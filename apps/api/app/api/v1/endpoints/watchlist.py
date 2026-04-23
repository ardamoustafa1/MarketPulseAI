import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.alert import Watchlist, WatchlistItem
from app.models.asset import Asset
from app.models.user import User
from app.schemas.watchlist import WatchlistAssetResponse, WatchlistResponse

router = APIRouter()

def get_or_create_default_watchlist(db: Session, user_id: str) -> Watchlist:
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == user_id, Watchlist.name == "Favorites").first()
    if not watchlist:
        watchlist = Watchlist(id=uuid.uuid4(), user_id=user_id, name="Favorites")
        db.add(watchlist)
        db.commit()
        db.refresh(watchlist)
    return watchlist

@router.get("", response_model=WatchlistResponse)
@router.get("/", response_model=WatchlistResponse)
def get_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the user's default watchlist and its assets"""
    watchlist = get_or_create_default_watchlist(db, current_user.id)
    
    # Fetch assets through the watchlist_items join
    items = (
        db.query(WatchlistItem, Asset)
        .join(Asset, WatchlistItem.asset_id == Asset.id)
        .filter(WatchlistItem.watchlist_id == watchlist.id)
        .all()
    )
    
    asset_responses = []
    for _, asset in items:
        asset_responses.append(WatchlistAssetResponse(
            id=str(asset.id),
            symbol=asset.symbol,
            name=asset.name,
            type=asset.type.value if hasattr(asset.type, 'value') else str(asset.type),
            image_url=asset.image_url,
            price=None,
            change_24h_percent=None,
        ))
        
    return WatchlistResponse(
        id=str(watchlist.id),
        name=watchlist.name,
        user_id=str(watchlist.user_id),
        assets=asset_responses
    )

@router.post("/{symbol}", response_model=WatchlistResponse)
def add_to_watchlist(symbol: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Add an asset to the user's watchlist by symbol"""
    asset = db.query(Asset).filter(Asset.symbol.ilike(symbol)).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")
        
    watchlist = get_or_create_default_watchlist(db, current_user.id)
    
    existing = (
        db.query(WatchlistItem)
        .filter(
            WatchlistItem.watchlist_id == watchlist.id,
            WatchlistItem.asset_id == asset.id,
        )
        .first()
    )
    if not existing:
        new_item = WatchlistItem(id=uuid.uuid4(), watchlist_id=watchlist.id, asset_id=asset.id)
        db.add(new_item)
        db.commit()
    
    return get_watchlist(db, current_user)

@router.delete("/{symbol}", response_model=WatchlistResponse)
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove an asset from the user's watchlist by symbol"""
    asset = db.query(Asset).filter(Asset.symbol.ilike(symbol)).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")
        
    watchlist = get_or_create_default_watchlist(db, current_user.id)
    
    item = (
        db.query(WatchlistItem)
        .filter(
            WatchlistItem.watchlist_id == watchlist.id,
            WatchlistItem.asset_id == asset.id,
        )
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
        
    return get_watchlist(db, current_user)
