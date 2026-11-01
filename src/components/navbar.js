// 頂部導覽列
export default `
<!-- 系統頂部導覽列 Navbar -->
<nav class="system-navbar fixed top-0 w-full z-40 h-auto min-h-[4rem] py-2 sm:py-0 sm:h-16 flex items-center justify-center">
    <div class="w-full max-w-[85rem] px-3 sm:px-4 md:px-8 flex items-center justify-between h-full">
        <div class="flex items-center gap-2 sm:gap-3 md:gap-4">
            <!-- 奇美教學部 Logo -->
            <img src="public/images/logo-teaching-dept.png" alt="奇美醫院教學部" class="h-6 sm:h-8 md:h-10 object-contain drop-shadow-sm flex-shrink-0">
            
            <div class="h-5 sm:h-6 w-[3px] bg-[#111] mx-0.5 sm:mx-1 flex-shrink-0 rounded-full"></div>
            
            <!-- 系統名稱 -->
            <h1 class="text-[13px] sm:text-base md:text-lg font-black text-[#111] tracking-tight sm:tracking-wider leading-tight">
                奇美醫院教學部<br class="block sm:hidden">討論室預約系統
                <span class="online-badge">線上版</span>
            </h1>
        </div>
        
        <div class="navbar-actions">
            <button id="open-long-booking" type="button" class="btn-primary long-booking-button" aria-haspopup="dialog" aria-controls="long-booking-modal">🚢 長時間借用</button>
        <!-- 系統時間小工具 -->
        <div class="clock-chip flex-shrink-0 flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5">
            <svg class="w-3 h-3 sm:w-4 sm:h-4 text-[#E8590C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span id="system-clock" class="tracking-wider w-[50px] sm:w-[68px] text-center">00:00:00</span>
        </div>
        </div>
    </div>
</nav>
`;
