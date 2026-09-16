// ============================================================
//  ПРИЛОЖЕНИЕ SETTINGS — Обои + Облако (вкладки)
// ============================================================

function createSettingsApp() {
    const html = `
        <div class="settings-app" style="padding: 0; display: flex; flex-direction: column;">

            <!-- Вкладки -->
            <div class="settings-tabs">
                <button class="settings-tab active" data-tab="wallpapers">🖼️ Обои</button>
                <button class="settings-tab" data-tab="cloud">☁️ Облако</button>
            </div>

            <!-- Панель: Обои -->
            <div class="settings-panel active" id="panel-wallpapers">

                <div class="settings-section">
                    <div class="settings-section-title">👤 Имя пользователя</div>
                    <input
                        type="text"
                        id="welcomeNameInput"
                        placeholder="Введите имя"
                        maxlength="32"
                        style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--window-border); background:var(--cal-nav-bg); color:var(--window-text); font-family:inherit; font-size:13px; outline:none; transition:border-color 0.15s, background 0.15s;"
                    >
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
                                <span class="value" id="cloudFilePath">${YANDEX_BACKUP_PATH}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="cloud-toast" id="cloudToast" style="position: absolute;"></div>
        </div>
    `;

    const win = createWindow({
        title: 'System Settings',
        width: 560,
        height: 700,
        content: html,
    });
    win.dataset.app = 'settings';
    win.style.minWidth = '460px';
    win.style.minHeight = '540px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    initSettingsApp(win);
    return win;
}

function initSettingsApp(win) {
    // ============================================================
    //  ВКЛАДКИ
    // ============================================================
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

    // ============================================================
    //  ПАНЕЛЬ: ОБОИ (+ имя пользователя)
    // ============================================================
    initWallpapersPanel(win);

    // ============================================================
    //  ПАНЕЛЬ: ОБЛАКО
    // ============================================================
    initCloudPanel(win);
}

// ------------------------------------------------------------
//  Панель обоев + имя пользователя
// ------------------------------------------------------------
function initWallpapersPanel(win) {
    const grid = win.querySelector('#wallpapersGrid');
    const hint = win.querySelector('#wallpaperModeHint');
    const modeBtns = win.querySelectorAll('.wallpaper-mode-btn');
    const nameInput = win.querySelector('#welcomeNameInput');
    if (!grid) return;

    // ---------- Имя пользователя ----------
    if (nameInput) {
        nameInput.value = localStorage.getItem('welcomeUsername') || '';

        // Стилевое выделение при фокусе
        nameInput.addEventListener('focus', () => {
            nameInput.style.borderColor = '#4a9eff';
            nameInput.style.background = 'var(--cal-nav-bg-hover)';
        });
        nameInput.addEventListener('blur', () => {
            nameInput.style.borderColor = 'var(--window-border)';
            nameInput.style.background = 'var(--cal-nav-bg)';
        });

        nameInput.addEventListener('input', () => {
            const val = nameInput.value.trim();
            if (val) {
                localStorage.setItem('welcomeUsername', val);
            } else {
                localStorage.removeItem('welcomeUsername');
            }
        });

        // Уведомление при сохранении (по Enter)
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                nameInput.blur();
                const val = nameInput.value.trim();
                if (window.showNotification) {
                    window.showNotification({
                        title: 'Имя сохранено',
                        message: val ? `Теперь вас зовут: ${val}` : 'Имя сброшено на «Гость»',
                        type: 'success',
                        icon: '👤',
                        duration: 2500,
                    });
                }
            }
        });
    }

    // ---------- Обои ----------
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
            console.error('Ошибка сохранения:', error);
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
            console.error('Ошибка загрузки:', error);
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
