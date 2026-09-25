// ============================================================
//  JSON EDITOR — полноценный редактор JSON
//  Режимы: Код / Дерево / Текст, поиск, формат, миниф
// ============================================================

function createJsonEditorApp() {
    const html = `
        <div class="jse-app" id="jseApp">
            <!-- Верхний тулбар -->
            <div class="jse-toolbar">
                <button type="button" class="jse-btn" id="jseLoadBtn" title="Загрузить из файла">📂 Загрузить</button>
                <button type="button" class="jse-btn" id="jseExampleBtn" title="Вставить пример">📋 Пример</button>
                <input type="file" id="jseFileInput" accept=".json,application/json,.txt" hidden>

                <div class="jse-toolbar-spacer"></div>

                <button type="button" class="jse-btn" id="jseFormatBtn" title="Форматировать (отступы 2 пробела)">✨ Формат</button>
                <button type="button" class="jse-btn" id="jseMinifyBtn" title="Сжать (без пробелов)">📦 Миниф</button>
                <button type="button" class="jse-btn" id="jseCopyBtn" title="Скопировать весь JSON">📋 Копировать</button>
                <button type="button" class="jse-btn" id="jseDownloadBtn" title="Скачать как .json">💾 Скачать</button>
                <button type="button" class="jse-btn jse-danger" id="jseClearBtn" title="Очистить">🗑</button>
            </div>

            <!-- Вторая строка: поиск + переключение вида + отмена/повтор -->
            <div class="jse-toolbar jse-toolbar-2">
                <div class="jse-search-wrap">
                    <span class="jse-search-icon">🔍</span>
                    <input type="text" class="jse-search-input" id="jseSearchInput" placeholder="Поиск по ключам и значениям…">
                    <span class="jse-search-count" id="jseSearchCount"></span>
                    <button type="button" class="jse-search-nav" id="jseSearchPrev" title="Предыдущее (Shift+Enter)">↑</button>
                    <button type="button" class="jse-search-nav" id="jseSearchNext" title="Следующее (Enter)">↓</button>
                </div>

                <div class="jse-toolbar-spacer"></div>

                <button type="button" class="jse-btn jse-icon" id="jseUndoBtn" title="Отменить (Ctrl+Z)">↶</button>
                <button type="button" class="jse-btn jse-icon" id="jseRedoBtn" title="Повторить (Ctrl+Y)">↷</button>

                <div class="jse-view-tabs">
                    <button type="button" class="jse-view-tab active" data-view="code">Код</button>
                    <button type="button" class="jse-view-tab" data-view="tree">Дерево</button>
                    <button type="button" class="jse-view-tab" data-view="text">Текст</button>
                </div>
            </div>

            <!-- Валидация -->
            <div class="jse-status jse-status-ok" id="jseStatus">
                <span class="jse-status-icon">✓</span>
                <span class="jse-status-text" id="jseStatusText">Готов к работе</span>
            </div>

            <!-- Основная область: две панели -->
            <div class="jse-main">
                <!-- Левая панель: редактируемый код -->
                <div class="jse-pane jse-pane-left">
                    <div class="jse-pane-header">
                        <span class="jse-pane-title">✏️ Редактор</span>
                        <span class="jse-pane-meta" id="jseEditMeta"></span>
                    </div>
                    <div class="jse-editor-wrap">
                        <textarea class="jse-editor" id="jseEditor" spellcheck="false" wrap="off"></textarea>
                    </div>
                </div>

                <div class="jse-divider"></div>

                <!-- Правая панель: дерево / formatted / readonly -->
                <div class="jse-pane jse-pane-right">
                    <div class="jse-pane-header">
                        <span class="jse-pane-title" id="jseRightTitle">🌳 Дерево</span>
                        <span class="jse-pane-meta" id="jseRightMeta"></span>
                    </div>
                    <div class="jse-tree-wrap" id="jseTreeWrap">
                        <div class="jse-tree" id="jseTree"></div>
                    </div>
                    <div class="jse-text-wrap" id="jseTextWrap" style="display:none;">
                        <pre class="jse-text-output" id="jseTextOutput"></pre>
                    </div>
                </div>
            </div>
        </div>
    `;

    const win = createWindow({
        title: 'Редактор JSON',
        width: 1100,
        height: 720,
        content: html,
    });
    win.dataset.app = 'jsoneditor';
    win.style.minWidth = '640px';
    win.style.minHeight = '400px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    jseInit(win);
    return win;
}

// ============================================================
//  Логика редактора
// ============================================================
function jseInit(win) {
    const $ = (id) => win.querySelector('#' + id);

    // ---------- DOM ----------
    const editor        = $('jseEditor');
    const treeEl        = $('jseTree');
    const treeWrap      = $('jseTreeWrap');
    const textWrap      = $('jseTextWrap');
    const textOutput    = $('jseTextOutput');
    const statusBar     = $('jseStatus');
    const statusIcon    = statusBar.querySelector('.jse-status-icon');
    const statusText    = $('jseStatusText');
    const editMeta      = $('jseEditMeta');
    const rightMeta     = $('jseRightMeta');
    const rightTitle    = $('jseRightTitle');
    const searchInput   = $('jseSearchInput');
    const searchCount   = $('jseSearchCount');
    const fileInput     = $('jseFileInput');

    // ---------- Состояние ----------
    let currentView = 'code';     // 'code' | 'tree' | 'text'
    let parsedData = null;        // распарсенный JSON или null
    let parseError = null;        // текст ошибки
    let searchMatches = [];       // список индексов совпадений в тексте
    let searchIndex = -1;

    // Undo/Redo — простой стек текста
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 100;
    let suppressHistory = false;

    const SEARCH_LIMIT = 500;
    const MAX_TREE_NODES = 8000;   // защита от «тяжёлого» дерева

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================
    function escapeHtml(s) {
        s = String(s);
        return s.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
    }
    function escapeAttr(s) {
        s = String(s == null ? '' : s);
        return s.replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
    }
    function pluralizeRu(n, one, few, many) {
        const m10 = n % 10;
        const m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
        return many;
    }

    // ============================================================
    //  ИСТОРИЯ (Undo/Redo)
    // ============================================================
    function pushHistory() {
        if (suppressHistory) return;
        const val = editor.value;
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === val) return;
        undoStack.push(val);
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack.length = 0;
        updateUndoRedoButtons();
    }
    function undo() {
        if (undoStack.length === 0) return;
        const current = editor.value;
        const prev = undoStack.pop();
        redoStack.push(current);
        suppressHistory = true;
        editor.value = prev;
        suppressHistory = false;
        onEditorInput();
        updateUndoRedoButtons();
    }
    function redo() {
        if (redoStack.length === 0) return;
        const current = editor.value;
        const next = redoStack.pop();
        undoStack.push(current);
        suppressHistory = true;
        editor.value = next;
        suppressHistory = false;
        onEditorInput();
        updateUndoRedoButtons();
    }
    function updateUndoRedoButtons() {
        $('jseUndoBtn').disabled = undoStack.length === 0;
        $('jseRedoBtn').disabled = redoStack.length === 0;
    }

    // ============================================================
    //  ПАРСИНГ / ВАЛИДАЦИЯ
    // ============================================================
    function parseEditor() {
        const text = editor.value;
        editMeta.textContent = text.length === 0
            ? ''
            : text.length + ' ' + pluralizeRu(text.length, 'символ', 'символа', 'символов');

        if (!text.trim()) {
            parsedData = null;
            parseError = null;
            setStatus('info', 'Пустой документ');
            return;
        }

        try {
            parsedData = JSON.parse(text);
            parseError = null;
            const summary = describeValue(parsedData);
            setStatus('ok', '✓ Валидный JSON · ' + summary);
        } catch (e) {
            parsedData = null;
            parseError = e.message;
            // Красивое сообщение об ошибке
            let msg = e.message;
            const posMatch = /position (\d+)/.exec(e.message);
            if (posMatch) {
                const pos = parseInt(posMatch[1], 10);
                const before = text.slice(0, pos);
                const line = before.split('\n').length;
                const col = pos - before.lastIndexOf('\n');
                msg = e.message + ' (строка ' + line + ', позиция ' + col + ')';
            }
            setStatus('error', '✕ ' + msg);
        }
    }

    function describeValue(v) {
        if (v === null) return 'null';
        if (Array.isArray(v)) return 'массив из ' + v.length + ' ' + pluralizeRu(v.length, 'элемента', 'элементов', 'элементов');
        if (typeof v === 'object') {
            const n = Object.keys(v).length;
            return 'объект, ключей: ' + n;
        }
        return typeof v;
    }

    function setStatus(type, msg) {
        statusBar.classList.remove('jse-status-ok', 'jse-status-error', 'jse-status-info');
        statusBar.classList.add('jse-status-' + type);
        statusIcon.textContent = type === 'ok' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
        statusText.textContent = msg;
    }

    // ============================================================
    //  ДЕРЕВО
    // ============================================================
    let treeNodeCount = 0;

    function renderTree(value) {
        treeNodeCount = 0;
        if (value === null && parseError === null && editor.value.trim() === '') {
            treeEl.innerHTML = '<div class="jse-empty">Загрузите или вставьте JSON</div>';
            rightMeta.textContent = '';
            return;
        }
        if (parseError) {
            treeEl.innerHTML = '<div class="jse-empty jse-error-text">Ошибка парсинга — дерево недоступно</div>';
            rightMeta.textContent = '';
            return;
        }

        const frag = document.createDocumentFragment();
        const rootNode = buildTreeNode(value, null, 0);
        frag.appendChild(rootNode);
        treeEl.innerHTML = '';
        treeEl.appendChild(frag);

        rightMeta.textContent = treeNodeCount + ' ' +
            pluralizeRu(treeNodeCount, 'узел', 'узла', 'узлов');
    }

    function buildTreeNode(value, key, depth) {
        treeNodeCount++;
        const row = document.createElement('div');
        row.className = 'jse-tree-node';

        if (value === null) {
            row.innerHTML = treeKeyHtml(key) + '<span class="jse-val-null">null</span>';
            return row;
        }
        if (typeof value === 'string') {
            row.innerHTML = treeKeyHtml(key) + '<span class="jse-val-string">' + escapeHtml(JSON.stringify(value)) + '</span>';
            return row;
        }
        if (typeof value === 'number') {
            row.innerHTML = treeKeyHtml(key) + '<span class="jse-val-number">' + value + '</span>';
            return row;
        }
        if (typeof value === 'boolean') {
            row.innerHTML = treeKeyHtml(key) + '<span class="jse-val-boolean">' + value + '</span>';
            return row;
        }

        const isArray = Array.isArray(value);
        const entries = isArray
            ? value.map((v, i) => [i, v])
            : Object.keys(value).map(k => [k, value[k]]);

        const details = document.createElement('details');
        details.className = 'jse-tree-details';
        details.open = depth < 2;

        const summary = document.createElement('summary');
        summary.className = 'jse-tree-summary';
        const cnt = entries.length;
        summary.innerHTML =
            treeKeyHtml(key) +
            '<span class="jse-val-bracket">' + (isArray ? '[' : '{') + '</span>' +
            '<span class="jse-val-count">' + cnt + ' ' +
                pluralizeRu(cnt, 'элемент', 'элемента', 'элементов') + '</span>' +
            '<span class="jse-val-bracket">' + (isArray ? ']' : '}') + '</span>';
        details.appendChild(summary);

        const children = document.createElement('div');
        children.className = 'jse-tree-children';

        // Ограничение по размеру дерева
        const limit = Math.min(entries.length, MAX_TREE_NODES - treeNodeCount);
        for (let i = 0; i < limit; i++) {
            const [k, v] = entries[i];
            children.appendChild(buildTreeNode(v, k, depth + 1));
        }
        if (entries.length > limit) {
            const more = document.createElement('div');
            more.className = 'jse-tree-more';
            more.textContent = '… ещё ' + (entries.length - limit) + ' ' +
                pluralizeRu(entries.length - limit, 'элемент', 'элемента', 'элементов') +
                ' (дерево усечено)';
            children.appendChild(more);
        }

        details.appendChild(children);
        return details;
    }

    function treeKeyHtml(key) {
        if (key === null || key === undefined) return '';
        const keyStr = typeof key === 'number' ? '[' + key + ']' : JSON.stringify(String(key));
        const cls = typeof key === 'number' ? 'jse-key-index' : 'jse-key';
        return '<span class="' + cls + '">' + escapeHtml(keyStr) + '</span><span class="jse-colon">:</span> ';
    }

    // ============================================================
    //  ТЕКСТ (readonly, formatted)
    // ============================================================
    function renderText(value) {
        if (parseError || value === null) {
            textOutput.textContent = parseError
                ? 'Ошибка парсинга — текст недоступен'
                : '';
            return;
        }
        textOutput.textContent = JSON.stringify(value, null, 2);
    }

    // ============================================================
    //  ГЛАВНЫЙ РЕНДЕР
    // ============================================================
    function render() {
        if (currentView === 'tree') {
            treeWrap.style.display = '';
            textWrap.style.display = 'none';
            rightTitle.textContent = '🌳 Дерево';
            renderTree(parsedData);
        } else if (currentView === 'text') {
            treeWrap.style.display = 'none';
            textWrap.style.display = '';
            rightTitle.textContent = '📄 Текст (форматированный)';
            renderText(parsedData);
            rightMeta.textContent = parsedData !== null
                ? (JSON.stringify(parsedData, null, 2).length + ' символов')
                : '';
        }
    }

    // ============================================================
    //  СОБЫТИЯ РЕДАКТОРА
    // ============================================================
    function onEditorInput() {
        parseEditor();
        render();
        updateSearchCount();
    }

    let inputTimer = null;
    editor.addEventListener('input', () => {
        // Мгновенный парсинг — быстрый
        parseEditor();
        render();
        updateSearchCount();

        // История — с задержкой
        clearTimeout(inputTimer);
        inputTimer = setTimeout(() => pushHistory(), 400);
    });

    // Горячие клавиши
    editor.addEventListener('keydown', (e) => {
        // Tab → 2 пробела
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            if (start === end) {
                // Обычный Tab — вставить 2 пробела
                editor.value = editor.value.slice(0, start) + '  ' + editor.value.slice(end);
                editor.selectionStart = editor.selectionEnd = start + 2;
            } else {
                // Выделено несколько строк — сдвинуть все
                const before = editor.value.slice(0, start);
                const selected = editor.value.slice(start, end);
                const after = editor.value.slice(end);
                const lines = selected.split('\n');
                const shift = e.shiftKey ? -1 : 1;
                const newLines = lines.map(line => {
                    if (shift > 0) return '  ' + line;
                    return line.startsWith('  ') ? line.slice(2) : line;
                });
                editor.value = before + newLines.join('\n') + after;
                editor.selectionStart = start;
                editor.selectionEnd = end + (newLines.join('\n').length - selected.length);
            }
            onEditorInput();
        }
        // Ctrl+Z / Ctrl+Y
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            redo();
        }
        // Ctrl+F — фокус в поиск
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // ============================================================
    //  ПЕРЕКЛЮЧЕНИЕ ВИДА
    // ============================================================
    win.querySelectorAll('.jse-view-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentView = tab.dataset.view;
            win.querySelectorAll('.jse-view-tab').forEach(t => t.classList.toggle('active', t === tab));
            render();
        });
    });

    // ============================================================
    //  ТУЛБАР: загрузить / пример / формат / миниф / копир / скачать / очистить
    // ============================================================
    $('jseLoadBtn').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            editor.value = e.target.result;
            pushHistory();
            onEditorInput();
            setStatus('ok', 'Загружено: ' + file.name);
        };
        reader.onerror = () => setStatus('error', 'Не удалось прочитать файл');
        reader.readAsText(file, 'UTF-8');
        fileInput.value = '';
    });

    $('jseExampleBtn').addEventListener('click', () => {
        const example = {
            name: "Демо-документ",
            version: "1.0",
            generated: new Date().toISOString().slice(0, 10),
            users: [
                { id: 1, name: "Иван", role: "admin", active: true, tags: ["dev", "ops"] },
                { id: 2, name: "Мария", role: "user", active: true, tags: ["design"] },
                { id: 3, name: "Пётр", role: "user", active: false, tags: [] }
            ],
            settings: {
                theme: "dark",
                notifications: { email: true, push: false, sms: null },
                limits: { maxItems: 100, timeout: 30.5 }
            },
            description: "Пример JSON для проверки редактора. Можно править любые поля."
        };
        editor.value = JSON.stringify(example, null, 2);
        pushHistory();
        onEditorInput();
        setStatus('ok', 'Пример загружен');
    });

    $('jseFormatBtn').addEventListener('click', () => {
        if (parsedData === null) {
            setStatus('error', 'Нечего форматировать — сначала исправьте ошибки');
            return;
        }
        editor.value = JSON.stringify(parsedData, null, 2);
        pushHistory();
        onEditorInput();
        setStatus('ok', 'Отформатировано');
    });

    $('jseMinifyBtn').addEventListener('click', () => {
        if (parsedData === null) {
            setStatus('error', 'Нечего сжимать — сначала исправьте ошибки');
            return;
        }
        editor.value = JSON.stringify(parsedData);
        pushHistory();
        onEditorInput();
        setStatus('ok', 'Сжато');
    });

    $('jseCopyBtn').addEventListener('click', async () => {
        const text = editor.value;
        if (!text) { setStatus('info', 'Пусто — нечего копировать'); return; }
        try {
            await navigator.clipboard.writeText(text);
            setStatus('ok', 'Скопировано в буфер');
        } catch (e) {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); setStatus('ok', 'Скопировано'); }
            catch (err) { setStatus('error', 'Не удалось скопировать'); }
            document.body.removeChild(ta);
        }
    });

    $('jseDownloadBtn').addEventListener('click', () => {
        const text = editor.value;
        if (!text) { setStatus('info', 'Пусто — нечего скачивать'); return; }
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('ok', 'Файл скачан');
    });

    $('jseClearBtn').addEventListener('click', () => {
        if (!editor.value) return;
        editor.value = '';
        pushHistory();
        onEditorInput();
        setStatus('info', 'Очищено');
    });

    $('jseUndoBtn').addEventListener('click', undo);
    $('jseRedoBtn').addEventListener('click', redo);

    // ============================================================
    //  ПОИСК
    // ============================================================
    function performSearch() {
        const q = searchInput.value.trim();
        searchMatches = [];
        searchIndex = -1;
        if (!q) {
            updateSearchCount();
            return;
        }
        const text = editor.value;
        const lowerText = text.toLowerCase();
        const lowerQ = q.toLowerCase();
        let pos = 0;
        while (searchMatches.length < SEARCH_LIMIT) {
            const idx = lowerText.indexOf(lowerQ, pos);
            if (idx === -1) break;
            searchMatches.push({ start: idx, end: idx + q.length });
            pos = idx + q.length;
        }
        updateSearchCount();
    }

    function updateSearchCount() {
        const q = searchInput.value.trim();
        if (!q) {
            searchCount.textContent = '';
            return;
        }
        const total = searchMatches.length;
        if (total === 0) {
            searchCount.textContent = '0';
            searchCount.classList.add('empty');
            return;
        }
        searchCount.classList.remove('empty');
        searchCount.textContent = (searchIndex + 1) + '/' + total;
    }

    function focusMatch(idx) {
        if (idx < 0 || idx >= searchMatches.length) return;
        const m = searchMatches[idx];
        editor.focus();
        editor.setSelectionRange(m.start, m.end);
        // Прокрутить textarea к позиции
        const before = editor.value.slice(0, m.start);
        const lineCount = before.split('\n').length - 1;
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 16;
        editor.scrollTop = Math.max(0, lineCount * lineHeight - editor.clientHeight / 2);
    }

    function findNext() {
        if (searchMatches.length === 0) return;
        searchIndex = (searchIndex + 1) % searchMatches.length;
        focusMatch(searchIndex);
        updateSearchCount();
    }
    function findPrev() {
        if (searchMatches.length === 0) return;
        searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
        focusMatch(searchIndex);
        updateSearchCount();
    }

    searchInput.addEventListener('input', () => {
        performSearch();
        if (searchMatches.length > 0) {
            searchIndex = 0;
            focusMatch(0);
            updateSearchCount();
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) findPrev();
            else findNext();
        }
        if (e.key === 'Escape') {
            searchInput.value = '';
            performSearch();
            editor.focus();
        }
    });

    $('jseSearchNext').addEventListener('click', findNext);
    $('jseSearchPrev').addEventListener('click', findPrev);

    // ============================================================
    //  СТАРТ
    // ============================================================
    // Пустой стартовый документ с примером
    editor.value = '';
    onEditorInput();
    updateUndoRedoButtons();
    setStatus('info', 'Загрузите файл, вставьте JSON или нажмите «Пример»');

    // Фокус в редактор
    setTimeout(() => editor.focus(), 150);
}