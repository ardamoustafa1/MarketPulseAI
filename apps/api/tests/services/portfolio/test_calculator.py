import pytest
from decimal import Decimal
from app.services.portfolio.calculator import PortfolioCalculationEngine, TransactionDTO, TransactionType

def test_single_asset_multiple_buys():
    # Scenario 1: Same asset, different prices (Averaging logic)
    transactions = [
        TransactionDTO(symbol="BTC", type=TransactionType.buy, quantity=Decimal("1"), price=Decimal("50000")),
        TransactionDTO(symbol="BTC", type=TransactionType.buy, quantity=Decimal("1"), price=Decimal("60000"))
    ]
    # Current value = 2 BTC * $65000 = 130000
    pos = PortfolioCalculationEngine.calculate_asset_position("BTC", transactions, current_price=Decimal("65000"))
    
    assert pos.quantity_held == Decimal("2")
    assert pos.average_buy_price == Decimal("55000") # (50k+60k)/2
    assert pos.total_invested == Decimal("110000")
    assert pos.current_value == Decimal("130000")
    assert pos.unrealized_pnl == Decimal("20000")
    assert pos.realized_pnl == Decimal("0")

def test_partial_sell():
    # Scenario 2: Partial sell
    transactions = [
        TransactionDTO(symbol="ETH", type=TransactionType.buy, quantity=Decimal("10"), price=Decimal("2000")),
        TransactionDTO(symbol="ETH", type=TransactionType.sell, quantity=Decimal("4"), price=Decimal("2500"))
    ]
    # Buy 10 @ 2000 => 20000. Avg Cost: 2000
    # Sell 4 @ 2500 => Realized PnL: 4 * (2500 - 2000) = 2000
    # Remaining: 6 @ 2000. Current price: 3000 => Current value = 18000
    pos = PortfolioCalculationEngine.calculate_asset_position("ETH", transactions, current_price=Decimal("3000"))
    
    assert pos.quantity_held == Decimal("6")
    assert pos.average_buy_price == Decimal("2000")
    assert pos.realized_pnl == Decimal("2000")
    assert pos.current_value == Decimal("18000")

def test_full_sell():
    # Scenario 3: Tam satış
    transactions = [
        TransactionDTO(symbol="SOL", type=TransactionType.buy, quantity=Decimal("10"), price=Decimal("100")),
        TransactionDTO(symbol="SOL", type=TransactionType.sell, quantity=Decimal("10"), price=Decimal("150"))
    ]
    pos = PortfolioCalculationEngine.calculate_asset_position("SOL", transactions, current_price=Decimal("160"))
    
    assert pos.quantity_held == Decimal("0")
    assert pos.average_buy_price == Decimal("0") # should reset
    assert pos.current_value == Decimal("0")
    assert pos.unrealized_pnl == Decimal("0")
    assert pos.realized_pnl == Decimal("500") # 10 * (150-100)

def test_sell_and_rebuy():
    # Scenario 4: Satış sonrası tekrar alış
    transactions = [
        TransactionDTO(symbol="SOL", type=TransactionType.buy, quantity=Decimal("10"), price=Decimal("100")),
        TransactionDTO(symbol="SOL", type=TransactionType.sell, quantity=Decimal("10"), price=Decimal("150")),
        TransactionDTO(symbol="SOL", type=TransactionType.buy, quantity=Decimal("5"), price=Decimal("200"))
    ]
    pos = PortfolioCalculationEngine.calculate_asset_position("SOL", transactions, current_price=Decimal("250"))
    
    assert pos.quantity_held == Decimal("5")
    assert pos.average_buy_price == Decimal("200") # Re-established
    assert pos.realized_pnl == Decimal("500") # Unchanged from previous trade
    assert pos.unrealized_pnl == Decimal("250") # 5 * (250 - 200)

def test_empty_transactions():
    # Scenario 5: Hiç transaction yok
    pos = PortfolioCalculationEngine.calculate_asset_position("UNKNOWN", [], current_price=Decimal("100"))
    assert pos.quantity_held == Decimal("0")
    assert pos.total_invested == Decimal("0")

def test_no_current_price():
    # Scenario 6: Güncel fiyat gelmedi (None)
    transactions = [TransactionDTO(symbol="BTC", type=TransactionType.buy, quantity=Decimal("1"), price=Decimal("50000"))]
    pos = PortfolioCalculationEngine.calculate_asset_position("BTC", transactions, current_price=None)
    assert pos.current_value == Decimal("50000") # Defaults to cost basis roughly or 0 depending on logic
    assert pos.unrealized_pnl == Decimal("0") # Because current == avg

def test_invalid_sell_exceeds_holding():
    # Scenario 7.a: Olmayanı satmaya çalışmak
    transactions = [
        TransactionDTO(symbol="DOGE", type=TransactionType.buy, quantity=Decimal("100"), price=Decimal("0.1")),
        TransactionDTO(symbol="DOGE", type=TransactionType.sell, quantity=Decimal("150"), price=Decimal("0.2"))
    ]
    with pytest.raises(ValueError):
         PortfolioCalculationEngine.calculate_asset_position("DOGE", transactions, current_price=Decimal("0.2"))

def test_invalid_negative_quantities():
    # Scenario 7.b: Negatif transaction göndermek
    transactions = [
        TransactionDTO(symbol="DOGE", type=TransactionType.buy, quantity=Decimal("-100"), price=Decimal("0.1"))
    ]
    with pytest.raises(ValueError):
         PortfolioCalculationEngine.calculate_asset_position("DOGE", transactions, current_price=Decimal("0.2"))

def test_portfolio_summary_allocation_and_sorting():
    positions = [
        PortfolioCalculationEngine.calculate_asset_position(
            "BTC",
            [TransactionDTO(symbol="BTC", type=TransactionType.buy, quantity=Decimal("1"), price=Decimal("50000"))],
            current_price=Decimal("60000"),
        ),
        PortfolioCalculationEngine.calculate_asset_position(
            "ETH",
            [TransactionDTO(symbol="ETH", type=TransactionType.buy, quantity=Decimal("10"), price=Decimal("2000"))],
            current_price=Decimal("2500"),
        ),
    ]

    summary = PortfolioCalculationEngine.calculate_portfolio_summary(positions)

    assert summary.total_invested == Decimal("70000")
    assert summary.total_current_value == Decimal("85000")
    assert summary.total_unrealized_pnl == Decimal("15000")
    assert len(summary.allocation) == 2
    assert summary.allocation[0].symbol == "BTC"
    assert summary.allocation[1].symbol == "ETH"

def test_portfolio_summary_handles_zero_positions():
    summary = PortfolioCalculationEngine.calculate_portfolio_summary([])
    assert summary.total_invested == Decimal("0")
    assert summary.total_current_value == Decimal("0")
    assert summary.allocation == []
