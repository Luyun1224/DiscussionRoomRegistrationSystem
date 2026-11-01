// 當日預約時間表與月曆
export default `
<!-- 主要內容區 (使用負 Margin 向上重疊，營造層次感) -->
<div class="max-w-[85rem] mx-auto px-4 md:px-8 pb-12 space-y-8 md:space-y-10 relative z-10 -mt-6">
    
    <!-- 日時間表區塊 (Premium Card) -->
    <div class="premium-card overflow-hidden">
        <div class="card-header p-5 flex items-center justify-between">
            <h2 class="section-title">
                <span class="section-icon" aria-hidden="true">⚓</span>
                當日預約狀況 <span id="schedule-date-display" class="date-chip ml-3"></span>
            </h2>
            <div class="hidden sm:flex gap-4 text-sm font-bold text-[#111]">
                <div class="flex items-center"><span class="legend-dot room-ink mr-2"></span>討論室</div>
                <div class="flex items-center"><span class="legend-dot room-orange mr-2"></span>多功能室</div>
            </div>
        </div>
        <div class="overflow-x-auto custom-scrollbar">
            <div id="schedule-container" class="min-w-[1000px] p-6 relative">
                <!-- 時間表將由 JS 動態生成 -->
            </div>
        </div>
    </div>

    <!-- 月曆區塊 (Premium Card) -->
    <div id="calendar-wrapper" class="premium-card p-6">
        <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 class="section-title">
                <span class="section-icon" aria-hidden="true">🗓️</span>
                月曆總覽
            </h2>
            <div class="month-switcher flex items-center gap-2 p-1">
                <button id="prev-month-btn" class="month-btn p-2" title="上個月">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h2 id="calendar-month-year" class="text-lg font-black text-[#111] min-w-[130px] text-center tracking-wide"></h2>
                <button id="next-month-btn" class="month-btn p-2" title="下個月">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
        
        <div class="weekday-row grid grid-cols-7 text-center font-black mb-3 text-sm">
            <div class="text-[#E8590C]">週日</div><div>週一</div><div>週二</div><div>週三</div><div>週四</div><div>週五</div><div class="text-[#E8590C]">週六</div>
        </div>
        <div id="calendar-grid" class="calendar-grid">
            <!-- 日曆網格將由 JS 動態生成 -->
        </div>
    </div>
</div>
`;
