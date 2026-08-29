import pytest
from decimal import Decimal
from app.services.parser_service import ParserService

@pytest.mark.asyncio
async def test_parse_multi_item_text():
    raw_text = "1.25kg potato for 125, 2l milk for 580, 1 dozen anday for 360 at Imtiaz from cash"
    extracted = await ParserService.parse_text(
        raw_text=raw_text,
        known_accounts=["Wallet Cash", "Meezan Bank", "Sadapay"],
        known_envelopes=["Grocery", "Fuel", "Dining Out"],
    )

    assert extracted.merchant == "Imtiaz"
    assert len(extracted.line_items) == 3
    assert extracted.total_amount == Decimal("1065.00")

    # Item 1: Potato
    item1 = extracted.line_items[0]
    assert item1.canonical_name == "Potato"
    assert item1.quantity == Decimal("1.25")
    assert item1.unit == "kg"
    assert item1.total_price == Decimal("125.00")
    assert item1.unit_price == Decimal("100.00")

    # Item 2: Milk
    item2 = extracted.line_items[1]
    assert item2.canonical_name == "Milk"
    assert item2.quantity == Decimal("2.0")
    assert item2.unit == "l"
    assert item2.total_price == Decimal("580.00")
    assert item2.unit_price == Decimal("290.00")

    # Item 3: Eggs
    item3 = extracted.line_items[2]
    assert item3.canonical_name == "Eggs"
    assert item3.quantity == Decimal("1.0")
    assert item3.unit == "dozen"
    assert item3.total_price == Decimal("360.00")

@pytest.mark.asyncio
async def test_parse_simple_single_expense():
    raw_text = "petrol for 3500 at Shell from meezan"
    extracted = await ParserService.parse_text(
        raw_text=raw_text,
        known_accounts=["Wallet Cash", "Meezan Bank", "Sadapay"],
        known_envelopes=["Grocery", "Fuel", "Dining Out"],
    )

    assert extracted.merchant == "Shell"
    assert extracted.total_amount == Decimal("3500.00")
    assert len(extracted.line_items) == 1
    assert extracted.line_items[0].canonical_name == "Petrol"
