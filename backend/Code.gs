// Google Apps Script V8. Configure Script Properties before deploying (see README).
const BOOKING_HEADERS = ['預約ID', '場地名稱', '預約日期', '開始時間', '結束時間', '借用者', '聯絡方式', '預訂用途'];
const BLOCK_HEADERS = ['id', 'roomName', 'startDate', 'endDate', 'reason'];
const ROOM_NAMES = ['討論室', '多功能室'];

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function database() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('後端尚未設定 SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}
function sheetData(sheet, requiredHeaders) {
  if (!sheet) throw new Error('找不到預約紀錄工作表');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  if (requiredHeaders.some(header => !headers.includes(header))) throw new Error('工作表欄位不相容，請依部署說明確認標題');
  const timezone = sheet.getParent().getSpreadsheetTimeZone();
  return values.slice(1).map((row, index) => {
    const record = { _row: index + 2 };
    headers.forEach((header, column) => {
      const value = row[column];
      record[header] = value instanceof Date
        ? Utilities.formatDate(value, timezone, ['開始時間', '結束時間'].includes(header) ? 'HH:mm' : 'yyyy-MM-dd')
        : String(value == null ? '' : value).trim();
    });
    return record;
  }).filter(record => record[requiredHeaders[0]]);
}
function bookingSheet(db) {
  const name = PropertiesService.getScriptProperties().getProperty('BOOKING_SHEET_NAME') || '預約紀錄';
  return db.getSheetByName(name);
}
function blockSheet(db, create) {
  let sheet = db.getSheetByName('包場設定');
  if (!sheet && create) {
    sheet = db.insertSheet('包場設定');
    sheet.appendRow(BLOCK_HEADERS);
  }
  return sheet;
}
function blocksFrom(db) {
  const sheet = blockSheet(db, false);
  return sheet ? sheetData(sheet, BLOCK_HEADERS) : [];
}
function publicBlocks(blocks) {
  return blocks.map(block => ({ id: block.id, roomName: block.roomName, startDate: block.startDate, endDate: block.endDate, reason: block.reason }));
}
function doGet(e) {
  try {
    const month = String((e.parameter || {}).month || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('月份格式錯誤');
    const db = database();
    const bookings = sheetData(bookingSheet(db), BOOKING_HEADERS).filter(b => b['預約日期'].startsWith(month));
    bookings.forEach(b => delete b._row);
    return reply({ status: 'success', data: bookings, blocks: publicBlocks(blocksFrom(db)), capabilities: { roomBlocks: true } });
  } catch (error) {
    return reply({ status: 'error', message: error.message });
  }
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validateRoom(roomName) {
  if (!ROOM_NAMES.includes(roomName)) throw new Error('場地不存在');
}
function requireAdmin(payload) {
  const key = PropertiesService.getScriptProperties().getProperty('BLOCK_ADMIN_KEY');
  if (!key || typeof payload.adminKey !== 'string' || payload.adminKey !== key) throw new Error('管理密碼不正確或尚未設定');
}
function validateRange(payload) {
  validateRoom(payload.roomName);
  if (!validDate(payload.startDate) || !validDate(payload.endDate) || payload.startDate > payload.endDate) throw new Error('包場日期區間不正確');
  if (typeof payload.reason !== 'string' || !payload.reason.trim() || payload.reason.length > 200) throw new Error('請填寫 200 字以內的包場原因');
}
function blockingRange(blocks, roomName, date) {
  return blocks.find(b => b.roomName === roomName && b.startDate <= date && date <= b.endDate);
}
function validateBooking(payload, bookings, blocks, excludedId) {
  validateRoom(payload.roomName);
  if (!validDate(payload.date)) throw new Error('預約日期不正確');
  const time = /^(?:0[8-9]|1[0-7]):(?:00|30)$|^18:00$/;
  if (!time.test(payload.startTime) || !time.test(payload.endTime) || payload.startTime >= payload.endTime) throw new Error('請選擇 08:00–18:00 內的半小時時段');
  if (blockingRange(blocks, payload.roomName, payload.date)) throw new Error('此場地當日已包場，無法借用');
  ['bookerName', 'contact', 'purpose'].forEach(field => {
    if (typeof payload[field] !== 'string' || !payload[field].trim()) throw new Error('請填寫所有必填欄位');
  });
  if (bookings.some(b => b['預約ID'] !== excludedId && b['場地名稱'] === payload.roomName && b['預約日期'] === payload.date && b['開始時間'] < payload.endTime && payload.startTime < b['結束時間'])) throw new Error('該時段已有預約');
}
// Force user text to remain text rather than becoming a spreadsheet formula.
function safeCell(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
function appendRecord(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(header => safeCell(record[header])));
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  let acquired = false;
  try {
    const request = JSON.parse(e.postData.contents);
    const payload = request.payload || {};
    if (!['book', 'edit', 'cancel', 'block', 'unblock'].includes(request.action)) throw new Error('不支援的操作');
    if (['block', 'unblock'].includes(request.action)) requireAdmin(payload);
    // All conflict checks and writes share the same lock; concurrent reservations cannot bypass blocks.
    lock.waitLock(30000);
    acquired = true;
    const db = database();
    const sheet = bookingSheet(db);
    const bookings = sheetData(sheet, BOOKING_HEADERS);
    const blocks = blocksFrom(db);
    if (request.action === 'block') {
      validateRange(payload);
      if (blocks.some(b => b.roomName === payload.roomName && b.startDate <= payload.endDate && payload.startDate <= b.endDate)) throw new Error('此區間與現有包場重疊');
      const conflict = bookings.find(b => b['場地名稱'] === payload.roomName && payload.startDate <= b['預約日期'] && b['預約日期'] <= payload.endDate);
      if (conflict) throw new Error(`${conflict['預約日期']} 已有預約，請先處理後再包場`);
      appendRecord(blockSheet(db, true), { id: Utilities.getUuid(), roomName: payload.roomName, startDate: payload.startDate, endDate: payload.endDate, reason: payload.reason.trim() });
    } else if (request.action === 'unblock') {
      const block = blocks.find(b => b.id === payload.blockId);
      if (!block) throw new Error('包場紀錄不存在，請重新載入');
      blockSheet(db, false).deleteRow(block._row);
    } else {
      let original;
      if (request.action !== 'book') {
        original = bookings.find(b => b['預約ID'] === payload.bookingId);
        if (!original) throw new Error('預約不存在，請重新載入');
      }
      if (request.action === 'cancel') {
        sheet.deleteRow(original._row);
      } else {
        const booking = request.action === 'edit' ? Object.assign({}, payload, { roomName: original['場地名稱'], date: original['預約日期'], startTime: original['開始時間'] }) : payload;
        validateBooking(booking, bookings, blocks, original && original['預約ID']);
        const record = { '預約ID': original ? original['預約ID'] : Utilities.getUuid(), '場地名稱': booking.roomName, '預約日期': booking.date, '開始時間': booking.startTime, '結束時間': booking.endTime, '借用者': booking.bookerName.trim(), '聯絡方式': booking.contact.trim(), '預訂用途': booking.purpose.trim() };
        if (original) {
          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
          // Leave unrelated columns and formulas intact.
          Object.keys(record).forEach(header => sheet.getRange(original._row, headers.indexOf(header) + 1).setValue(safeCell(record[header])));
        } else appendRecord(sheet, record);
      }
    }
    SpreadsheetApp.flush();
    return reply({ status: 'success' });
  } catch (error) {
    return reply({ status: 'error', message: error.message });
  } finally {
    if (acquired) lock.releaseLock();
  }
}
