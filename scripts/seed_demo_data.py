"""
Root CLI wrapper for seeding Tazkiyah demo dataset.
Executes apps/api/scripts/seed_demo_data.py
"""

import sys
import os
import asyncio

# Add apps/api to path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(ROOT_DIR, "apps", "api")
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from app.core.database import engine, Base
from scripts.seed_demo_data import seed_demo_data


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_demo_data()


if __name__ == "__main__":
    asyncio.run(main())
