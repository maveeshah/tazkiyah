from uuid import UUID
from collections import defaultdict
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import aliased
from app.models.canonical_item import CanonicalItem, PriceHistory
from app.schemas.cpi import CPITrendItem, PricePointResponse

class CPIService:
    KNOWN_SYNONYMS = {
        "aaloo": "Potato",
        "aalu": "Potato",
        "potato": "Potato",
        "potatoes": "Potato",
        "pyaz": "Onion",
        "pyaaz": "Onion",
        "onion": "Onion",
        "onions": "Onion",
        "tamatar": "Tomato",
        "tomato": "Tomato",
        "tomatoes": "Tomato",
        "doodh": "Milk",
        "milk": "Milk",
        "anday": "Eggs",
        "eggs": "Eggs",
        "egg": "Eggs",
        "petrol": "Petrol",
        "fuel": "Petrol",
        "diesel": "Diesel",
        "atta": "Flour",
        "flour": "Flour",
        "cheeni": "Sugar",
        "sugar": "Sugar",
        "chaawal": "Rice",
        "rice": "Rice",
        "oil": "Cooking Oil",
        "cooking oil": "Cooking Oil",
    }

    KNOWN_CATEGORIES = {
        "Potato": "Fresh Produce",
        "Onion": "Fresh Produce",
        "Tomato": "Fresh Produce",
        "Milk": "Dairy",
        "Eggs": "Poultry & Dairy",
        "Petrol": "Fuel",
        "Diesel": "Fuel",
        "Flour": "Grains & Staples",
        "Sugar": "Grains & Staples",
        "Rice": "Grains & Staples",
        "Cooking Oil": "Cooking Essentials",
    }

    @classmethod
    def normalize_name(cls, raw_name: str) -> tuple[str, str]:
        cleaned = raw_name.strip().lower()
        canonical = cls.KNOWN_SYNONYMS.get(cleaned, raw_name.strip().title())
        category = cls.KNOWN_CATEGORIES.get(canonical, "General")
        return canonical, category

    @classmethod
    async def match_or_create_canonical_item(
        cls,
        household_id: UUID,
        raw_name: str,
        standard_unit: str,
        db: AsyncSession,
    ) -> CanonicalItem:
        canonical_name, category = cls.normalize_name(raw_name)

        result = await db.execute(
            select(CanonicalItem).where(
                CanonicalItem.household_id == household_id,
                CanonicalItem.name == canonical_name,
            )
        )
        item = result.scalar_one_or_none()

        if not item:
            item = CanonicalItem(
                household_id=household_id,
                name=canonical_name,
                category=category,
                standard_unit=standard_unit,
            )
            db.add(item)
            await db.flush()

        return item

    @classmethod
    async def record_price_history(
        cls,
        canonical_item_id: UUID,
        unit_price: Decimal,
        unit: str,
        merchant: Optional[str],
        db: AsyncSession,
    ) -> PriceHistory:
        price_entry = PriceHistory(
            canonical_item_id=canonical_item_id,
            unit_price=unit_price,
            unit=unit,
            merchant=merchant,
        )
        db.add(price_entry)
        await db.flush()
        return price_entry

    @classmethod
    async def get_cpi_trends(cls, household_id: UUID, db: AsyncSession) -> List[CPITrendItem]:
        items_result = await db.execute(
            select(CanonicalItem).where(CanonicalItem.household_id == household_id)
        )
        items = items_result.scalars().all()
        if not items:
            return []

        item_ids = [item.id for item in items]

        # One window-function query for every item's latest-20 price history,
        # instead of one query per item in a loop.
        row_number = (
            func.row_number()
            .over(
                partition_by=PriceHistory.canonical_item_id,
                order_by=desc(PriceHistory.recorded_at),
            )
            .label("rn")
        )
        ranked = (
            select(PriceHistory, row_number)
            .where(PriceHistory.canonical_item_id.in_(item_ids))
            .subquery()
        )
        ranked_price_history = aliased(PriceHistory, ranked)

        history_result = await db.execute(
            select(ranked_price_history)
            .where(ranked.c.rn <= 20)
            .order_by(ranked.c.canonical_item_id, ranked.c.rn)
        )
        history_by_item: dict[UUID, List[PriceHistory]] = defaultdict(list)
        for row in history_result.scalars().all():
            history_by_item[row.canonical_item_id].append(row)

        trends: List[CPITrendItem] = []
        for item in items:
            history_rows = history_by_item.get(item.id, [])

            latest_price = history_rows[0].unit_price if history_rows else None
            previous_price = history_rows[1].unit_price if len(history_rows) > 1 else None

            inflation_rate = None
            if latest_price and previous_price and previous_price > 0:
                inflation_rate = float(((latest_price - previous_price) / previous_price) * 100)

            history_responses = [
                PricePointResponse(
                    id=row.id,
                    canonical_item_id=row.canonical_item_id,
                    unit_price=row.unit_price,
                    unit=row.unit,
                    merchant=row.merchant,
                    recorded_at=row.recorded_at,
                )
                for row in history_rows
            ]

            trends.append(
                CPITrendItem(
                    canonical_item_id=item.id,
                    name=item.name,
                    category=item.category,
                    standard_unit=item.standard_unit,
                    latest_price=latest_price,
                    previous_price=previous_price,
                    inflation_rate_percentage=inflation_rate,
                    history=history_responses,
                )
            )

        return trends
