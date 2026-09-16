// ============================================================
//  CLOUD BACKUP — синхронизация с Яндекс.Диском
//  + Автосинхронизация
// ============================================================

const YANDEX_BACKUP_PATH = 'app:/macos_web_backup.json';
const YANDEX_TOKEN_KEY = 'yandexToken';
const CLOUD_AUTOSYNC_KEY = 'cloudAutoSync';
const CLOUD_INTERVAL_KEY = 'cloudSyncInterval';
const CLOUD_LAST_SYNC_KEY = 'cloudLastSync';
const CLOUD_LAST_HASH_KEY = 'cloudLastHash';

// ------------------------------------------------------------
//  Токен
// ------------------------------------------------------------
function getYandexToken() {
    return localStorage.getItem(YANDEX_TOKEN_KEY) || null;
}

function setYandexToken(token) {
    if (token) {
        localStorage.setItem(YANDEX_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(YANDEX_TOKEN_KEY);
    }
}

// ------------------------------------------------------------
//  Настройки автосинхронизации
// ------------------------------------------------------------
function getAutoSyncEnabled() {
    return localStorage.getItem(CLOUD_AUTOSYNC_KEY) === '1';
}

function setAutoSyncEnabled(enabled) {
    localStorage.setItem(CLOUD_AUTOSYNC_KEY, enabled ? '1' : '0');
}

function getSyncInterval() {
    const val = parseInt(localStorage.getItem(CLOUD_INTERVAL_KEY));
    return isNaN(val) ? 15 : val;
}

function setSyncInterval(minutes) {
    localStorage.setItem(CLOUD_INTERVAL_KEY, String(minutes));
}

// ------------------------------------------------------------
//  Утилита — понятное сообщение об ошибке сети
// ------------------------------------------------------------
function getCloudNetworkMessage(error) {
    const message = error && error.message ? error.message : String(error);
    if (
        message.includes('Failed to fetch') ||
        message.includes('Load failed') ||
        message.includes('NetworkError')
    ) {
        return 'Не удалось выполнить сетевой запрос. Проверьте подключение к интернету и VPN.';
    }
    return message;
}

// ------------------------------------------------------------
//  Проверка ответа от API Яндекса
// ------------------------------------------------------------
async function getYandexErrorDescription(response) {
    try {
        const errorData = await response.json();
        return errorData.description || errorData.message || '';
    } catch (e) {
        return '';
    }
}

async function checkYandexResponse(response, operation) {
    if (response.ok) return;

    const description = await getYandexErrorDescription(response);

    if (response.status === 401) {
        setYandexToken(null);
        throw new Error('Токен недействителен или истёк. Укажите новый OAuth-токен.');
    }
    if (response.status === 403) {
        throw new Error('Нет доступа к Яндекс.Диску. Проверьте права токена.');
    }
    if (response.status === 404 && operation === 'load') {
        throw new Error('Резервная копия не найдена. Сначала сохраните данные.');
    }

    throw new Error(description || `Ошибка Яндекс.Диска: HTTP ${response.status}.`);
}

// ------------------------------------------------------------
//  Сбор данных для сохранения
// ------------------------------------------------------------
function collectBackupData() {
    const data = {
        version: '1.0',
        exported: new Date().toISOString(),
        platform: 'macOS Web Simulator',
        storage: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === YANDEX_TOKEN_KEY) continue;
        if (key === CLOUD_LAST_SYNC_KEY) continue;
        if (key === CLOUD_LAST_HASH_KEY) continue;
        try {
            const raw = localStorage.getItem(key);
            data.storage[key] = raw;
        } catch (e) {}
    }

    return data;
}

// ------------------------------------------------------------
//  Быстрый хеш строки (djb2)
// ------------------------------------------------------------
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0xffffffff;
    }
    return (hash >>> 0).toString(16);
}

function getCurrentDataHash() {
    const data = collectBackupData();
    const sortedKeys = Object.keys(data.storage).sort();
    const parts = sortedKeys.map(k => k + '=' + data.storage[k]);
    return hashString(parts.join('|'));
}

// ------------------------------------------------------------
//  Сохранение
// ------------------------------------------------------------
async function saveToYandexDisk(skipIfUnchanged = false) {
    const token = getYandexToken();
    if (!token) {
        throw new Error('Токен не задан. Введите OAuth-токен.');
    }

    if (skipIfUnchanged) {
        const currentHash = getCurrentDataHash();
        const lastHash = localStorage.getItem(CLOUD_LAST_HASH_KEY);
        if (currentHash === lastHash) {
            return { skipped: true };
        }
    }

    const data = collectBackupData();

    const uploadUrlResponse = await fetch(
        'https://cloud-api.yandex.net/v1/disk/resources/upload?path=' +
        encodeURIComponent(YANDEX_BACKUP_PATH) +
        '&overwrite=true',
        {
            method: 'GET',
            headers: { 'Authorization': `OAuth ${token}` }
        }
    );
    await checkYandexResponse(uploadUrlResponse, 'save');

    const uploadInfo = await uploadUrlResponse.json();
    if (!uploadInfo.href) {
        throw new Error('Яндекс.Диск не вернул ссылку для загрузки файла.');
    }

    const uploadResponse = await fetch(uploadInfo.href, {
        method: 'PUT',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data, null, 2)
    });
    if (!uploadResponse.ok) {
        throw new Error(`Не удалось сохранить файл: HTTP ${uploadResponse.status}.`);
    }

    localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());
    localStorage.setItem(CLOUD_LAST_HASH_KEY, getCurrentDataHash());

    return { skipped: false };
}

// ------------------------------------------------------------
//  Загрузка
// ------------------------------------------------------------
async function loadFromYandexDisk() {
    const token = getYandexToken();
    if (!token) {
        throw new Error('Токен не задан. Введите OAuth-токен.');
    }

    const downloadUrlResponse = await fetch(
        'https://cloud-api.yandex.net/v1/disk/resources/download?path=' +
        encodeURIComponent(YANDEX_BACKUP_PATH),
        {
            method: 'GET',
            headers: { 'Authorization': `OAuth ${token}` }
        }
    );
    await checkYandexResponse(downloadUrlResponse, 'load');

    const downloadInfo = await downloadUrlResponse.json();
    if (!downloadInfo.href) {
        throw new Error('Яндекс.Диск не вернул ссылку для скачивания файла.');
    }

    const fileResponse = await fetch(downloadInfo.href, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store'
    });
    if (!fileResponse.ok) {
        throw new Error(`Не удалось скачать резервную копию: HTTP ${fileResponse.status}.`);
    }

    let data;
    try {
        data = await fileResponse.json();
    } catch (e) {
        throw new Error('Файл резервной копии не является корректным JSON.');
    }

    if (data && data.storage && typeof data.storage === 'object') {
        Object.keys(data.storage).forEach(key => {
            if (key === YANDEX_TOKEN_KEY) return;
            try {
                localStorage.setItem(key, data.storage[key]);
            } catch (e) {}
        });
    }

    localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());
    localStorage.setItem(CLOUD_LAST_HASH_KEY, getCurrentDataHash());

    return data;
}

// ------------------------------------------------------------
//  Проверка токена
// ------------------------------------------------------------
async function verifyYandexToken() {
    const token = getYandexToken();
    if (!token) throw new Error('Токен не задан.');

    const resp = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
        headers: { 'Authorization': `OAuth ${token}` }
    });

    if (resp.ok) return true;
    if (resp.status === 401 || resp.status === 403) {
        setYandexToken(null);
        throw new Error('Токен недействителен.');
    }
    const description = await getYandexErrorDescription(resp);
    throw new Error(description || `Ошибка проверки: HTTP ${resp.status}.`);
}

// ============================================================
//  АВТОСИНХРОНИЗАЦИЯ
// ============================================================

let autoSyncTimer = null;
let autoSyncTickTimer = null;
let nextSyncTimestamp = 0;
let autoSyncListeners = [];

function onAutoSync(callback) {
    autoSyncListeners.push(callback);
}

function emitAutoSync(type, payload = {}) {
    autoSyncListeners.forEach(cb => {
        try { cb(type, payload); } catch (e) { console.error(e); }
    });
}

function startAutoSync() {
    stopAutoSync();

    if (!getAutoSyncEnabled()) {
        emitAutoSync('state', { enabled: false });
        return;
    }

    const intervalMs = getSyncInterval() * 60 * 1000;
    nextSyncTimestamp = Date.now() + intervalMs;

    autoSyncTimer = setInterval(async () => {
        nextSyncTimestamp = Date.now() + intervalMs;

        if (!getYandexToken()) {
            emitAutoSync('error', { error: new Error('Токен не задан') });
            return;
        }

        try {
            const result = await saveToYandexDisk(true);
            emitAutoSync('success', result);
        } catch (error) {
            console.error('Автосинхронизация:', error);
            emitAutoSync('error', { error });
        }
    }, intervalMs);

    autoSyncTickTimer = setInterval(() => {
        const secondsLeft = Math.max(0, Math.ceil((nextSyncTimestamp - Date.now()) / 1000));
        emitAutoSync('tick', { secondsLeft });
    }, 1000);

    emitAutoSync('state', { enabled: true });
}

function stopAutoSync() {
    if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
        autoSyncTimer = null;
    }
    if (autoSyncTickTimer) {
        clearInterval(autoSyncTickTimer);
        autoSyncTickTimer = null;
    }
    nextSyncTimestamp = 0;
}

window.addEventListener('load', () => {
    if (getAutoSyncEnabled() && getYandexToken()) {
        setTimeout(startAutoSync, 2000);
    }
});

// ============================================================
//  UI — приложение Cloud Backup
// ============================================================

function createCloudApp() {
    const html = `
        <div class="cloud-app">
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

            <div class="cloud-toast" id="cloudToast"></div>
        </div>
    `;

    const win = createWindow({
        title: 'Cloud Backup',
        width: 440,
        height: 720,
        content: html,
    });
    win.dataset.app = 'cloud';
    win.style.minWidth = '380px';
    win.style.minHeight = '600px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    initCloudApp(win);
    return win;
}

function initCloudApp(win) {
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
            if (nextSyncTimestamp) {
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

    onAutoSync((type, payload) => {
        if (type === 'tick') {
            if (getAutoSyncEnabled() && nextSyncTimestamp) {
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
