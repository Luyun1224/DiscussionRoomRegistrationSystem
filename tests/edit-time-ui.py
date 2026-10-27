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
            if request['action'] == 'edit':
                data = request['payload']
                item = next(b for b in bookings if b['預約ID'] == data['bookingId'])
                item.update({'開始時間': data['startTime'], '結束時間': data['endTime']})
                return r.fulfill(json={'status': 'success'})
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
    bookings.extend([
        {'預約ID': 'edit-test', '場地名稱': '多功能室', '預約日期': '2026-10-09', '開始時間': '08:00', '結束時間': '18:00', '借用者': '測試', '聯絡方式': '123', '預訂用途': '測試'},
        {'預約ID': 'busy', '場地名稱': '多功能室', '預約日期': '2026-10-10', '開始時間': '10:00', '結束時間': '11:00', '借用者': '其他', '聯絡方式': '123', '預訂用途': '測試'},
        {'預約ID': 'short', '場地名稱': '多功能室', '預約日期': '2026-10-10', '開始時間': '08:00', '結束時間': '09:00', '借用者': '測試', '聯絡方式': '123', '預訂用途': '測試'}
    ])
    page.reload()
    page.locator('#date-picker').fill('2026-10-09')
    page.locator('#date-picker').dispatch_event('change')
    page.locator('.booked-slot[data-booking-id="edit-test"]').click()
    page.locator('#edit-start-time-select').select_option('09:30')
    assert page.locator('#edit-end-time-select').input_value() == '18:00'
    page.locator('#edit-start-time-select').select_option('17:30')
    assert page.locator('#edit-end-time-select option').all_text_contents() == ['18:00']
    page.locator('#edit-start-time-select').select_option('09:30')
    page.locator('#confirm-edit-btn').click()
    page.wait_for_function('!document.querySelector(".booked-slot[data-booking-id=edit-test]").classList.contains("pending")')
    page.wait_for_timeout(500)
    assert writes[-1]['payload']['startTime'] == '09:30'
    page.locator('.booked-slot[data-booking-id="edit-test"]').click()
    assert page.locator('#edit-start-time-select').input_value() == '09:30'
    page.locator('#edit-modal .close-modal-btn').first.click()
    page.locator('#date-picker').fill('2026-10-10')
    page.locator('#date-picker').dispatch_event('change')
    page.locator('.booked-slot[data-booking-id="short"]').click()
    starts = page.locator('#edit-start-time-select option').all_text_contents()
    assert '10:00' not in starts and '10:30' not in starts and '11:00' in starts
    page.locator('#edit-start-time-select').select_option('09:30')
    assert page.locator('#edit-end-time-select option').all_text_contents() == ['10:00']
    assert not errors, errors
    browser.close()
    print('Edit start-time UI checks passed (mock API, no live writes)')
