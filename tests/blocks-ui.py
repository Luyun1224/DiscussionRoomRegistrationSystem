"""Browser behavior tests with intercepted API responses; no live backend writes."""
import json
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8000'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(timezone_id='Asia/Taipei')
    blocks = []
    requests = []
    errors = []
    legacy = False
    page.on('pageerror', lambda error: errors.append(str(error)))
    def route(r):
        nonlocal_url = r.request.url
        if nonlocal_url.startswith(BASE):
            return r.continue_()
        if 'script.google.com/' in nonlocal_url:
            if r.request.method == 'GET':
                result = {'status': 'success', 'data': []}
                if not legacy:
                    result.update(blocks=blocks, capabilities={'roomBlocks': True})
                return r.fulfill(json=result)
            request = json.loads(r.request.post_data)
            requests.append(request)
            payload = request['payload']
            if payload.get('adminKey') != 'test-key':
                return r.fulfill(json={'status': 'error', 'message': '管理密碼不正確'})
            if request['action'] == 'block':
                blocks.append({'id': 'test-block', **{k: payload[k] for k in ['roomName', 'startDate', 'endDate', 'reason']}})
            elif request['action'] == 'unblock':
                blocks.clear()
            else:
                raise AssertionError('Unexpected mutation')
            return r.fulfill(json={'status': 'success'})
        if 'unpkg.com/tippy' in nonlocal_url:
            return r.fulfill(body='window.tippy = () => ({destroy(){}});', content_type='application/javascript')
        if 'TaiwanCalendar' in nonlocal_url:
            return r.fulfill(json=[])
        return r.fulfill(body='', content_type='text/plain')
    page.route('**/*', route)
    page.goto(BASE)
    page.wait_for_selector('.time-slot-cell', state='attached')
    assert page.locator('#block-submit').is_enabled()
    assert page.locator('.time-slot-cell.available').count() == 40
    page.locator('#block-start').fill('2026-10-06')
    page.locator('#block-year-end').click()
    assert page.locator('#block-end').input_value() == '2026-12-31'
    page.locator('#block-end').fill('2026-10-05')
    page.locator('#block-reason').fill('專案 <img src=x onerror=alert(1)>')
    page.locator('#block-admin-key').fill('test-key')
    page.locator('#block-submit').click()
    page.wait_for_selector('#alert-modal.modal-visible')
    assert not requests
    page.locator('#alert-ok').click()
    page.locator('#block-end').fill('2026-12-31')
    page.locator('#block-admin-key').fill('test-key')
    page.locator('#block-submit').click()
    page.wait_for_function("document.getElementById('alert-title').textContent === '操作成功'")
    assert page.locator('#block-admin-key').input_value() == ''
    assert requests[0]['action'] == 'block'
    assert page.locator('#block-list img').count() == 0
    page.locator('#alert-ok').click()
    page.locator('#date-picker').fill('2026-10-06')
    page.locator('#date-picker').dispatch_event('change')
    page.wait_for_selector('.room-blocked', state='attached')
    assert page.locator('.room-blocked').count() == 20
    assert page.locator('.time-slot-cell.available').count() == 20
    page.locator('.room-blocked').first.click()
    assert 'modal-hidden' in page.locator('#booking-modal').get_attribute('class')
    assert page.locator('.calendar-block-badge').count() == 26
    page.locator('#date-picker').fill('2026-12-31')
    page.locator('#date-picker').dispatch_event('change')
    page.wait_for_function("document.getElementById('schedule-date-display').textContent === '2026-12-31'")
    assert page.locator('.room-blocked').count() == 20
    page.locator('#block-admin-key').fill('test-key')
    page.locator('#block-list button').click()
    page.locator('#confirm-ok').click()
    page.wait_for_function("document.getElementById('alert-title').textContent === '操作成功'")
    page.locator('#alert-ok').click()
    assert page.locator('.room-blocked').count() == 0
    assert page.locator('.time-slot-cell.available').count() == 40
    assert [r['action'] for r in requests] == ['block', 'unblock']
    legacy = True
    page.reload()
    page.wait_for_selector('.time-slot-cell', state='attached')
    assert page.locator('#block-submit').is_disabled()
    assert '尚未支援包場' in page.locator('#block-service-status').text_content()
    assert not errors, errors
    browser.close()
    print('PASS: range creation, year-end shortcut, date validation, blocked room, cross-month/end-date, safe text, removal, legacy-backend detection; no live writes')
