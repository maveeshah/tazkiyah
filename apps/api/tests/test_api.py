import pytest
from decimal import Decimal

@pytest.mark.asyncio
async def test_api_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_api_create_household_and_user(client):
    h_resp = await client.post("/api/v1/households", json={"name": "Al-Mizan", "base_currency": "PKR"})
    assert h_resp.status_code == 200
    h_data = h_resp.json()
    h_id = h_data["id"]

    u_resp = await client.post(
        f"/api/v1/households/{h_id}/users",
        json={"phone_number": "+923009998877", "full_name": "Hamza", "email": "hamza@tazkiyah.app"},
    )
    assert u_resp.status_code == 200
    u_data = u_resp.json()
    assert u_data["full_name"] == "Hamza"
    assert u_data["household_id"] == h_id

@pytest.mark.asyncio
async def test_api_goal_creation_and_pacing(client, seed_data):
    household = seed_data["household"]
    
    # Create Umrah Goal: 600k target
    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "name": "Umrah 2027",
            "goal_type": "TARGET_BY_DATE",
            "target_amount": "600000.00",
            "target_date": "2027-08-01",
            "current_balance": "100000.00",
        },
    )
    assert goal_resp.status_code == 200
    goal_data = goal_resp.json()
    assert goal_data["name"] == "Umrah 2027"
    assert float(goal_data["monthly_pacing"]) > 0

@pytest.mark.asyncio
async def test_goal_linked_to_envelope_tracks_live_balance(client, seed_data):
    household = seed_data["household"]
    grocery_env = seed_data["envelopes"]["grocery"]  # assigned: 40,000, spent: 0

    goal_resp = await client.post(
        "/api/v1/goals",
        json={
            "household_id": str(household.id),
            "envelope_id": str(grocery_env.id),
            "name": "Grocery Buffer",
            "goal_type": "SINKING_FUND",
            "target_amount": "50000.00",
            # A client-supplied current_balance must be ignored for a goal
            # linked to an envelope -- it is derived from the envelope instead.
            "current_balance": "999999.00",
        },
    )
    assert goal_resp.status_code == 200
    goal_data = goal_resp.json()
    goal_id = goal_data["id"]
    assert Decimal(goal_data["current_balance"]) == Decimal("40000.00")

    # Spend against the linked envelope; the goal's balance must follow it
    # live rather than staying pinned at creation time.
    spend_resp = await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(seed_data["accounts"]["cash"].id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "5000.00",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "Groceries", "quantity": "1.000", "unit": "trip", "total_price": "5000.00"}
            ],
        },
    )
    assert spend_resp.status_code == 200

    goals = (await client.get(f"/api/v1/goals/household/{household.id}")).json()
    updated_goal = next(g for g in goals if g["id"] == goal_id)
    assert Decimal(updated_goal["current_balance"]) == Decimal("35000.00")


@pytest.mark.asyncio
async def test_create_envelope_group_rejects_unknown_household(client):
    resp = await client.post(
        "/api/v1/envelopes/groups",
        json={"household_id": "11111111-2222-3333-4444-555555555555", "name": "Ghost Group"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_envelope_rejects_unknown_group(client):
    resp = await client.post(
        "/api/v1/envelopes",
        json={"group_id": "11111111-2222-3333-4444-555555555555", "name": "Ghost Envelope"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_overdrawn_accounts(client, seed_data):
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]
    grocery_env = seed_data["envelopes"]["grocery"]

    empty_resp = await client.get(f"/api/v1/accounts/overdrawn/{household.id}")
    assert empty_resp.json() == []

    await client.post(
        "/api/v1/transactions",
        json={
            "household_id": str(household.id),
            "account_id": str(cash_acc.id),
            "envelope_id": str(grocery_env.id),
            "total_amount": "30000.00",
            "source": "WEB",
            "line_items": [
                {"raw_item_name": "Vet Bill", "quantity": "1.000", "unit": "service", "total_price": "30000.00"}
            ],
        },
    )

    overdrawn_resp = await client.get(f"/api/v1/accounts/overdrawn/{household.id}")
    assert overdrawn_resp.status_code == 200
    overdrawn = overdrawn_resp.json()
    assert len(overdrawn) == 1
    assert overdrawn[0]["id"] == str(cash_acc.id)
    assert overdrawn[0]["is_overdrawn"] is True


@pytest.mark.asyncio
async def test_get_account_requires_matching_household(client, seed_data):
    household = seed_data["household"]
    cash_acc = seed_data["accounts"]["cash"]

    ok_resp = await client.get(
        f"/api/v1/accounts/{cash_acc.id}", params={"household_id": str(household.id)}
    )
    assert ok_resp.status_code == 200
    assert ok_resp.json()["id"] == str(cash_acc.id)

    other_h_resp = await client.post(
        "/api/v1/households", json={"name": "Another Family", "base_currency": "PKR"}
    )
    other_household_id = other_h_resp.json()["id"]

    wrong_household_resp = await client.get(
        f"/api/v1/accounts/{cash_acc.id}", params={"household_id": other_household_id}
    )
    assert wrong_household_resp.status_code == 404

    missing_param_resp = await client.get(f"/api/v1/accounts/{cash_acc.id}")
    assert missing_param_resp.status_code == 422
