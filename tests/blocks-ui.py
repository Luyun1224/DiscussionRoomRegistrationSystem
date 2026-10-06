"""Legacy API range reservations, using a memory backend; no live writes."""
import json
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8000'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(timezone_id='Asia/Taipei')
    bookings, writes, errors = [], [], []
    fail_date = None
    modern = False
    page.on('pageerror', lambda error: errors.append(str(error)))
    def route(r):
        url = r.request.url
        if url.startswith(BASE):
            return r.continue_()
        if 'script.google.com/' in url:
            if r.request.method == 'GET':
                month = parse_qs(urlparse(url).query)['month'][0]
                result = {'status': 'success', 'data': [b for b in bookings if b['預約日期'].startswith(month)]}
                if modern:
                    result.update(blocks=[], capabilities={'roomBlocks': True})
                return r.fulfill(json=result)
            request = json.loads(r.request.post_data)
            writes.append(request)
            assert request['action'] == 'book'
            data = request['payload']
            assert 'adminKey' not in data
            if data['date'] == fail_date:
                return r.fulfill(json={'status': 'error', 'message': '測試失敗'})
            bookings.append({'預約ID': str(len(bookings)+1), '場地名稱': data['roomName'], '預約日期': data['date'], '開始時間': data['startTime'], '結束時間': data['endTime'], '借用者': data['bookerName'], '聯絡方式': data['contact'], '預訂用途': data['purpose']})
            return r.fulfill(json={'status': 'success'})
        if 'cdn.tailwindcss.com' in url:
            return r.fulfill(body="const s=document.createElement('style'); s.textContent='#alert-modal {position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center} .pointer-events-none {pointer-events:none} .pointer-events-auto {pointer-events:auto} #alert-modal .modal-content {max-width:384px;max-height:90vh;overflow-y:auto} #alert-modal svg {width:32px;height:32px}';document.head.append(s);", content_type='application/javascript')
        if 'unpkg.com/tippy' in url:
            return r.fulfill(body='window.tippy=()=>({destroy(){}});', content_type='application/javascript')
        if 'TaiwanCalendar' in url:
            return r.fulfill(json=[])
        return r.fulfill(body='', content_type='text/plain')
    page.route('**/*', route)
    page.goto(BASE)
    page.wait_for_selector('.time-slot-cell', state='attached')
    assert page.locator('#block-submit').is_enabled(), 'Legacy backend must support submission'
    assert page.locator('input[type=password]').count() == 0
    def form(start, end):
        if 'modal-hidden' in page.locator('#long-booking-modal').get_attribute('class'):
            page.locator('#open-long-booking').click()
        page.locator('#block-start').fill(start)
        page.locator('#block-end').fill(end)
        page.locator('#long-booker-name').fill('教學部 測試者')
        page.locator('#long-booker-contact').fill('1234')
        page.locator('#block-reason').fill('長期活動')
    def submit(title):
        page.locator('#block-submit').click()
        page.wait_for_function('(title)=>document.getElementById("alert-title").textContent===title && document.getElementById("alert-modal").classList.contains("modal-visible")', arg=title)
    def dismiss():
        page.locator('#alert-ok').click()
        page.wait_for_function('!document.getElementById("block-submit").disabled')
    form('2026-10-30', '2026-11-02')
    page.locator('#long-booker-name').fill('')
    page.locator('#block-submit').click()
    assert not writes, 'Required name should prevent requests'
    page.locator('#long-booker-name').fill('教學部 測試者')
    page.locator('#block-year-end').click()
    assert page.locator('#block-end').input_value() == '2026-12-31'
    page.locator('#block-end').fill('2026-11-02')
    submit('操作成功')
    assert [b['預約日期'] for b in bookings] == ['2026-10-30','2026-10-31','2026-11-01','2026-11-02']
    assert all(b['借用者']=='教學部 測試者' and b['聯絡方式']=='1234' and b['開始時間']=='08:00' and b['結束時間']=='18:00' for b in bookings)
    dismiss()
    page.locator('#date-picker').fill('2026-10-30')
    page.locator('#date-picker').dispatch_event('change')
    page.wait_for_selector('.booked-slot', state='attached')
    assert page.locator('.booked-slot').count() == 1
    # Same submission is idempotent across reloads.
    before = len(writes)
    form('2026-10-30', '2026-11-02')
    submit('操作成功')
    assert len(writes) == before
    dismiss()
    # Conflict anywhere in range prevents all new writes.
    form('2026-10-29', '2026-11-02')
    submit('長時間借用未完成')
    assert len(writes) == before
    assert '已有預約' in page.locator('#alert-message').text_content()
    dismiss()
    # Stop on failure, report partial results, and safely resume missing dates.
    fail_date = '2026-12-31'
    form('2026-12-30', '2027-01-01')
    submit('長時間借用未完成')
    assert '1/3' in page.locator('#alert-message').text_content()
    assert writes[-1]['payload']['date'] == '2026-12-31'
    dismiss()
    fail_date = None
    submit('操作成功')
    assert sum(b['預約日期']=='2026-12-30' for b in bookings) == 1
    assert writes[-1]['payload']['date'] == '2027-01-01'
    dismiss()
    modern = True
    page.reload()
    page.wait_for_selector('.time-slot-cell', state='attached')
    form('2027-02-01', '2027-02-01')
    submit('操作成功')
    assert writes[-1]['action'] == 'book'
    dismiss()
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#open-long-booking').click()
    bounds = page.locator('.long-booking-content').bounding_box()
    assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 390
    page.keyboard.press('Escape')
    assert 'modal-hidden' in page.locator('#long-booking-modal').get_attribute('class')
    assert not errors, errors
    browser.close()
    print('PASS: legacy + modern API, required borrower/contact, inclusive cross-month/year dates, conflicts, no duplicates, partial failure/resume, mobile dialog; no live writes')
