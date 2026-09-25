// ============================================================
//  ПРИЛОЖЕНИЕ SETTINGS — Обои + Облако + Карта
// ============================================================

function createSettingsApp() {
    const html = `
        <div class="settings-app" style="padding: 0; display: flex; flex-direction: column;">

            <!-- Вкладки -->
            <div class="settings-tabs">
                <button class="settings-tab active" data-tab="wallpapers">🖼️ Обои</button>
                <button class="settings-tab" data-tab="cloud">☁️ Облако</button>
                <button class="settings-tab" data-tab="map">🗺️ Карта</button>
            </div>

            <!-- Панель: Обои -->
            <div class="settings-panel active" id="panel-wallpapers">

                <div class="settings-section">
                    <div class="settings-section-title">🎨 Фон рабочего стола</div>
                    <div class="background-mode-toggle">
                        <button class="background-mode-btn active" data-bgmode="map">
                            <span class="bg-icon">🗺️</span>
                            <span class="bg-label">Карта мира</span>
                        </button>
                        <button class="background-mode-btn" data-bgmode="wallpaper">
                            <span class="bg-icon">🖼️</span>
                            <span class="bg-label">Обои</span>
                        </button>
                    </div>
                    <div class="wallpaper-mode-hint">
                        Карта показывает день и ночь, погоду и часы по городам. Обои — классический градиент.
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">👤 Имя пользователя</div>
                    <input type="text" id="welcomeNameInput" class="city-form-input"
                           placeholder="Введите имя" maxlength="32">
                    <div class="wallpaper-mode-hint" style="margin-top:6px;">
                        Отображается на приветственном экране при запуске системы
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Режим обоев</div>
                    <div class="wallpaper-mode-row">
                        <button class="wallpaper-mode-btn" data-mode="manual">🎨 Выбрать вручную</button>
                        <button class="wallpaper-mode-btn" data-mode="auto">🌗 По теме системы</button>
                    </div>
                    <div class="wallpaper-mode-hint" id="wallpaperModeHint"></div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Обои рабочего стола</div>
                    <div class="wallpapers-grid" id="wallpapersGrid"></div>
                </div>
            </div>

            <!-- Панель: Облако -->
            <div class="settings-panel" id="panel-cloud">
                <div class="cloud-panel">
                    <div class="cloud-header">
                        <div class="cloud-header-icon">☁️</div>
                        <div class="cloud-header-text">
                            <h2>Cloud Backup</h2>
                            <p>Синхронизация с Яндекс.Диском</p>
                        </div>
                    </div>

                    <div class="cloud-section">
                        <div class="cloud-section-title">OAuth-токен</div>
                        <div class="cloud-token-row">
                            <input type="password" class="cloud-input" id="cloudTokenInput"
                                   placeholder="Введите токен Яндекс.Диска" autocomplete="off">
                            <button class="cloud-btn primary" id="cloudSaveTokenBtn">💾 Сохранить</button>
                        </div>
                        <div class="cloud-hint">
                            Получить токен: <a href="https://yandex.ru/dev/disk/poligon/" target="_blank">yandex.ru/dev/disk/poligon</a>
                            → «Получить токен» → скопировать.
                        </div>
                    </div>

                    <div class="cloud-section">
                        <div class="cloud-section-title">Автосинхронизация</div>
                        <div class="cloud-autosync">
                            <div class="cloud-switch-row">
                                <span class="cloud-switch-label">Включить автосинхронизацию</span>
                                <label class="cloud-switch">
                                    <input type="checkbox" id="cloudAutoSyncToggle">
                                    <span class="slider"></span>
                                </label>
                            </div>
                            <div class="cloud-interval-row disabled" id="cloudIntervalRow">
                                <label for="cloudIntervalSelect">Интервал</label>
                                <select class="cloud-select" id="cloudIntervalSelect">
                                    <option value="5">5 минут</option>
                                    <option value="15">15 минут</option>
                                    <option value="30">30 минут</option>
                                    <option value="60">1 час</option>
                                </select>
                            </div>
                            <div class="cloud-next-sync inactive" id="cloudNextSync">
                                <span class="dot"></span>
                                <span>Следующая синхронизация через <span class="countdown" id="cloudCountdown">—</span></span>
                            </div>
                        </div>
                    </div>

                    <div class="cloud-section">
                        <div class="cloud-section-title">Синхронизация</div>
                        <div class="cloud-actions">
                            <button class="cloud-action-btn" id="cloudUploadBtn">
                                <span class="icon">⬆️</span>
                                <span>Сохранить в облако</span>
                            </button>
                            <button class="cloud-action-btn" id="cloudDownloadBtn">
                                <span class="icon">⬇️</span>
                                <span>Загрузить из облака</span>
                            </button>
                        </div>
                    </div>

                    <div class="cloud-section">
                        <div class="cloud-section-title">Управление</div>
                        <div class="cloud-actions">
                            <button class="cloud-btn secondary" id="cloudCheckBtn">🔍 Проверить токен</button>
                            <button class="cloud-btn danger" id="cloudResetBtn">🗑️ Сбросить токен</button>
                        </div>
                    </div>

                    <div class="cloud-section">
                        <div class="cloud-section-title">Статус</div>
                        <div class="cloud-status">
                            <div class="cloud-status-row">
                                <span class="label">Токен</span>
                                <span class="value" id="cloudTokenStatus">—</span>
                            </div>
                            <div class="cloud-status-row">
                                <span class="label">Последняя синхронизация</span>
                                <span class="value" id="cloudLastSync">—</span>
                            </div>
                            <div class="cloud-status-row">
                                <span class="label">Файл на диске</span>
                                <span class="value" id="cloudFilePath">${typeof YANDEX_BACKUP_PATH !== 'undefined' ? YANDEX_BACKUP_PATH : 'app:/macos_web_backup.json'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Панель: Карта -->
            <div class="settings-panel" id="panel-map">
                <div class="settings-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div class="settings-section-title" style="margin-bottom: 0;">🏙️ Города на карте</div>
                        <span class="cities-counter" id="citiesCounter">0</span>
                    </div>
                    <div class="wallpaper-mode-hint" style="margin-bottom: 8px;">
                        Отметьте ⭐ «Мой город» — он будет пульсировать на карте. Часы внизу показывают время для всех выбранных. Кнопка ✏️ редактирует название, координаты и часовой пояс.
                    </div>

                    <div class="cities-list" id="citiesList"></div>

                    <button class="city-add-btn" id="cityAddBtn">
                        ➕ Добавить свой город
                    </button>

                    <!-- Форма добавления / редактирования -->
                    <div class="city-add-form" id="cityAddForm">
                        <div>
                            <label class="city-form-label" for="cityNameInput">Название города</label>
                            <input type="text" id="cityNameInput" class="city-form-input"
                                   placeholder="Например, Казань" maxlength="30">
                        </div>
                        <div class="city-form-row">
                            <div style="flex: 1;">
                                <label class="city-form-label" for="cityLatInput">Широта</label>
                                <input type="number" id="cityLatInput" class="city-form-input"
                                       placeholder="55.79" step="0.01" min="-90" max="90">
                            </div>
                            <div style="flex: 1;">
                                <label class="city-form-label" for="cityLonInput">Долгота</label>
                                <input type="number" id="cityLonInput" class="city-form-input"
                                       placeholder="49.12" step="0.01" min="-180" max="180">
                            </div>
                        </div>
                        <div>
                            <label class="city-form-label" for="cityTzInput">Часовой пояс (UTC±)</label>
                            <input type="number" id="cityTzInput" class="city-form-input"
                                   placeholder="3" step="1" min="-12" max="14" value="3">
                        </div>
                        <div class="city-form-hint">
                            💡 Координаты легко найти на <a href="https://www.openstreetmap.org" target="_blank">openstreetmap.org</a> —
                            правый клик по городу → «Показать адрес».
                        </div>
                        <div class="city-form-actions">
                            <button class="city-form-btn secondary" id="cityCancelBtn">Отмена</button>
                            <button class="city-form-btn primary" id="citySubmitBtn">✓ Добавить</button>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">📋 Популярные города</div>
                    <div class="city-presets" id="cityPresets"></div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">⚙️ Управление</div>
                    <div class="cloud-actions">
                        <button class="cloud-btn secondary" id="citiesResetBtn">🔄 Вернуть стандартные</button>
                        <button class="cloud-btn danger" id="citiesClearBtn">🗑️ Удалить все</button>
                    </div>
                </div>
            </div>

            <div class="cloud-toast" id="cloudToast" style="position: absolute;"></div>
        </div>
    `;

    const win = createWindow({
        title: 'System Settings',
        width: 620,
        height: 760,
        content: html,
    });
    win.dataset.app = 'settings';
    win.style.minWidth = '480px';
    win.style.minHeight = '560px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    initSettingsApp(win);
    return win;
}

function initSettingsApp(win) {
    // Вкладки
    const tabs = win.querySelectorAll('.settings-tab');
    const panels = win.querySelectorAll('.settings-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.toggle('active', t === tab));
            panels.forEach(p => {
                p.classList.toggle('active', p.id === `panel-${target}`);
            });
        });
    });

    initWallpapersPanel(win);
    initCloudPanel(win);
    initMapPanel(win);
}

// ------------------------------------------------------------
//  Панель обоев
// ------------------------------------------------------------
function initWallpapersPanel(win) {
    const grid = win.querySelector('#wallpapersGrid');
    const hint = win.querySelector('#wallpaperModeHint');
    const modeBtns = win.querySelectorAll('.wallpaper-mode-btn');
    const nameInput = win.querySelector('#welcomeNameInput');
    if (!grid) return;

    // ---- Переключатель фона: карта ↔ обои ----
    const bgModeBtns = win.querySelectorAll('.background-mode-btn');

    function updateBgModeUI() {
        const mode = typeof window.getBackgroundMode === 'function'
            ? window.getBackgroundMode()
            : 'map';
        bgModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bgmode === mode);
        });
    }

    bgModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.bgmode;

            if (typeof window.setBackgroundMode === 'function') {
                window.setBackgroundMode(mode);
            } else {
                localStorage.setItem('desktopBackgroundMode', mode);
            }

            updateBgModeUI();

            if (window.showNotification) {
                window.showNotification({
                    title: mode === 'map' ? 'Карта включена' : 'Обои включены',
                    message: mode === 'map'
                        ? 'Рабочий стол показывает карту мира'
                        : 'Рабочий стол показывает обои',
                    type: 'success',
                    icon: mode === 'map' ? '🗺️' : '🖼️',
                    duration: 2500,
                });
            }
        });
    });

    updateBgModeUI();

    // ---- Имя пользователя ----
    if (nameInput) {
        nameInput.value = localStorage.getItem('welcomeUsername') || '';
        nameInput.addEventListener('focus', () => {
            nameInput.style.borderColor = '#4a9eff';
        });
        nameInput.addEventListener('blur', () => {
            nameInput.style.borderColor = 'var(--app-input-border)';
        });
        nameInput.addEventListener('input', () => {
            const val = nameInput.value.trim();
            if (val) {
                localStorage.setItem('welcomeUsername', val);
            } else {
                localStorage.removeItem('welcomeUsername');
            }
        });
    }

    function updateModeButtons() {
        const manual = isWallpaperManual();
        modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === (manual ? 'manual' : 'auto'));
        });
        hint.textContent = manual
            ? '🎨 Обои выбраны вручную и не меняются при смене темы системы.'
            : '🌗 Обои автоматически меняются при смене светлой/тёмной темы системы.';
    }

    function renderWallpapers() {
        grid.innerHTML = '';
        const activeId = getCurrentWallpaperId() || getDefaultWallpaperId();
        const manual = isWallpaperManual();

        WALLPAPERS.forEach(wp => {
            const item = document.createElement('div');
            item.className = 'wallpaper-item';
            if (wp.id === activeId && (manual || wp.id === activeId)) {
                item.classList.add('selected');
            }

            item.style.background = wp.value;
            item.dataset.id = wp.id;
            item.title = wp.name;

            const themeIcon = wp.theme === 'dark' ? '🌙' : '☀️';
            item.innerHTML = `<div class="wallpaper-label">${themeIcon} ${wp.name}</div>`;

            item.addEventListener('click', () => {
                grid.querySelectorAll('.wallpaper-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');

                setWallpaperManually(wp.id);

                // Автоматически включаем режим «Обои»
                if (typeof window.setBackgroundMode === 'function') {
                    window.setBackgroundMode('wallpaper');
                    updateBgModeUI();
                }

                // Обновляем слой обоев
                if (typeof window.refreshWallpaperLayer === 'function') {
                    setTimeout(window.refreshWallpaperLayer, 50);
                }

                if (window.showNotification) {
                    window.showNotification({
                        title: 'Обои изменены',
                        message: `Установлены: ${wp.name}`,
                        type: 'success',
                        icon: '🖼️',
                        duration: 2500,
                    });
                }
                updateModeButtons();
            });

            grid.appendChild(item);
        });
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.mode === 'auto') {
                resetWallpaperToAuto();
                if (window.showNotification) {
                    window.showNotification({
                        title: 'Авто-режим включён',
                        message: 'Обои будут меняться вместе с темой системы',
                        type: 'success',
                        icon: '🌗',
                        duration: 2500,
                    });
                }
            } else {
                setWallpaperManual(true);
                if (window.showNotification) {
                    window.showNotification({
                        title: 'Ручной режим',
                        message: 'Обои больше не меняются автоматически',
                        type: 'info',
                        icon: '🎨',
                        duration: 2500,
                    });
                }
            }
            renderWallpapers();
            updateModeButtons();

            // Обновляем слой обоев
            if (typeof window.refreshWallpaperLayer === 'function') {
                window.refreshWallpaperLayer();
            }
        });
    });

    renderWallpapers();
    updateModeButtons();
}

// ------------------------------------------------------------
//  Панель облака
// ------------------------------------------------------------
function initCloudPanel(win) {
    const tokenInput       = win.querySelector('#cloudTokenInput');
    const saveTokenBtn     = win.querySelector('#cloudSaveTokenBtn');
    const uploadBtn        = win.querySelector('#cloudUploadBtn');
    const downloadBtn      = win.querySelector('#cloudDownloadBtn');
    const checkBtn         = win.querySelector('#cloudCheckBtn');
    const resetBtn         = win.querySelector('#cloudResetBtn');
    const tokenStatus      = win.querySelector('#cloudTokenStatus');
    const lastSyncEl       = win.querySelector('#cloudLastSync');
    const toastEl          = win.querySelector('#cloudToast');

    const autoSyncToggle   = win.querySelector('#cloudAutoSyncToggle');
    const intervalRow      = win.querySelector('#cloudIntervalRow');
    const intervalSelect   = win.querySelector('#cloudIntervalSelect');
    const nextSyncBox      = win.querySelector('#cloudNextSync');
    const countdownEl      = win.querySelector('#cloudCountdown');

    if (!tokenInput) return;

    let toastTimer = null;
    function toast(message, type = 'success') {
        clearTimeout(toastTimer);
        toastEl.textContent = message;
        toastEl.className = 'cloud-toast ' + type;
        requestAnimationFrame(() => toastEl.classList.add('show'));
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    function formatCountdown(seconds) {
        if (seconds <= 0) return '0 сек';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m === 0) return s + ' сек';
        return m + ' мин ' + String(s).padStart(2, '0') + ' сек';
    }

    function refreshStatus() {
        const token = getYandexToken();
        if (token) {
            const masked = token.length > 12
                ? token.slice(0, 6) + '…' + token.slice(-4)
                : '••••';
            tokenStatus.textContent = '✅ ' + masked;
            tokenStatus.className = 'value ok';
        } else {
            tokenStatus.textContent = '❌ не задан';
            tokenStatus.className = 'value error';
        }

        const lastSync = localStorage.getItem(CLOUD_LAST_SYNC_KEY);
        if (lastSync) {
            try {
                const d = new Date(lastSync);
                lastSyncEl.textContent = d.toLocaleString('ru-RU', {
                    day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit'
                });
            } catch (e) {
                lastSyncEl.textContent = lastSync;
            }
        } else {
            lastSyncEl.textContent = 'никогда';
        }
    }

    function refreshAutoSyncUI() {
        const enabled = getAutoSyncEnabled();
        const interval = getSyncInterval();

        autoSyncToggle.checked = enabled;
        intervalSelect.value = String(interval);
        intervalRow.classList.toggle('disabled', !enabled);

        if (enabled) {
            nextSyncBox.classList.remove('inactive');
            if (typeof nextSyncTimestamp !== 'undefined' && nextSyncTimestamp) {
                const secondsLeft = Math.max(0, Math.ceil((nextSyncTimestamp - Date.now()) / 1000));
                countdownEl.textContent = formatCountdown(secondsLeft);
            } else {
                countdownEl.textContent = '—';
            }
        } else {
            nextSyncBox.classList.add('inactive');
            countdownEl.textContent = '—';
        }
    }

    if (typeof onAutoSync === 'function') {
        onAutoSync((type, payload) => {
            if (type === 'tick') {
                if (getAutoSyncEnabled()) {
                    countdownEl.textContent = formatCountdown(payload.secondsLeft);
                }
            } else if (type === 'success') {
                refreshStatus();
                if (!payload.skipped) {
                    toast('Автосинхронизация выполнена', 'success');
                }
            } else if (type === 'error') {
                toast('Автосинхронизация: ' + getCloudNetworkMessage(payload.error), 'error');
            } else if (type === 'state') {
                refreshAutoSyncUI();
            }
        });
    }

    function setBusy(busy, activeBtn, label) {
        [saveTokenBtn, uploadBtn, downloadBtn, checkBtn, resetBtn].forEach(btn => {
            btn.disabled = busy;
            if (!btn.dataset.originalHtml) {
                btn.dataset.originalHtml = btn.innerHTML;
            }
            if (btn === activeBtn && busy) {
                btn.innerHTML = label;
            } else {
                btn.innerHTML = btn.dataset.originalHtml;
            }
        });
    }

    saveTokenBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (!token) {
            toast('Введите токен', 'error');
            return;
        }
        setYandexToken(token);
        tokenInput.value = '';
        refreshStatus();
        if (getAutoSyncEnabled()) startAutoSync();
        toast('Токен сохранён', 'success');
    });

    autoSyncToggle.addEventListener('change', () => {
        const enabled = autoSyncToggle.checked;
        if (enabled && !getYandexToken()) {
            autoSyncToggle.checked = false;
            toast('Сначала сохраните токен', 'error');
            return;
        }
        setAutoSyncEnabled(enabled);

        if (enabled) {
            startAutoSync();
            toast('Автосинхронизация включена', 'success');
        } else {
            stopAutoSync();
            toast('Автосинхронизация выключена', 'warning');
        }
        refreshAutoSyncUI();
    });

    intervalSelect.addEventListener('change', () => {
        const minutes = parseInt(intervalSelect.value);
        setSyncInterval(minutes);
        if (getAutoSyncEnabled()) {
            startAutoSync();
            toast('Интервал: ' + minutes + ' мин', 'success');
        }
        refreshAutoSyncUI();
    });

    uploadBtn.addEventListener('click', async () => {
        if (!getYandexToken()) {
            toast('Сначала введите токен', 'error');
            return;
        }
        setBusy(true, uploadBtn, '<span class="icon">⏳</span><span>Сохранение…</span>');
        try {
            await saveToYandexDisk(false);
            refreshStatus();
            toast('Данные сохранены в облако', 'success');
        } catch (error) {
            toast('Ошибка: ' + getCloudNetworkMessage(error), 'error');
        } finally {
            setBusy(false);
        }
    });

    downloadBtn.addEventListener('click', async () => {
        if (!getYandexToken()) {
            toast('Сначала введите токен', 'error');
            return;
        }
        setBusy(true, downloadBtn, '<span class="icon">⏳</span><span>Загрузка…</span>');
        try {
            const data = await loadFromYandexDisk();
            const keys = data && data.storage ? Object.keys(data.storage).length : 0;
            refreshStatus();
            toast(`Загружено записей: ${keys}`, 'success');
        } catch (error) {
            toast('Ошибка: ' + getCloudNetworkMessage(error), 'error');
        } finally {
            setBusy(false);
        }
    });

    checkBtn.addEventListener('click', async () => {
        if (!getYandexToken()) {
            toast('Токен не задан', 'warning');
            return;
        }
        setBusy(true, checkBtn, '⏳ Проверка…');
        try {
            await verifyYandexToken();
            refreshStatus();
            toast('Токен действителен', 'success');
        } catch (error) {
            refreshStatus();
            toast('Ошибка: ' + getCloudNetworkMessage(error), 'error');
        } finally {
            setBusy(false);
        }
    });

    resetBtn.addEventListener('click', () => {
        if (!getYandexToken()) {
            toast('Токен уже сброшен', 'warning');
            return;
        }
        setYandexToken(null);
        if (getAutoSyncEnabled()) {
            setAutoSyncEnabled(false);
            stopAutoSync();
        }
        refreshStatus();
        refreshAutoSyncUI();
        toast('Токен сброшен', 'warning');
    });

    tokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveTokenBtn.click();
    });

    refreshStatus();
    refreshAutoSyncUI();
}

// ------------------------------------------------------------
//  Панель карты — управление городами
// ------------------------------------------------------------
function initMapPanel(win) {
    const list        = win.querySelector('#citiesList');
    const counter     = win.querySelector('#citiesCounter');
    const addBtn      = win.querySelector('#cityAddBtn');
    const addForm     = win.querySelector('#cityAddForm');
    const nameInput   = win.querySelector('#cityNameInput');
    const latInput    = win.querySelector('#cityLatInput');
    const lonInput    = win.querySelector('#cityLonInput');
    const tzInput     = win.querySelector('#cityTzInput');
    const submitBtn   = win.querySelector('#citySubmitBtn');
    const cancelBtn   = win.querySelector('#cityCancelBtn');
    const presetsEl   = win.querySelector('#cityPresets');
    const resetBtn    = win.querySelector('#citiesResetBtn');
    const clearBtn    = win.querySelector('#citiesClearBtn');

    if (!list) return;

    // -1 = не редактируем, иначе — индекс редактируемого города
    let editingIndex = -1;

    function getCities() {
        if (typeof window.getCitiesList === 'function') {
            return window.getCitiesList();
        }
        return [];
    }

    function saveCities(cities) {
        if (typeof window.setCitiesList === 'function') {
            window.setCitiesList(cities);
        }
    }

    // ---- Отрисовка списка городов ----
    function renderCities() {
        const cities = getCities();
        list.innerHTML = '';

        if (cities.length === 0) {
            list.innerHTML = '<div class="cities-empty">Нет добавленных городов.<br>Добавьте свой или выберите из популярных ниже.</div>';
            counter.textContent = '0';
            return;
        }

        counter.textContent = String(cities.length);

        cities.forEach((city, idx) => {
            const item = document.createElement('div');
            item.className = 'city-item';
            if (city.my) item.classList.add('my-city');

            const lat = city.lat.toFixed(2);
            const lon = city.lon.toFixed(2);
            const tz = city.tz >= 0 ? `UTC+${city.tz}` : `UTC${city.tz}`;

            item.innerHTML = `
                <button class="city-star ${city.my ? 'active' : ''}" title="${city.my ? 'Это мой город' : 'Сделать моим городом'}">
                    ${city.my ? '⭐' : '☆'}
                </button>
                <div class="city-info">
                    <div class="city-name">${city.name}</div>
                    <div class="city-coords">${lat}, ${lon} · ${tz}</div>
                </div>
                <button class="city-edit" title="Редактировать">✏️</button>
                <button class="city-remove" title="Удалить">🗑️</button>
            `;

            // Звёздочка
            item.querySelector('.city-star').addEventListener('click', () => {
                const cities = getCities();
                cities.forEach(c => c.my = false);
                cities[idx].my = true;
                saveCities(cities);
                renderCities();
                renderPresets();

                if (window.showNotification) {
                    window.showNotification({
                        title: 'Мой город',
                        message: `${city.name} отмечен как ваш город`,
                        type: 'success',
                        icon: '⭐',
                        duration: 2500,
                    });
                }
            });

            // Редактирование
            item.querySelector('.city-edit').addEventListener('click', () => {
                editingIndex = idx;
                openCityForm(city);
            });

            // Удаление
            item.querySelector('.city-remove').addEventListener('click', () => {
                const cities = getCities();
                const removed = cities.splice(idx, 1)[0];
                saveCities(cities);
                renderCities();
                renderPresets();

                if (window.showNotification) {
                    window.showNotification({
                        title: 'Город удалён',
                        message: `${removed.name} убран с карты`,
                        type: 'info',
                        icon: '🗑️',
                        duration: 2000,
                    });
                }
            });

            list.appendChild(item);
        });
    }

    // ---- Форма: открыть для добавления или редактирования ----
    function openCityForm(cityToEdit) {
        addForm.classList.add('visible');
        addBtn.style.display = 'none';

        const isEdit = !!cityToEdit && editingIndex >= 0;

        let titleEl = addForm.querySelector('.city-form-title');
        if (!titleEl) {
            titleEl = document.createElement('div');
            titleEl.className = 'city-form-title';
            addForm.insertBefore(titleEl, addForm.firstChild);
        }
        titleEl.textContent = isEdit ? '✏️ Редактирование города' : '➕ Новый город';

        if (isEdit) {
            nameInput.value = cityToEdit.name || '';
            latInput.value = cityToEdit.lat != null ? cityToEdit.lat : '';
            lonInput.value = cityToEdit.lon != null ? cityToEdit.lon : '';
            tzInput.value = cityToEdit.tz != null ? cityToEdit.tz : 0;
            submitBtn.textContent = '💾 Сохранить';
        } else {
            nameInput.value = '';
            latInput.value = '';
            lonInput.value = '';
            tzInput.value = '3';
            submitBtn.textContent = '✓ Добавить';
        }

        nameInput.focus();
    }

    function closeCityForm() {
        addForm.classList.remove('visible');
        addBtn.style.display = 'flex';
        editingIndex = -1;
        nameInput.value = '';
        latInput.value = '';
        lonInput.value = '';
        tzInput.value = '3';
        submitBtn.textContent = '✓ Добавить';

        const titleEl = addForm.querySelector('.city-form-title');
        if (titleEl) titleEl.textContent = '➕ Новый город';
    }

    // ---- Пресеты ----
    const PRESET_CITIES = [
        { name: 'Москва',        lat: 55.75, lon: 37.62,  tz: 3 },
        { name: 'Санкт-Петербург', lat: 59.93, lon: 30.34, tz: 3 },
        { name: 'Казань',        lat: 55.79, lon: 49.12,  tz: 3 },
        { name: 'Новосибирск',   lat: 55.03, lon: 82.92,  tz: 7 },
        { name: 'Лондон',        lat: 51.51, lon: -0.13,  tz: 0 },
        { name: 'Париж',         lat: 48.85, lon: 2.35,   tz: 1 },
        { name: 'Берлин',        lat: 52.52, lon: 13.40,  tz: 1 },
        { name: 'Нью-Йорк',      lat: 40.71, lon: -74.01, tz: -5 },
        { name: 'Лос-Анджелес',  lat: 34.05, lon: -118.24, tz: -8 },
        { name: 'Токио',         lat: 35.68, lon: 139.69, tz: 9 },
        { name: 'Пекин',         lat: 39.90, lon: 116.40, tz: 8 },
        { name: 'Дубай',         lat: 25.20, lon: 55.27,  tz: 4 },
        { name: 'Сидней',        lat: -33.87, lon: 151.21, tz: 10 },
        { name: 'Сан-Паулу',     lat: -23.55, lon: -46.63, tz: -3 },
        { name: 'Стамбул',       lat: 41.01, lon: 28.98,  tz: 3 },
        { name: 'Бангкок',       lat: 13.76, lon: 100.50, tz: 7 },
        { name: 'Мумбаи',        lat: 19.08, lon: 72.88,  tz: 5 },
        { name: 'Мехико',        lat: 19.43, lon: -99.13, tz: -6 },
        { name: 'Каир',          lat: 30.04, lon: 31.24,  tz: 2 },
        { name: 'Кейптаун',      lat: -33.92, lon: 18.42, tz: 2 },
    ];

    function renderPresets() {
        const cities = getCities();
        const existingNames = new Set(cities.map(c => c.name.toLowerCase()));

        presetsEl.innerHTML = '';

        PRESET_CITIES.forEach(preset => {
            const isAdded = existingNames.has(preset.name.toLowerCase());
            const chip = document.createElement('button');
            chip.className = 'city-preset-chip' + (isAdded ? ' added' : '');
            chip.textContent = preset.name;
            chip.title = isAdded ? 'Уже добавлен' : 'Нажмите, чтобы добавить';

            if (!isAdded) {
                chip.addEventListener('click', () => {
                    const cities = getCities();
                    const makeMy = cities.length === 0;
                    cities.push({
                        name: preset.name,
                        lat: preset.lat,
                        lon: preset.lon,
                        tz: preset.tz,
                        my: makeMy,
                    });
                    saveCities(cities);
                    renderCities();
                    renderPresets();

                    if (window.showNotification) {
                        window.showNotification({
                            title: 'Город добавлен',
                            message: preset.name,
                            type: 'success',
                            icon: '🏙️',
                            duration: 2000,
                        });
                    }
                });
            }

            presetsEl.appendChild(chip);
        });
    }

    // ---- Форма ----
    function showForm() {
        editingIndex = -1;
        openCityForm(null);
    }

    function hideForm() {
        closeCityForm();
    }

    addBtn.addEventListener('click', showForm);
    cancelBtn.addEventListener('click', hideForm);

    submitBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        const tz = parseInt(tzInput.value) || 0;

        if (!name) {
            if (window.showNotification) window.showNotification({
                title: 'Ошибка', message: 'Введите название города',
                type: 'error', icon: '⚠️', duration: 2500,
            });
            nameInput.focus();
            return;
        }

        if (isNaN(lat) || lat < -90 || lat > 90) {
            if (window.showNotification) window.showNotification({
                title: 'Ошибка', message: 'Широта должна быть от -90 до 90',
                type: 'error', icon: '⚠️', duration: 2500,
            });
            latInput.focus();
            return;
        }

        if (isNaN(lon) || lon < -180 || lon > 180) {
            if (window.showNotification) window.showNotification({
                title: 'Ошибка', message: 'Долгота должна быть от -180 до 180',
                type: 'error', icon: '⚠️', duration: 2500,
            });
            lonInput.focus();
            return;
        }

        const cities = getCities();
        const isEdit = editingIndex >= 0;

        // Проверка на дубликат имени (кроме редактируемого города)
        const duplicateIdx = cities.findIndex(
            (c, i) => i !== editingIndex && c.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicateIdx !== -1) {
            if (window.showNotification) window.showNotification({
                title: 'Ошибка', message: 'Город с таким названием уже есть',
                type: 'warning', icon: '⚠️', duration: 2500,
            });
            return;
        }

        if (isEdit) {
            // Сохраняем флаг «мой город»
            const wasMy = cities[editingIndex].my;
            cities[editingIndex] = { name, lat, lon, tz, my: wasMy };

            saveCities(cities);
            renderCities();
            renderPresets();
            closeCityForm();

            if (window.showNotification) {
                window.showNotification({
                    title: 'Город обновлён', message: name,
                    type: 'success', icon: '✏️', duration: 2500,
                });
            }
        } else {
            // Добавление
            const makeMy = cities.length === 0;
            cities.push({ name, lat, lon, tz, my: makeMy });
            saveCities(cities);

            renderCities();
            renderPresets();
            closeCityForm();

            if (window.showNotification) {
                window.showNotification({
                    title: 'Город добавлен', message: name,
                    type: 'success', icon: '🏙️', duration: 2500,
                });
            }
        }
    });

    [nameInput, latInput, lonInput, tzInput].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitBtn.click();
            if (e.key === 'Escape') hideForm();
        });
    });

    // ---- Сброс ----
    resetBtn.addEventListener('click', () => {
        if (!confirm('Вернуть стандартный список городов?')) return;

        const defaults = [
            { name: 'Москва',       lat: 55.75, lon: 37.62,  tz: 3,  my: true },
            { name: 'Лондон',       lat: 51.51, lon: -0.13,  tz: 0,  my: false },
            { name: 'Нью-Йорк',     lat: 40.71, lon: -74.01, tz: -5, my: false },
            { name: 'Лос-Анджелес', lat: 34.05, lon: -118.24, tz: -8, my: false },
            { name: 'Токио',        lat: 35.68, lon: 139.69, tz: 9,  my: false },
            { name: 'Сидней',       lat: -33.87, lon: 151.21, tz: 10, my: false },
            { name: 'Дубай',        lat: 25.20, lon: 55.27,  tz: 4,  my: false },
            { name: 'Сан-Паулу',    lat: -23.55, lon: -46.63, tz: -3, my: false },
        ];

        saveCities(JSON.parse(JSON.stringify(defaults)));
        renderCities();
        renderPresets();

        if (window.showNotification) {
            window.showNotification({
                title: 'Список восстановлен',
                message: 'Стандартные города возвращены',
                type: 'success', icon: '🔄', duration: 2500,
            });
        }
    });

    // ---- Удалить все ----
    clearBtn.addEventListener('click', () => {
        if (!confirm('Удалить все города с карты?')) return;

        saveCities([]);
        renderCities();
        renderPresets();

        if (window.showNotification) {
            window.showNotification({
                title: 'Все города удалены',
                message: 'Список пуст',
                type: 'warning', icon: '🗑️', duration: 2500,
            });
        }
    });

    renderCities();
    renderPresets();
}