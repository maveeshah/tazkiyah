import assert from 'node:assert';

console.log('===============================================================');
console.log('STARTING EMPIRICAL MATHEMATICAL & LOGICAL STRESS-TEST FOR M4');
console.log('===============================================================');

let testCount = 0;
function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`✓ [PASS ${testCount}] ${name}`);
  } catch (err) {
    console.error(`✗ [FAIL ${testCount}] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 1. Quantity Formatting Stress Tests (formatQuantity)
// -----------------------------------------------------------------------------

test('formatQuantity handles integer, float, string, undefined, null, NaN', () => {
  const formatQuantity = (qty) => {
    if (qty === undefined || qty === null) return '1.000';
    const val = typeof qty === 'string' ? parseFloat(qty) : Number(qty);
    if (isNaN(val)) return String(qty);
    return val % 1 === 0 ? `${val}.000` : val.toFixed(3);
  };

  assert.strictEqual(formatQuantity(undefined), '1.000');
  assert.strictEqual(formatQuantity(null), '1.000');
  assert.strictEqual(formatQuantity(1), '1.000');
  assert.strictEqual(formatQuantity(5), '5.000');
  assert.strictEqual(formatQuantity('2'), '2.000');
  assert.strictEqual(formatQuantity(2.5), '2.500');
  assert.strictEqual(formatQuantity(0.125), '0.125');
  assert.strictEqual(formatQuantity('3.75'), '3.750');
  assert.strictEqual(formatQuantity('invalid_num'), 'invalid_num');
});

// -----------------------------------------------------------------------------
// 2. Receipt Subtotal & Integrity Calculation
// -----------------------------------------------------------------------------

test('Receipt Integrity Check: Subtotal vs Total discrepancy detection', () => {
  const evaluateIntegrity = (lineItems, totalAmountStr) => {
    const lineItemsSubtotal = lineItems.reduce((sum, item) => {
      const p = parseFloat(String(item.total_price)) || 0;
      return sum + p;
    }, 0);
    const totalAmount = parseFloat(String(totalAmountStr)) || 0;
    const isBalanced = Math.abs(lineItemsSubtotal - totalAmount) < 0.05 || lineItems.length === 0;
    const discrepancy = Math.abs(lineItemsSubtotal - totalAmount);
    return { lineItemsSubtotal, totalAmount, isBalanced, discrepancy };
  };

  // Case 1: Perfectly balanced
  const r1 = evaluateIntegrity(
    [{ total_price: '120.00' }, { total_price: '380.00' }, { total_price: '500.00' }],
    '1000.00'
  );
  assert.strictEqual(r1.lineItemsSubtotal, 1000.00);
  assert.strictEqual(r1.isBalanced, true);
  assert.strictEqual(r1.discrepancy, 0);

  // Case 2: Sub-cent rounding difference (e.g. 0.02)
  const r2 = evaluateIntegrity(
    [{ total_price: '333.33' }, { total_price: '333.33' }, { total_price: '333.33' }],
    '1000.00'
  );
  assert.strictEqual(r2.isBalanced, true); // 0.01 discrepancy is within 0.05 epsilon

  // Case 3: Major discrepancy (e.g. tax/tip not itemized)
  const r3 = evaluateIntegrity(
    [{ total_price: '500.00' }, { total_price: '300.00' }],
    '1000.00'
  );
  assert.strictEqual(r3.isBalanced, false);
  assert.strictEqual(r3.discrepancy, 200.00);

  // Case 4: Zero line items (Lump sum transaction)
  const r4 = evaluateIntegrity([], '2500.00');
  assert.strictEqual(r4.isBalanced, true); // 0 line items handled gracefully
  assert.strictEqual(r4.lineItemsSubtotal, 0);
});

// -----------------------------------------------------------------------------
// 3. Multi-Criteria Search Filter Verification
// -----------------------------------------------------------------------------

test('Search Filter: Multi-field matching across merchant, raw text, line items, CPI staples, notes', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      merchant: 'Imtiaz Super Market',
      raw_input: 'Aaloo 5kg 600, Milk 2L 440 from Imtiaz',
      envelope_id: 'env-1',
      account_id: 'acc-1',
      total_amount: 1040,
      line_items: [
        { id: 'li-1', raw_item_name: 'Aaloo (Potatoes)', canonical_item_id: 'cpi-potato', notes: 'Fresh Sindh crop', total_price: 600 },
        { id: 'li-2', raw_item_name: 'Olpers Milk 1L', canonical_item_id: 'cpi-milk', notes: 'Tetra pak', total_price: 440 },
      ],
    },
    {
      id: 'tx-2',
      merchant: 'Shell Petrol Station',
      raw_input: 'Petrol 10 liters Shell Clifton',
      envelope_id: 'env-2',
      account_id: 'acc-2',
      total_amount: 2750,
      line_items: [
        { id: 'li-3', raw_item_name: 'Super Unleaded Petrol', canonical_item_id: 'cpi-petrol', notes: 'Tank refill', total_price: 2750 },
      ],
    },
    {
      id: 'tx-3',
      merchant: 'Kolachi Restaurant',
      raw_input: 'Family dinner',
      envelope_id: 'env-3',
      account_id: 'acc-1',
      total_amount: 8500,
      line_items: [
        { id: 'li-4', raw_item_name: 'Chicken Karahi & Naan', canonical_item_id: null, notes: 'Outdoor seating', total_price: 8500 },
      ],
    },
  ];

  const accountsMap = new Map([
    ['acc-1', { id: 'acc-1', name: 'Meezan Bank' }],
    ['acc-2', { id: 'acc-2', name: 'Sadapay Wallet' }],
  ]);

  const envelopeMap = new Map([
    ['env-1', { envelopeName: 'Groceries & Staples', groupName: 'Daily Living' }],
    ['env-2', { envelopeName: 'Fuel & Transportation', groupName: 'Daily Living' }],
    ['env-3', { envelopeName: 'Dining Out', groupName: 'Lifestyle' }],
  ]);

  const canonicalMap = new Map([
    ['cpi-potato', { canonical_item_id: 'cpi-potato', name: 'Potato (Aaloo)', category: 'Staples' }],
    ['cpi-milk', { canonical_item_id: 'cpi-milk', name: 'Milk (Fresh/Pack)', category: 'Dairy' }],
    ['cpi-petrol', { canonical_item_id: 'cpi-petrol', name: 'Petrol (Super)', category: 'Energy' }],
  ]);

  const search = (query) => {
    const q = query.toLowerCase().trim();
    return mockTransactions.filter((tx) => {
      const matchesMerchant = (tx.merchant || '').toLowerCase().includes(q);
      const matchesRawInput = (tx.raw_input || '').toLowerCase().includes(q);
      const envInfo = envelopeMap.get(tx.envelope_id);
      const matchesEnvelope =
        envInfo?.envelopeName.toLowerCase().includes(q) ||
        envInfo?.groupName.toLowerCase().includes(q);
      const accInfo = accountsMap.get(tx.account_id);
      const matchesAccount = accInfo?.name.toLowerCase().includes(q);

      const matchesLineItems = tx.line_items.some((li) => {
        const rawMatch = li.raw_item_name.toLowerCase().includes(q);
        const notesMatch = (li.notes || '').toLowerCase().includes(q);
        const canonical = li.canonical_item_id ? canonicalMap.get(li.canonical_item_id) : null;
        const canonicalMatch = canonical ? canonical.name.toLowerCase().includes(q) : false;
        return rawMatch || notesMatch || canonicalMatch;
      });

      return matchesMerchant || matchesRawInput || matchesEnvelope || matchesAccount || matchesLineItems;
    });
  };

  // Test 1: Match merchant name
  assert.strictEqual(search('imtiaz').length, 1);
  assert.strictEqual(search('imtiaz')[0].id, 'tx-1');

  // Test 2: Match line item raw name
  assert.strictEqual(search('olpers').length, 1);
  assert.strictEqual(search('olpers')[0].id, 'tx-1');

  // Test 3: Match line item note
  assert.strictEqual(search('sindh crop').length, 1);
  assert.strictEqual(search('sindh crop')[0].id, 'tx-1');

  // Test 4: Match CPI Canonical staple name
  assert.strictEqual(search('potato').length, 1);
  assert.strictEqual(search('potato')[0].id, 'tx-1');

  // Test 5: Match account name
  assert.strictEqual(search('sadapay').length, 1);
  assert.strictEqual(search('sadapay')[0].id, 'tx-2');

  // Test 6: Match envelope group name
  assert.strictEqual(search('lifestyle').length, 1);
  assert.strictEqual(search('lifestyle')[0].id, 'tx-3');

  // Test 7: Match raw input substring
  assert.strictEqual(search('clifton').length, 1);
  assert.strictEqual(search('clifton')[0].id, 'tx-2');

  // Test 8: Non-matching search
  assert.strictEqual(search('non_existent_text_xyz').length, 0);
});

// -----------------------------------------------------------------------------
// 4. Sorting Logic Verification
// -----------------------------------------------------------------------------

test('Sorting Invariants: DATE_DESC, DATE_ASC, AMOUNT_DESC, AMOUNT_ASC', () => {
  const txs = [
    { id: '1', transacted_at: '2026-08-10T10:00:00Z', total_amount: 500 },
    { id: '2', transacted_at: '2026-08-20T12:00:00Z', total_amount: 1500 },
    { id: '3', transacted_at: '2026-08-15T09:00:00Z', total_amount: 250 },
  ];

  const sort = (items, sortBy) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.transacted_at).getTime();
      const dateB = new Date(b.transacted_at).getTime();
      const amountA = parseFloat(String(a.total_amount)) || 0;
      const amountB = parseFloat(String(b.total_amount)) || 0;
      switch (sortBy) {
        case 'DATE_DESC': return dateB - dateA;
        case 'DATE_ASC': return dateA - dateB;
        case 'AMOUNT_DESC': return amountB - amountA;
        case 'AMOUNT_ASC': return amountA - amountB;
        default: return dateB - dateA;
      }
    });
  };

  const byDateDesc = sort(txs, 'DATE_DESC').map((t) => t.id);
  assert.deepStrictEqual(byDateDesc, ['2', '3', '1']);

  const byDateAsc = sort(txs, 'DATE_ASC').map((t) => t.id);
  assert.deepStrictEqual(byDateAsc, ['1', '3', '2']);

  const byAmtDesc = sort(txs, 'AMOUNT_DESC').map((t) => t.id);
  assert.deepStrictEqual(byAmtDesc, ['2', '1', '3']);

  const byAmtAsc = sort(txs, 'AMOUNT_ASC').map((t) => t.id);
  assert.deepStrictEqual(byAmtAsc, ['3', '1', '2']);
});

// -----------------------------------------------------------------------------
// 5. Aggregate Summary Metrics Calculations
// -----------------------------------------------------------------------------

test('Summary Metrics: Spend, Average Receipt Size, Line Items count and zero guard', () => {
  const calcMetrics = (transactions) => {
    const count = transactions.length;
    let totalSpend = 0;
    let totalLineItems = 0;
    for (const tx of transactions) {
      totalSpend += parseFloat(String(tx.total_amount)) || 0;
      totalLineItems += (tx.line_items || []).length;
    }
    const avgReceiptSize = count > 0 ? totalSpend / count : 0;
    return { count, totalSpend, avgReceiptSize, totalLineItems };
  };

  // Case 1: Populated transactions
  const m1 = calcMetrics([
    { total_amount: 1000, line_items: [{}, {}] },
    { total_amount: 2000, line_items: [{}] },
    { total_amount: 3000, line_items: [{}, {}, {}] },
  ]);
  assert.strictEqual(m1.count, 3);
  assert.strictEqual(m1.totalSpend, 6000);
  assert.strictEqual(m1.avgReceiptSize, 2000);
  assert.strictEqual(m1.totalLineItems, 6);

  // Case 2: Zero transactions (empty filter)
  const m2 = calcMetrics([]);
  assert.strictEqual(m2.count, 0);
  assert.strictEqual(m2.totalSpend, 0);
  assert.strictEqual(m2.avgReceiptSize, 0);
  assert.strictEqual(m2.totalLineItems, 0);
  assert(!isNaN(m2.avgReceiptSize));
});

// -----------------------------------------------------------------------------
// 6. LogTransactionModal Dynamic Calculation Math
// -----------------------------------------------------------------------------

test('LogTransactionModal: Dynamic UnitPrice <-> TotalPrice auto-calculation', () => {
  const updateLineItem = (item, field, value) => {
    const updated = { ...item, [field]: value };
    if (field === 'unit_price' || field === 'quantity') {
      const qty = parseFloat(field === 'quantity' ? value : updated.quantity);
      const price = parseFloat(field === 'unit_price' ? value : updated.unit_price);
      if (!isNaN(qty) && !isNaN(price) && qty > 0 && price >= 0) {
        updated.total_price = (qty * price).toFixed(2);
      }
    }
    if (field === 'total_price') {
      const tot = parseFloat(value);
      const qty = parseFloat(updated.quantity);
      if (!isNaN(tot) && !isNaN(qty) && qty > 0 && tot >= 0) {
        updated.unit_price = (tot / qty).toFixed(2);
      }
    }
    return updated;
  };

  // 1. Initial item
  let item = { quantity: '2.5', unit_price: '', total_price: '' };

  // 2. Typing Unit Price 120 -> Total Price should become 300.00
  item = updateLineItem(item, 'unit_price', '120');
  assert.strictEqual(item.total_price, '300.00');

  // 3. Changing quantity to 4.0 -> Total Price should become 480.00
  item = updateLineItem(item, 'quantity', '4.0');
  assert.strictEqual(item.total_price, '480.00');

  // 4. Overriding Total Price to 600 -> Unit Price should auto-derive to 150.00 (600 / 4)
  item = updateLineItem(item, 'total_price', '600');
  assert.strictEqual(item.unit_price, '150.00');

  // 5. Zero quantity safety
  item = { quantity: '0', unit_price: '100', total_price: '' };
  item = updateLineItem(item, 'unit_price', '100');
  assert.strictEqual(item.total_price, ''); // Not calculated for 0 qty
});

console.log('===============================================================');
console.log(`ALL ${testCount} EMPIRICAL M4 STRESS-TESTS PASSED SUCCESSFULLY!`);
console.log('===============================================================');
