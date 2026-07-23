        // 系統時鐘更新邏輯
        function updateClock() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('system-clock').textContent = timeString;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // --- 設定區 ---
        const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx19UdR3V26vH3kSp7OUPaTnWmEw0bRA2jhzXZ7bY-Fi5khPakQqN8qncOIpGeDry2tBA/exec';
        // 讀取改走 Google Sheets 發布端點，避開 Apps Script doGet 冷啟動/配額造成的載入不穩。
        // 請將下列網址改為試算表「發布到網路」後的 CSV 或 GViz(tqx=out:csv/json) 端點；可放多個作為備援。
        const SHEET_READ_ENDPOINTS = [
            // 'https://docs.google.com/spreadsheets/d/e/你的發布ID/pub?gid=0&single=true&output=csv',
            // 'https://docs.google.com/spreadsheets/d/你的試算表ID/gviz/tq?tqx=out:csv&sheet=預約紀錄'
        ];
        const READ_TIMEOUT_MS = 8000;
        const HOLIDAY_API_URL = 'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/{year}.json';
        
        // 房間設定 (使用 OKC 配色：深海軍藍 / 雷霆藍)
        const rooms = [
            { id: 1, name: '討論室', colorClass: 'bg-[#002D62]', textClass: 'text-[#002D62]' }, 
            { id: 2, name: '多功能室', colorClass: 'bg-[#007AC1]', textClass: 'text-[#007AC1]' }, 
        ];

        // --- 狀態變數 ---
        let currentDailyBookings = []; 
        let currentMonthBookings = []; 
        let calendarDate = new Date(); 
        let holidays = {};
        let tippyInstances = [];

        // --- DOM 元素 ---
        const els = {
            datePicker: document.getElementById('date-picker'),
            btnToday: document.getElementById('btn-today'),
            scheduleContainer: document.getElementById('schedule-container'),
            scheduleDateDisplay: document.getElementById('schedule-date-display'),
            loader: document.getElementById('loader'),
            modals: {
                booking: document.getElementById('booking-modal'),
                edit: document.getElementById('edit-modal'),
                alert: document.getElementById('alert-modal')
            },
            calendar: {
                grid: document.getElementById('calendar-grid'),
                monthYear: document.getElementById('calendar-month-year'),
                prevBtn: document.getElementById('prev-month-btn'),
                nextBtn: document.getElementById('next-month-btn')
            }
        };

        // --- 輔助函數 ---
        const loaderCtrl = {
            show: () => els.loader.classList.remove('opacity-0', 'pointer-events-none'),
            hide: () => els.loader.classList.add('opacity-0', 'pointer-events-none')
        };

        const generateTimeSlots = (interval = 30) => {
            const slots = [];
            for (let hour = 8; hour < 18; hour++) {
                for (let minute = 0; minute < 60; minute += interval) {
                    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
                }
            }
            slots.push('18:00'); 
            return slots;
        };
        const timeSlots = generateTimeSlots();

        const timeToMinutes = (time) => {
            if (typeof time !== 'string' || !time.includes(':')) return 0;
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const formatDate = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const svgIcons = {
            info: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            warning: `<svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
            success: `<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
        };

        const openModal = (modalEl) => {
            modalEl.classList.remove('modal-hidden', 'pointer-events-none');
            modalEl.classList.add('modal-visible');
        };

        const closeModal = (modalEl) => {
            modalEl.classList.remove('modal-visible');
            modalEl.classList.add('modal-hidden', 'pointer-events-none');
        };

        const customAlert = (message, type = 'info', title = '系統訊息') => {
            return new Promise(resolve => {
                const titleEl = document.getElementById('alert-title');
                const messageEl = document.getElementById('alert-message');
                const btnsEl = document.getElementById('alert-buttons');
                const iconEl = document.getElementById('alert-icon-container');

                titleEl.textContent = title;
                messageEl.innerHTML = message;
                iconEl.innerHTML = svgIcons[type] || svgIcons.info;
                
                iconEl.className = `mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full ${type === 'success' ? 'bg-green-100' : type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`;

                btnsEl.innerHTML = `<button id="alert-ok" class="px-8 py-2.5 btn-primary rounded-lg font-bold w-full">確定</button>`;
                openModal(els.modals.alert);
                
                document.getElementById('alert-ok').onclick = () => {
                    closeModal(els.modals.alert);
                    setTimeout(resolve, 300); 
                };
            });
        };

        const customConfirm = (message, title = '確認操作') => {
            return new Promise(resolve => {
                const titleEl = document.getElementById('alert-title');
                const messageEl = document.getElementById('alert-message');
                const btnsEl = document.getElementById('alert-buttons');
                const iconEl = document.getElementById('alert-icon-container');

                titleEl.textContent = title;
                messageEl.innerHTML = message; 
                iconEl.innerHTML = svgIcons.warning;
                iconEl.className = 'mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-amber-100';

                btnsEl.innerHTML = `
                    <button id="confirm-cancel" class="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">取消</button>
                    <button id="confirm-ok" class="flex-1 px-4 py-2.5 btn-danger rounded-lg font-bold">確定執行</button>
                `;
                openModal(els.modals.alert);
                
                document.getElementById('confirm-ok').onclick = () => {
                    closeModal(els.modals.alert);
                    setTimeout(() => resolve(true), 300);
                };
                document.getElementById('confirm-cancel').onclick = () => {
                    closeModal(els.modals.alert);
                    setTimeout(() => resolve(false), 300);
                };
            });
        };

        const renderSchedule = (bookings) => {
            currentDailyBookings = Array.isArray(bookings) ? bookings : [];
            els.scheduleContainer.innerHTML = ''; 

            const totalSlots = timeSlots.length - 1; 

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = `120px repeat(${totalSlots}, minmax(40px, 1fr))`;
            grid.style.gridTemplateRows = `auto repeat(${rooms.length}, 80px)`;
            grid.className = "w-full border-l border-t border-slate-200 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm";

            const headerCorner = document.createElement('div');
            headerCorner.className = "sticky left-0 top-0 bg-slate-50/90 backdrop-blur-sm z-20 p-3 border-b border-r border-slate-200 font-bold text-slate-600 flex items-center justify-center shadow-[1px_0_0_0_#e2e8f0]";
            headerCorner.style.gridRow = '1';
            headerCorner.style.gridColumn = '1';
            headerCorner.textContent = '場地 \\ 時間';
            grid.appendChild(headerCorner);

            timeSlots.slice(0, -1).forEach((slot, index) => {
                const isHour = slot.endsWith(':00');
                const headerSlot = document.createElement('div');
                headerSlot.className = `p-2 border-b border-r border-slate-200 text-center text-sm flex items-center justify-center ${isHour ? 'font-bold text-slate-700 bg-slate-50/50' : 'text-slate-400'}`;
                headerSlot.style.gridRow = '1';
                headerSlot.style.gridColumn = `${index + 2}`;
                headerSlot.textContent = slot;
                grid.appendChild(headerSlot);
            });

            rooms.forEach((room, roomIndex) => {
                const roomLabel = document.createElement('div');
                roomLabel.className = `sticky left-0 p-3 border-b border-r border-slate-200 flex flex-col items-center justify-center font-bold bg-white/95 backdrop-blur-sm z-10 shadow-[1px_0_0_0_#e2e8f0] ${room.textClass}`;
                roomLabel.style.gridRow = `${roomIndex + 2}`;
                roomLabel.style.gridColumn = '1';
                roomLabel.innerHTML = `
                    <span class="w-2 h-2 rounded-full ${room.colorClass} mb-1"></span>
                    <span>${room.name}</span>
                `;
                grid.appendChild(roomLabel);

                timeSlots.slice(0, -1).forEach((slot, slotIndex) => {
                    const isHour = slot.endsWith(':00');
                    const cell = document.createElement('div');
                    cell.className = `time-slot-cell border-b border-r border-slate-100 available cursor-pointer ${isHour ? 'border-l-slate-200' : ''}`;
                    cell.dataset.roomName = room.name;
                    cell.dataset.timeSlot = slot;
                    cell.style.gridRow = `${roomIndex + 2}`;
                    cell.style.gridColumn = `${slotIndex + 2}`;
                    cell.title = `點擊預約 ${room.name} ${slot}`;
                    grid.appendChild(cell);
                });
            });

            els.scheduleContainer.appendChild(grid);
            
            if (currentDailyBookings.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none z-30 pt-10';
                emptyState.innerHTML = `
                    <svg class="w-12 h-12 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <p class="text-lg font-bold text-slate-500 tracking-wide">本日尚無預約</p>
                    <p class="text-sm mt-1">點擊上方空白格即可開始預約</p>
                `;
                els.scheduleContainer.appendChild(emptyState);
            }

            const gridStartMinutes = timeToMinutes('08:00');
            const gridEndMinutes = timeToMinutes('18:00');

            currentDailyBookings.forEach(booking => {
                const { '場地名稱': roomName, '開始時間': startTime, '結束時間': endTime, '預約ID': bookingId, '借用者': booker, '預訂用途': purpose } = booking;
                
                if (!startTime || !endTime || startTime === 'N/A' || endTime === 'N/A') return; 
                
                const roomIndex = rooms.findIndex(r => r.name === roomName);
                if (roomIndex === -1) return;

                const startMinutes = timeToMinutes(startTime);
                const endMinutes = timeToMinutes(endTime);
                
                if (startMinutes < gridStartMinutes || endMinutes > gridEndMinutes || startMinutes >= endMinutes) return;

                const offsetMinutes = startMinutes - gridStartMinutes;
                const durationMinutes = endMinutes - startMinutes;
                
                const startSlotIndex = Math.floor(offsetMinutes / 30);
                const durationSlots = Math.ceil(durationMinutes / 30);
                
                if (durationSlots <= 0) return;

                const roomConfig = rooms[roomIndex];
                const bookingEl = document.createElement('div');
                bookingEl.className = `${roomConfig.colorClass} booked-slot rounded-md cursor-pointer border border-white/20`;
                
                bookingEl.style.gridRow = `${roomIndex + 2}`;
                bookingEl.style.gridColumn = `${startSlotIndex + 2} / span ${durationSlots}`;
                
                bookingEl.style.zIndex = '20';
                bookingEl.style.margin = '4px 2px';
                bookingEl.style.height = 'calc(100% - 8px)';
                bookingEl.dataset.bookingId = bookingId;
                
                bookingEl.innerHTML = `
                    <div class="booked-slot-inner w-full h-full flex flex-col justify-center items-center px-1">
                        <span class="font-bold truncate w-full text-center tracking-wide">${booker}</span>
                        ${durationSlots > 1 ? `<span class="text-xs opacity-90 truncate w-full text-center font-light">${purpose}</span>` : ''}
                    </div>
                `;
                
                tippy(bookingEl, {
                    content: `
                        <div class="text-left">
                            <div class="font-bold border-b border-slate-200 pb-1 mb-1 text-[#007AC1]">${roomName}</div>
                            <div class="text-sm font-medium">時間：${startTime} - ${endTime}</div>
                            <div class="text-sm font-medium">借用人：${booker}</div>
                            <div class="text-sm mt-1 pt-1 border-t border-slate-100 text-slate-500">用途：${purpose}</div>
                            <div class="text-xs text-slate-400 mt-2 text-center">(點擊可編輯或取消)</div>
                        </div>
                    `,
                    allowHTML: true,
                    theme: 'chimei',
                    placement: 'top',
                    animation: 'shift-away'
                });

                grid.appendChild(bookingEl);
            });
        };

        const renderScheduleFromMonthData = (dateString) => {
            const dailyData = currentMonthBookings.filter(b => b['預約日期'] === dateString);
            els.scheduleDateDisplay.textContent = dateString; // 更新標題上的日期顯示
            renderSchedule(dailyData);
        }

        const renderCalendar = (date, monthBookings) => {
            tippyInstances.forEach(instance => instance.destroy());
            tippyInstances = [];
            
            currentMonthBookings = Array.isArray(monthBookings) ? monthBookings : [];
            els.calendar.grid.innerHTML = '';
            els.calendar.monthYear.textContent = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
            
            const todayStr = formatDate(new Date());
            const selectedDateStr = els.datePicker.value;

            const year = date.getFullYear();
            const month = date.getMonth();

            const firstDayOfMonth = new Date(year, month, 1);
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startDayOfWeek = firstDayOfMonth.getDay();

            for (let i = 0; i < startDayOfWeek; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = "calendar-day other-month";
                els.calendar.grid.appendChild(emptyCell);
            }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayCell = document.createElement('div');
                dayCell.className = "calendar-day";
                
                const thisDate = new Date(year, month, day);
                const thisDateStr = formatDate(thisDate);
                const dayOfWeek = thisDate.getDay();
                
                dayCell.dataset.date = thisDateStr;

                const topRow = document.createElement('div');
                topRow.className = "flex justify-between items-start mb-1";
                
                const dayNumber = document.createElement('span');
                dayNumber.className = 'day-number font-bold';
                dayNumber.textContent = day;
                topRow.appendChild(dayNumber);
                dayCell.appendChild(topRow);

                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const holidayKey = thisDateStr.replace(/-/g, '');
                const holidayInfo = holidays[holidayKey];

                if (thisDateStr === todayStr) dayCell.classList.add('is-today');
                if (thisDateStr === selectedDateStr) dayCell.classList.add('is-selected');
                if (isWeekend || holidayInfo) dayCell.classList.add('is-weekend');

                const bookingsForDay = currentMonthBookings
                    .filter(b => b['預約日期'] === thisDateStr)
                    .sort((a,b) => timeToMinutes(a['開始時間']) - timeToMinutes(b['開始時間']));
                
                const detailsContainer = document.createElement('div');
                detailsContainer.className = 'flex-grow overflow-hidden flex flex-col gap-1';
                dayCell.appendChild(detailsContainer);

                if (bookingsForDay.length > 0) {
                    bookingsForDay.slice(0, 2).forEach(booking => {
                        const roomConfig = rooms.find(r => r.name === booking['場地名稱']);
                        if (roomConfig) {
                            const item = document.createElement('div');
                            item.className = 'calendar-booking-item';
                            item.innerHTML = `
                                <div class="booking-dot ${roomConfig.colorClass} mr-1 flex-shrink-0 shadow-sm"></div>
                                <span class="truncate font-medium" title="${booking['場地名稱']} ${booking['開始時間']}">${booking['開始時間']} ${booking['借用者']}</span>
                            `;
                            detailsContainer.appendChild(item);
                        }
                    });

                    if (bookingsForDay.length > 2) {
                        const more = document.createElement('div');
                        more.className = 'text-[10px] text-slate-400 font-bold pl-3 mt-1';
                        more.textContent = `+${bookingsForDay.length - 2} 筆`;
                        detailsContainer.appendChild(more);
                    }
                    
                    const indicator = document.createElement('div');
                    indicator.className = 'w-2 h-2 rounded-full bg-[#EF3B24] absolute top-2 right-2 shadow-sm';
                    topRow.appendChild(indicator);
                }
                
                if (holidayInfo) {
                    const holidayEl = document.createElement('div');
                    holidayEl.className = 'holiday-name truncate';
                    holidayEl.textContent = holidayInfo.name;
                    holidayEl.title = holidayInfo.name;
                    detailsContainer.appendChild(holidayEl);
                }

                if (bookingsForDay.length > 0) {
                    const tooltipContent = bookingsForDay.map(b => `
                        <div class="mb-2 last:mb-0">
                            <span class="inline-block w-2 h-2 rounded-full ${rooms.find(r=>r.name===b['場地名稱'])?.colorClass||'bg-gray-500'} mr-1"></span>
                            <strong class="text-blue-800">${b['開始時間']}-${b['結束時間']}</strong> 
                            <span class="text-slate-600 font-bold">${b['場地名稱']}</span><br>
                            <span class="text-sm text-slate-500 pl-3">借用: ${b['借用者']}</span>
                        </div>
                    `).join('<div class="h-px bg-slate-100 my-1"></div>');
                    
                    const instance = tippy(dayCell, {
                        content: `<div class="p-1">${tooltipContent}</div>`,
                        allowHTML: true,
                        theme: 'chimei',
                        placement: 'auto',
                        delay: [300, 0] 
                    });
                    tippyInstances.push(instance);
                }

                els.calendar.grid.appendChild(dayCell);
            }
        };

        function fetchWithTimeout(url, options = {}) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
            return fetch(url, { ...options, signal: controller.signal })
                .finally(() => clearTimeout(timeoutId));
        }

        function parseCsv(text) {
            const rows = [];
            let row = [];
            let cell = '';
            let inQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        cell += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    row.push(cell);
                    cell = '';
                } else if ((char === '\n' || char === '\r') && !inQuotes) {
                    if (char === '\r' && nextChar === '\n') i++;
                    row.push(cell);
                    if (row.some(value => value.trim() !== '')) rows.push(row);
                    row = [];
                    cell = '';
                } else {
                    cell += char;
                }
            }

            row.push(cell);
            if (row.some(value => value.trim() !== '')) rows.push(row);
            return rows;
        }

        function normalizeBookingRows(rows) {
            if (!rows.length) return [];
            const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').trim());
            return rows.slice(1).map(row => {
                const booking = {};
                headers.forEach((header, index) => {
                    booking[header] = (row[index] || '').trim();
                });
                return booking;
            }).filter(booking => booking['預約日期'] && booking['場地名稱']);
        }

        function parseGvizJson(text) {
            const jsonText = text.trim().replace(/^\/\*O_o\*\//, '').replace(/^google\.visualization\.Query\.setResponse\(/, '').replace(/\);?$/, '');
            const table = JSON.parse(jsonText).table;
            const headers = table.cols.map(col => col.label || col.id);
            return table.rows.map(row => {
                const booking = {};
                headers.forEach((header, index) => {
                    const cell = row.c[index];
                    booking[header] = cell ? String(cell.f ?? cell.v ?? '').trim() : '';
                });
                return booking;
            }).filter(booking => booking['預約日期'] && booking['場地名稱']);
        }

        function parseSheetResponse(text, endpoint) {
            const trimmed = text.trim();
            if (trimmed.startsWith('google.visualization.Query.setResponse') || trimmed.startsWith('/*O_o*/')) {
                return parseGvizJson(trimmed);
            }
            return normalizeBookingRows(parseCsv(text));
        }

        async function fetchBookingsFromPublishedSheet(monthString) {
            if (SHEET_READ_ENDPOINTS.length === 0) {
                console.warn('尚未設定 Google Sheets 發布 CSV/GViz 讀取端點，暫時回退使用 Apps Script doGet。');
                const response = await fetchWithTimeout(`${WEB_APP_URL}?month=${monthString}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                return result.data;
            }

            const errors = [];
            for (const endpoint of SHEET_READ_ENDPOINTS) {
                try {
                    const separator = endpoint.includes('?') ? '&' : '?';
                    const cacheBustedUrl = `${endpoint}${separator}_=${Date.now()}`;
                    const response = await fetchWithTimeout(cacheBustedUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return parseSheetResponse(await response.text(), endpoint)
                        .filter(booking => booking['預約日期']?.startsWith(monthString));
                } catch (error) {
                    errors.push(`${endpoint}: ${error.message}`);
                    console.warn('Published sheet read failed:', endpoint, error);
                }
            }

            throw new Error(`Google Sheets 發布端點讀取失敗：${errors.join('；')}`);
        }

        async function fetchHolidays(year) {
            if (holidays[year]) return; 
            try {
                const response = await fetch(HOLIDAY_API_URL.replace('{year}', year));
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                const holidayMap = {};
                data.forEach(item => {
                    if (item.isHoliday) {
                        holidayMap[item.date] = { name: item.name };
                    }
                });
                holidays = { ...holidays, ...holidayMap };
                holidays[year] = true; 
            } catch (error) {
                console.warn(`無法載入 ${year} 年的假日資訊:`, error);
            }
        }

        async function updateViewData() {
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth() + 1;
            const monthString = `${year}-${String(month).padStart(2, '0')}`;
            
            loaderCtrl.show();
            try {
                await Promise.all([
                    fetchHolidays(year),
                    fetchBookingsFromPublishedSheet(monthString)
                        .then(bookings => {
                            currentMonthBookings = bookings;
                        })
                ]);
            } catch (error) {
                console.error("Data fetch error:", error);
                await customAlert(`資料讀取失敗，請檢查網路連線或稍後再試。<br><small class="text-slate-400 mt-2 block">${error.message}</small>`, 'warning', '讀取錯誤');
                currentMonthBookings = []; 
            } finally {
                renderCalendar(calendarDate, currentMonthBookings);
                renderScheduleFromMonthData(els.datePicker.value);
                loaderCtrl.hide();
            }
        }

        function hideAllModals() {
            closeModal(els.modals.booking);
            closeModal(els.modals.edit);
            ['booker-name', 'booker-contact', 'booking-purpose', 'edit-booker-name', 'edit-booker-contact', 'edit-booking-purpose'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = '';
            });
        }

        function populateEndTimeSelect(selectElement, startIndex, existingBookings, currentEndTime = null) {
            selectElement.innerHTML = '';
            
            for (let i = startIndex + 1; i < timeSlots.length; i++) {
                const slotTime = timeSlots[i];
                const option = document.createElement('option');
                option.value = slotTime;
                option.textContent = slotTime;
                
                if (currentEndTime && slotTime === currentEndTime) option.selected = true;
                selectElement.appendChild(option);
                
                const nextBooking = existingBookings
                    .filter(b => timeToMinutes(b['開始時間']) > timeToMinutes(timeSlots[startIndex]))
                    .sort((a,b) => timeToMinutes(a['開始時間']) - timeToMinutes(b['開始時間']))[0];
                
                if (nextBooking && timeToMinutes(slotTime) >= timeToMinutes(nextBooking['開始時間'])) {
                    if(timeToMinutes(slotTime) > timeToMinutes(nextBooking['開始時間'])){
                        selectElement.removeChild(option);
                    }
                    break; 
                }
            } 
            
            if (selectElement.options.length === 0 && startIndex < timeSlots.length - 1) {
                 const option = document.createElement('option');
                 option.value = timeSlots[startIndex+1];
                 option.textContent = timeSlots[startIndex+1];
                 selectElement.appendChild(option);
            }
            
            if(!currentEndTime && selectElement.options.length > 0) selectElement.selectedIndex = 0;
        }

        function showBookingModal(roomName, startTime) {
            document.getElementById('modal-room-name').textContent = roomName;
            document.getElementById('modal-date').textContent = els.datePicker.value;
            document.getElementById('modal-start-time').textContent = startTime;
            
            const endTimeSelect = document.getElementById('end-time-select');
            const roomBookingsToday = currentDailyBookings.filter(b => b['場地名稱'] === roomName);
            const startIndex = timeSlots.indexOf(startTime);
            
            populateEndTimeSelect(endTimeSelect, startIndex, roomBookingsToday);
            
            openModal(els.modals.booking);
            setTimeout(() => document.getElementById('booker-name').focus(), 300);
        }

        function showEditModal(booking) {
            els.modals.edit.dataset.bookingId = booking['預約ID'];
            document.getElementById('edit-modal-room-name').textContent = booking['場地名稱'];
            document.getElementById('edit-modal-date').textContent = booking['預約日期'];
            document.getElementById('edit-modal-start-time').textContent = booking['開始時間'];
            
            document.getElementById('edit-booker-name').value = booking['借用者'];
            document.getElementById('edit-booker-contact').value = booking['聯絡方式'];
            document.getElementById('edit-booking-purpose').value = booking['預訂用途'];
            
            const endTimeSelect = document.getElementById('edit-end-time-select');
            const roomBookingsToday = currentDailyBookings.filter(b => b['場地名稱'] === booking['場地名稱'] && b['預約ID'] !== booking['預約ID']);
            const startIndex = timeSlots.indexOf(booking['開始時間']);
            
            populateEndTimeSelect(endTimeSelect, startIndex, roomBookingsToday, booking['結束時間']);
            
            openModal(els.modals.edit);
        }

        async function handleApiCall(action, payload, successMessage) {
            loaderCtrl.show();
            try {
                const response = await fetch(WEB_APP_URL, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action, payload })
                });
                
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message || '伺服器回傳錯誤');
                
                hideAllModals();
                await updateViewData();
                await customAlert(successMessage, 'success', '操作成功');
            } catch (error) {
                console.error(`${action} API Error:`, error);
                await customAlert(`操作失敗，請稍後再試。<br><small class="text-slate-400 mt-2 block">${error.message}</small>`, 'warning', '錯誤');
            } finally {
                loaderCtrl.hide();
            }
        }

        document.getElementById('confirm-booking-btn').addEventListener('click', () => {
            const name = document.getElementById('booker-name').value.trim();
            const contact = document.getElementById('booker-contact').value.trim();
            const purpose = document.getElementById('booking-purpose').value.trim();
            
            if (!name || !contact || !purpose) { 
                customAlert('請填寫所有標記 <span class="text-red-500 font-bold">*</span> 的必填欄位。', 'warning', '資料不完整'); 
                return; 
            }
            
            const payload = { 
                date: els.datePicker.value, 
                roomName: document.getElementById('modal-room-name').textContent, 
                startTime: document.getElementById('modal-start-time').textContent, 
                endTime: document.getElementById('end-time-select').value, 
                bookerName: name, 
                contact: contact, 
                purpose: purpose 
            };
            handleApiCall('book', payload, '已成功新增您的預約！');
        });

        document.getElementById('confirm-edit-btn').addEventListener('click', () => {
            const name = document.getElementById('edit-booker-name').value.trim();
            const contact = document.getElementById('edit-booker-contact').value.trim();
            const purpose = document.getElementById('edit-booking-purpose').value.trim();
            
            if (!name || !contact || !purpose) { 
                customAlert('所有欄位皆不可空白。', 'warning', '資料不完整'); 
                return; 
            }
            
            const payload = { 
                bookingId: els.modals.edit.dataset.bookingId, 
                endTime: document.getElementById('edit-end-time-select').value, 
                bookerName: name, 
                contact: contact, 
                purpose: purpose 
            };
            handleApiCall('edit', payload, '預約資訊已成功更新。');
        });

        document.getElementById('trigger-cancel-btn').addEventListener('click', async () => {
            const bookingId = els.modals.edit.dataset.bookingId;
            const booking = currentDailyBookings.find(b => b['預約ID'] === bookingId);
            if(!booking) return;
            
            const confirmed = await customConfirm(
                `確定要取消 <span class="font-bold text-[#002D62]">${booking['借用者']}</span> 於 <span class="font-bold text-[#EF3B24]">${booking['開始時間']}-${booking['結束時間']}</span> 的預約嗎？<br><span class="text-sm text-slate-500 mt-2 block">此操作無法復原。</span>`
            );
            
            if (confirmed) handleApiCall('cancel', { bookingId: bookingId }, '該筆預約已取消。');
        });

        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', hideAllModals));
        
        els.scheduleContainer.addEventListener('click', (e) => {
            const availableCell = e.target.closest('.time-slot-cell.available');
            const bookedSlot = e.target.closest('.booked-slot');
            
            if (availableCell) {
                const { roomName, timeSlot } = availableCell.dataset;
                showBookingModal(roomName, timeSlot);
            } else if (bookedSlot) {
                const bookingId = bookedSlot.dataset.bookingId;
                const booking = currentDailyBookings.find(b => b['預約ID'] === bookingId);
                if (booking) showEditModal(booking);
            }
        });

        els.calendar.grid.addEventListener('click', (e) => {
            const dayCell = e.target.closest('.calendar-day');
            if (dayCell && dayCell.dataset.date && !dayCell.classList.contains('other-month')) {
                els.datePicker.value = dayCell.dataset.date;
                els.datePicker.dispatchEvent(new Event('change')); 
            }
        });

        els.calendar.prevBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            updateViewData();
        });

        els.calendar.nextBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            updateViewData();
        });

        els.btnToday.addEventListener('click', () => {
            const todayStr = formatDate(new Date());
            if (els.datePicker.value !== todayStr) {
                els.datePicker.value = todayStr;
                els.datePicker.dispatchEvent(new Event('change'));
            }
        });

        els.datePicker.addEventListener('change', async () => {
            const newDateStr = els.datePicker.value;
            if(!newDateStr) return; 

            const [year, month, day] = newDateStr.split('-').map(Number);
            const currentCalYear = calendarDate.getFullYear();
            const currentCalMonth = calendarDate.getMonth() + 1;

            if (year !== currentCalYear || month !== currentCalMonth) {
                calendarDate = new Date(year, month - 1, 1);
                await updateViewData(); 
            } else {
                renderCalendar(calendarDate, currentMonthBookings);
                renderScheduleFromMonthData(newDateStr);
            }
        });

        window.addEventListener('load', async () => {
            const today = new Date();
            els.datePicker.value = formatDate(today);
            calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
            
            await updateViewData();
        });

