import pytest
from decimal import Decimal
from app.services.cpi_service import CPIService

@pytest.mark.asyncio
async def test_cpi_canonical_matching_and_inflation_tracking(db_session, seed_data):
    household = seed_data["household"]

    # 1. Match 'aaloo' -> Canonical 'Potato'
    item = await CPIService.match_or_create_canonical_item(
        household_id=household.id,
        raw_name="aaloo",
        standard_unit="kg",
        db=db_session,
    )
    assert item.name == "Potato"
    assert item.category == "Fresh Produce"

    # 2. Record First Price: 80 PKR/kg at Local Market
    await CPIService.record_price_history(
        canonical_item_id=item.id,
        unit_price=Decimal("80.00"),
        unit="kg",
        merchant="Local Vendor",
        db=db_session,
    )

    # 3. Record Second Price: 100 PKR/kg at Imtiaz (25% inflation)
    await CPIService.record_price_history(
        canonical_item_id=item.id,
        unit_price=Decimal("100.00"),
        unit="kg",
        merchant="Imtiaz Supermarket",
        db=db_session,
    )

    trends = await CPIService.get_cpi_trends(household_id=household.id, db=db_session)
    assert len(trends) == 1
    trend = trends[0]
    assert trend.name == "Potato"
    assert trend.latest_price == Decimal("100.00")
    assert trend.previous_price == Decimal("80.00")
    assert trend.inflation_rate_percentage == 25.0
