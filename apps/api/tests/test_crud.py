"""CRUD (PATCH / DELETE) coverage for transactions, accounts, envelopes, groups, goals."""

import pytest
from decimal import Decimal


def _hh(seed_data):
    return str(seed_data["household"].id)


async def _log_tx(client, seed_data, *, envelope=None, account=None, amount="1000.00", items=None):
    env = envelope or seed_data["envelopes"]["grocery"]
    acc = account or seed_data["accounts"]["cash"]
    payload = {
        "household_id": _hh(seed_data),
        "account_id": str(acc.id),
        "envelope_id": str(env.id),
        "total_amount": amount,
        "merchant": "Test Mart",
        "source": "WEB",
        "line_items": items if items is not None else [
            {"raw_item_name": "Thing", "quantity": "1.000", "unit": "pc", "total_price": amount}
        ],
    }
    resp = await client.post("/api/v1/transactions", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------------------------------------------------------------- transactions

@pytest.mark.asyncio
async def test_transaction_get_patch_delete_reverses_balances(client, seed_data):
    hh = _hh(seed_data)
    cash = seed_data["accounts"]["cash"]
    grocery = seed_data["envelopes"]["grocery"]

    tx = await _log_tx(client, seed_data, amount="1000.00")
    tx_id = tx["id"]

    # GET
    got = (await client.get(f"/api/v1/transactions/{tx_id}?household_id={hh}")).json()
    assert got["id"] == tx_id

    acc_after_create = (await client.get(f"/api/v1/accounts/{cash.id}?household_id={hh}")).json()
    assert Decimal(str(acc_after_create["current_balance"])) == Decimal("24000.00")  # 25000 - 1000

    # PATCH amount 1000 -> 1500 (account should drop another 500, envelope spent +500)
    patched = (await client.patch(
        f"/api/v1/transactions/{tx_id}?household_id={hh}",
        json={"total_amount": "1500.00", "line_items": [
            {"raw_item_name": "Thing", "quantity": "1.000", "unit": "pc", "total_price": "1500.00"}
        ]},
    )).json()
    assert Decimal(str(patched["total_amount"])) == Decimal("1500.00")
    acc = (await client.get(f"/api/v1/accounts/{cash.id}?household_id={hh}")).json()
    assert Decimal(str(acc["current_balance"])) == Decimal("23500.00")  # 25000 - 1500
    groups = (await client.get(f"/api/v1/envelopes/groups/household/{hh}")).json()
    g = next(e for grp in groups for e in grp["envelopes"] if e["id"] == str(grocery.id))
    assert Decimal(str(g["spent_amount"])) == Decimal("1500.00")

    # DELETE -> fully reverted
    d = await client.delete(f"/api/v1/transactions/{tx_id}?household_id={hh}")
    assert d.status_code == 200
    acc = (await client.get(f"/api/v1/accounts/{cash.id}?household_id={hh}")).json()
    assert Decimal(str(acc["current_balance"])) == Decimal("25000.00")
    groups = (await client.get(f"/api/v1/envelopes/groups/household/{hh}")).json()
    g = next(e for grp in groups for e in grp["envelopes"] if e["id"] == str(grocery.id))
    assert Decimal(str(g["spent_amount"])) == Decimal("0.00")
    assert (await client.get(f"/api/v1/transactions/{tx_id}?household_id={hh}")).status_code == 404


@pytest.mark.asyncio
async def test_transaction_patch_moves_spend_between_envelopes(client, seed_data):
    hh = _hh(seed_data)
    grocery = seed_data["envelopes"]["grocery"]
    fuel = seed_data["envelopes"]["fuel"]

    tx = await _log_tx(client, seed_data, envelope=grocery, amount="2000.00")

    await client.patch(
        f"/api/v1/transactions/{tx['id']}?household_id={hh}",
        json={"envelope_id": str(fuel.id)},
    )

    groups = (await client.get(f"/api/v1/envelopes/groups/household/{hh}")).json()
    flat = {e["id"]: e for grp in groups for e in grp["envelopes"]}
    assert Decimal(str(flat[str(grocery.id)]["spent_amount"])) == Decimal("0.00")
    assert Decimal(str(flat[str(fuel.id)]["spent_amount"])) == Decimal("2000.00")


@pytest.mark.asyncio
async def test_transaction_patch_rejects_line_item_sum_mismatch(client, seed_data):
    hh = _hh(seed_data)
    tx = await _log_tx(client, seed_data, amount="1000.00")
    resp = await client.patch(
        f"/api/v1/transactions/{tx['id']}?household_id={hh}",
        json={"total_amount": "5000.00"},  # existing line item still totals 1000
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------- accounts

@pytest.mark.asyncio
async def test_account_patch_and_delete_guard(client, seed_data):
    hh = _hh(seed_data)
    cash = seed_data["accounts"]["cash"]

    # PATCH rename + balance correction
    patched = (await client.patch(
        f"/api/v1/accounts/{cash.id}?household_id={hh}",
        json={"name": "Renamed Wallet", "current_balance": "9999.00"},
    )).json()
    assert patched["name"] == "Renamed Wallet"
    assert Decimal(str(patched["current_balance"])) == Decimal("9999.00")

    # DELETE blocked while a transaction references it
    await _log_tx(client, seed_data, account=cash, amount="100.00")
    blocked = await client.delete(f"/api/v1/accounts/{cash.id}?household_id={hh}")
    assert blocked.status_code == 409

    # An unreferenced account deletes cleanly
    new_acc = (await client.post("/api/v1/accounts", json={
        "household_id": hh, "name": "Scratch", "type": "CASH", "current_balance": "0.00",
    })).json()
    ok = await client.delete(f"/api/v1/accounts/{new_acc['id']}?household_id={hh}")
    assert ok.status_code == 200
    assert (await client.get(f"/api/v1/accounts/{new_acc['id']}?household_id={hh}")).status_code == 404


@pytest.mark.asyncio
async def test_account_create_bad_household_is_400_not_500(client):
    resp = await client.post("/api/v1/accounts", json={
        "household_id": "00000000-0000-0000-0000-000000000000",
        "name": "Orphan", "type": "BANK", "current_balance": "0.00",
    })
    assert resp.status_code == 400


# ---------------------------------------------------------------- envelopes / groups

@pytest.mark.asyncio
async def test_envelope_patch_and_delete_guard(client, seed_data):
    hh = _hh(seed_data)
    grocery = seed_data["envelopes"]["grocery"]

    patched = (await client.patch(
        f"/api/v1/envelopes/{grocery.id}?household_id={hh}",
        json={"name": "Groceries & Staples", "target_amount": "50000.00"},
    )).json()
    assert patched["name"] == "Groceries & Staples"

    await _log_tx(client, seed_data, envelope=grocery, amount="100.00")
    blocked = await client.delete(f"/api/v1/envelopes/{grocery.id}?household_id={hh}")
    assert blocked.status_code == 409

    # Fresh envelope in a fresh group deletes fine
    grp = (await client.post("/api/v1/envelopes/groups", json={
        "household_id": hh, "name": "Temp Group", "sort_order": 9,
    })).json()
    env = (await client.post("/api/v1/envelopes", json={"group_id": grp["id"], "name": "Temp Env"})).json()
    ok = await client.delete(f"/api/v1/envelopes/{env['id']}?household_id={hh}")
    assert ok.status_code == 200


@pytest.mark.asyncio
async def test_group_patch_and_delete_cascades_unreferenced(client, seed_data):
    hh = _hh(seed_data)

    grp = (await client.post("/api/v1/envelopes/groups", json={
        "household_id": hh, "name": "Annual", "sort_order": 8,
    })).json()
    await client.post("/api/v1/envelopes", json={"group_id": grp["id"], "name": "Zakat"})

    renamed = (await client.patch(
        f"/api/v1/envelopes/groups/{grp['id']}?household_id={hh}",
        json={"name": "Annual Obligations", "sort_order": 5},
    )).json()
    assert renamed["name"] == "Annual Obligations"
    assert renamed["sort_order"] == 5

    ok = await client.delete(f"/api/v1/envelopes/groups/{grp['id']}?household_id={hh}")
    assert ok.status_code == 200
    groups = (await client.get(f"/api/v1/envelopes/groups/household/{hh}")).json()
    assert all(g["id"] != grp["id"] for g in groups)


@pytest.mark.asyncio
async def test_group_delete_blocked_when_envelope_referenced(client, seed_data):
    hh = _hh(seed_data)
    grp = (await client.post("/api/v1/envelopes/groups", json={
        "household_id": hh, "name": "Blocked Group", "sort_order": 7,
    })).json()
    env = (await client.post("/api/v1/envelopes", json={"group_id": grp["id"], "name": "Used Env"})).json()
    # move an assignment in so a transaction can post, then spend
    await client.post(f"/api/v1/envelopes/assign?household_id={hh}", json={
        "envelope_id": env["id"], "assigned_amount": "500.00",
    })
    await client.post("/api/v1/transactions", json={
        "household_id": hh,
        "account_id": str(seed_data["accounts"]["cash"].id),
        "envelope_id": env["id"],
        "total_amount": "300.00",
        "source": "WEB",
        "line_items": [{"raw_item_name": "x", "total_price": "300.00"}],
    })
    blocked = await client.delete(f"/api/v1/envelopes/groups/{grp['id']}?household_id={hh}")
    assert blocked.status_code == 409


# ---------------------------------------------------------------- goals

@pytest.mark.asyncio
async def test_goal_get_patch_delete(client, seed_data):
    hh = _hh(seed_data)

    created = (await client.post("/api/v1/goals", json={
        "household_id": hh,
        "name": "New Laptop",
        "goal_type": "TARGET_CAP",
        "target_amount": "300000.00",
        "current_balance": "50000.00",
    })).json()
    goal_id = created["id"]
    assert Decimal(str(created["current_balance"])) == Decimal("50000.00")

    got = (await client.get(f"/api/v1/goals/{goal_id}?household_id={hh}")).json()
    assert got["name"] == "New Laptop"

    # Unlinked goal: balance + name editable
    patched = (await client.patch(f"/api/v1/goals/{goal_id}?household_id={hh}", json={
        "name": "New Laptop Fund", "current_balance": "120000.00",
    })).json()
    assert patched["name"] == "New Laptop Fund"
    assert Decimal(str(patched["current_balance"])) == Decimal("120000.00")

    d = await client.delete(f"/api/v1/goals/{goal_id}?household_id={hh}")
    assert d.status_code == 200
    assert (await client.get(f"/api/v1/goals/{goal_id}?household_id={hh}")).status_code == 404


@pytest.mark.asyncio
async def test_goal_linked_balance_edit_is_ignored(client, seed_data):
    hh = _hh(seed_data)
    grocery = seed_data["envelopes"]["grocery"]  # available 40000

    created = (await client.post("/api/v1/goals", json={
        "household_id": hh,
        "envelope_id": str(grocery.id),
        "name": "Grocery Stockpile",
        "goal_type": "SINKING_FUND",
        "target_amount": "100000.00",
    })).json()
    assert Decimal(str(created["current_balance"])) == Decimal("40000.00")  # from envelope

    patched = (await client.patch(f"/api/v1/goals/{created['id']}?household_id={hh}", json={
        "current_balance": "999999.00",
    })).json()
    assert Decimal(str(patched["current_balance"])) == Decimal("40000.00")  # still envelope-derived


@pytest.mark.asyncio
async def test_goal_rejects_foreign_envelope(client, seed_data):
    hh = _hh(seed_data)
    other_hh = (await client.post("/api/v1/households", json={"name": "Other"})).json()
    other_grp = (await client.post("/api/v1/envelopes/groups", json={
        "household_id": other_hh["id"], "name": "Theirs", "sort_order": 1,
    })).json()
    other_env = (await client.post("/api/v1/envelopes", json={
        "group_id": other_grp["id"], "name": "Their Env",
    })).json()

    resp = await client.post("/api/v1/goals", json={
        "household_id": hh,
        "envelope_id": other_env["id"],
        "name": "Cross-tenant goal",
        "goal_type": "TARGET_CAP",
        "target_amount": "1000.00",
    })
    assert resp.status_code == 404
