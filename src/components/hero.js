// 歡迎橫幅與日期控制列
export default `
<!-- 歡迎橫幅：大洋流海報風 -->
<header class="poster-hero mt-[82px] sm:mt-16">
    <div class="marquee" aria-hidden="true">
        <div class="marquee-track">
            <span>CHIMEI TEACHING DEPT.</span><span>→</span><span>討論室預約</span><span>→</span><span>DISCUSSION ROOM BOOKING</span><span>→</span><span>即時查看・線上預約</span><span>→</span>
            <span>CHIMEI TEACHING DEPT.</span><span>→</span><span>討論室預約</span><span>→</span><span>DISCUSSION ROOM BOOKING</span><span>→</span><span>即時查看・線上預約</span><span>→</span>
        </div>
    </div>

    <div class="max-w-[85rem] mx-auto px-4 md:px-8 pt-8 sm:pt-10 pb-24 sm:pb-28 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        <div class="text-center md:text-left">
            <p class="hero-kicker">FUTURE ROOM → BOOK NOW</p>
            <h2 class="hero-title"><span class="hero-title-text">今天有空嗎？</span></h2>
            <p class="hero-sub">找個空間，讓好點子有地方發生</p>
        </div>

        <!-- 控制列 -->
        <div class="hero-controls">
            <label for="date-picker" class="font-black whitespace-nowrap">📅 快速跳轉</label>
            <input type="date" id="date-picker" class="hero-date">
            <button id="btn-today" class="btn-primary hero-today">⚓ 回到今日</button>
        </div>
    </div>

    <!-- 海浪裝飾 -->
    <svg class="hero-waves" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40 Q60 10 120 40 T240 40 T360 40 T480 40 T600 40 T720 40 T840 40 T960 40 T1080 40 T1200 40 T1320 40 T1440 40" />
        <path d="M0 70 Q60 40 120 70 T240 70 T360 70 T480 70 T600 70 T720 70 T840 70 T960 70 T1080 70 T1200 70 T1320 70 T1440 70" />
        <path class="hero-waves-fill" d="M0 100 Q60 70 120 100 T240 100 T360 100 T480 100 T600 100 T720 100 T840 100 T960 100 T1080 100 T1200 100 T1320 100 T1440 100 V120 H0 Z" />
    </svg>
</header>
`;
