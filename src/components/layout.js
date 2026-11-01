// 背景裝飾、載入遮罩、提示訊息區
export default `
<!-- 動態背景裝飾 -->
<div class="bg-shapes">
    <div class="bg-shape-1"></div>
    <div class="bg-shape-2"></div>
</div>

<!-- 全域載入遮罩 -->
<div id="loader" class="fixed inset-0 z-[100] bg-slate-900 bg-opacity-40 flex flex-col justify-center items-center pointer-events-none opacity-0 transition-opacity duration-300 backdrop-blur-sm">
    <div class="loader-card">
        <div class="loader-spinner"></div>
        <p class="font-black text-lg tracking-wide">處理中，請稍候…</p>
    </div>
</div>

<!-- 背景操作提示 -->
<div id="toast-region" class="toast-region" aria-live="polite"></div>
`;
