// 預約／編輯／系統訊息視窗
export default `
<!-- 模態框 (預約) -->
<div id="booking-modal" class="fixed inset-0 z-50 flex justify-center items-center p-3 sm:p-4 modal-backdrop modal-hidden pointer-events-none bg-slate-900/40">
    <div class="modal-content bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 w-full max-w-lg relative pointer-events-auto poster-modal max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button class="close-modal-btn absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <h3 class="text-2xl font-bold mb-6 text-slate-800 flex items-center border-b pb-4">
            <span class="w-2 h-6 bg-[#F26B1D] rounded-full mr-3 border-2 border-[#111]"></span>
            新增預約
        </h3>
        
        <div class="poster-info info-grid p-4 rounded-xl mb-6 text-center">
            <div class="info-cell"><p class="info-label">場地</p><p id="modal-room-name" class="info-value"></p></div>
            <div class="info-cell"><p class="info-label">日期</p><p id="modal-date" class="info-value"></p></div>
            <div class="info-cell info-time">
                <div>
                    <p class="info-label">從</p>
                    <p id="modal-start-time" class="time-pill"></p>
                </div>
                <span class="info-dash" aria-hidden="true">–</span>
                <div>
                    <p class="info-label">到</p>
                    <select id="end-time-select" class="time-pill time-select"></select>
                </div>
            </div>
        </div>
        
        <div class="space-y-5">
            <div>
                <label for="booker-name" class="block text-sm font-bold text-slate-700 mb-1">借用者姓名 <span class="text-red-500">*</span></label>
                <input type="text" id="booker-name" class="input-field" placeholder="請輸入單位與姓名 (例：教學部 王大明)">
            </div>
            <div>
                <label for="booker-contact" class="block text-sm font-bold text-slate-700 mb-1">聯絡方式 <span class="text-red-500">*</span></label>
                <input type="text" id="booker-contact" class="input-field" placeholder="請輸入分機或手機號碼">
            </div>
            <div>
                <label for="booking-purpose" class="block text-sm font-bold text-slate-700 mb-1">預定用途 <span class="text-red-500">*</span></label>
                <textarea id="booking-purpose" rows="3" class="input-field resize-none" placeholder="請簡述會議或活動內容"></textarea>
            </div>
        </div>
        
        <div class="mt-8 flex justify-end gap-3">
            <button class="close-modal-btn px-6 py-2.5 btn-secondary font-bold rounded-lg">取消</button>
            <button id="confirm-booking-btn" class="px-6 py-2.5 btn-primary rounded-lg font-bold flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                確認預約
            </button>
        </div>
    </div>
</div>

<!-- 模態框 (編輯) -->
<div id="edit-modal" class="fixed inset-0 z-50 flex justify-center items-center p-3 sm:p-4 modal-backdrop modal-hidden pointer-events-none bg-slate-900/40">
    <div class="modal-content bg-white rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 w-full max-w-lg relative pointer-events-auto poster-modal max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button class="close-modal-btn absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <h3 class="text-2xl font-bold mb-6 text-slate-800 flex items-center border-b pb-4">
            <span class="w-2 h-6 bg-[#111] rounded-full mr-3"></span>
            檢視 / 編輯預約
        </h3>
        
        <div class="poster-info info-grid p-4 rounded-xl mb-6 text-center">
            <div class="info-cell"><p class="info-label">場地</p><p id="edit-modal-room-name" class="info-value"></p></div>
            <div class="info-cell"><p class="info-label">日期</p><p id="edit-modal-date" class="info-value"></p></div>
            <div class="info-cell info-time">
                <div>
                    <p class="info-label">從</p>
                    <select id="edit-start-time-select" class="time-pill time-select" aria-label="開始時間"></select>
                </div>
                <span class="info-dash" aria-hidden="true">–</span>
                <div>
                    <p class="info-label">到</p>
                    <select id="edit-end-time-select" class="time-pill time-select"></select>
                </div>
            </div>
        </div>
        
        <div class="space-y-5">
            <div>
                <label for="edit-booker-name" class="block text-sm font-bold text-slate-700 mb-1">借用者姓名</label>
                <input type="text" id="edit-booker-name" class="input-field">
            </div>
            <div>
                <label for="edit-booker-contact" class="block text-sm font-bold text-slate-700 mb-1">聯絡方式</label>
                <input type="text" id="edit-booker-contact" class="input-field">
            </div>
            <div>
                <label for="edit-booking-purpose" class="block text-sm font-bold text-slate-700 mb-1">預定用途</label>
                <textarea id="edit-booking-purpose" rows="3" class="input-field resize-none"></textarea>
            </div>
        </div>
        
        <div class="mt-8 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
             <button id="trigger-cancel-btn" class="w-full sm:w-auto px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-lg transition-colors border border-transparent hover:border-red-200 flex items-center justify-center">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                取消此預約
             </button>
             <div class="w-full sm:w-auto flex gap-3">
                <button class="close-modal-btn flex-1 px-6 py-2.5 btn-secondary font-bold rounded-lg">關閉</button>
                <button id="confirm-edit-btn" class="flex-1 px-6 py-2.5 btn-primary rounded-lg font-bold flex items-center justify-center">
                    儲存變更
                </button>
             </div>
        </div>
    </div>
</div>

<!-- 模態框 (系統訊息/確認框) -->
<div id="alert-modal" class="fixed inset-0 z-[110] flex justify-center items-center p-4 modal-backdrop modal-hidden pointer-events-none bg-slate-900/50">
    <div class="modal-content bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm text-center relative pointer-events-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div id="alert-icon-container" class="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <!-- Icon will be injected here -->
        </div>
        <h4 id="alert-title" class="text-xl font-bold text-slate-800 mb-2">系統訊息</h4>
        <p id="alert-message" class="text-slate-600 mb-8 font-medium"></p>
        <div id="alert-buttons" class="flex justify-center gap-3">
            <!-- Buttons will be injected here -->
        </div>
    </div>
</div>
`;
