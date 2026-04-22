from decimal import Decimal, InvalidOperation
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
from app.schemas.portfolio import AssetPositionStatus, PortfolioSummary, AssetAllocation

class TransactionType(str, Enum):
    buy = "buy"
    sell = "sell"

@dataclass
class TransactionDTO:
    symbol: str
    type: TransactionType
    quantity: Decimal
    price: Decimal

class PortfolioCalculationEngine:
    """
    Domain service for complex financial portfolio calculations.
    Stateless and purely algorithmic, relying entirely on provided DTOs to avoid ORM tight coupling.
    """
    
    @staticmethod
    def calculate_asset_position(
        symbol: str, 
        transactions: List[TransactionDTO], 
        current_price: Optional[Decimal] = None,
        has_live_price: bool = True,
        is_stale_price: bool = False,
    ) -> AssetPositionStatus:
        """
        Calculates the state of a single asset based on historical chronological transactions.
        If no current_price is provided, Current Value and Unrealized PNL result in 0.
        """
        qty_held = Decimal("0")
        avg_cost = Decimal("0")
        realized_pnl = Decimal("0")
        
        # Sort transactions implicitly assuming they arrived ordered by date, or we treat them strictly as ordered
        for t in transactions:
            if t.type == TransactionType.buy:
                if t.quantity < 0 or t.price < 0:
                    raise ValueError("Buy quantity and price must be positive.")
                
                total_current_cost = qty_held * avg_cost
                cost_of_new_buy = t.quantity * t.price
                
                new_qty = qty_held + t.quantity
                if new_qty > Decimal("0"):
                    avg_cost = (total_current_cost + cost_of_new_buy) / new_qty
                    
                qty_held = new_qty

            elif t.type == TransactionType.sell:
                if t.quantity < 0 or t.price < 0:
                    raise ValueError("Sell quantity and price must be positive.")
                
                if t.quantity > qty_held:
                    raise ValueError(f"Cannot sell {t.quantity} {symbol}, only holding {qty_held}.")

                # Realized PNL on this chunk: Sell value - Cost basis
                realized_pnl += t.quantity * (t.price - avg_cost)
                
                qty_held -= t.quantity
                
                # If everything is sold, average cost resets completely
                if qty_held == Decimal("0"):
                    avg_cost = Decimal("0")
                    
        total_invested = qty_held * avg_cost
        if current_price is None:
            # Keep cost-basis valuation for continuity, but mark with has_live_price=False upstream.
            current_value = qty_held * avg_cost
            unrealized_pnl = Decimal("0")
            unrealized_pnl_percent = Decimal("0")
        else:
            current_value = qty_held * current_price
            unrealized_pnl = current_value - total_invested
            unrealized_pnl_percent = Decimal("0")
            if total_invested > Decimal("0"):
                unrealized_pnl_percent = (unrealized_pnl / total_invested) * 100
        
        return AssetPositionStatus(
            symbol=symbol,
            quantity_held=round(qty_held, 8),
            average_buy_price=round(avg_cost, 8),
            total_invested=round(total_invested, 8),
            current_value=round(current_value, 8),
            unrealized_pnl=round(unrealized_pnl, 8),
            unrealized_pnl_percent=round(unrealized_pnl_percent, 2),
            realized_pnl=round(realized_pnl, 8),
            has_live_price=has_live_price,
            is_stale_price=is_stale_price,
        )

    @staticmethod
    def calculate_portfolio_summary(
        positions: List[AssetPositionStatus]
    ) -> PortfolioSummary:
        """
        Aggregates all calculated asset positions into a combined Portfolio Summary,
        figuring out total investments, global PnL, and Asset Allocation (Donut chart data).
        """
        total_invested = sum(p.total_invested for p in positions)
        total_current_value = sum(p.current_value for p in positions)
        total_realized_pnl = sum(p.realized_pnl for p in positions)
        missing_price_positions = sum(1 for p in positions if not p.has_live_price)
        stale_price_positions = sum(1 for p in positions if p.is_stale_price)
        
        total_unrealized_pnl = total_current_value - total_invested
        total_unrealized_pnl_percent = Decimal("0")
        if total_invested > Decimal("0"):
            total_unrealized_pnl_percent = (total_unrealized_pnl / total_invested) * 100
            
        allocations = []
        if total_current_value > Decimal("0"):
            # Exclude assets that user fully sold (quantity 0 means current value is 0)
            active_positions = [p for p in positions if p.current_value > Decimal("0")]
            for p in active_positions:
                pct = (p.current_value / total_current_value) * 100
                allocations.append(AssetAllocation(symbol=p.symbol, percentage=round(pct, 2)))
                
        # Sort descending by percentage
        allocations.sort(key=lambda x: x.percentage, reverse=True)

        return PortfolioSummary(
            total_invested=round(total_invested, 8),
            total_current_value=round(total_current_value, 8),
            total_unrealized_pnl=round(total_unrealized_pnl, 8),
            total_unrealized_pnl_percent=round(total_unrealized_pnl_percent, 2),
            total_realized_pnl=round(total_realized_pnl, 8),
            valuation_complete=missing_price_positions == 0 and stale_price_positions == 0,
            missing_price_positions=missing_price_positions,
            stale_price_positions=stale_price_positions,
            positions=positions,
            allocation=allocations
        )
