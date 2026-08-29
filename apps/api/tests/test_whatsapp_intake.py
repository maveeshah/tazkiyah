import pytest
from decimal import Decimal
from app.models.household import Household, User
from app.models.account import Account, AccountType
from app.services.whatsapp_client import WhatsAppClient


@pytest.mark.asyncio
async def test_intake_household_without_envelopes_does_not_crash(client, db_session):
    # Household + user + one account, but zero budget envelopes.
    hh = Household(name="Bare Household", base_currency="PKR")
    db_session.add(hh)
    await db_session.flush()
    db_session.add(User(household_id=hh.id, phone_number="+923009990001", full_name="Bare"))
    db_session.add(Account(household_id=hh.id, name="Cash", type=AccountType.CASH, current_balance=Decimal("500.00")))
    await db_session.commit()

    WhatsAppClient.sent_messages_log.clear()
    resp = await client.post(
        "/api/v1/webhook/simulate",
        json={
            "phone_number": "+923009990001",
            "message_type": "text",
            "content": "250 spent on chai from cash",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["simulation_result"]["status"] == "no_envelope"
    assert "envelope" in WhatsAppClient.sent_messages_log[-1]["text"]["body"].lower()

@pytest.mark.asyncio
async def test_whatsapp_intake_with_explicit_account(client, seed_data):
    # Registered user phone: +923001234567
    WhatsAppClient.sent_messages_log.clear()

    # User texts: "1.25kg potato for 125, 2l milk for 580 at Imtiaz from cash"
    resp = await client.post(
        "/api/v1/webhook/simulate",
        json={
            "phone_number": "+923001234567",
            "message_type": "text",
            "content": "1.25kg potato for 125, 2l milk for 580 at Imtiaz from cash",
        },
    )
    assert resp.status_code == 200
    res_data = resp.json()["simulation_result"]
    assert res_data["status"] == "success"
    assert res_data["total_amount"] == 705.00

    # Verify a confirmation message was sent back on WhatsApp
    assert len(WhatsAppClient.sent_messages_log) > 0
    last_msg = WhatsAppClient.sent_messages_log[-1]
    assert "705.00" in last_msg["text"]["body"]
    assert "Imtiaz" in last_msg["text"]["body"]

@pytest.mark.asyncio
async def test_whatsapp_intake_prompts_button_when_account_missing(client, seed_data):
    WhatsAppClient.sent_messages_log.clear()

    # User texts expense without specifying account: "Dinner for 4500 at Monal"
    resp = await client.post(
        "/api/v1/webhook/simulate",
        json={
            "phone_number": "+923001234567",
            "message_type": "text",
            "content": "dinner for 4500 at Monal",
        },
    )
    assert resp.status_code == 200
    res_data = resp.json()["simulation_result"]
    assert res_data["status"] == "prompted_for_account"

    # Verify interactive quick-reply buttons were sent
    last_msg = WhatsAppClient.sent_messages_log[-1]
    assert last_msg["type"] == "interactive"
    buttons = last_msg["interactive"]["action"]["buttons"]
    assert len(buttons) >= 2  # Cash and Meezan

    chosen_button_id = buttons[0]["reply"]["id"]

    # Simulate user tapping the button
    btn_resp = await client.post(
        "/api/v1/webhook/simulate",
        json={
            "phone_number": "+923001234567",
            "message_type": "interactive",
            "content": chosen_button_id,
        },
    )
    assert btn_resp.status_code == 200
    btn_res_data = btn_resp.json()["simulation_result"]
    assert btn_res_data["status"] == "success"
    assert btn_res_data["total_amount"] == 4500.00
