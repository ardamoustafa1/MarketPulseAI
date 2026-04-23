from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.asset import Asset
from app.models.user import User

router = APIRouter()


class AssetListItem(BaseModel):
    id: str
    symbol: str
    name: str
    type: str
    image_url: str | None


@router.get("/", response_model=list[AssetListItem])
def read_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = (
        db.query(Asset)
        .filter(Asset.is_active is True)
        .order_by(Asset.symbol.asc())
        .all()
    )
    return [
        AssetListItem(
            id=str(asset.id),
            symbol=asset.symbol,
            name=asset.name,
            type=asset.type.value,
            image_url=asset.image_url,
        )
        for asset in assets
    ]
