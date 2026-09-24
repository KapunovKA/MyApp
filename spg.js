// ============================================================
//  СПГ — Технологические цепочки
//  Интеграция в macOS-систему (createWindow)
// ============================================================

const SPG_MINUTE_TO_X = 2;

function createSpgApp() {
    const html = `
        <div class="spg-app" id="spgApp">
            <div class="spg-scroll">
                <div class="spg-section">
                    <div class="spg-section-title">1. Загрузка файла СПГ</div>
                    <div class="spg-drop" id="spgDrop">
                        <div class="spg-drop-icon">📁</div>
                        <div class="spg-drop-text"><b>Нажмите</b> или перетащите сюда JSON-файл</div>
                        <div class="spg-drop-file" id="spgFileName"></div>
                    </div>
                    <input type="file" id="spgFileInput" accept=".json,application/json" hidden>
                </div>

                <div class="spg-section spg-hidden" id="spgLogBox">
                    <div class="spg-section-title">2. Лог загрузки</div>
                    <div class="spg-log" id="spgLog"></div>
                </div>

                <div class="spg-section spg-hidden" id="spgOverviewBox">
                    <div class="spg-section-title">3. Обзор файла</div>
                    <div class="spg-overview" id="spgOverview"></div>
                </div>

                <div class="spg-section spg-hidden" id="spgChainsBox">
                    <div class="spg-section-title">4. Найденные технологические цепочки</div>
                    <div class="spg-toolbar">
                        <button type="button" class="spg-btn" id="spgSelectAllBtn">Выбрать все</button>
                        <button type="button" class="spg-btn" id="spgClearAllBtn">Снять выбор</button>
                        <button type="button" class="spg-btn" id="spgExpandAllChainsBtn">Развернуть все</button>
                        <button type="button" class="spg-btn" id="spgCollapseAllChainsBtn">Свернуть все</button>
                        <div class="spg-spacer"></div>
                        <span class="spg-info" id="spgSelectedInfo">Выбрано: 0</span>
                    </div>
                    <div id="spgChains"></div>
                </div>

                <div class="spg-section spg-hidden" id="spgCopyBox">
                    <div class="spg-section-title">5. Параметры копирования</div>

                    <div class="spg-mode-tabs">
                        <div class="spg-mode-tab" data-mode="count">По количеству и интервалу</div>
                        <div class="spg-mode-tab active" data-mode="trains">По расписанию</div>
                    </div>

                    <div id="spgModeCountPanel" class="spg-hidden">
                        <div class="spg-field-row">
                            <div class="spg-field">
                                <label>Количество копий</label>
                                <input type="number" id="spgCopyCount" value="1" min="1" max="200">
                            </div>
                            <div class="spg-field">
                                <label>Сдвиг (минут) <span class="spg-hint">1 мин = 2 ед. X</span></label>
                                <input type="number" id="spgShiftMinutes" value="15" min="1" max="1440">
                            </div>
                            <div class="spg-field spg-wide">
                                <label>Префикс заголовка</label>
                                <input type="text" id="spgCopyPrefix" value="копия">
                            </div>
                        </div>
                    </div>

                    <div id="spgModeTrainsPanel">
                        <div class="spg-field-row">
                            <div class="spg-field spg-wide">
                                <label>CSV-файл <span class="spg-hint">колонки: номер поезда, время</span></label>
                                <input type="file" id="spgTrainsFileInput" accept=".csv" class="spg-file-inline">
                            </div>
                        </div>

                        <div id="spgTrainsStatus"></div>

                        <div id="spgTrainsPreviewWrap" class="spg-hidden">
                            <div class="spg-toolbar spg-mt-14">
                                <button type="button" class="spg-btn spg-primary spg-big" id="spgApplyBtn">Применить копирование</button>
                                <div class="spg-spacer"></div>
                                <span class="spg-info">Строк: <b id="spgTrainsCount">0</b></span>
                                <button type="button" class="spg-btn spg-small" id="spgAddTrainRowBtn">＋ Добавить</button>
                                <button type="button" class="spg-btn spg-small" id="spgClearTrainsBtn">✕ Очистить</button>
                            </div>

                            <div class="spg-table-scroll">
                                <table class="spg-trains-table" id="spgTrainsPreviewTable">
                                    <thead>
                                        <tr>
                                            <th style="width:40px">#</th>
                                            <th style="width:120px">Поезд</th>
                                            <th style="width:110px">Время</th>
                                            <th style="width:80px">Мин.</th>
                                            <th style="width:80px">X</th>
                                            <th style="width:70px"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="spgTrainsPreviewBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="spg-info-block spg-blue spg-mt-12" id="spgPreviewInfo">
                        Выберите цепочки для настройки.
                    </div>
                </div>

                <div class="spg-section spg-hidden" id="spgResultBox">
                    <div class="spg-section-title">6. Результат</div>
                    <div class="spg-info-block spg-green" id="spgResultInfo"></div>
                    <div class="spg-toolbar spg-mt-12">
                        <button type="button" class="spg-btn spg-primary" id="spgDownloadFullBtn">⬇ Скачать полный</button>
                        <button type="button" class="spg-btn" id="spgDownloadChainsBtn">⬇ Только цепочки</button>
                        <button type="button" class="spg-btn" id="spgCopyJsonBtn">📋 Копировать JSON</button>
                    </div>
                    <div class="spg-result-preview" id="spgResultPreview"></div>
                </div>
            </div>

            <div class="spg-modal-backdrop spg-hidden" id="spgModalBackdrop">
                <div class="spg-modal-box">
                    <h3 id="spgModalTitle">Вопрос</h3>
                    <p id="spgModalText"></p>
                    <div class="spg-modal-actions">
                        <button type="button" class="spg-btn" id="spgModalCancel">Отмена</button>
                        <button type="button" class="spg-btn spg-primary" id="spgModalOk">ОК</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const win = createWindow({
        title: 'СПГ — Технологические цепочки',
        width: 900,
        height: 720,
        content: html,
    });
    win.dataset.app = 'spg';
    win.style.minWidth = '520px';
    win.style.minHeight = '500px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    spgInit(win);
    return win;
}

function spgInit(win) {
    const $ = (id) => win.querySelector('#' + id);

    const drop              = $('spgDrop');
    const fileInput         = $('spgFileInput');
    const fileNameEl        = $('spgFileName');
    const logBox            = $('spgLogBox');
    const logEl             = $('spgLog');
    const overviewBox       = $('spgOverviewBox');
    const overviewEl        = $('spgOverview');
    const chainsBox         = $('spgChainsBox');
    const chainsEl          = $('spgChains');
    const copyBox           = $('spgCopyBox');
    const resultBox         = $('spgResultBox');
    const resultInfo        = $('spgResultInfo');
    const resultPreview     = $('spgResultPreview');
    const previewInfo       = $('spgPreviewInfo');
    const selectedInfo      = $('spgSelectedInfo');
    const trainsFileInput   = $('spgTrainsFileInput');
    const trainsStatus      = $('spgTrainsStatus');
    const trainsPreviewWrap = $('spgTrainsPreviewWrap');
    const trainsPreviewBody = $('spgTrainsPreviewBody');
    const trainsCount       = $('spgTrainsCount');

    let sourceData = null;
    let chains = [];
    let selectedIds = {};
    let collapsedChainIds = {};
    let replicatedData = null;
    let copyMode = 'trains';
    let trainsList = [];

    const MINUTE_TO_X = SPG_MINUTE_TO_X;

    // ---------- Лог ----------
    function log(msg) {
        logBox.classList.remove('spg-hidden');
        logEl.textContent += msg + '\n';
        console.log('[SPG]', msg);
    }

    // ---------- Drag & Drop / выбор файла ----------
    drop.onclick = () => fileInput.click();
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('dragover'); };
    drop.ondragleave = () => drop.classList.remove('dragover');
    drop.ondrop = (e) => {
        e.preventDefault();
        drop.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) readFile(e.dataTransfer.files[0]);
    };
    fileInput.onchange = () => {
        if (fileInput.files.length > 0) readFile(fileInput.files[0]);
    };

    function readFile(file) {
        logEl.textContent = '';
        log('Читаю: ' + file.name);
        const reader = new FileReader();
        reader.onerror = () => log('ОШИБКА чтения файла');
        reader.onload = (e) => {
            log('Прочитано символов: ' + e.target.result.length);
            let data;
            try {
                data = JSON.parse(e.target.result);
                log('JSON OK');
            } catch (err) {
                log('ОШИБКА JSON: ' + err.message);
                return;
            }
            sourceData = data;
            fileNameEl.textContent = 'Файл: ' + file.name;
            analyze(data);
        };
        reader.readAsText(file, 'UTF-8');
    }

    // ---------- Анализ ----------
    function analyze(data) {
        log('Анализ структуры...');
        if (!data.graphData) { log('НЕТ graphData'); return; }

        const rows = data.graphData.rows || [];
        const techChains = data.graphData.techChains || [];
        log('rows: ' + rows.length + ', techChains: ' + techChains.length);

        const opsByChain = {};
        let commentCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.operations || !row.operations.length) continue;
            for (let j = 0; j < row.operations.length; j++) {
                const op = row.operations[j];
                if (op.chainId == null) continue;
                const key = String(op.chainId);
                if (!opsByChain[key]) opsByChain[key] = [];
                if (op.comment != null && String(op.comment).trim() !== '') commentCount++;
                opsByChain[key].push({
                    id: op.id,
                    label: op.label,
                    type: op.type,
                    x: op.x,
                    y: op.y,
                    duration: op.duration,
                    iconId: op.iconId,
                    comment: op.comment,
                    rowId: row.id,
                    rowTitle: row.title
                });
            }
        }

        log('Операций с комментарием: ' + commentCount);
        log('Уникальных chainId: ' + Object.keys(opsByChain).length);

        chains = [];
        for (let i = 0; i < techChains.length; i++) {
            const tc = techChains[i];
            const idKey = String(tc.id);
            const chainObj = {
                id: tc.id,
                header: tc.header || ('Цепочка ' + tc.id),
                isLocked: !!tc.isLocked,
                operations: opsByChain[idKey] || [],
                comments: []
            };
            if (tc.comment != null && String(tc.comment).trim() !== '') {
                chainObj.comments.push(String(tc.comment).trim());
            }
            chains.push(chainObj);
            delete opsByChain[idKey];
        }

        const remaining = Object.keys(opsByChain);
        for (let i = 0; i < remaining.length; i++) {
            const key = remaining[i];
            chains.push({
                id: Number(key),
                header: 'Цепочка ' + key + ' (без заголовка)',
                isLocked: false,
                operations: opsByChain[key],
                comments: []
            });
        }

        for (let i = 0; i < chains.length; i++) {
            const cmts = {};
            for (let ci = 0; ci < chains[i].comments.length; ci++) cmts[chains[i].comments[ci]] = true;
            const ops = chains[i].operations;
            for (let oi = 0; oi < ops.length; oi++) {
                const cmt = ops[oi].comment;
                if (cmt != null && String(cmt).trim() !== '') cmts[String(cmt).trim()] = true;
            }
            chains[i].comments = Object.keys(cmts);
        }

        log('Итого цепочек: ' + chains.length);

        selectedIds = {};
        collapsedChainIds = {};
        replicatedData = null;

        renderOverview(rows, techChains, chains);
        renderChains();
        updateSelectedInfo();
        updatePreview();

        chainsBox.classList.remove('spg-hidden');
        copyBox.classList.remove('spg-hidden');
        resultBox.classList.add('spg-hidden');
    }

    function renderOverview(rows, techChains, chains) {
        let totalOps = 0;
        for (let i = 0; i < chains.length; i++) totalOps += chains[i].operations.length;
        let html = '';
        html += '<div>Строк: <b>' + rows.length + '</b></div>';
        html += '<div>TechChains: <b>' + techChains.length + '</b></div>';
        html += '<div>Цепочек: <b>' + chains.length + '</b></div>';
        html += '<div>Операций: <b>' + totalOps + '</b></div>';
        overviewEl.innerHTML = html;
        overviewBox.classList.remove('spg-hidden');
    }

    // ---------- Отрисовка цепочек ----------
    function renderChains() {
        if (chains.length === 0) {
            chainsEl.innerHTML = '<div class="spg-empty">Цепочки не найдены</div>';
            return;
        }

        let html = '';
        for (let i = 0; i < chains.length; i++) {
            const c = chains[i];
            const selected = !!selectedIds[c.id];
            const collapsed = !!collapsedChainIds[c.id];
            const cls = 'spg-chain' + (selected ? ' selected' : '');
            const checkedAttr = selected ? ' checked' : '';

            html += '<div class="' + cls + '">';
            html += '<div class="spg-chain-head" data-id="' + c.id + '">';
            html += '<span class="spg-caret" data-caret="' + c.id + '" title="Свернуть/развернуть">' +
                    (collapsed ? '▶' : '▼') + '</span>';
            html += '<input type="checkbox" data-id="' + c.id + '"' + checkedAttr + '>';
            html += '<span class="spg-chain-title">' + escapeHtml(c.header) + '</span>';
            html += '<span class="spg-chain-id">[chainId: ' + c.id + ']</span>';
            html += '<span class="spg-chain-meta">' + c.operations.length + ' операций</span>';
            if (c.isLocked) html += '<span class="spg-lock">locked</span>';
            if (c.comments && c.comments.length > 0) {
                html += '<span class="spg-cmt-badge" title="Комментарии">комм.: ' +
                        escapeHtml(c.comments.join(', ')) + '</span>';
            }
            html += '</div>';

            html += '<div class="spg-chain-body"' + (collapsed ? ' style="display:none"' : '') + '>';
            html += '<div class="spg-chain-table-scroll"><table class="spg-chain-table">';
            html += '<tr>' +
                    '<th style="width:36px">#</th>' +
                    '<th>Строка</th>' +
                    '<th>Операция</th>' +
                    '<th>Тип</th>' +
                    '<th>x</th>' +
                    '<th>y</th>' +
                    '<th>Длит.</th>' +
                    '<th>Комментарий</th>' +
                    '</tr>';

            for (let j = 0; j < c.operations.length; j++) {
                const op = c.operations[j];
                html += '<tr>';
                html += '<td class="spg-num">' + (j + 1) + '</td>';
                html += '<td class="spg-row-title">' + escapeHtml(op.rowTitle || '') + '</td>';
                html += '<td>' + escapeHtml(op.label || '') + '</td>';
                html += '<td class="spg-num">' + (op.type || '') + '</td>';
                html += '<td class="spg-num">' + (op.x != null ? op.x : '') + '</td>';
                html += '<td class="spg-num">' + (op.y != null ? op.y : '') + '</td>';
                html += '<td class="spg-num">' + (op.duration != null ? op.duration : '') + '</td>';
                html += '<td class="spg-comment-cell">' +
                        (op.comment != null && String(op.comment).trim() !== ''
                            ? escapeHtml(String(op.comment))
                            : '<span class="spg-dash">—</span>') +
                        '</td>';
                html += '</tr>';
            }
            if (c.operations.length === 0) {
                html += '<tr><td colspan="8" class="spg-empty-cell">Операций нет</td></tr>';
            }
            html += '</table></div>';
            html += '</div></div>';
        }

        chainsEl.innerHTML = html;

        chainsEl.querySelectorAll('.spg-caret').forEach(el => el.addEventListener('click', onCaretClick));
        chainsEl.querySelectorAll('.spg-chain-head').forEach(el => el.addEventListener('click', onHeadClick));
        chainsEl.querySelectorAll('.spg-chain-head input[type=checkbox]').forEach(el => el.addEventListener('click', onCheckboxClick));
    }

    function onCaretClick(e) {
        e.stopPropagation();
        const id = Number(e.currentTarget.getAttribute('data-caret'));
        if (collapsedChainIds[id]) delete collapsedChainIds[id];
        else collapsedChainIds[id] = true;
        renderChains();
    }
    function onHeadClick(e) {
        if (e.target.classList && e.target.classList.contains('spg-caret')) return;
        const id = Number(e.currentTarget.getAttribute('data-id'));
        toggleChain(id);
    }
    function onCheckboxClick(e) {
        e.stopPropagation();
        const id = Number(e.currentTarget.getAttribute('data-id'));
        toggleChain(id);
    }

    function toggleChain(id) {
        if (selectedIds[id]) delete selectedIds[id];
        else selectedIds[id] = true;
        renderChains();
        updateSelectedInfo();
        updatePreview();
    }

    function updateSelectedInfo() {
        const n = Object.keys(selectedIds).length;
        selectedInfo.textContent = 'Выбрано: ' + n + ' из ' + chains.length;
    }

    $('spgSelectAllBtn').onclick = () => {
        selectedIds = {};
        for (let i = 0; i < chains.length; i++) selectedIds[chains[i].id] = true;
        renderChains(); updateSelectedInfo(); updatePreview();
    };
    $('spgClearAllBtn').onclick = () => {
        selectedIds = {};
        renderChains(); updateSelectedInfo(); updatePreview();
    };
    $('spgExpandAllChainsBtn').onclick = () => { collapsedChainIds = {}; renderChains(); };
    $('spgCollapseAllChainsBtn').onclick = () => {
        collapsedChainIds = {};
        for (let i = 0; i < chains.length; i++) collapsedChainIds[chains[i].id] = true;
        renderChains();
    };

    // ---------- Режимы ----------
    const modeTabs = win.querySelectorAll('.spg-mode-tab');
    modeTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            modeTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            copyMode = this.getAttribute('data-mode');
            if (copyMode === 'count') {
                $('spgModeCountPanel').classList.remove('spg-hidden');
                $('spgModeTrainsPanel').classList.add('spg-hidden');
            } else {
                $('spgModeCountPanel').classList.add('spg-hidden');
                $('spgModeTrainsPanel').classList.remove('spg-hidden');
            }
            updatePreview();
        });
    });

    // ---------- Превью ----------
    function getSelectedChains() {
        const out = [];
        for (let i = 0; i < chains.length; i++) {
            if (selectedIds[chains[i].id]) out.push(chains[i]);
        }
        return out;
    }

    function clampInt(v, min, max, def) {
        let n = parseInt(v, 10);
        if (isNaN(n)) return def;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    function updatePreview() {
        const selected = getSelectedChains();
        if (selected.length === 0) {
            previewInfo.textContent = 'Выберите хотя бы одну цепочку.';
            return;
        }

        if (copyMode === 'count') {
            const count = clampInt($('spgCopyCount').value, 1, 200, 1);
            const minutes = clampInt($('spgShiftMinutes').value, 1, 1440, 15);
            const shiftX = minutes * MINUTE_TO_X;
            const totalCopies = selected.length * count;
            previewInfo.innerHTML =
                'Режим: <b>по количеству</b>. Копий: <b>' + totalCopies +
                '</b>. Итог: <b>' + (chains.length + totalCopies) + '</b> цепочек.<br>' +
                'Сдвиг: <b>' + minutes + ' мин</b> = <b>' + shiftX + ' ед. X</b>.';
            return;
        }

        let okCount = 0;
        for (let i = 0; i < trainsList.length; i++) {
            if (trainsList[i].status === 'ok') okCount++;
        }
        const totalCopies2 = selected.length * okCount;
        previewInfo.innerHTML =
            'Режим: <b>по расписанию</b>. Строк: <b>' + trainsList.length +
            '</b>, валидных: <b>' + okCount + '</b>.<br>' +
            'Копий: <b>' + totalCopies2 + '</b>. Итог: <b>' + (chains.length + totalCopies2) + '</b> цепочек.<br>' +
            'Время применяется к <b>первой</b> операции цепочки.';
    }

    $('spgCopyCount').oninput = updatePreview;
    $('spgShiftMinutes').oninput = updatePreview;

    // ---------- CSV ----------
    trainsFileInput.onchange = function () {
        if (trainsFileInput.files.length === 0) return;
        const file = trainsFileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            trainsStatus.innerHTML = '<div class="spg-info-block spg-red">Только CSV. Сохраните таблицу как CSV (разделитель ;).</div>';
            return;
        }
        trainsStatus.innerHTML = '<div class="spg-info-block spg-blue">Читаю: ' + escapeHtml(file.name) + '</div>';
        const reader = new FileReader();
        reader.onerror = () => {
            trainsStatus.innerHTML = '<div class="spg-info-block spg-red">Ошибка чтения</div>';
        };
        reader.onload = (e) => {
            try {
                const rows = parseCsv(e.target.result);
                processTrainRows(rows);
                trainsStatus.innerHTML = '<div class="spg-info-block spg-blue">Загружено: ' +
                    escapeHtml(file.name) + '. Строк: ' + rows.length + '</div>';
            } catch (err) {
                trainsStatus.innerHTML = '<div class="spg-info-block spg-red">Ошибка CSV: ' + escapeHtml(err.message) + '</div>';
            }
        };
        reader.readAsText(file, 'UTF-8');
    };

    function parseCsv(text) {
        const lines = text.split(/\r?\n/);
        const rows = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            let sep = ';';
            if (line.indexOf(';') === -1) {
                if (line.indexOf('\t') !== -1) sep = '\t';
                else if (line.indexOf(',') !== -1) sep = ',';
            }
            rows.push(line.split(sep).map(s => s.trim()));
        }
        return rows;
    }

    function processTrainRows(rows) {
        trainsList = [];
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length < 2) continue;
            const train = String(r[0] == null ? '' : r[0]).trim();
            const rawTime = r[1];
            if (!train && !rawTime) continue;
            trainsList.push(parseTrainRow(train, rawTime));
        }
        renderTrainsPreview();
        updatePreview();
    }

    function parseTrainRow(train, rawTime) {
        const result = { train, raw: rawTime, minutes: null, x: null, status: 'ok', note: '' };

        if (typeof rawTime === 'number') {
            result.minutes = Math.round(rawTime * 24 * 60);
            result.x = result.minutes * MINUTE_TO_X;
            return result;
        }

        const s = String(rawTime == null ? '' : rawTime).trim();
        if (!s) { result.status = 'empty'; result.note = 'Пустое значение'; return result; }

        const parsed = parseTimeString(s);
        if (parsed === null) { result.status = 'text'; result.note = 'Не распознано'; return result; }

        result.minutes = parsed;
        result.x = parsed * MINUTE_TO_X;
        return result;
    }

    function parseTimeString(s) {
        s = s.replace(/\s+/g, ' ').trim();
        let m = s.match(/^(\d{1,2})\s*[:\-\.]\s*(\d{1,2})(?:\s*[:\-\.]\s*\d{1,2})?$/);
        if (m) {
            const h = parseInt(m[1], 10), mn = parseInt(m[2], 10);
            if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59) return h * 60 + mn;
            return null;
        }
        m = s.match(/^(\d{1,2})\s*ч(?:\s*(\d{1,2}))?$/);
        if (m) {
            const h2 = parseInt(m[1], 10), mn2 = m[2] ? parseInt(m[2], 10) : 0;
            if (h2 >= 0 && h2 <= 23 && mn2 >= 0 && mn2 <= 59) return h2 * 60 + mn2;
            return null;
        }
        m = s.match(/^(\d{1,2})$/);
        if (m) {
            const h3 = parseInt(m[1], 10);
            if (h3 >= 0 && h3 <= 23) return h3 * 60;
            return null;
        }
        return null;
    }

    // ---------- Таблица расписания ----------
    function renderTrainsPreview() {
        if (trainsList.length === 0) {
            trainsPreviewWrap.classList.remove('spg-hidden');
            trainsCount.textContent = '0';
            trainsPreviewBody.innerHTML =
                '<tr><td colspan="6" class="spg-empty-cell">Нет строк. Нажмите «＋ Добавить» или загрузите CSV.</td></tr>';
            return;
        }
        trainsPreviewWrap.classList.remove('spg-hidden');
        trainsCount.textContent = trainsList.length;

        let html = '';
        for (let i = 0; i < trainsList.length; i++) {
            const t = trainsList[i];
            let trCls = '';
            if (t.status === 'text') trCls = ' class="spg-warn"';
            else if (t.status === 'empty') trCls = ' class="spg-err"';

            const rawDisplay = t.raw == null ? '' : String(t.raw);

            html += '<tr' + trCls + ' data-idx="' + i + '">';
            html += '<td class="spg-num">' + (i + 1) + '</td>';
            html += '<td><input type="text" class="spg-cell-input spg-train-input" ' +
                    'value="' + escapeAttr(t.train) + '" data-idx="' + i + '" data-field="train"></td>';
            html += '<td><input type="text" class="spg-cell-input spg-time-input" ' +
                    'value="' + escapeAttr(rawDisplay) + '" data-idx="' + i + '" data-field="raw" ' +
                    'placeholder="чч:мм"></td>';
            html += '<td class="spg-num">' + (t.minutes != null ? t.minutes : '—') + '</td>';
            html += '<td class="spg-num">' + (t.x != null ? t.x : '—') + '</td>';
            html += '<td><button type="button" class="spg-btn spg-small spg-danger" data-action="del" data-idx="' + i + '" title="Удалить">✕</button></td>';
            html += '</tr>';
        }
        trainsPreviewBody.innerHTML = html;

        trainsPreviewBody.querySelectorAll('input.spg-cell-input').forEach(inp => {
            inp.addEventListener('input', onCellInput);
            inp.addEventListener('blur', onCellBlur);
            inp.addEventListener('keydown', onCellKeydown);
        });
        trainsPreviewBody.querySelectorAll('button[data-action="del"]').forEach(btn => {
            btn.addEventListener('click', onDeleteRow);
        });
    }

    function onCellInput(e) {
        const input = e.currentTarget;
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        const field = input.getAttribute('data-field');
        if (isNaN(idx) || !trainsList[idx]) return;

        if (field === 'train') trainsList[idx].train = input.value;
        else if (field === 'raw') trainsList[idx].raw = input.value;

        recalcTrainRow(idx);
        updateRowMetaCells(idx);
        updatePreview();
    }
    function onCellBlur(e) {
        const input = e.currentTarget;
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        if (isNaN(idx) || !trainsList[idx]) return;
        renderTrainsPreview();
    }
    function onCellKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
    }

    function recalcTrainRow(idx) {
        const t = trainsList[idx];
        const raw = t.raw;
        let mins = null;

        if (typeof raw === 'number') {
            mins = Math.round(raw * 24 * 60);
        } else {
            const s = String(raw == null ? '' : raw).trim();
            if (s) {
                const p = parseTimeString(s);
                if (p !== null) mins = p;
            }
        }

        t.minutes = mins;
        t.x = mins != null ? mins * MINUTE_TO_X : null;

        if (mins == null) {
            if (raw == null || String(raw).trim() === '') t.status = 'empty';
            else t.status = 'text';
        } else {
            t.status = 'ok';
        }
    }

    function updateRowMetaCells(idx) {
        const row = trainsPreviewBody.querySelector('tr[data-idx="' + idx + '"]');
        if (!row) return;
        const t = trainsList[idx];
        const tds = row.querySelectorAll('td');
        tds[3].textContent = (t.minutes != null ? t.minutes : '—');
        tds[4].textContent = (t.x != null ? t.x : '—');
        row.classList.remove('spg-warn', 'spg-err');
        if (t.status === 'text') row.classList.add('spg-warn');
        else if (t.status === 'empty') row.classList.add('spg-err');
    }

    function onDeleteRow(e) {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (isNaN(idx)) return;
        trainsList.splice(idx, 1);
        renderTrainsPreview();
        updatePreview();
    }

    $('spgAddTrainRowBtn').onclick = () => {
        trainsList.push({ train: '', raw: '', minutes: null, x: null, status: 'empty', note: '' });
        renderTrainsPreview();
        updatePreview();
        const lastIdx = trainsList.length - 1;
        const inp = trainsPreviewBody.querySelector('input.spg-train-input[data-idx="' + lastIdx + '"]');
        if (inp) inp.focus();
    };

    $('spgClearTrainsBtn').onclick = () => {
        if (trainsList.length === 0) return;
        spgConfirm('Удалить все строки расписания?', () => {
            trainsList = [];
            renderTrainsPreview();
            updatePreview();
        });
    };

    // ---------- Логика копирования ----------
    function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

    function applyReplication() {
        const data = deepClone(sourceData);
        const gd = data.graphData;
        if (!gd) throw new Error('Нет graphData');

        const rows = gd.rows || [];
        const techChains = gd.techChains || [];
        const selected = getSelectedChains();

        const existingIds = {};
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].operations) continue;
            for (let j = 0; j < rows[i].operations.length; j++) {
                const op = rows[i].operations[j];
                if (op.id != null) existingIds[op.id] = true;
                if (op.chainId != null) existingIds[op.chainId] = true;
            }
        }
        for (let i = 0; i < techChains.length; i++) existingIds[techChains[i].id] = true;

        let baseId = Date.now();
        function nextId() {
            while (existingIds[baseId]) baseId++;
            existingIds[baseId] = true;
            return baseId;
        }

        let totalCopies = 0;

        if (copyMode === 'count') {
            const count = clampInt($('spgCopyCount').value, 1, 200, 1);
            const minutes = clampInt($('spgShiftMinutes').value, 1, 1440, 15);
            const shiftX = minutes * MINUTE_TO_X;
            const prefix = ($('spgCopyPrefix').value || 'копия').trim() || 'копия';

            for (let s = 0; s < selected.length; s++) {
                const chain = selected[s];
                for (let k = 1; k <= count; k++) {
                    const newChainId = nextId();
                    techChains.push({
                        header: chain.header + ' (' + prefix + ' ' + k + ')',
                        isLocked: chain.isLocked,
                        id: newChainId
                    });

                    for (let oi = 0; oi < chain.operations.length; oi++) {
                        const opSrc = chain.operations[oi];
                        const targetRow = findRowById(rows, opSrc.rowId);
                        if (!targetRow) continue;
                        if (!targetRow.operations) targetRow.operations = [];
                        const originalOp = findOpById(targetRow.operations, opSrc.id);
                        if (!originalOp) continue;

                        const newOp = deepClone(originalOp);
                        newOp.id = nextId();
                        newOp.chainId = newChainId;
                        if (typeof newOp.x === 'number') newOp.x = newOp.x + shiftX * k;
                        targetRow.operations.push(newOp);
                    }
                    totalCopies++;
                }
            }
        } else {
            for (let s2 = 0; s2 < selected.length; s2++) {
                const chain2 = selected[s2];

                let baseX = null;
                for (let fi = 0; fi < chain2.operations.length; fi++) {
                    const fx = chain2.operations[fi].x;
                    if (typeof fx === 'number') {
                        if (baseX === null || fx < baseX) baseX = fx;
                    }
                }
                if (baseX === null) baseX = 0;

                for (let ti = 0; ti < trainsList.length; ti++) {
                    const t = trainsList[ti];
                    if (t.status !== 'ok') continue;

                    const newChainId2 = nextId();
                    const headerText = chain2.header + ' — поезд ' + t.train;
                    const firstX = t.minutes * MINUTE_TO_X;
                    const delta = firstX - baseX;

                    techChains.push({
                        header: headerText,
                        isLocked: chain2.isLocked,
                        id: newChainId2,
                        comment: t.train
                    });

                    for (let oi2 = 0; oi2 < chain2.operations.length; oi2++) {
                        const opSrc2 = chain2.operations[oi2];
                        const targetRow2 = findRowById(rows, opSrc2.rowId);
                        if (!targetRow2) continue;
                        if (!targetRow2.operations) targetRow2.operations = [];
                        const originalOp2 = findOpById(targetRow2.operations, opSrc2.id);
                        if (!originalOp2) continue;

                        const newOp2 = deepClone(originalOp2);
                        newOp2.id = nextId();
                        newOp2.chainId = newChainId2;
                        if (typeof newOp2.x === 'number') newOp2.x = newOp2.x + delta;
                        else newOp2.x = firstX;
                        newOp2.comment = t.train;
                        targetRow2.operations.push(newOp2);
                    }
                    totalCopies++;
                }
            }
        }

        return { data, totalCopies, selectedCount: selected.length };
    }

    function findRowById(rows, id) {
        for (let i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
        return null;
    }
    function findOpById(ops, id) {
        for (let i = 0; i < ops.length; i++) if (ops[i].id === id) return ops[i];
        return null;
    }

    // ---------- Применение ----------
    $('spgApplyBtn').onclick = function () {
        if (Object.keys(selectedIds).length === 0) {
            spgAlert('Выберите хотя бы одну цепочку.');
            return;
        }

        if (copyMode === 'trains') {
            let okCount = 0;
            for (let i = 0; i < trainsList.length; i++) if (trainsList[i].status === 'ok') okCount++;
            if (okCount === 0) {
                spgAlert('Загрузите CSV или добавьте строки вручную.');
                return;
            }

            const textRows = [];
            for (let k = 0; k < trainsList.length; k++) {
                if (trainsList[k].status === 'text') textRows.push(trainsList[k]);
            }
            if (textRows.length > 0) {
                askAboutTextRows(textRows, () => doApply());
                return;
            }
        }
        doApply();
    };

    function askAboutTextRows(textRows, onConfirm) {
        const list = textRows.map(t =>
            '• ' + escapeHtml(t.train) + ' — "' + escapeHtml(String(t.raw)) + '"'
        ).join('<br>');

        showModal(
            'Не распознано время',
            'В ' + textRows.length + ' строк(ах) время не похоже на час:мин. Они будут пропущены.<br><br>' + list,
            () => onConfirm()
        );
    }

    function doApply() {
        try {
            const res = applyReplication();
            replicatedData = res.data;

            resultInfo.innerHTML =
                'Готово! Копий: <b>' + res.totalCopies + '</b>. ' +
                'Цепочек было: <b>' + chains.length + '</b>, ' +
                'стало: <b>' + (chains.length + res.totalCopies) + '</b>.';

            const json = JSON.stringify(res.data, null, 2);
            if (json.length > 15000) resultPreview.textContent = json.slice(0, 15000) + '\n... (усечено)';
            else resultPreview.textContent = json;

            resultBox.classList.remove('spg-hidden');
            resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            spgAlert('Ошибка: ' + err.message);
            console.error(err);
        }
    }

    // ---------- Модальные окна ----------
    function showModal(title, text, onOk) {
        $('spgModalTitle').textContent = title;
        $('spgModalText').innerHTML = text;
        $('spgModalBackdrop').classList.remove('spg-hidden');
        $('spgModalOk').onclick = () => {
            $('spgModalBackdrop').classList.add('spg-hidden');
            if (onOk) onOk();
        };
        $('spgModalCancel').onclick = () => {
            $('spgModalBackdrop').classList.add('spg-hidden');
        };
    }

    function spgAlert(text) {
        showModal('Внимание', escapeHtml(text), null);
    }
    function spgConfirm(text, onOk) {
        showModal('Подтверждение', escapeHtml(text), onOk);
    }

    // ---------- Скачивание ----------
    function makeDownload(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType || 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    $('spgDownloadFullBtn').onclick = () => {
        if (!replicatedData) { spgAlert('Сначала «Применить копирование».'); return; }
        makeDownload('СПГ_with_copies.json', JSON.stringify(replicatedData));
    };
    $('spgDownloadChainsBtn').onclick = () => {
        if (!replicatedData) { spgAlert('Сначала «Применить копирование».'); return; }
        const gd = replicatedData.graphData || {};
        const out = { techChains: gd.techChains || [], rows: gd.rows || [] };
        makeDownload('chains_with_copies.json', JSON.stringify(out, null, 2));
    };
    $('spgCopyJsonBtn').onclick = () => {
        if (!replicatedData) { spgAlert('Сначала «Применить копирование».'); return; }
        const text = JSON.stringify(replicatedData, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                const btn = $('spgCopyJsonBtn');
                const old = btn.textContent;
                btn.textContent = '✔ Скопировано';
                setTimeout(() => { btn.textContent = old; }, 1500);
            }).catch(err => spgAlert('Не скопировать: ' + err.message));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            spgAlert('Скопировано в буфер');
        }
    };

    // ---------- Утилиты ----------
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
}