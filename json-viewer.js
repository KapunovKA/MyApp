// ============================================================
//  JSON VIEWER — просмотр JSON файлов в читаемом виде
// ============================================================

const JSON_MAX_SIZE_WARN = 2 * 1024 * 1024;   // 2 МБ — предупреждение
const JSON_MAX_SIZE_HARD = 20 * 1024 * 1024;  // 20 МБ — жёсткий лимит
const JSON_MAX_NODES_TREE = 5000;             // больше — принудительно raw

function createJsonViewerApp() {
    const html = `
        <div class="json-app" id="jvApp">
            <div class="json-toolbar">
                <button class="json-btn primary" id="jvFileBtn">📂 Открыть</button>
                <button class="json-btn" id="jvPasteBtn">📝 Вставить</button>
                <button class="json-btn" id="jvClearBtn" title="Очистить">🗑️</button>
                <input type="file" id="jvFileInput" accept=".json,application/json" hidden>
                <div class="json-toolbar-spacer"></div>
                <div class="json-view-toggle">
                    <button class="json-view-btn active" data-view="tree">🌳 Дерево</button>
                    <button class="json-view-btn" data-view="raw">📄 Формат</button>
                </div>
                <button class="json-btn" id="jvCopyBtn" title="Копировать">📋</button>
                <button class="json-btn" id="jvDownloadBtn" title="Скачать">💾</button>
            </div>

            <div class="json-main">
                <div class="json-dropzone" id="jvDropzone">
                    <div class="json-dropzone-icon">📄</div>
                    <div class="json-dropzone-title">Перетащите .json файл сюда</div>
                    <div class="json-dropzone-hint">или нажмите «Открыть» / «Вставить»</div>
                </div>

                <div class="json-content" id="jvContent"></div>

                <div class="json-paste-area" id="jvPasteArea">
                    <textarea
                        class="json-paste-input"
                        id="jvPasteInput"
                        placeholder="Вставьте JSON сюда..."
                        spellcheck="false"
                    ></textarea>
                    <div class="json-paste-actions">
                        <button class="json-btn" id="jvPasteCancel">Отмена</button>
                        <button class="json-btn primary" id="jvPasteApply">Применить</button>
                    </div>
                </div>
            </div>

            <div class="json-error" id="jvError"></div>

            <div class="json-status" id="jvStatus">
                <span class="json-status-info" id="jvStatusInfo"></span>
                <div class="json-status-actions">
                    <button class="json-status-btn" id="jvExpandAll">Развернуть</button>
                    <button class="json-status-btn" id="jvCollapseAll">Свернуть</button>
                </div>
            </div>
        </div>
    `;

    const win = createWindow({
        title: 'JSON Viewer',
        width: 720,
        height: 620,
        content: html,
    });
    win.dataset.app = 'json';
    win.style.minWidth = '420px';
    win.style.minHeight = '400px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    jvInit(win);
    return win;
}

// ------------------------------------------------------------
//  Инициализация
// ------------------------------------------------------------
function jvInit(win) {
    // ---------- Состояние (per-window) ----------
    let data = null;
    let rawText = '';
    let fileName = '';
    let view = 'tree';
    let stats = null;
    let pasteOpen = false;

    // ---------- Элементы ----------
    const appEl        = win.querySelector('#jvApp');
    const fileBtn      = win.querySelector('#jvFileBtn');
    const fileInput    = win.querySelector('#jvFileInput');
    const pasteBtn     = win.querySelector('#jvPasteBtn');
    const clearBtn     = win.querySelector('#jvClearBtn');
    const copyBtn      = win.querySelector('#jvCopyBtn');
    const downloadBtn  = win.querySelector('#jvDownloadBtn');
    const viewBtns     = win.querySelectorAll('.json-view-btn');
    const dropzone     = win.querySelector('#jvDropzone');
    const pasteArea    = win.querySelector('#jvPasteArea');
    const pasteInput   = win.querySelector('#jvPasteInput');
    const pasteApply   = win.querySelector('#jvPasteApply');
    const pasteCancel  = win.querySelector('#jvPasteCancel');
    const contentEl    = win.querySelector('#jvContent');
    const statusInfo   = win.querySelector('#jvStatusInfo');
    const errorEl      = win.querySelector('#jvError');
    const expandAllBtn = win.querySelector('#jvExpandAll');
    const collapseAllBtn = win.querySelector('#jvCollapseAll');

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
    }

    function pluralizeRu(n, one, few, many) {
        const m10 = n % 10;
        const m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
        return many;
    }

    // ============================================================
    //  СТАТИСТИКА
    // ============================================================
    function computeStats(value) {
        let keys = 0;
        let nodes = 0;
        let maxDepth = 0;
        let arrays = 0;
        let objects = 0;

        (function walk(v, depth) {
            nodes++;
            if (depth > maxDepth) maxDepth = depth;

            if (v === null) return;

            if (Array.isArray(v)) {
                arrays++;
                for (let i = 0; i < v.length; i++) walk(v[i], depth + 1);
            } else if (typeof v === 'object') {
                objects++;
                const ks = Object.keys(v);
                keys += ks.length;
                for (let i = 0; i < ks.length; i++) walk(v[ks[i]], depth + 1);
            }
        })(value, 0);

        return { keys, nodes, maxDepth, arrays, objects };
    }

    // ============================================================
    //  РЕНДЕР ДЕРЕВА
    // ============================================================
    function renderNode(value, key, depth) {
        const hasKey = key !== null && key !== undefined;
        const keyHtml = hasKey
            ? `<span class="json-key">${escapeHtml(JSON.stringify(String(key)))}</span><span class="json-colon">:</span> `
            : '';

        if (value === null) {
            return `<div class="json-line">${keyHtml}<span class="json-null">null</span></div>`;
        }
        if (typeof value === 'string') {
            return `<div class="json-line">${keyHtml}<span class="json-string">${escapeHtml(JSON.stringify(value))}</span></div>`;
        }
        if (typeof value === 'number') {
            return `<div class="json-line">${keyHtml}<span class="json-number">${value}</span></div>`;
        }
        if (typeof value === 'boolean') {
            return `<div class="json-line">${keyHtml}<span class="json-boolean">${value}</span></div>`;
        }

        const isArray = Array.isArray(value);
        const entries = isArray
            ? value.map((v, i) => [i, v])
            : Object.keys(value).map(k => [k, value[k]]);

        if (entries.length === 0) {
            return `<div class="json-line">${keyHtml}<span class="json-bracket">${isArray ? '[]' : '{}'}</span></div>`;
        }

        const open = depth < 2 ? ' open' : '';
        const brOpen = isArray ? '[' : '{';
        const brClose = isArray ? ']' : '}';
        const countLabel = entries.length +
            ' ' + pluralizeRu(entries.length, 'элемент', 'элемента', 'элементов');

        const childrenHtml = entries
            .map(([k, v]) => renderNode(v, k, depth + 1))
            .join('');

        return `<details class="json-node"${open}>
            <summary class="json-summary">
                ${keyHtml}<span class="json-bracket">${brOpen}</span>
                <span class="json-count">${countLabel}</span>
                <span class="json-bracket">${brClose}</span>
            </summary>
            <div class="json-children">${childrenHtml}</div>
        </details>`;
    }

    // ============================================================
    //  РЕНДЕР
    // ============================================================
    function render() {
        if (data === null) {
            reset();
            return;
        }

        appEl.classList.add('has-data');
        hideError();

        if (view === 'tree') {
            const tooBig = stats && stats.nodes > JSON_MAX_NODES_TREE;
            if (tooBig) {
                view = 'raw';
                updateViewButtons();
                showError(`⚠️ Слишком большой JSON (${stats.nodes} узлов) — открыт в режиме «Формат»`, 'warning');
                renderRaw();
                return;
            }
            contentEl.innerHTML = renderNode(data, null, 0);
        } else {
            renderRaw();
        }

        renderStatus();
    }

    function renderRaw() {
        const pretty = JSON.stringify(data, null, 2);
        contentEl.innerHTML = `<pre class="json-raw">${escapeHtml(pretty)}</pre>`;
    }

    function renderStatus() {
        if (!stats) {
            statusInfo.textContent = '';
            return;
        }
        const size = rawText ? formatBytes(new Blob([rawText]).size) : '—';
        const name = fileName ? fileName + ' · ' : '';
        const keysLabel = stats.keys + ' ' +
            pluralizeRu(stats.keys, 'ключ', 'ключа', 'ключей');
        const nodesLabel = stats.nodes + ' ' +
            pluralizeRu(stats.nodes, 'узел', 'узла', 'узлов');

        statusInfo.textContent =
            `${name}${keysLabel} · ${nodesLabel} · глубина ${stats.maxDepth} · ${size}`;
    }

    function reset() {
        data = null;
        rawText = '';
        fileName = '';
        stats = null;
        view = 'tree';
        pasteOpen = false;

        appEl.classList.remove('has-data');
        contentEl.innerHTML = '';
        pasteArea.classList.remove('visible');
        pasteInput.value = '';
        statusInfo.textContent = '';
        hideError();
        updateViewButtons();
    }

    // ============================================================
    //  ЗАГРУЗКА ДАННЫХ
    // ============================================================
    function loadFromText(text, name = '') {
        hideError();

        if (!text || !text.trim()) {
            reset();
            return;
        }

        if (text.length > JSON_MAX_SIZE_HARD) {
            showError(`Файл слишком большой (${formatBytes(text.length)}). Лимит: ${formatBytes(JSON_MAX_SIZE_HARD)}`);
            return;
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            showError('Ошибка парсинга JSON: ' + e.message);
            return;
        }

        data = parsed;
        rawText = text;
        fileName = name;
        stats = computeStats(parsed);

        if (text.length > JSON_MAX_SIZE_WARN) {
            showError(`⚠️ Большой файл (${formatBytes(text.length)}) — рендер может быть медленным`, 'warning');
        }

        render();
    }

    async function loadFromFile(file) {
        if (!file) return;

        const isJson =
            file.name.toLowerCase().endsWith('.json') ||
            file.type === 'application/json' ||
            file.type === 'text/json';

        if (!isJson) {
            showError('Ожидается файл .json');
            return;
        }

        if (file.size > JSON_MAX_SIZE_HARD) {
            showError(`Файл слишком большой (${formatBytes(file.size)}). Лимит: ${formatBytes(JSON_MAX_SIZE_HARD)}`);
            return;
        }

        try {
            const text = await file.text();
            loadFromText(text, file.name);
        } catch (e) {
            showError('Не удалось прочитать файл: ' + e.message);
        }
    }

    // ============================================================
    //  UI — ошибки и переключения
    // ============================================================
    function showError(msg, type = 'error') {
        errorEl.textContent = msg;
        errorEl.className = 'json-error visible' + (type === 'warning' ? ' warning' : '');
        clearTimeout(showError._timer);
        showError._timer = setTimeout(() => hideError(), 6000);
    }

    function hideError() {
        errorEl.classList.remove('visible', 'warning');
        errorEl.textContent = '';
    }

    function updateViewButtons() {
        viewBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.view === view);
        });
    }

    function openPasteArea() {
        pasteOpen = true;
        pasteArea.classList.add('visible');
        pasteInput.value = rawText || '';
        setTimeout(() => pasteInput.focus(), 50);
    }

    function closePasteArea() {
        pasteOpen = false;
        pasteArea.classList.remove('visible');
    }

    // ============================================================
    //  СОБЫТИЯ
    // ============================================================
    fileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadFromFile(file);
        fileInput.value = '';
    });

    pasteBtn.addEventListener('click', openPasteArea);
    pasteCancel.addEventListener('click', closePasteArea);

    pasteApply.addEventListener('click', () => {
        const text = pasteInput.value;
        closePasteArea();
        loadFromText(text, '');
    });

    pasteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closePasteArea();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            pasteApply.click();
        }
    });

    clearBtn.addEventListener('click', () => {
        if (!data) {
            reset();
            return;
        }
        reset();
    });

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newView = btn.dataset.view;
            if (newView === view) return;
            view = newView;
            updateViewButtons();
            render();
        });
    });

    copyBtn.addEventListener('click', async () => {
        if (!data) return;
        try {
            const pretty = JSON.stringify(data, null, 2);
            await navigator.clipboard.writeText(pretty);
            showError('✅ Скопировано в буфер обмена', 'warning');
        } catch (e) {
            showError('Не удалось скопировать: ' + e.message);
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!data) return;
        try {
            const pretty = JSON.stringify(data, null, 2);
            const blob = new Blob([pretty], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'formatted.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            showError('Не удалось скачать: ' + e.message);
        }
    });

    expandAllBtn.addEventListener('click', () => {
        contentEl.querySelectorAll('details').forEach(d => { d.open = true; });
    });

    collapseAllBtn.addEventListener('click', () => {
        contentEl.querySelectorAll('details').forEach(d => { d.open = false; });
    });

    // ---------- Drag & Drop на всё окно ----------
    let dragDepth = 0;

    win.addEventListener('dragenter', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        dragDepth++;
        dropzone.classList.add('dragover');
    });

    win.addEventListener('dragover', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    win.addEventListener('dragleave', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) dropzone.classList.remove('dragover');
    });

    win.addEventListener('drop', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.files.length) return;
        e.preventDefault();
        dragDepth = 0;
        dropzone.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        loadFromFile(file);
    });

    // ---------- Escape: закрыть вставку, если открыта ----------
    function onKeyDown(e) {
        if (!win.classList.contains('focused')) return;
        if (e.key === 'Escape' && pasteOpen) {
            closePasteArea();
        }
    }
    document.addEventListener('keydown', onKeyDown);

    // ---------- Очистка при закрытии ----------
    win.querySelector('.close').addEventListener('click', () => {
        document.removeEventListener('keydown', onKeyDown);
        clearTimeout(showError._timer);
    });

    // ---------- Стартовое состояние ----------
    reset();
}
