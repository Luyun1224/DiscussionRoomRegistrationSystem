// 長時間借用視窗
export default `
<div id="long-booking-modal" role="dialog" aria-modal="true" aria-labelledby="block-heading" class="long-booking-modal modal-backdrop modal-hidden pointer-events-none">
    <section class="modal-content long-booking-content premium-card p-6">
        <button id="close-long-booking" type="button" class="long-booking-close" aria-label="關閉長時間借用">×</button>
        <h2 id="block-heading" class="text-xl font-black mb-3">🚢 長時間借用</h2>
        <p class="text-sm text-slate-600 mb-4">借用期間每日 08:00–18:00 停止開放借用，包含起日與迄日。已有預約的區間需先處理預約。</p>
        <p id="block-service-status" role="status" class="text-sm text-[#111] mb-4">正在確認借用服務…</p>
        <form id="block-form" class="space-y-4">
            <div class="grid sm:grid-cols-3 gap-3">
                <div><label for="block-room">場地</label><select id="block-room" class="input-field"><option>討論室</option><option>多功能室</option></select></div>
                <div><label for="block-start">開始日期</label><input id="block-start" type="date" class="input-field" required></div>
                <div><label for="block-end">結束日期</label><input id="block-end" type="date" class="input-field" required></div>
            </div>
            <button id="block-year-end" type="button" class="text-sm font-bold text-[#E8590C] underline">結束日期設為開始日期當年年底</button>
            <div><label for="long-booker-name">借用者姓名 <span class="text-red-500">*</span></label><input id="long-booker-name" class="input-field" required placeholder="請輸入單位與姓名"></div>
            <div><label for="long-booker-contact">聯絡方式 <span class="text-red-500">*</span></label><input id="long-booker-contact" class="input-field" required placeholder="請輸入分機或手機號碼"></div>
            <div><label for="block-reason">借用用途</label><input id="block-reason" class="input-field" maxlength="200" required placeholder="例如：教學部專案使用"></div>
            <button id="block-submit" type="submit" class="btn-primary px-6 py-2.5 rounded-lg" disabled>確認長時間借用</button>
        </form>
        <h3 class="font-bold mt-6 mb-2">長時間借用紀錄</h3>
        <div id="block-list" class="space-y-3" aria-live="polite"></div>
    </section>
</div>
`;
