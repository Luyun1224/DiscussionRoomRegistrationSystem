const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup() {
  let locked = false;
  let serial = 0;
  const sheets = {};
  const db = { getSheetByName: n => sheets[n] || null, insertSheet: n => sheets[n] = makeSheet([]), getSpreadsheetTimeZone: () => 'Asia/Taipei' };
  function makeSheet(rows) {
    return { rows, getParent: () => db, getDataRange: () => ({ getValues: () => rows.map(r => [...r]) }),
      getLastColumn: () => rows[0].length,
      getRange: (r, c, nr, nc) => ({ getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)), setValue: v => { assert.ok(locked); rows[r - 1][c - 1] = v; } }),
      appendRow: row => { assert.ok(locked); rows.push(row); }, deleteRow: r => { assert.ok(locked); rows.splice(r - 1, 1); } };
  }
  sheets['預約紀錄'] = makeSheet([['預約ID', '場地名稱', '預約日期', '開始時間', '結束時間', '借用者', '聯絡方式', '預訂用途', '額外欄位']]);
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: n => ({ SPREADSHEET_ID: 'test', BLOCK_ADMIN_KEY: 'test-key' })[n] }) },
    SpreadsheetApp: { openById: () => db, flush: () => {} },
    Utilities: { getUuid: () => String(++serial) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(locked, false); locked = true; }, releaseLock: () => { locked = false; } }) }
  });
  vm.runInContext(fs.readFileSync('backend/Code.gs', 'utf8'), context);
  return { sheets, post: (action, payload) => context.doPost({ postData: { contents: JSON.stringify({ action, payload }) } }), get: month => context.doGet({ parameter: { month } }), isLocked: () => locked };
}
const block = { roomName: '討論室', startDate: '2026-10-06', endDate: '2026-12-31', reason: '專案包場', adminKey: 'test-key' };
const booking = { roomName: '討論室', date: '2026-10-06', startTime: '08:00', endTime: '09:00', bookerName: '測試', contact: '123', purpose: '測試' };
test('range blocks inclusive dates across months; other rooms and outside range remain available', () => {
  const s = setup();
  assert.equal(s.post('block', block).status, 'success');
  for (const date of ['2026-10-06', '2026-11-15', '2026-12-31']) assert.equal(s.post('book', { ...booking, date }).status, 'error');
  assert.equal(s.post('book', { ...booking, roomName: '多功能室' }).status, 'success');
  assert.equal(s.post('book', { ...booking, date: '2027-01-01' }).status, 'success');
  assert.equal(s.get('2026-11').blocks.length, 1);
  assert.equal(s.get('2026-11').capabilities.roomBlocks, true);
  assert.equal(s.isLocked(), false);
});
test('admin required; reversed/impossible dates and overlap rejected; unblock restores booking', () => {
  const s = setup();
  assert.equal(s.post('block', { ...block, adminKey: 'wrong' }).status, 'error');
  assert.equal(s.post('block', { ...block, startDate: '2027-01-01' }).status, 'error');
  assert.equal(s.post('block', { ...block, startDate: '2026-02-30' }).status, 'error');
  assert.equal(s.post('block', block).status, 'success');
  assert.equal(s.post('block', { ...block, startDate: '2026-12-31', endDate: '2027-01-01' }).status, 'error');
  const id = s.get('2026-10').blocks[0].id;
  assert.equal(s.post('unblock', { blockId: id, adminKey: 'wrong' }).status, 'error');
  assert.equal(s.post('unblock', { blockId: id, adminKey: 'test-key' }).status, 'success');
  assert.equal(s.post('book', booking).status, 'success');
});
test('existing bookings prevent blocks without modifying records; edit/cancel preserve API', () => {
  const s = setup();
  assert.equal(s.post('book', booking).status, 'success');
  const id = s.get('2026-10').data[0]['預約ID'];
  assert.equal(s.post('block', block).status, 'error');
  assert.equal(s.get('2026-10').data.length, 1);
  s.sheets['預約紀錄'].rows[1][8] = 'keep';
  assert.equal(s.post('edit', { bookingId: id, endTime: '10:00', bookerName: '更新', contact: '123', purpose: '更新' }).status, 'success');
  assert.equal(s.sheets['預約紀錄'].rows[1][8], 'keep');
  // Simulate a block inserted externally; server must also reject editing into it.
  s.sheets['包場設定'] = { getDataRange: () => ({ getValues: () => [['id', 'roomName', 'startDate', 'endDate', 'reason'], ['external', '討論室', '2026-10-06', '2026-12-31', '包場']] }), getParent: () => ({ getSpreadsheetTimeZone: () => 'Asia/Taipei' }) };
  assert.equal(s.post('edit', { bookingId: id, endTime: '11:00', bookerName: '更新', contact: '123', purpose: '更新' }).status, 'error');
  assert.equal(s.post('cancel', { bookingId: id }).status, 'success');
  assert.equal(s.get('2026-10').data.length, 0);
});
