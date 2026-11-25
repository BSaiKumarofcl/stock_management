from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select

from ..config import MIN_LOW_STOCK_THRESHOLD
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Product, User
from ..schemas import DashboardOut, LowStockItem

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    org_id = user.organization_id
    default = max(user.organization.default_low_stock_threshold, MIN_LOW_STOCK_THRESHOLD)

    total_products, total_quantity = db.execute(
        select(func.count(Product.id), func.coalesce(func.sum(Product.quantity_on_hand), 0)).where(
            Product.organization_id == org_id
        )
    ).one()

    threshold = case(
        (Product.low_stock_threshold.is_(None), default),
        (Product.low_stock_threshold < default, default),
        else_=Product.low_stock_threshold,
    )
    rows = db.execute(
        select(Product, threshold.label("thr"))
        .where(Product.organization_id == org_id, Product.quantity_on_hand < threshold)
        .order_by(Product.quantity_on_hand, Product.name)
    ).all()

    items = [
        LowStockItem(
            id=p.id, name=p.name, sku=p.sku, quantity_on_hand=p.quantity_on_hand, low_stock_threshold=thr
        )
        for p, thr in rows
    ]
    return DashboardOut(
        total_products=total_products,
        total_quantity=int(total_quantity),
        low_stock_count=len(items),
        low_stock_items=items,
    )
