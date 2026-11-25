from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import MIN_LOW_STOCK_THRESHOLD
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import SettingsIn, SettingsOut

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(user: User = Depends(get_current_user)):
    return SettingsOut(
        default_low_stock_threshold=max(
            user.organization.default_low_stock_threshold,
            MIN_LOW_STOCK_THRESHOLD,
        )
    )


@router.put("", response_model=SettingsOut)
def update_settings(
    payload: SettingsIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    user.organization.default_low_stock_threshold = payload.default_low_stock_threshold
    db.commit()
    return SettingsOut(default_low_stock_threshold=payload.default_low_stock_threshold)
