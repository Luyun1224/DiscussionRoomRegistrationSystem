// 把各區塊的 HTML 依序組裝到 <body>，必須在 app.js 之前執行
import layout from './components/layout.js';
import navbar from './components/navbar.js';
import hero from './components/hero.js';
import mainContent from './components/main-content.js';
import longBookingModal from './components/long-booking-modal.js';
import bookingModals from './components/booking-modals.js';

document.getElementById('app').outerHTML =
    [layout, navbar, hero, mainContent, longBookingModal, bookingModals].join('\n');
