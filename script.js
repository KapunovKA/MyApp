// ============================================================
//  Часы в Menu Bar + календарь в popup
// ============================================================
function updateClock() {
    const now = new Date();

    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const barStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}  ` +
                   `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = barStr;

    const popupTime = document.getElementById('popupTime');
    const popupDate = document.getElementById('popupDate');
    if (popupTime) {
        popupTime.textContent =
            `${String(now.getHours()).padStart(2, '0')}:` +
            `${String(now.getMinutes()).padStart(2, '0')}:` +
            `${String(now.getSeconds()).padStart(2, '0')}`;
    }
    if (popupDate) {
        popupDate.textContent = now.toLocaleDateString('ru-RU', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }
}

setInterval(updateClock, 1000);
updateClock();

// ============================================================
//  КАЛЕНДАРЬ
// ============================================================
const CAL_MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const CAL_MONTHS_GENITIVE = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];
const CAL_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const CAL_WEEKDAYS_FULL = [
    'воскресенье', 'понедельник', 'вторник', 'среда',
    'четверг', 'пятница', 'суббота'
];

const CAL_SELECTED_KEY = 'calendarSelectedDate';

let calCurrentYear;
let calCurrentMonth;
let calSelectedDate = null;

function initCalendar() {
    const now = new Date();
    calCurrentYear = now.getFullYear();
    calCurrentMonth = now.getMonth();

    try {
        const saved = localStorage.getItem(CAL_SELECTED_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.year === 'number') {
                calSelectedDate = parsed;
            }
        }
    } catch (e) {}

    const container = document.getElementById('calendar');
    if (!container) return;

    container.innerHTML = `
        <div class="cal-header">
            <span class="cal-month" id="calMonthLabel"></span>
            <div class="cal-nav">
                <button class="cal-nav-btn" id="calPrevYear" title="Предыдущий год">«</button>
                <button class="cal-nav-btn" id="calPrevMonth" title="Предыдущий месяц">‹</button>
                <button class="cal-nav-btn" id="calNextMonth" title="Следующий месяц">›</button>
                <button class="cal-nav-btn" id="calNextYear" title="Следующий год">»</button>
            </div>
        </div>
        <div class="cal-weekdays">
            ${CAL_WEEKDAYS.map((d, i) =>
                `<div class="cal-weekday${i >= 5 ? ' weekend' : ''}">${d}</div>`
            ).join('')}
        </div>
        <div class="cal-days" id="calDays"></div>
        <div class="cal-info" id="calInfo"></div>
        <button class="cal-today-btn" id="calTodayBtn">↩ Сегодня</button>
    `;

    document.getElementById('calPrevMonth').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentMonth--;
        if (calCurrentMonth < 0) { calCurrentMonth = 11; calCurrentYear--; }
        renderCalendar();
    });
    document.getElementById('calNextMonth').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentMonth++;
        if (calCurrentMonth > 11) { calCurrentMonth = 0; calCurrentYear++; }
        renderCalendar();
    });
    document.getElementById('calPrevYear').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentYear--;
        renderCalendar();
    });
    document.getElementById('calNextYear').addEventListener('click', (e) => {
        e.stopPropagation();
        calCurrentYear++;
        renderCalendar();
    });

    document.getElementById('calTodayBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const now = new Date();
        calCurrentYear = now.getFullYear();
        calCurrentMonth = now.getMonth();
        calSelectedDate = {
            year: now.getFullYear(),
            month: now.getMonth(),
            day: now.getDate()
        };
        saveSelectedDate();
        renderCalendar();
    });

    document.getElementById('calDays').addEventListener('click', (e) => {
        const cell = e.target.closest('.cal-day');
        if (!cell) return;
        if (cell.classList.contains('other-month')) return;

        const day = parseInt(cell.dataset.day);
        if (isNaN(day)) return;

        calSelectedDate = {
            year: calCurrentYear,
            month: calCurrentMonth,
            day: day
        };
        saveSelectedDate();
        renderCalendar();
    });

    renderCalendar();
}

function saveSelectedDate() {
    try {
        if (calSelectedDate) {
            localStorage.setItem(CAL_SELECTED_KEY, JSON.stringify(calSelectedDate));
        } else {
            localStorage.removeItem(CAL_SELECTED_KEY);
        }
    } catch (e) {}
}

function renderCalendar() {
    const monthLabel = document.getElementById('calMonthLabel');
    const daysContainer = document.getElementById('calDays');
    if (!monthLabel || !daysContainer) return;

    monthLabel.textContent = `${CAL_MONTHS[calCurrentMonth]} ${calCurrentYear}`;

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === calCurrentYear &&
                           today.getMonth() === calCurrentMonth;

    const firstDay = new Date(calCurrentYear, calCurrentMonth, 1);
    let startWeekday = firstDay.getDay();
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const prevMonthDate = new Date(calCurrentYear, calCurrentMonth, 0);
    const daysInPrevMonth = prevMonthDate.getDate();

    let html = '';

    for (let i = startWeekday - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="cal-day other-month">${day}</div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(calCurrentYear, calCurrentMonth, day);
        const weekday = date.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isToday = isCurrentMonth && day === today.getDate();
        const isSelected = calSelectedDate &&
                          calSelectedDate.year === calCurrentYear &&
                          calSelectedDate.month === calCurrentMonth &&
                          calSelectedDate.day === day;

        const classes = ['cal-day'];
        if (isWeekend) classes.push('weekend');
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');

        html += `<div class="${classes.join(' ')}" data-day="${day}">${day}</div>`;
    }

    const total = startWeekday + daysInMonth;
    const remaining = (7 - (total % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
        html += `<div class="cal-day other-month">${day}</div>`;
    }

    daysContainer.innerHTML = html;

    renderCalendarInfo();
}

function renderCalendarInfo() {
    const info = document.getElementById('calInfo');
    if (!info) return;

    if (!calSelectedDate) {
        info.className = 'cal-info empty';
        info.innerHTML = '👆 Клик по дню — покажет информацию';
        return;
    }

    info.className = 'cal-info';

    const { year, month, day } = calSelectedDate;
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);

    const diffMs = date.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let diffLabel = '';
    if (diffDays === 0) diffLabel = 'сегодня';
    else if (diffDays === 1) diffLabel = 'завтра';
    else if (diffDays === -1) diffLabel = 'вчера';
    else if (diffDays > 0) diffLabel = `через ${diffDays} ${pluralizeDays(diffDays)}`;
    else diffLabel = `${Math.abs(diffDays)} ${pluralizeDays(Math.abs(diffDays))} назад`;

    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDaysInYear = isLeap ? 366 : 365;
    const daysLeftInYear = totalDaysInYear - dayOfYear;

    const weekNumber = getISOWeek(date);
    const weekdayFull = CAL_WEEKDAYS_FULL[date.getDay()];

    info.innerHTML = `
        <div class="cal-info-date">${day} ${CAL_MONTHS_GENITIVE[month]} ${year}</div>
        <div class="cal-info-row">
            <span class="label">День недели</span>
            <span class="value">${weekdayFull}</span>
        </div>
        <div class="cal-info-row">
            <span class="label">Относительно</span>
            <span class="value">${diffLabel}</span>
        </div>
        <div class="cal-info-row">
            <span class="label">День в году</span>
            <span class="value">${dayOfYear} / ${totalDaysInYear}</span>
        </div>
        <div class="cal-info-row">
            <span class="label">Неделя</span>
            <span class="value">№ ${weekNumber}</span>
        </div>
        <div class="cal-info-row">
            <span class="label">До конца года</span>
            <span class="value">${daysLeftInYear} ${pluralizeDays(daysLeftInYear)}</span>
        </div>
    `;
}

function pluralizeDays(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'день';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
    return 'дней';
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================================
//  УВЕДОМЛЕНИЯ + ЦЕНТР УВЕДОМЛЕНИЙ
// ============================================================
const NOTIF_HISTORY_KEY = 'notificationsHistory';
const NOTIF_MAX_HISTORY = 50;
const NOTIF_READ_KEY = 'notificationsRead';

let notifHistory = [];
let notifUnreadCount = 0;

function loadNotifHistory() {
    try {
        const saved = localStorage.getItem(NOTIF_HISTORY_KEY);
        if (saved) {
            notifHistory = JSON.parse(saved);
            if (!Array.isArray(notifHistory)) notifHistory = [];
        }
    } catch (e) {
        notifHistory = [];
    }

    try {
        notifUnreadCount = parseInt(localStorage.getItem(NOTIF_READ_KEY)) || 0;
    } catch (e) {
        notifUnreadCount = 0;
    }
}

function saveNotifHistory() {
    try {
        localStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(notifHistory.slice(0, NOTIF_MAX_HISTORY)));
        localStorage.setItem(NOTIF_READ_KEY, String(notifUnreadCount));
    } catch (e) {}
}

function renderNotifCenter() {
    const list = document.getElementById('notifCenterList');
    if (!list) return;

    if (notifHistory.length === 0) {
        list.innerHTML = '<div class="notif-empty">Нет уведомлений</div>';
        return;
    }

    list.innerHTML = notifHistory.map((n, idx) => {
        const isUnread = idx < notifUnreadCount;
        const timeAgo = formatTimeAgo(n.timestamp);
        return `
            <div class="notif-history-item ${n.type}${isUnread ? ' unread' : ''}">
                <div class="notif-history-icon">${n.icon || 'ℹ️'}</div>
                <div class="notif-history-content">
                    <div class="notif-history-title">${n.title}</div>
                    ${n.message ? `<div class="notif-history-message">${n.message}</div>` : ''}
                    <div class="notif-history-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    const bell = document.getElementById('notifBell');
    if (!badge || !bell) return;

    if (notifUnreadCount > 0) {
        badge.textContent = notifUnreadCount > 99 ? '99+' : String(notifUnreadCount);
        badge.classList.add('visible');
        bell.classList.add('has-unread');
    } else {
        badge.classList.remove('visible');
        bell.classList.remove('has-unread');
    }
}

function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hour = Math.floor(min / 60);
    const day = Math.floor(hour / 24);

    if (sec < 60) return 'только что';
    if (min < 60) return `${min} мин назад`;
    if (hour < 24) return `${hour} ч назад`;
    if (day < 7) return `${day} дн назад`;

    const d = new Date(timestamp);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function markAllNotifRead() {
    notifUnreadCount = 0;
    saveNotifHistory();
    updateNotifBadge();
    renderNotifCenter();
}

function clearNotifHistory() {
    notifHistory = [];
    notifUnreadCount = 0;
    saveNotifHistory();
    updateNotifBadge();
    renderNotifCenter();
}

function showNotification({ title, message, type = 'info', icon = 'ℹ️', duration = 5000 }) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notifData = {
        title,
        message: message || '',
        type,
        icon,
        timestamp: Date.now(),
    };
    notifHistory.unshift(notifData);
    if (notifHistory.length > NOTIF_MAX_HISTORY) {
        notifHistory = notifHistory.slice(0, NOTIF_MAX_HISTORY);
    }
    notifUnreadCount++;
    saveNotifHistory();
    updateNotifBadge();
    renderNotifCenter();

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;

    notif.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            ${message ? `<div class="notification-message">${message}</div>` : ''}
        </div>
        <button class="notification-close" title="Закрыть">×</button>
    `;

    notif.querySelector('.notification-close').addEventListener('click', () => closeNotification(notif));

    container.appendChild(notif);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => notif.classList.add('show'));
    });

    let timeoutId = null;
    if (duration > 0) {
        timeoutId = setTimeout(() => closeNotification(notif), duration);
    }

    notif.addEventListener('mouseenter', () => {
        if (timeoutId) clearTimeout(timeoutId);
    });
    notif.addEventListener('mouseleave', () => {
        if (duration > 0) {
            timeoutId = setTimeout(() => closeNotification(notif), 1500);
        }
    });

    return notif;
}

function closeNotification(notif) {
    if (!notif || !notif.parentNode) return;
    notif.classList.add('hiding');
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 350);
}

window.showNotification = showNotification;

// ============================================================
//  ВИДЖЕТ ВАЛЮТ (ЦБ РФ) + ГРАФИК
// ============================================================
const CURRENCY_API_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';
const CURRENCY_UPDATE_INTERVAL = 30 * 60 * 1000;
const CURRENCY_HISTORY_KEY = 'currencyHistory';
const CURRENCY_HISTORY_DAYS = 30;

const CURRENCY_META = {
    usd: { name: 'Доллар США', icon: '💵', code: 'USD', color: '#4a9eff' },
    eur: { name: 'Евро', icon: '💶', code: 'EUR', color: '#34c759' },
    cny: { name: 'Юань', icon: '¥', code: 'CNY', color: '#ff9f0a' },
};

let currencyState = {
    usd: null,
    eur: null,
    cny: null,
    previous: { usd: null, eur: null, cny: null },
    history: { usd: [], eur: [], cny: [] },
};

let currencyChartInstance = null;

function loadCurrencyHistory() {
    try {
        const saved = localStorage.getItem(CURRENCY_HISTORY_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                currencyState.history = {
                    usd: Array.isArray(parsed.usd) ? parsed.usd : [],
                    eur: Array.isArray(parsed.eur) ? parsed.eur : [],
                    cny: Array.isArray(parsed.cny) ? parsed.cny : [],
                };
            }
        }
    } catch (e) {}
}

function saveCurrencyHistory() {
    try {
        localStorage.setItem(CURRENCY_HISTORY_KEY, JSON.stringify(currencyState.history));
    } catch (e) {}
}

function appendCurrencyHistoryPoint(code, value) {
    if (value === null || value === undefined) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const arr = currencyState.history[code];

    const last = arr[arr.length - 1];
    if (last && last.date === dateStr) {
        last.value = value;
        return;
    }

    arr.push({ date: dateStr, value });
    if (arr.length > CURRENCY_HISTORY_DAYS) {
        currencyState.history[code] = arr.slice(-CURRENCY_HISTORY_DAYS);
    }
}

function generateSyntheticHistory(currentValue, days = 30) {
    if (currentValue === null || currentValue === undefined) return [];

    const points = [];
    const today = new Date();
    let value = currentValue;

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);

        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const drift = 1 + (Math.random() - 0.5) * 0.01;
        value = value / drift;

        points.push({
            date: dateStr,
            value: i === 0 ? currentValue : value
        });
    }

    return points.reverse();
}

function ensureCurrencyHistory(code, currentValue) {
    if (currentValue === null || currentValue === undefined) return;

    const arr = currencyState.history[code] || [];
    if (arr.length >= 5) return;

    currencyState.history[code] = generateSyntheticHistory(currentValue, 30);
    console.log(`[Currency] Синтетическая история для ${code}: ${currencyState.history[code].length} точек`);
}

async function fetchCurrencies() {
    try {
        const resp = await fetch(CURRENCY_API_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        currencyState.previous = {
            usd: currencyState.usd,
            eur: currencyState.eur,
            cny: currencyState.cny,
        };

        currencyState.usd = data.Valute?.USD?.Value ?? null;
        currencyState.eur = data.Valute?.EUR?.Value ?? null;
        currencyState.cny = data.Valute?.CNY?.Value ?? null;

        ensureCurrencyHistory('usd', currencyState.usd);
        ensureCurrencyHistory('eur', currencyState.eur);
        ensureCurrencyHistory('cny', currencyState.cny);

        appendCurrencyHistoryPoint('usd', currencyState.usd);
        appendCurrencyHistoryPoint('eur', currencyState.eur);
        appendCurrencyHistoryPoint('cny', currencyState.cny);
        saveCurrencyHistory();

        renderCurrencies();
    } catch (e) {
        console.warn('Ошибка загрузки валют ЦБ:', e);
        ['usd', 'eur', 'cny'].forEach(c => {
            const el = document.getElementById(c + 'Value');
            if (el) {
                el.textContent = '—';
                el.className = 'currency-value loading';
            }
        });
    }
}

function renderCurrencies() {
    ['usd', 'eur', 'cny'].forEach(code => {
        const el = document.getElementById(code + 'Value');
        const item = document.querySelector(`.currency-item[data-currency="${code}"]`);
        if (!el) return;

        const value = currencyState[code];
        const prev = currencyState.previous[code];

        if (value === null || value === undefined) {
            el.textContent = '—';
            el.className = 'currency-value';
            return;
        }

        el.textContent = value.toFixed(2) + ' ₽';
        el.className = 'currency-value';

        if (prev !== null && prev !== undefined && prev !== value) {
            if (value > prev) el.classList.add('up');
            else if (value < prev) el.classList.add('down');

            if (item) {
                item.classList.add('updating');
                setTimeout(() => item.classList.remove('updating'), 400);
            }
        }
    });
}

function openCurrencyChart(code) {
    const meta = CURRENCY_META[code];
    if (!meta) return;

    const modal = document.getElementById('currencyModal');
    const title = document.getElementById('currencyModalTitle');
    const statsEl = document.getElementById('currencyModalStats');
    const footer = document.getElementById('currencyModalFooter');
    if (!modal) return;

    title.textContent = `${meta.icon} Курс ${meta.code} / RUB`;

    const hist = currencyState.history[code] || [];
    const currentValue = currencyState[code];

    let minVal = null, maxVal = null;
    hist.forEach(p => {
        if (minVal === null || p.value < minVal) minVal = p.value;
        if (maxVal === null || p.value > maxVal) maxVal = p.value;
    });

    const first = hist[0]?.value ?? null;
    const last = currentValue;
    let changeStr = '—';
    let changeClass = '';
    if (first !== null && last !== null && first !== 0) {
        const change = last - first;
        const pct = (change / first) * 100;
        changeStr = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
        changeClass = change >= 0 ? 'up' : 'down';
    }

    statsEl.innerHTML = `
        <div class="currency-stat">
            <span class="currency-stat-label">Текущий</span>
            <span class="currency-stat-value">${currentValue !== null ? currentValue.toFixed(2) + ' ₽' : '—'}</span>
        </div>
        <div class="currency-stat">
            <span class="currency-stat-label">Изменение</span>
            <span class="currency-stat-value ${changeClass}">${changeStr}</span>
        </div>
        <div class="currency-stat">
            <span class="currency-stat-label">Минимум</span>
            <span class="currency-stat-value">${minVal !== null ? minVal.toFixed(2) + ' ₽' : '—'}</span>
        </div>
        <div class="currency-stat">
            <span class="currency-stat-label">Максимум</span>
            <span class="currency-stat-value">${maxVal !== null ? maxVal.toFixed(2) + ' ₽' : '—'}</span>
        </div>
    `;

    footer.textContent = hist.length > 0
        ? `Период: ${formatDateRu(hist[0].date)} — ${formatDateRu(hist[hist.length-1].date)} (${hist.length} ${pluralizePoints(hist.length)})`
        : 'Нет данных для отображения.';

    modal.classList.add('open');

    requestAnimationFrame(() => {
        drawCurrencyChart(code, hist, meta.color);
    });
}

function closeCurrencyChart() {
    const modal = document.getElementById('currencyModal');
    if (!modal) return;
    modal.classList.remove('open');
    if (currencyChartInstance) {
        currencyChartInstance.destroy();
        currencyChartInstance = null;
    }
}

function drawCurrencyChart(code, hist, color) {
    const canvas = document.getElementById('currencyChartCanvas');
    if (!canvas) return;

    if (currencyChartInstance) {
        currencyChartInstance.destroy();
        currencyChartInstance = null;
    }

    if (!hist || hist.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const labels = hist.map(p => formatDateShort(p.date));
    const data = hist.map(p => p.value);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--popup-text').trim() || '#fff';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--popup-border').trim() || 'rgba(0,0,0,0.1)';

    const ctx = canvas.getContext('2d');

    currencyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Курс ${code.toUpperCase()}`,
                data,
                borderColor: color,
                backgroundColor: color + '20',
                borderWidth: 2.5,
                pointRadius: hist.length > 20 ? 0 : 3,
                pointHoverRadius: 5,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                tension: 0.25,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(2) + ' ₽';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                    }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: value => value.toFixed(2) + ' ₽',
                    }
                }
            }
        }
    });
}

function formatDateRu(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)}.${String(m).padStart(2,'0')}`;
}

function pluralizePoints(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'точка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'точки';
    return 'точек';
}

function initCurrencies() {
    loadCurrencyHistory();
    fetchCurrencies();
    setInterval(fetchCurrencies, CURRENCY_UPDATE_INTERVAL);

    document.querySelectorAll('.currency-item').forEach(item => {
        item.addEventListener('click', () => {
            openCurrencyChart(item.dataset.currency);
        });
    });
}

// ============================================================
//  ПРИВЕТСТВЕННЫЙ ЭКРАН
// ============================================================
const WELCOME_USERNAME_KEY = 'welcomeUsername';

const WELCOME_QUOTES_FALLBACK = [
    { text: 'Успех — это способность идти от неудачи к неудаче, не теряя энтузиазма.', author: 'Уинстон Черчилль' },
    { text: 'Лучший способ предсказать будущее — создать его.', author: 'Питер Друкер' },
    { text: 'Единственный способ делать великую работу — любить то, что делаешь.', author: 'Стив Джобс' },
    { text: 'Дорогу осилит идущий.', author: 'Латинская поговорка' },
    { text: 'Всё, что вы можете вообразить, — реально.', author: 'Пабло Пикассо' },
    { text: 'Никогда не поздно стать тем, кем ты мог бы быть.', author: 'Джордж Элиот' },
    { text: 'Через тернии — к звёздам.', author: 'Латинская поговорка' },
    { text: 'Терпение — горько, но его плоды сладки.', author: 'Жан-Жак Руссо' },
];

let welcomeQuoteFetched = false;
let welcomeQuoteData = null;

async function fetchWelcomeQuote() {
    if (welcomeQuoteFetched) return welcomeQuoteData;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const resp = await fetch(
            'https://api.develnext.org/data/v1/quote/random?minRating=10',
            { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();

        if (data && data.text) {
            welcomeQuoteFetched = true;
            welcomeQuoteData = {
                text: data.text,
                author: data.source?.author || 'Неизвестный',
            };
            console.log('[Welcome] Цитата загружена из API:', welcomeQuoteData);
            return welcomeQuoteData;
        }

        throw new Error('Пустой ответ');
    } catch (e) {
        console.warn('[Welcome] Ошибка загрузки цитаты, использую фолбэк:', e.message);
        welcomeQuoteFetched = true;
        welcomeQuoteData = null;
        return null;
    }
}

function getFallbackQuote() {
    return WELCOME_QUOTES_FALLBACK[Math.floor(Math.random() * WELCOME_QUOTES_FALLBACK.length)];
}

function getGreetingByTime() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return { text: 'Доброе утро', emoji: '🌅' };
    } else if (hour >= 12 && hour < 17) {
        return { text: 'Добрый день', emoji: '☀️' };
    } else if (hour >= 17 && hour < 23) {
        return { text: 'Добрый вечер', emoji: '🌆' };
    } else {
        return { text: 'Доброй ночи', emoji: '🌙' };
    }
}

async function showWelcomeScreen() {
    const screen = document.getElementById('welcome-screen');
    if (!screen) return;

    const greetingEl = document.getElementById('welcomeGreeting');
    const emojiEl = document.getElementById('welcomeEmoji');
    const nameEl = document.getElementById('welcomeName');
    const subtitleEl = document.getElementById('welcomeSubtitle');
    const startBtn = document.getElementById('welcomeBtn');

    const { text, emoji } = getGreetingByTime();
    greetingEl.textContent = text;
    emojiEl.textContent = emoji;

    let name = localStorage.getItem(WELCOME_USERNAME_KEY);
    if (!name) name = 'Гость';
    nameEl.textContent = name;

    const fallback = getFallbackQuote();
    subtitleEl.outerHTML = `
        <div class="welcome-quote" id="welcomeSubtitle">${fallback.text}</div>
        <div class="welcome-quote-author">${fallback.author}</div>
    `;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            screen.classList.add('visible');
        });
    });

    fetchWelcomeQuote().then(quote => {
        if (!quote) return;

        const currentQuote = document.getElementById('welcomeSubtitle');
        const currentAuthor = document.querySelector('.welcome-quote-author');

        if (currentQuote && currentAuthor) {
            currentQuote.style.opacity = '0';
            currentAuthor.style.opacity = '0';
            currentQuote.style.transition = 'opacity 0.3s';
            currentAuthor.style.transition = 'opacity 0.3s';

            setTimeout(() => {
                currentQuote.textContent = quote.text;
                currentAuthor.textContent = quote.author;
                currentQuote.style.opacity = '1';
                currentAuthor.style.opacity = '1';
            }, 300);
        }
    });

    let closed = false;

    function hideWelcome() {
        if (closed) return;
        closed = true;

        screen.classList.remove('visible');
        screen.classList.add('hiding');
        setTimeout(() => {
            screen.style.display = 'none';
        }, 600);

        startBtn.removeEventListener('click', hideWelcome);
        screen.removeEventListener('click', onBgClick);
        document.removeEventListener('keydown', onKey);
        clearTimeout(autoHideTimer);

        if (window.showNotification) {
            const g = getGreetingByTime();
            window.showNotification({
                title: `${g.emoji} ${g.text}!`,
                message: 'Система готова к работе',
                type: 'info',
                icon: '✨',
                duration: 3000,
            });
        }
    }

    function onBgClick(e) {
        if (e.target === screen) hideWelcome();
    }

    function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') hideWelcome();
    }

    startBtn.addEventListener('click', hideWelcome);
    screen.addEventListener('click', onBgClick);
    document.addEventListener('keydown', onKey);

    const autoHideTimer = setTimeout(() => {
        if (screen.classList.contains('visible')) hideWelcome();
    }, 8000);
}

// ============================================================
//  Экран загрузки + последовательность запуска
// ============================================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const boot = document.getElementById('boot-screen');
        if (boot) boot.classList.add('hidden');

        setTimeout(() => {
            showWelcomeScreen();
        }, 400);
    }, 2600);
});

// ============================================================
//  Реестр приложений
// ============================================================
const APP_LAUNCHERS = {
    calculator: createCalculatorApp,
    salary: createSalaryApp,
    games: createGamesApp,
    settings: createSettingsApp,
    spg: createSpgApp,
};

const APP_TITLES = {
    calculator: 'Calculator',
    salary: 'Salary Stats',
    games: 'Games',
    settings: 'System Settings',
    spg: 'СПГ — Технологические цепочки',
};

// ============================================================
//  Обработчик кнопок приложений в Menu Bar
// ============================================================
document.querySelectorAll('.app-btn').forEach(item => {
    item.addEventListener('click', () => {
        const app = item.dataset.app;

        const existing = [...document.querySelectorAll('.window')].find(
            w => w.dataset.app === app
        );
        if (existing) {
            existing.classList.remove('minimized');
            focusWindow(existing);
            return;
        }

        const launcher = APP_LAUNCHERS[app];
        if (launcher) {
            launcher();
            item.classList.add('running');
        }
    });
});

// ============================================================
//  Инициализация календаря, валют, истории уведомлений
// ============================================================
window.addEventListener('load', () => {
    loadNotifHistory();
    renderNotifCenter();
    updateNotifBadge();

    initCalendar();
    initCurrencies();

    // ---------- Колокольчик уведомлений ----------
    const bell = document.getElementById('notifBell');
    const bellContainer = document.getElementById('notifBellContainer');
    const clearBtn = document.getElementById('notifClear');

    if (bell && bellContainer) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            bellContainer.classList.toggle('open');

            if (bellContainer.classList.contains('open')) {
                setTimeout(() => {
                    markAllNotifRead();
                }, 400);
            }
        });

        document.addEventListener('click', (e) => {
            if (!bellContainer.contains(e.target)) {
                bellContainer.classList.remove('open');
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearNotifHistory();
        });
    }

    // ---------- Модальное окно графика валюты ----------
    const currencyModal = document.getElementById('currencyModal');
    const currencyModalClose = document.getElementById('currencyModalClose');

    if (currencyModalClose) {
        currencyModalClose.addEventListener('click', closeCurrencyChart);
    }

    if (currencyModal) {
        currencyModal.addEventListener('click', (e) => {
            if (e.target === currencyModal) closeCurrencyChart();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCurrencyChart();
            if (bellContainer) bellContainer.classList.remove('open');
        }
    });

    // ---------- Часы и календарь ----------
    const container = document.getElementById('clockContainer');
    const popup = document.getElementById('clockPopup');
    if (!container || !popup) return;

    let closeTimer = null;

    function openPopup() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        container.classList.add('open');
    }

    function scheduleClose() {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
            container.classList.remove('open');
            closeTimer = null;
            const now = new Date();
            calCurrentYear = now.getFullYear();
            calCurrentMonth = now.getMonth();
            renderCalendar();
        }, 250);
    }

    container.addEventListener('mouseenter', openPopup);
    container.addEventListener('mouseleave', scheduleClose);

    popup.addEventListener('mouseenter', () => {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
    });
    popup.addEventListener('mouseleave', scheduleClose);
});
