// ============================================================
//  ПРИЛОЖЕНИЕ «ЗАРПЛАТА» — с облаком, темой, сравнением годов
// ============================================================

const SAL_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const SAL_STORAGE_PREFIX = 'salaryData_';
const SAL_CURRENT_YEAR_KEY = 'salaryCurrentYear';

// ============================================================
//  АВТОРИЗАЦИЯ И БЕЗДЕЙСТВИЕ
// ============================================================
const SAL_PASSCODE_HASH_KEY = 'salaryPasscodeHash';
const SAL_SESSION_KEY = 'salarySessionExpiresAt';
const SAL_INACTIVITY_MINUTES = 5;
const SAL_WARNING_SECONDS = 30;

// ============================================================
//  СРАВНЕНИЕ ГОДОВ — палитра
// ============================================================
const SAL_COMPARE_COLORS = [
    '#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0',
    '#8e6fd1', '#26c6da', '#66bb6a', '#ec407a',
    '#ab47bc', '#ffa726',
];
const SAL_MAX_COMPARE = 6;

const salState = {
    currentYear: new Date().getFullYear(),
    chartInstance: null,
    analysisVisible: false,
    // --- авторизация и сессия ---
    authorized: false,
    sessionTimer: null,
    lastActivity: Date.now(),
    warningShown: false,
    // --- сравнение годов ---
    compareYears: [],
    showAverage: false,
};

// ------------------------------------------------------------
//  Форматирование
// ------------------------------------------------------------
function salFormatMoney(value, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '—';
    const parts = num.toFixed(decimals).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (decimals === 0) return intPart;
    return intPart + ',' + parts[1];
}

function salParseMoneyInput(value) {
    if (!value || value.trim() === '—' || value.trim() === '') return 0;
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function pluralizeYears(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'году';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'годам';
    return 'годам';
}

// ------------------------------------------------------------
//  Passcode — хэширование и проверка
// ------------------------------------------------------------
async function salHashPasscode(passcode) {
    const bytes = new TextEncoder().encode(passcode);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function salHasPasscode() {
    return Boolean(localStorage.getItem(SAL_PASSCODE_HASH_KEY));
}

async function salSetPasscode(passcode) {
    const hash = await salHashPasscode(passcode);
    localStorage.setItem(SAL_PASSCODE_HASH_KEY, hash);
}

async function salCheckPasscode(passcode) {
    const stored = localStorage.getItem(SAL_PASSCODE_HASH_KEY);
    if (!stored) return false;
    const entered = await salHashPasscode(passcode);
    return stored === entered;
}

// ------------------------------------------------------------
//  Хранение
// ------------------------------------------------------------
function salLoadData(year) {
    const key = SAL_STORAGE_PREFIX + year;
    let data = [];
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length === 12) {
                data = parsed.map(row => ({
                    month: row.month || '',
                    organization: row.organization || '',
                    ndflRate: row.ndflRate !== undefined ? row.ndflRate : 13,
                    salary: row.salary || 0,
                    advance: row.advance || 0,
                    baseSalary: row.baseSalary || 0,
                    bonus: row.bonus || 0,
                    vacation: row.vacation || 0
                }));
            }
        }
    } catch (e) { console.warn('Sal load error:', e); }

    if (data.length !== 12) {
        data = SAL_MONTHS.map(m => ({
            month: m, organization: '', ndflRate: 13,
            salary: 0, advance: 0, baseSalary: 0, bonus: 0, vacation: 0
        }));
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    }
    return data;
}

function salSaveData(year, data) {
    try { localStorage.setItem(SAL_STORAGE_PREFIX + year, JSON.stringify(data)); } catch (e) {}
}

function salCalcTotal(row) {
    return (parseFloat(row.advance) || 0) +
           (parseFloat(row.baseSalary) || 0) +
           (parseFloat(row.bonus) || 0) +
           (parseFloat(row.vacation) || 0);
}

// ------------------------------------------------------------
//  Список лет
// ------------------------------------------------------------
function salGetAvailableYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2010; y <= currentYear + 5; y++) {
        if (localStorage.getItem(SAL_STORAGE_PREFIX + y)) years.push(y);
    }
    return years.sort((a, b) => b - a);
}

function salEnsureInitialYear() {
    const years = salGetAvailableYears();
    if (years.length === 0) {
        const cy = new Date().getFullYear();
        salSaveData(cy, SAL_MONTHS.map(m => ({
            month: m, organization: '', ndflRate: 13,
            salary: 0, advance: 0, baseSalary: 0, bonus: 0, vacation: 0
        })));
        return [cy];
    }
    return years;
}

// ------------------------------------------------------------
//  Создание UI
// ------------------------------------------------------------
function createSalaryApp() {
    const html = `
        <div class="salary-app">
            <!-- Экран авторизации -->
            <div class="salary-lock visible" id="salLock">
                <div class="salary-lock-card">
                    <button class="salary-lock-close" id="salLockClose" title="Закрыть окно">✕</button>
                    <div class="salary-lock-icon">🔐</div>
                    <div class="salary-lock-title" id="salLockTitle">Вход в систему</div>
                    <div class="salary-lock-subtitle" id="salLockSubtitle">Введите код доступа для просмотра данных</div>
                    <input
                        type="password"
                        class="salary-lock-input"
                        id="salLockInput"
                        placeholder="Код доступа"
                        autocomplete="off"
                        maxlength="32"
                    >
                    <div class="salary-lock-error" id="salLockError"></div>
                    <button class="salary-lock-btn" id="salLockBtn">Войти</button>
                    <div class="salary-lock-hint" id="salLockHint">
                        Код действует только в этом браузере
                    </div>
                </div>
            </div>

            <!-- Основное приложение -->
            <div class="salary-toolbar">
                <span class="salary-year-label">📅 Год:</span>
                <select class="salary-select" id="salYearSelect"></select>
                <button class="salary-btn add" id="salAddYearBtn">➕ Добавить год</button>
                <div class="salary-toolbar-spacer"></div>
                <span class="salary-session-timer" id="salSessionTimer"></span>
                <span class="salary-save-status" id="salSaveStatus"></span>
                <button class="salary-btn cloud-load" id="salCloudLoadBtn" title="Загрузить из Яндекс.Диска">
                    📥 Загрузить
                </button>
                <button class="salary-btn cloud-save" id="salCloudSaveBtn" title="Сохранить в Яндекс.Диск">
                    ☁️ Сохранить
                </button>
                <button class="salary-btn" id="salAnalysisBtn">📊 Анализ</button>
                <button class="salary-btn lock" id="salLockBtn2" title="Заблокировать">🔒</button>
            </div>

            <div class="salary-dashboard" id="salDashboard">
                <div class="salary-card">
                    <div class="salary-card-label">Сумма за год</div>
                    <div class="salary-card-value" id="salTotal">—</div>
                </div>
                <div class="salary-card">
                    <div class="salary-card-label">Средняя</div>
                    <div class="salary-card-value" id="salAvg">—</div>
                </div>
                <div class="salary-card clickable" id="salCardMax">
                    <div class="salary-card-label">Максимум</div>
                    <div class="salary-card-value" id="salMax">—</div>
                </div>
                <div class="salary-card clickable" id="salCardMin">
                    <div class="salary-card-label">Минимум</div>
                    <div class="salary-card-value" id="salMin">—</div>
                </div>
                <div class="salary-card">
                    <div class="salary-card-label">Месяцев</div>
                    <div class="salary-card-value" id="salCount">—</div>
                </div>
            </div>

            <div class="salary-table-wrapper">
                <table class="sal-table" id="salTable">
                    <thead>
                        <tr>
                            <th>Месяц</th>
                            <th>Организация</th>
                            <th>НДФЛ, %</th>
                            <th>Оклад</th>
                            <th>Аванс</th>
                            <th>Зарплата</th>
                            <th>Премия</th>
                            <th>Отпускные</th>
                            <th>Итого</th>
                        </tr>
                    </thead>
                    <tbody id="salBody"></tbody>
                    <tfoot id="salFooter"></tfoot>
                </table>
            </div>

            <div class="salary-analysis-panel" id="salAnalysis">
                <div class="salary-analysis-title">📈 Динамика зарплаты</div>

                <!-- Суммарное сравнение: год vs прошлый год -->
                <div class="salary-year-compare-card" id="salYearCompare">
                    <div class="salary-year-compare-item">
                        <span class="yc-label" id="salYcCurrentLabel">Сумма текущего года</span>
                        <span class="yc-value" id="salYcCurrent">—</span>
                        <span class="yc-note" id="salYcCurrentNote">—</span>
                    </div>
                    <div class="salary-year-compare-item">
                        <span class="yc-label" id="salYcPrevLabel">Сумма предыдущего года</span>
                        <span class="yc-value" id="salYcPrev">—</span>
                        <span class="yc-note" id="salYcPrevNote">—</span>
                    </div>
                    <div class="salary-year-compare-item" id="salYcDeltaBlock">
                        <span class="yc-label">Разница</span>
                        <span class="yc-value" id="salYcDelta">—</span>
                        <span class="yc-note" id="salYcDeltaNote">—</span>
                    </div>
                </div>

                <!-- Панель сравнения годов -->
                <div class="salary-compare-bar">
                    <span class="salary-compare-label">Сравнить с:</span>
                    <div class="salary-compare-chips" id="salCompareChips"></div>
                    <button class="salary-avg-toggle" id="salAvgToggle" title="Показать среднее по всем годам">
                        <span class="chip-dot"></span>
                        <span>Среднее</span>
                    </button>
                    <span class="salary-compare-counter" id="salCompareCounter">0 / 6</span>
                    <button class="salary-compare-clear" id="salCompareClear">✕ Очистить</button>
                </div>

                <div class="salary-analysis-grid">
                    <div class="salary-analysis-card" id="salCardAvg2">
                        <span class="analysis-label">Средняя выплата</span>
                        <span class="analysis-value" id="salAnalysisAvg">—</span>
                    </div>
                    <div class="salary-analysis-card" id="salCardChange">
                        <span class="analysis-label">Последнее изменение</span>
                        <span class="analysis-value" id="salAnalysisChange">—</span>
                    </div>
                    <div class="salary-analysis-card" id="salCardTrend">
                        <span class="analysis-label">Тренд</span>
                        <span class="analysis-value" id="salAnalysisTrend">—</span>
                    </div>
                    <div class="salary-analysis-card" id="salCardBest">
                        <span class="analysis-label">Лучший месяц</span>
                        <span class="analysis-value" id="salAnalysisBest">—</span>
                    </div>
                    <div class="salary-analysis-card" id="salCardForecast">
                        <span class="analysis-label">Прогноз</span>
                        <span class="analysis-value" id="salAnalysisForecast">—</span>
                    </div>
                </div>
                <div class="salary-chart-container">
                    <canvas id="salChartCanvas"></canvas>
                </div>
            </div>
        </div>
    `;

    const win = createWindow({
        title: 'Статистика зарплаты',
        width: 900,
        height: 680,
        content: html,
    });
    win.dataset.app = 'salary';
    win.style.minWidth = '600px';
    win.style.minHeight = '400px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    salInitApp(win);
    return win;
}

// ------------------------------------------------------------
//  Инициализация
// ------------------------------------------------------------
function salInitApp(win) {
    const yearSelect = win.querySelector('#salYearSelect');
    const addYearBtn = win.querySelector('#salAddYearBtn');
    const analysisBtn = win.querySelector('#salAnalysisBtn');
    const cloudSaveBtn = win.querySelector('#salCloudSaveBtn');
    const cloudLoadBtn = win.querySelector('#salCloudLoadBtn');
    const saveStatus = win.querySelector('#salSaveStatus');
    const sessionTimerEl = win.querySelector('#salSessionTimer');

    // Элементы авторизации
    const lockEl = win.querySelector('#salLock');
    const lockInput = win.querySelector('#salLockInput');
    const lockBtn = win.querySelector('#salLockBtn');
    const lockError = win.querySelector('#salLockError');
    const lockTitle = win.querySelector('#salLockTitle');
    const lockSubtitle = win.querySelector('#salLockSubtitle');
    const lockHint = win.querySelector('#salLockHint');
    const lockBtn2 = win.querySelector('#salLockBtn2');
    const lockCloseBtn = win.querySelector('#salLockClose');

    // Элементы сравнения
    const avgToggle = win.querySelector('#salAvgToggle');

    // ============================================================
    //  АВТОРИЗАЦИЯ
    // ============================================================
    const hasPasscode = salHasPasscode();

    if (hasPasscode) {
        lockTitle.textContent = 'Вход в систему';
        lockSubtitle.textContent = 'Введите код доступа для просмотра данных';
        lockBtn.textContent = 'Войти';
        lockHint.textContent = `Автовыход через ${SAL_INACTIVITY_MINUTES} мин бездействия`;
    } else {
        lockTitle.textContent = 'Создание кода доступа';
        lockSubtitle.textContent = 'Придумайте код не короче 4 символов';
        lockBtn.textContent = 'Создать код';
        lockHint.textContent = 'Код хранится как SHA-256-хэш в этом браузере';
    }

    async function tryLogin() {
        const value = lockInput.value.trim();

        if (value.length < 4) {
            lockError.textContent = 'Код должен быть не короче 4 символов';
            lockError.classList.add('visible');
            return;
        }

        lockBtn.disabled = true;

        try {
            if (!hasPasscode) {
                await salSetPasscode(value);
                salState.authorized = true;
                unlockApp();
            } else {
                const ok = await salCheckPasscode(value);
                if (ok) {
                    salState.authorized = true;
                    unlockApp();
                } else {
                    lockError.textContent = 'Неверный код доступа';
                    lockError.classList.add('visible');
                    lockInput.value = '';
                    lockInput.focus();
                    const card = lockEl.querySelector('.salary-lock-card');
                    card.animate(
                        [
                            { transform: 'translateX(0)' },
                            { transform: 'translateX(-8px)' },
                            { transform: 'translateX(8px)' },
                            { transform: 'translateX(-6px)' },
                            { transform: 'translateX(6px)' },
                            { transform: 'translateX(0)' }
                        ],
                        { duration: 400, easing: 'ease-in-out' }
                    );
                }
            }
        } catch (err) {
            console.error('Ошибка авторизации:', err);
            lockError.textContent = 'Ошибка: ' + (err.message || 'неизвестная');
            lockError.classList.add('visible');
        } finally {
            lockBtn.disabled = false;
        }
    }

    function unlockApp() {
        lockEl.classList.remove('visible');
        lockInput.value = '';
        lockError.classList.remove('visible');

        if (salState.sessionTimer) clearInterval(salState.sessionTimer);
        salState.lastActivity = Date.now();
        salState.warningShown = false;

        salRefreshAll(win);

        if (window.showNotification) {
            window.showNotification({
                title: 'Добро пожаловать',
                message: `Сессия истечёт через ${SAL_INACTIVITY_MINUTES} мин бездействия`,
                type: 'success',
                icon: '🔓',
                duration: 3000,
            });
        }

        startSessionTimer(win);
    }

    function lockApp() {
        salState.authorized = false;
        if (salState.sessionTimer) {
            clearInterval(salState.sessionTimer);
            salState.sessionTimer = null;
        }
        lockEl.classList.add('visible');
        lockInput.value = '';
        lockError.classList.remove('visible');
        lockInput.focus();
        if (sessionTimerEl) {
            sessionTimerEl.textContent = '';
            sessionTimerEl.className = 'salary-session-timer';
        }
    }

    lockBtn.addEventListener('click', tryLogin);
    lockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryLogin();
    });
    lockBtn2.addEventListener('click', () => {
        if (!salState.authorized) return;
        lockApp();
        if (window.showNotification) {
            window.showNotification({
                title: 'Заблокировано',
                message: 'Введите код для продолжения',
                type: 'info',
                icon: '🔒',
                duration: 2500,
            });
        }
    });

    // Закрытие окна из экрана авторизации
    if (lockCloseBtn) {
        lockCloseBtn.addEventListener('click', () => {
            closeWindow(win);
        });
    }

    // ============================================================
    //  ТАЙМЕР БЕЗДЕЙСТВИЯ
    // ============================================================
    function startSessionTimer(win) {
        salState.lastActivity = Date.now();
        salState.warningShown = false;

        const totalMs = SAL_INACTIVITY_MINUTES * 60 * 1000;
        const warnMs = SAL_WARNING_SECONDS * 1000;

        salState.sessionTimer = setInterval(() => {
            if (!salState.authorized) return;

            const elapsed = Date.now() - salState.lastActivity;
            const remaining = totalMs - elapsed;

            if (remaining <= 0) {
                clearInterval(salState.sessionTimer);
                salState.sessionTimer = null;

                if (window.showNotification) {
                    window.showNotification({
                        title: 'Сессия завершена',
                        message: 'Окно закрыто из-за бездействия',
                        type: 'warning',
                        icon: '⏱️',
                        duration: 3500,
                    });
                }

                closeWindow(win);
                return;
            }

            if (sessionTimerEl) {
                const sec = Math.ceil(remaining / 1000);
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                const text = `⏱ ${m}:${String(s).padStart(2, '0')}`;
                sessionTimerEl.textContent = text;

                sessionTimerEl.classList.remove('warning', 'danger');
                if (remaining <= warnMs) {
                    sessionTimerEl.classList.add('danger');
                } else if (remaining <= 60000) {
                    sessionTimerEl.classList.add('warning');
                }
            }

            if (remaining <= warnMs && !salState.warningShown) {
                salState.warningShown = true;
                if (window.showNotification) {
                    window.showNotification({
                        title: 'Скоро автовыход',
                        message: `Окно закроется через ${SAL_WARNING_SECONDS} сек`,
                        type: 'warning',
                        icon: '⚠️',
                        duration: 4000,
                    });
                }
            }
        }, 1000);
    }

    function markActivity() {
        if (!salState.authorized) return;
        salState.lastActivity = Date.now();
        salState.warningShown = false;
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(ev => {
        win.addEventListener(ev, markActivity, { passive: true });
    });

    setTimeout(() => lockInput.focus(), 100);

    // ============================================================
    //  ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
    // ============================================================
    function salRefreshAll(win) {
        try {
            const savedYear = parseInt(localStorage.getItem(SAL_CURRENT_YEAR_KEY));
            if (!isNaN(savedYear)) salState.currentYear = savedYear;
        } catch (e) {}

        const years = salEnsureInitialYear();
        if (!years.includes(salState.currentYear)) {
            salState.currentYear = years[0];
        }

        yearSelect.innerHTML = years.map(y =>
            `<option value="${y}"${y === salState.currentYear ? ' selected' : ''}>${y}</option>`
        ).join('');

        salState.compareYears = salState.compareYears.filter(y => y !== salState.currentYear);

        salRenderTable(win);
        salUpdateDashboard(win);
        if (salState.analysisVisible) salUpdateAnalysis(win);
        updateSaveStatus();
    }

    // ---------- Смена года ----------
    yearSelect.addEventListener('change', () => {
        salState.currentYear = parseInt(yearSelect.value);
        localStorage.setItem(SAL_CURRENT_YEAR_KEY, String(salState.currentYear));

        salState.compareYears = salState.compareYears.filter(y => y !== salState.currentYear);

        salRenderTable(win);
        salUpdateDashboard(win);
        if (salState.analysisVisible) salUpdateAnalysis(win);
    });

    // ---------- Добавить год ----------
    addYearBtn.addEventListener('click', () => {
        const input = prompt('Введите год (2010–2100):');
        if (!input) return;
        const year = parseInt(input);
        if (isNaN(year) || year < 2010 || year > 2100) {
            alert('Некорректный год');
            return;
        }
        if (localStorage.getItem(SAL_STORAGE_PREFIX + year)) {
            alert('Год уже существует');
            return;
        }
        salSaveData(year, SAL_MONTHS.map(m => ({
            month: m, organization: '', ndflRate: 13,
            salary: 0, advance: 0, baseSalary: 0, bonus: 0, vacation: 0
        })));
        const newYears = salGetAvailableYears();
        yearSelect.innerHTML = newYears.map(y =>
            `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`
        ).join('');
        salState.currentYear = year;
        localStorage.setItem(SAL_CURRENT_YEAR_KEY, String(year));
        salRenderTable(win);
        salUpdateDashboard(win);

        if (window.showNotification) {
            window.showNotification({
                title: 'Год добавлен',
                message: `Создан ${year} год`,
                type: 'success',
                icon: '📅',
                duration: 2500,
            });
        }
    });

    // ---------- Анализ ----------
    analysisBtn.addEventListener('click', () => {
        const panel = win.querySelector('#salAnalysis');
        salState.analysisVisible = !salState.analysisVisible;
        panel.classList.toggle('visible', salState.analysisVisible);
        analysisBtn.textContent = salState.analysisVisible ? '📊 Скрыть' : '📊 Анализ';

        if (salState.analysisVisible) {
            salUpdateAnalysis(win);
        }
    });

    // ---------- Тоггл «Среднее по годам» ----------
    if (avgToggle) {
        avgToggle.addEventListener('click', () => {
            salState.showAverage = !salState.showAverage;
            avgToggle.classList.toggle('active', salState.showAverage);
            salUpdateAnalysis(win);
        });
    }

    // ---------- Клик по Max / Min ----------
    win.querySelector('#salCardMax').addEventListener('click', () => salScrollToBest(win, 'max'));
    win.querySelector('#salCardMin').addEventListener('click', () => salScrollToBest(win, 'min'));

    // ============================================================
    //  ОБЛАКО
    // ============================================================
    function updateSaveStatus() {
        const lastSync = localStorage.getItem('cloudLastSync');
        if (!lastSync) {
            saveStatus.textContent = '';
            saveStatus.className = 'salary-save-status';
            return;
        }
        try {
            const d = new Date(lastSync);
            const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
            let text;
            if (diffSec < 10) text = '✓ только что';
            else if (diffSec < 60) text = `✓ ${diffSec} сек назад`;
            else if (diffSec < 3600) text = `✓ ${Math.floor(diffSec / 60)} мин назад`;
            else if (diffSec < 86400) text = `✓ ${Math.floor(diffSec / 3600)} ч назад`;
            else text = `✓ ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}`;

            saveStatus.textContent = text;
            saveStatus.className = 'salary-save-status ok';
        } catch (e) {
            saveStatus.textContent = '';
        }
    }

    updateSaveStatus();
    const statusInterval = setInterval(updateSaveStatus, 30000);

    // ---------- Сохранить ----------
    cloudSaveBtn.addEventListener('click', async () => {
        if (!salState.authorized) return;

        if (typeof saveToYandexDisk !== 'function') {
            window.showNotification && window.showNotification({
                title: 'Ошибка',
                message: 'Модуль облачной синхронизации не загружен',
                type: 'error', icon: '⚠️', duration: 3000,
            });
            return;
        }

        const token = typeof getYandexToken === 'function' ? getYandexToken() : null;
        if (!token) {
            window.showNotification && window.showNotification({
                title: 'Нужен токен',
                message: 'Откройте приложение «Настройки» → вкладка «Облако» и введите токен',
                type: 'warning', icon: '🔑', duration: 4000,
            });
            return;
        }

        cloudSaveBtn.disabled = true;
        cloudSaveBtn.classList.add('saving');
        const originalText = cloudSaveBtn.textContent;
        cloudSaveBtn.textContent = '⏳ Сохранение…';

        try {
            await saveToYandexDisk(false);
            updateSaveStatus();
            window.showNotification && window.showNotification({
                title: 'Сохранено в облако',
                message: `Таблица за ${salState.currentYear} год синхронизирована`,
                type: 'success', icon: '☁️', duration: 3000,
            });
        } catch (error) {
            console.error(error);
            const msg = typeof getCloudNetworkMessage === 'function'
                ? getCloudNetworkMessage(error)
                : (error.message || String(error));
            window.showNotification && window.showNotification({
                title: 'Ошибка сохранения',
                message: msg,
                type: 'error', icon: '❌', duration: 5000,
            });
        } finally {
            cloudSaveBtn.disabled = false;
            cloudSaveBtn.classList.remove('saving');
            cloudSaveBtn.textContent = originalText;
        }
    });

    // ---------- Загрузить ----------
    cloudLoadBtn.addEventListener('click', async () => {
        if (!salState.authorized) return;

        if (typeof loadFromYandexDisk !== 'function') {
            window.showNotification && window.showNotification({
                title: 'Ошибка',
                message: 'Модуль облачной синхронизации не загружен',
                type: 'error', icon: '⚠️', duration: 3000,
            });
            return;
        }

        const token = typeof getYandexToken === 'function' ? getYandexToken() : null;
        if (!token) {
            window.showNotification && window.showNotification({
                title: 'Нужен токен',
                message: 'Откройте приложение «Настройки» → вкладка «Облако» и введите токен',
                type: 'warning', icon: '🔑', duration: 4000,
            });
            return;
        }

        const confirmed = confirm(
            'Загрузить данные из облака?\n\n' +
            '⚠️ Текущие данные в localStorage будут заменены содержимым бэкапа.'
        );
        if (!confirmed) return;

        cloudLoadBtn.disabled = true;
        cloudLoadBtn.classList.add('saving');
        const originalText = cloudLoadBtn.textContent;
        cloudLoadBtn.textContent = '⏳ Загрузка…';

        try {
            const data = await loadFromYandexDisk();

            if (data) {
                const newYears = salGetAvailableYears();
                if (newYears.length > 0) {
                    if (!newYears.includes(salState.currentYear)) {
                        salState.currentYear = newYears[0];
                    }
                    yearSelect.innerHTML = newYears.map(y =>
                        `<option value="${y}"${y === salState.currentYear ? ' selected' : ''}>${y}</option>`
                    ).join('');
                }

                salState.compareYears = salState.compareYears.filter(y => y !== salState.currentYear);

                salRenderTable(win);
                salUpdateDashboard(win);
                if (salState.analysisVisible) salUpdateAnalysis(win);
                updateSaveStatus();

                window.showNotification && window.showNotification({
                    title: 'Загружено из облака',
                    message: 'Таблица обновлена',
                    type: 'success', icon: '📥', duration: 3000,
                });
            }
        } catch (error) {
            console.error(error);
            const msg = typeof getCloudNetworkMessage === 'function'
                ? getCloudNetworkMessage(error)
                : (error.message || String(error));
            window.showNotification && window.showNotification({
                title: 'Ошибка загрузки',
                message: msg,
                type: 'error', icon: '❌', duration: 5000,
            });
        } finally {
            cloudLoadBtn.disabled = false;
            cloudLoadBtn.classList.remove('saving');
            cloudLoadBtn.textContent = originalText;
        }
    });

    // ---------- ⌘ S / ⌘ O ----------
    function onKeyDown(e) {
        if (!win.classList.contains('focused')) return;
        if (!salState.authorized) return;

        if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'ы')) {
            e.preventDefault();
            cloudSaveBtn.click();
        } else if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'щ')) {
            e.preventDefault();
            cloudLoadBtn.click();
        }
    }
    document.addEventListener('keydown', onKeyDown);

    // ---------- cloudDataRestored ----------
    function onCloudRestore() {
        if (!salState.authorized) return;
        salRefreshAll(win);
        window.showNotification && window.showNotification({
            title: 'Данные обновлены',
            message: 'Таблица синхронизирована с облаком',
            type: 'success', icon: '☁️', duration: 3000,
        });
    }
    window.addEventListener('cloudDataRestored', onCloudRestore);

    // ---------- Смена темы ----------
    const systemThemeMQ = window.matchMedia('(prefers-color-scheme: dark)');
    function onThemeChange() {
        if (salState.analysisVisible) {
            salUpdateAnalysis(win);
        }
    }
    if (systemThemeMQ.addEventListener) {
        systemThemeMQ.addEventListener('change', onThemeChange);
    } else if (systemThemeMQ.addListener) {
        systemThemeMQ.addListener(onThemeChange);
    }

    // ---------- Очистка ----------
    win.querySelector('.close').addEventListener('click', () => {
        clearInterval(statusInterval);
        if (salState.sessionTimer) {
            clearInterval(salState.sessionTimer);
            salState.sessionTimer = null;
        }
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('cloudDataRestored', onCloudRestore);
        if (systemThemeMQ.removeEventListener) {
            systemThemeMQ.removeEventListener('change', onThemeChange);
        } else if (systemThemeMQ.removeListener) {
            systemThemeMQ.removeListener(onThemeChange);
        }
    });
}

// ------------------------------------------------------------
//  Рендер таблицы
// ------------------------------------------------------------
function salRenderTable(win) {
    const data = salLoadData(salState.currentYear);
    const tbody = win.querySelector('#salBody');
    const tfoot = win.querySelector('#salFooter');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    function createCell(value, field, index, isNumeric) {
        const td = document.createElement('td');
        td.className = 'editable' + (isNumeric ? ' money-cell' : '');
        td.contentEditable = 'true';

        const decimals = field === 'ndflRate' ? 0 : 2;
        let displayValue;

        if (isNumeric) {
            const num = parseFloat(value);
            displayValue = (isNaN(num) || num === 0) ? '—' : salFormatMoney(num, decimals);
        } else {
            displayValue = (value !== undefined && value !== null) ? value : '';
        }
        td.textContent = displayValue;

        td.addEventListener('focus', function () {
            const text = this.textContent;
            if (text === '—' || text === '') {
                this.textContent = '';
            } else if (isNumeric) {
                this.textContent = salParseMoneyInput(text).toString();
            }
        });

        td.addEventListener('blur', function () {
            const raw = this.textContent.trim();
            const freshData = salLoadData(salState.currentYear);
            let newValue;

            if (isNumeric) {
                newValue = salParseMoneyInput(raw);
                freshData[index][field] = newValue;
                this.textContent = (newValue === 0) ? '—' : salFormatMoney(newValue, decimals);
            } else {
                newValue = raw;
                this.textContent = raw;
                freshData[index][field] = newValue;
            }

            salSaveData(salState.currentYear, freshData);
            salRenderTable(win);
            salUpdateDashboard(win);
            if (salState.analysisVisible) salUpdateAnalysis(win);
        });

        return td;
    }

    function createQuarterRow(quarterIndex, startIndex) {
        const tr = document.createElement('tr');
        tr.className = 'quarter-row';
        const names = ['1-й квартал', '2-й квартал', '3-й квартал', '4-й квартал'];

        tr.innerHTML = `<td class="quarter-label">📊 ${names[quarterIndex]}</td><td></td><td></td>`;

        const fields = ['salary', 'advance', 'baseSalary', 'bonus', 'vacation'];
        const sums = {};
        fields.forEach(f => sums[f] = 0);
        let totalSum = 0;

        for (let i = startIndex; i < startIndex + 3 && i < data.length; i++) {
            const row = data[i];
            fields.forEach(f => sums[f] += parseFloat(row[f]) || 0);
            totalSum += salCalcTotal(row);
        }

        fields.forEach(f => {
            const td = document.createElement('td');
            td.className = 'total-cell';
            td.textContent = sums[f] === 0 ? '—' : salFormatMoney(sums[f], 2);
            tr.appendChild(td);
        });

        const tdTotal = document.createElement('td');
        tdTotal.className = 'total-cell';
        tdTotal.style.fontWeight = '700';
        tdTotal.textContent = totalSum === 0 ? '—' : salFormatMoney(totalSum, 2);
        tr.appendChild(tdTotal);

        return tr;
    }

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const total = salCalcTotal(row);
        const tr = document.createElement('tr');

        const tdMonth = document.createElement('td');
        tdMonth.className = 'month-label';
        tdMonth.textContent = row.month;
        tr.appendChild(tdMonth);

        tr.appendChild(createCell(row.organization, 'organization', i, false));
        tr.appendChild(createCell(row.ndflRate, 'ndflRate', i, true));
        tr.appendChild(createCell(row.salary, 'salary', i, true));
        tr.appendChild(createCell(row.advance, 'advance', i, true));
        tr.appendChild(createCell(row.baseSalary, 'baseSalary', i, true));
        tr.appendChild(createCell(row.bonus, 'bonus', i, true));
        tr.appendChild(createCell(row.vacation, 'vacation', i, true));

        const tdTotal = document.createElement('td');
        tdTotal.className = 'total-cell';
        tdTotal.textContent = total === 0 ? '—' : salFormatMoney(total, 2);
        tr.appendChild(tdTotal);

        tbody.appendChild(tr);

        if ((i + 1) % 3 === 0) {
            tbody.appendChild(createQuarterRow(Math.floor(i / 3), i - 2));
        }
    }

    const trFoot = document.createElement('tr');
    trFoot.className = 'total-row';
    trFoot.innerHTML = `<td>Итого за год:</td><td></td><td>—</td>`;

    const fieldsToSum = ['salary', 'advance', 'baseSalary', 'bonus', 'vacation'];
    const sums = {};
    fieldsToSum.forEach(f => sums[f] = 0);
    data.forEach(row => {
        fieldsToSum.forEach(f => {
            const val = parseFloat(row[f]);
            if (!isNaN(val)) sums[f] += val;
        });
    });

    fieldsToSum.forEach(f => {
        const td = document.createElement('td');
        td.className = 'total-cell';
        td.textContent = sums[f] === 0 ? '—' : salFormatMoney(sums[f], 2);
        trFoot.appendChild(td);
    });

    let totalSum = 0;
    data.forEach(row => totalSum += salCalcTotal(row));
    const tdTotalSum = document.createElement('td');
    tdTotalSum.className = 'total-cell';
    tdTotalSum.style.fontWeight = '700';
    tdTotalSum.textContent = totalSum === 0 ? '—' : salFormatMoney(totalSum, 2);
    trFoot.appendChild(tdTotalSum);

    tfoot.appendChild(trFoot);
}

// ------------------------------------------------------------
//  Дашборд
// ------------------------------------------------------------
function salUpdateDashboard(win) {
    const data = salLoadData(salState.currentYear);
    const totals = data.map(salCalcTotal);
    const valid = totals.filter(v => v > 0);
    const totalSum = valid.reduce((a, b) => a + b, 0);
    const avg = valid.length > 0 ? totalSum / valid.length : 0;
    const max = valid.length > 0 ? Math.max(...valid) : 0;
    const min = valid.length > 0 ? Math.min(...valid) : 0;

    win.querySelector('#salTotal').textContent = totalSum === 0 ? '—' : salFormatMoney(totalSum, 2) + ' ₽';
    win.querySelector('#salAvg').textContent = avg === 0 ? '—' : salFormatMoney(avg, 2) + ' ₽';
    win.querySelector('#salMax').textContent = max === 0 ? '—' : salFormatMoney(max, 2) + ' ₽';
    win.querySelector('#salMin').textContent = min === 0 ? '—' : salFormatMoney(min, 2) + ' ₽';
    win.querySelector('#salCount').textContent = valid.length;
}

function salScrollToBest(win, type) {
    const data = salLoadData(salState.currentYear);
    const totals = data.map(salCalcTotal);
    const valid = totals.filter(v => v > 0);
    if (valid.length === 0) return;

    const target = type === 'max' ? Math.max(...valid) : Math.min(...valid);
    const idx = totals.indexOf(target);
    if (idx === -1) return;

    const rows = win.querySelectorAll('#salBody tr');
    const monthIdx = idx;
    const quarterOffset = Math.floor(monthIdx / 3);
    const rowIndex = monthIdx + quarterOffset;

    const row = rows[rowIndex];
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('highlight-row');
        setTimeout(() => row.classList.remove('highlight-row'), 2200);
    }
}

// ------------------------------------------------------------
//  Чипы годов для сравнения
// ------------------------------------------------------------
function salRenderCompareChips(win) {
    const container = win.querySelector('#salCompareChips');
    const clearBtn = win.querySelector('#salCompareClear');
    const counterEl = win.querySelector('#salCompareCounter');
    if (!container) return;

    const allYears = salGetAvailableYears().sort((a, b) => a - b);
    const currentYear = salState.currentYear;
    const otherYears = allYears.filter(y => y !== currentYear);

    const colorForYear = (year) => {
        const idx = salState.compareYears.indexOf(year);
        if (idx >= 0) return SAL_COMPARE_COLORS[idx % SAL_COMPARE_COLORS.length];
        return null;
    };

    const currentChip = `
        <span class="salary-year-chip current" title="Текущий год">
            <span class="chip-dot" style="background: #4a9eff;"></span>
            <span class="chip-label">${currentYear}</span>
        </span>
    `;

    const otherChips = otherYears.map(year => {
        const isActive = salState.compareYears.includes(year);
        const color = isActive ? colorForYear(year) : null;
        const dotColor = color
            ? `style="background: ${color};"`
            : `style="background: rgba(127,127,127,0.4);"`;
        return `
            <button class="salary-year-chip ${isActive ? 'active' : ''}" data-year="${year}">
                <span class="chip-dot" ${dotColor}></span>
                <span class="chip-label">${year}</span>
            </button>
        `;
    }).join('');

    container.innerHTML = currentChip + otherChips;

    if (counterEl) {
        const count = salState.compareYears.length;
        counterEl.textContent = `${count} / ${SAL_MAX_COMPARE}`;
        counterEl.classList.remove('warning', 'max');
        if (count === SAL_MAX_COMPARE) counterEl.classList.add('max');
        else if (count === SAL_MAX_COMPARE - 1) counterEl.classList.add('warning');
    }

    container.querySelectorAll('.salary-year-chip:not(.current)').forEach(chip => {
        chip.addEventListener('click', () => {
            const year = parseInt(chip.dataset.year);
            const idx = salState.compareYears.indexOf(year);

            if (idx >= 0) {
                salState.compareYears.splice(idx, 1);
            } else {
                if (salState.compareYears.length >= SAL_MAX_COMPARE) {
                    if (window.showNotification) {
                        window.showNotification({
                            title: `Максимум ${SAL_MAX_COMPARE} лет`,
                            message: 'Уберите один из выбранных, чтобы добавить новый',
                            type: 'warning',
                            icon: '⚠️',
                            duration: 3000,
                        });
                    }
                    return;
                }
                salState.compareYears.push(year);
            }

            salRenderCompareChips(win);
            salUpdateAnalysis(win);
        });
    });

    if (clearBtn) {
        clearBtn.classList.toggle('visible', salState.compareYears.length > 0);
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);

        newClearBtn.addEventListener('click', () => {
            salState.compareYears = [];
            salRenderCompareChips(win);
            salUpdateAnalysis(win);
        });
    }
}

// ------------------------------------------------------------
//  Карточка «Сумма года vs прошлый год»
// ------------------------------------------------------------
function salRenderYearCompare(win) {
    const currentYear = salState.currentYear;
    const prevYear = currentYear - 1;

    const currentData = salLoadData(currentYear);
    const currentTotals = currentData.map(salCalcTotal);
    const currentSum = currentTotals.reduce((a, b) => a + b, 0);

    const prevKey = SAL_STORAGE_PREFIX + prevYear;
    const hasPrev = localStorage.getItem(prevKey) !== null;

    const elCurrentLabel = win.querySelector('#salYcCurrentLabel');
    const elCurrent = win.querySelector('#salYcCurrent');
    const elCurrentNote = win.querySelector('#salYcCurrentNote');
    const elPrevLabel = win.querySelector('#salYcPrevLabel');
    const elPrev = win.querySelector('#salYcPrev');
    const elPrevNote = win.querySelector('#salYcPrevNote');
    const elDelta = win.querySelector('#salYcDelta');
    const elDeltaNote = win.querySelector('#salYcDeltaNote');
    const deltaBlock = win.querySelector('#salYcDeltaBlock');

    if (!elCurrent) return;

    if (elCurrentLabel) elCurrentLabel.textContent = `Сумма ${currentYear}`;
    if (elPrevLabel) elPrevLabel.textContent = `Сумма ${prevYear}`;

    elCurrent.textContent = currentSum === 0 ? '—' : salFormatMoney(currentSum, 2) + ' ₽';
    elCurrentNote.textContent = `за ${currentYear} год`;

    deltaBlock.classList.remove('positive', 'negative');

    if (!hasPrev) {
        elPrev.textContent = '—';
        elPrevNote.textContent = `${prevYear} год не найден`;
        elDelta.textContent = '—';
        elDeltaNote.textContent = 'нет данных для сравнения';
        return;
    }

    const prevData = salLoadData(prevYear);
    const prevTotals = prevData.map(salCalcTotal);
    const prevSum = prevTotals.reduce((a, b) => a + b, 0);

    elPrev.textContent = prevSum === 0 ? '—' : salFormatMoney(prevSum, 2) + ' ₽';
    elPrevNote.textContent = `за ${prevYear} год`;

    if (currentSum === 0 || prevSum === 0) {
        elDelta.textContent = '—';
        elDeltaNote.textContent = 'недостаточно данных';
        return;
    }

    const diff = currentSum - prevSum;
    const pct = (diff / prevSum) * 100;
    const sign = diff >= 0 ? '+' : '';
    const signPct = pct >= 0 ? '+' : '';

    elDelta.textContent = `${sign}${salFormatMoney(Math.abs(diff), 2)} ₽`;
    elDeltaNote.textContent = `${signPct}${pct.toFixed(1)}% к ${prevYear}`;

    deltaBlock.classList.add(diff >= 0 ? 'positive' : 'negative');
}

// ------------------------------------------------------------
//  Анализ динамики + сравнение + средние по годам
// ------------------------------------------------------------
function salUpdateAnalysis(win) {
    salRenderCompareChips(win);
    salRenderYearCompare(win);

    const data = salLoadData(salState.currentYear);
    const totals = data.map(salCalcTotal);
    const validPoints = totals
        .map((value, index) => ({ value, index, label: data[index].month.substring(0, 3) }))
        .filter(p => p.value > 0);
    const validData = validPoints.map(p => p.value);
    const avg = validData.length > 0
        ? validData.reduce((s, v) => s + v, 0) / validData.length
        : 0;

    function setCard(selector, value, tone) {
        const card = win.querySelector(selector);
        if (!card) return;
        const valueEl = card.querySelector('.analysis-value');
        card.classList.remove('positive', 'negative');
        if (tone) card.classList.add(tone);
        valueEl.textContent = value;
    }

    setCard('#salCardAvg2', avg > 0 ? salFormatMoney(avg, 2) + ' ₽' : '—');

    let change = null;
    if (validData.length >= 2 && validData[validData.length - 2] > 0) {
        change = ((validData[validData.length - 1] - validData[validData.length - 2]) / validData[validData.length - 2]) * 100;
    }
    setCard(
        '#salCardChange',
        change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        change === null ? '' : (change >= 0 ? 'positive' : 'negative')
    );

    let trend = null;
    if (validData.length >= 2 && validData[0] > 0) {
        trend = ((validData[validData.length - 1] - validData[0]) / validData[0]) * 100;
    }
    setCard(
        '#salCardTrend',
        trend === null ? '—' : `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`,
        trend === null ? '' : (trend >= 0 ? 'positive' : 'negative')
    );

    if (validPoints.length > 0) {
        const best = validPoints.reduce((b, p) => p.value > b.value ? p : b);
        setCard('#salCardBest', salFormatMoney(best.value, 2) + ' ₽', 'positive');
    } else {
        setCard('#salCardBest', '—');
    }

    let forecast = null;
    if (validData.length > 2) {
        const n = validData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            const x = i + 1;
            const y = validData[i];
            sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        forecast = Math.max(0, slope * (n + 1) + intercept);
    }
    setCard('#salCardForecast', forecast !== null && forecast > 0 ? salFormatMoney(forecast, 2) + ' ₽' : '—');

    // ============================================================
    //  ГРАФИК
    // ============================================================
    const canvas = win.querySelector('#salChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (salState.chartInstance) {
        salState.chartInstance.destroy();
        salState.chartInstance = null;
    }

    const labels = SAL_MONTHS.map(m => m.substring(0, 3));

    const currentYearData = new Array(12).fill(null);
    validPoints.forEach(p => {
        currentYearData[p.index] = p.value;
    });

    const datasets = [{
        label: `${salState.currentYear}`,
        data: currentYearData,
        borderColor: '#4a9eff',
        backgroundColor: '#4a9eff20',
        borderWidth: 2.5,
        pointBackgroundColor: '#4a9eff',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: false,
        spanGaps: true,
        order: 1,
    }];

    salState.compareYears.forEach((year, idx) => {
        const yearData = salLoadData(year);
        const yearTotals = yearData.map(salCalcTotal);
        const compareData = new Array(12).fill(null);

        yearTotals.forEach((value, monthIdx) => {
            if (value > 0) compareData[monthIdx] = value;
        });

        const hasData = compareData.some(v => v !== null);
        if (!hasData) return;

        datasets.push({
            label: `${year}`,
            data: compareData,
            borderColor: SAL_COMPARE_COLORS[idx % SAL_COMPARE_COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: 1.75,
            borderDash: [5, 4],
            pointBackgroundColor: SAL_COMPARE_COLORS[idx % SAL_COMPARE_COLORS.length],
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: false,
            spanGaps: true,
            order: 2,
        });
    });

    if (salState.showAverage) {
        const allYearsForAvg = [...new Set([
            salState.currentYear,
            ...salState.compareYears,
        ])];

        const monthlyAvg = new Array(12).fill(null);
        for (let m = 0; m < 12; m++) {
            const values = [];
            allYearsForAvg.forEach(year => {
                const yearData = salLoadData(year);
                const total = salCalcTotal(yearData[m]);
                if (total > 0) values.push(total);
            });
            if (values.length > 0) {
                monthlyAvg[m] = values.reduce((a, b) => a + b, 0) / values.length;
            }
        }

        const hasAvgData = monthlyAvg.some(v => v !== null);
        if (hasAvgData) {
            datasets.push({
                label: `Среднее по ${allYearsForAvg.length} ${pluralizeYears(allYearsForAvg.length)}`,
                data: monthlyAvg,
                borderColor: '#ff9f40',
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                borderDash: [2, 3],
                pointBackgroundColor: '#ff9f40',
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: false,
                spanGaps: true,
                order: 0,
            });
        }
    }

    const computedStyle = getComputedStyle(canvas);
    const gridColor = computedStyle.getPropertyValue('--sal-chart-grid').trim() || 'rgba(255,255,255,0.06)';
    const ticksColor = computedStyle.getPropertyValue('--sal-chart-ticks').trim() || 'rgba(255,255,255,0.6)';
    const legendColor = computedStyle.getPropertyValue('--sal-text').trim() || '#fff';

    salState.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    align: 'start',
                    labels: {
                        color: legendColor,
                        usePointStyle: true,
                        boxWidth: 8,
                        font: { size: 11, weight: '600' },
                        padding: 12,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(40, 40, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: c => {
                            if (c.parsed.y === null || c.parsed.y === undefined) return '';
                            return c.dataset.label + ': ' + salFormatMoney(c.parsed.y, 2) + ' ₽';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: ticksColor,
                        font: { size: 10 },
                    }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: ticksColor,
                        font: { size: 10 },
                        callback: v => salFormatMoney(v, 0) + ' ₽',
                    }
                }
            }
        }
    });
}
