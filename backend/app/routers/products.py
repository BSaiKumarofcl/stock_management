from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import MIN_LOW_STOCK_THRESHOLD
from ..deps import get_current_user
from ..models import Product, User
from ..schemas import ProductCreate, ProductOut, ProductUpdate, StockAdjustIn

router = APIRouter(prefix="/api/products", tags=["products"])


def to_out(p: Product, default_threshold: int) -> ProductOut:
    threshold = max(
        p.low_stock_threshold if p.low_stock_threshold is not None else default_threshold,
        default_threshold,
        MIN_LOW_STOCK_THRESHOLD,
    )
    return ProductOut(
        id=p.id,
        name=p.name,
        sku=p.sku,
        description=p.description,
        quantity_on_hand=p.quantity_on_hand,
        cost_price=p.cost_price,
        selling_price=p.selling_price,
        low_stock_threshold=p.low_stock_threshold,
        effective_low_stock_threshold=threshold,
        is_low_stock=p.quantity_on_hand < threshold,
        last_updated_by=p.last_updated_by,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def get_owned(db: Session, user: User, product_id: int, lock: bool = False) -> Product:
    stmt = select(Product).where(
        Product.id == product_id, Product.organization_id == user.organization_id
    )
    if lock:
        stmt = stmt.with_for_update()  # row lock on PostgreSQL; no-op on SQLite
    product = db.scalar(stmt)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


def commit_or_conflict(db: Session):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "SKU already exists in your organization")


@router.get("", response_model=list[ProductOut])
def list_products(
    q: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Product).where(Product.organization_id == user.organization_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    products = db.scalars(stmt.order_by(Product.name)).all()
    d = user.organization.default_low_stock_threshold
    return [to_out(p, d) for p in products]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    product = Product(
        **payload.model_dump(), organization_id=user.organization_id, last_updated_by=user.id
    )
    db.add(product)
    commit_or_conflict(db)
    db.refresh(product)
    return to_out(product, user.organization.default_low_stock_threshold)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    product = get_owned(db, user, product_id)
    return to_out(product, user.organization.default_low_stock_threshold)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = get_owned(db, user, product_id, lock=True)
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    product.last_updated_by = user.id
    commit_or_conflict(db)
    db.refresh(product)
    return to_out(product, user.organization.default_low_stock_threshold)


@router.post("/{product_id}/adjust", response_model=ProductOut)
def adjust_stock(
    product_id: int,
    payload: StockAdjustIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = get_owned(db, user, product_id, lock=True)
    new_qty = product.quantity_on_hand + payload.delta
    if new_qty < 0:
        db.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Adjustment would make stock negative (current: {product.quantity_on_hand})",
        )
    product.quantity_on_hand = new_qty
    product.last_updated_by = user.id
    db.commit()
    db.refresh(product)
    return to_out(product, user.organization.default_low_stock_threshold)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    product = get_owned(db, user, product_id)
    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
