// ============================================================
//  СПГ — Технологические цепочки (v2)
//  Интеграция в macOS-систему (createWindow)
// ============================================================

const SPG_MINUTE_TO_X = 2;
const SPG_PROSTOY_LABEL = 'простой вагона в ожидании';
const SPG_PEREGON_KEYWORD = 'перегон';
const SPG_LS_KEY = 'spg_comments_backup_v1';

function createSpgApp() {
    const html = `
        <div class="spg-app" id="spgApp">
            <div class="spg-topbar">
                <div class="spg-topbar-logo">🚂 СПГ — Технологические цепочки</div>
                <div class="spg-drop" id="spgDrop">
                    <span class="spg-drop-icon">📂</span>
                    <span class="spg-drop-text"><b>Загрузить JSON</b> — нажмите или перетащите</span>
                    <span class="spg-drop-file" id="spgFileName"></span>
                </div>
                <input type="file" id="spgFileInput" accept=".json,application/json" hidden>
            </div>

            <div class="spg-scroll">
                <div class="spg-section spg-hidden" id="spgChainsBox">
                    <div class="spg-section-title">Найденные технологические цепочки</div>

                    <div class="spg-hidden-banner spg-hidden" id="spgHiddenBanner">
                        <span>👁</span>
                        <span>Комментарии скрыты.</span>
                        <span class="spg-meta" id="spgBackupMeta"></span>
                        <div class="spg-spacer"></div>
                        <button type="button" class="spg-btn spg-small spg-primary" id="spgApplyChangesBtn">✚ Применить изменения</button>
                        <button type="button" class="spg-btn spg-small spg-success" id="spgRestoreTopBtn">↺ Восстановить</button>
                        <button type="button" class="spg-btn spg-small spg-danger" id="spgDeleteBackupBtn" title="Удалить снимок">🗑 Забыть снимок</button>
                    </div>

                    <div class="spg-search-row">
                        <input type="text" class="spg-search-input" id="spgChainSearchInput"
                               placeholder="🔍 Поиск по названию или chainId…">
                        <span class="spg-search-info" id="spgChainSearchInfo"></span>
                    </div>

                    <div class="spg-toolbar">
                        <button type="button" class="spg-btn" id="spgSelectAllBtn">Выбрать все</button>
                        <button type="button" class="spg-btn" id="spgClearAllBtn">Снять выбор</button>
                        <button type="button" class="spg-btn" id="spgExpandAllChainsBtn">Развернуть</button>
                        <button type="button" class="spg-btn" id="spgCollapseAllChainsBtn">Свернуть</button>
                        <div class="spg-spacer"></div>
                        <button type="button" class="spg-btn spg-warn" id="spgHideCommentsBtn" title="Скрыть комментарии">👁 Скрыть комм.</button>
                        <button type="button" class="spg-btn spg-success spg-hidden" id="spgRestoreCommentsBtn" title="Восстановить комментарии">↺ Показать комм.</button>
                        <span class="spg-info" id="spgSelectedInfo">Выбрано: 0</span>
                    </div>

                    <div class="spg-chains-scroll" id="spgChainsScroll">
                        <div id="spgChains"></div>
                    </div>
                </div>

                <div class="spg-section spg-hidden" id="spgCopyBox">
                    <div class="spg-section-title">Параметры копирования</div>

                    <div class="spg-mode-tabs">
                        <div class="spg-mode-tab" data-mode="count">По количеству</div>
                        <div class="spg-mode-tab active" data-mode="trains">По расписанию</div>
                    </div>

                    <div id="spgModeCountPanel" class="spg-hidden">
                        <div class="spg-field-row">
                            <div class="spg-field">
                                <label>Количество копий</label>
                                <input type="number" id="spgCopyCount" value="1" min="1" max="200">
                            </div>
                            <div class="spg-field">
                                <label>Сдвиг (минут)</label>
                                <input type="number" id="spgShiftMinutes" value="15" min="1" max="1440">
                            </div>
                            <div class="spg-field spg-wide">
                                <label>Префикс заголовка</label>
                                <input type="text" id="spgCopyPrefix" value="копия">
                            </div>
                        </div>
                    </div>

                    <div id="spgModeTrainsPanel">
                        <div class="spg-toolbar">
                            <label class="spg-label">Загрузить CSV:</label>
                            <input type="file" id="spgTrainsFileInput" accept=".csv" class="spg-file-inline">
                            <button type="button" class="spg-btn spg-small" id="spgAddTrainRowBtn">＋ Добавить</button>
                            <button type="button" class="spg-btn spg-small spg-danger" id="spgClearTrainsBtn">✕ Очистить</button>
                            <div class="spg-spacer"></div>
                            <span class="spg-info">Строк: <b id="spgTrainsTotal">0</b>, валидных: <b id="spgTrainsValid">0</b></span>
                        </div>

                        <div id="spgTrainsStatus"></div>

                        <div class="spg-table-scroll">
                            <table class="spg-trains-table" id="spgTrainsPreviewTable">
                                <thead>
                                    <tr>
                                        <th style="width:36px">#</th>
                                        <th style="width:110px">Поезд-1</th>
                                        <th style="width:90px">Начало</th>
                                        <th style="width:90px">Конец</th>
                                        <th style="width:110px">Поезд-2</th>
                                        <th style="width:90px">Начало 2</th>
                                        <th style="width:90px">Конец 2</th>
                                        <th style="width:70px"></th>
                                    </tr>
                                </thead>
                                <tbody id="spgTrainsPreviewBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div style="margin-top:16px;">
                        <button type="button" class="spg-btn spg-primary spg-big" id="spgApplyBtn">Применить копирование</button>
                    </div>

                    <div class="spg-info-block spg-blue" id="spgPreviewInfo" style="margin-top:12px;">
                        Выберите цепочки для настройки.
                    </div>
                </div>

                <div class="spg-section spg-hidden" id="spgResultBox">
                    <div class="spg-section-title">Результат</div>
                    <div class="spg-info-block spg-green" id="spgResultInfo"></div>
                    <div class="spg-toolbar" style="margin-top:12px;">
                        <button type="button" class="spg-btn spg-primary spg-big" id="spgDownloadFullBtn">⬇ Скачать файл</button>
                    </div>
                </div>
            </div>

            <div class="spg-modal-backdrop spg-hidden" id="spgModalBackdrop">
                <div class="spg-modal-box">
                    <h3 id="spgModalTitle">Вопрос</h3>
                    <div id="spgModalText"></div>
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
        width: 960,
        height: 760,
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

    const MINUTE_TO_X = SPG_MINUTE_TO_X;
    const PROSTOY_LABEL = SPG_PROSTOY_LABEL;
    const PEREgon_KEYWORD = SPG_PEREGON_KEYWORD;
    const LS_KEY = SPG_LS_KEY;

    // ---------- DOM ----------
    const drop              = $('spgDrop');
    const fileInput         = $('spgFileInput');
    const fileNameEl        = $('spgFileName');
    const chainsBox         = $('spgChainsBox');
    const chainsEl          = $('spgChains');
    const copyBox           = $('spgCopyBox');
    const resultBox         = $('spgResultBox');
    const resultInfo        = $('spgResultInfo');
    const previewInfo       = $('spgPreviewInfo');
    const selectedInfo      = $('spgSelectedInfo');
    const trainsFileInput   = $('spgTrainsFileInput');
    const trainsStatus      = $('spgTrainsStatus');
    const trainsPreviewBody = $('spgTrainsPreviewBody');
    const trainsTotal       = $('spgTrainsTotal');
    const trainsValid       = $('spgTrainsValid');
    const hiddenBanner      = $('spgHiddenBanner');
    const backupMeta        = $('spgBackupMeta');
    const chainSearchInput  = $('spgChainSearchInput');
    const chainSearchInfo   = $('spgChainSearchInfo');

    // ---------- Состояние ----------
    let sourceData = null;
    let chains = [];
    let selectedIds = {};
    let collapsedChainIds = {};
    let replicatedData = null;
    let commentsHidden = false;
    let chainSearchQuery = '';
    let copyMode = 'trains';
    let trainsList = [];

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
    function xToHHMM(x) {
        if (x == null || typeof x !== 'number' || isNaN(x)) return '';
        const minutes = Math.round(x / MINUTE_TO_X);
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
    function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
    function clampInt(v, min, max, def) {
        let n = parseInt(v, 10);
        if (isNaN(n)) return def;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    // ============================================================
    //  localStorage — снимок комментариев
    // ============================================================
    function saveCommentsSnapshot() {
        const snapshot = { version: 1, savedAt: new Date().toISOString(), chains: {} };
        let totalSaved = 0;
        for (let i = 0; i < chains.length; i++) {
            const c = chains[i];
            const opsComments = {};
            const ops = c.operations;
            for (let j = 0; j < ops.length; j++) {
                const cmt = ops[j].comment;
                if (cmt != null && String(cmt).trim() !== '') {
                    opsComments[String(ops[j].id)] = String(cmt).trim();
                    totalSaved++;
                }
            }
            const hasChainComment = c.comments && c.comments.length > 0;
            const hasOpComments = Object.keys(opsComments).length > 0;
            if (hasChainComment || hasOpComments) {
                snapshot.chains[String(c.id)] = {
                    chainComment: hasChainComment ? c.comments.join(' | ') : null,
                    operations: opsComments
                };
            }
        }
        if (totalSaved === 0 && Object.keys(snapshot.chains).length === 0) return false;
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
            return true;
        } catch (e) { console.error(e); return false; }
    }
    function loadCommentsSnapshot() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || data.version !== 1 || !data.chains) return null;
            return data;
        } catch (e) { return null; }
    }
    function deleteCommentsSnapshot() {
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
    }

    // ============================================================
    //  МОДАЛЬНЫЕ ОКНА
    // ============================================================
    function showModal(title, htmlContent, onOk, hideCancel) {
        $('spgModalTitle').textContent = title;
        $('spgModalText').innerHTML = htmlContent;
        $('spgModalBackdrop').classList.remove('spg-hidden');
        $('spgModalCancel').style.display = hideCancel ? 'none' : '';
        $('spgModalOk').onclick = function () {
            $('spgModalBackdrop').classList.add('spg-hidden');
            if (onOk) onOk();
        };
        $('spgModalCancel').onclick = function () {
            $('spgModalBackdrop').classList.add('spg-hidden');
        };
    }
    function spgAlert(text) { showModal('Внимание', escapeHtml(text), null, true); }
    function spgConfirm(text, onOk) { showModal('Подтверждение', escapeHtml(text), onOk, false); }

    // ============================================================
    //  ЗАГРУЗКА ФАЙЛА
    // ============================================================
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
        const reader = new FileReader();
        reader.onerror = () => spgAlert('Ошибка чтения файла');
        reader.onload = (e) => {
            let data;
            try {
                data = JSON.parse(e.target.result);
            } catch (err) {
                spgAlert('Ошибка разбора JSON: ' + err.message);
                return;
            }
            sourceData = data;
            fileNameEl.textContent = '📄 ' + file.name;
            drop.classList.add('uploaded');
            analyze(data);
        };
        reader.readAsText(file, 'UTF-8');
    }

    // ============================================================
    //  АНАЛИЗ
    // ============================================================
    function analyze(data) {
        if (!data.graphData) { spgAlert('ОШИБКА: нет поля graphData'); return; }

        const rows = data.graphData.rows || [];
        const techChains = data.graphData.techChains || [];

        const opsByChain = {};
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.operations || !row.operations.length) continue;
            for (let j = 0; j < row.operations.length; j++) {
                const op = row.operations[j];
                if (op.chainId == null) continue;
                const key = String(op.chainId);
                if (!opsByChain[key]) opsByChain[key] = [];
                opsByChain[key].push({
                    id: op.id, label: op.label, type: op.type,
                    x: op.x, duration: op.duration, iconId: op.iconId,
                    comment: op.comment, rowId: row.id, rowTitle: row.title
                });
            }
        }

        chains = [];
        for (let i = 0; i < techChains.length; i++) {
            const tc = techChains[i];
            const idKey = String(tc.id);
            const chainObj = {
                id: tc.id,
                header: tc.header || ('Цепочка ' + tc.id),
                isLocked: !!tc.isLocked,
                operations: opsByChain[idKey] || [],
                comments: [],
                chainComment: tc.comment || null
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
                comments: [],
                chainComment: null
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

        selectedIds = {};
        collapsedChainIds = {};
        replicatedData = null;
        chainSearchQuery = '';
        chainSearchInput.value = '';

        renderChains();
        updateSelectedInfo();
        updatePreview();

        chainsBox.classList.remove('spg-hidden');
        copyBox.classList.remove('spg-hidden');
        resultBox.classList.add('spg-hidden');

        const existing = loadCommentsSnapshot();
        if (existing) {
            commentsHidden = false;
            askRestoreFromBackup(existing);
        } else {
            commentsHidden = false;
        }
        updateCommentsUI();
    }

    // ============================================================
    //  СКРЫТИЕ / ВОССТАНОВЛЕНИЕ
    // ============================================================
    $('spgHideCommentsBtn').onclick = () => {
        saveCommentsSnapshot();
        for (let i = 0; i < chains.length; i++) {
            chains[i].comments = [];
            chains[i].chainComment = null;
            const ops = chains[i].operations;
            for (let j = 0; j < ops.length; j++) ops[j].comment = null;
        }
        commentsHidden = true;
        renderChains();
        updateCommentsUI();
    };
    $('spgRestoreCommentsBtn').onclick = () => restoreFromBackup();
    $('spgRestoreTopBtn').onclick = () => restoreFromBackup();

    $('spgDeleteBackupBtn').onclick = () => {
        spgConfirm('Удалить снимок комментариев из localStorage?', () => {
            deleteCommentsSnapshot();
            commentsHidden = false;
            updateCommentsUI();
        });
    };

    $('spgApplyChangesBtn').onclick = () => {
        replicatedData = buildCurrentDataWithCommentsHidden();
        const cmtCount = countCommentsInData(replicatedData);
        resultInfo.innerHTML =
            'Изменения применены. <b>Комментарии скрыты</b>. ' +
            'Всего операций: <b>' + countOperations(replicatedData) + '</b>, ' +
            'комментариев: <b>' + cmtCount + '</b>.';
        resultBox.classList.remove('spg-hidden');
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    function buildCurrentDataWithCommentsHidden() {
        const data = deepClone(sourceData);
        if (commentsHidden) {
            const gd = data.graphData;
            if (gd) {
                const rows = gd.rows || [];
                for (let i = 0; i < rows.length; i++) {
                    const ops = rows[i].operations;
                    if (!Array.isArray(ops)) continue;
                    for (let j = 0; j < ops.length; j++) {
                        if (ops[j].comment !== undefined) delete ops[j].comment;
                    }
                }
                const tcs = gd.techChains || [];
                for (let k = 0; k < tcs.length; k++) {
                    if (tcs[k].comment !== undefined) delete tcs[k].comment;
                }
            }
        }
        return data;
    }

    function countOperations(data) {
        let n = 0;
        const rows = (data.graphData && data.graphData.rows) || [];
        for (let i = 0; i < rows.length; i++) {
            if (Array.isArray(rows[i].operations)) n += rows[i].operations.length;
        }
        return n;
    }

    function countCommentsInData(data) {
        let n = 0;
        const rows = (data.graphData && data.graphData.rows) || [];
        for (let i = 0; i < rows.length; i++) {
            const ops = rows[i].operations || [];
            for (let j = 0; j < ops.length; j++) {
                if (ops[j].comment != null && String(ops[j].comment).trim() !== '') n++;
            }
        }
        const tcs = (data.graphData && data.graphData.techChains) || [];
        for (let k = 0; k < tcs.length; k++) {
            if (tcs[k].comment != null && String(tcs[k].comment).trim() !== '') n++;
        }
        return n;
    }

    function restoreFromBackup() {
        const snap = loadCommentsSnapshot();
        if (!snap) { spgAlert('Снимок комментариев не найден.'); return; }

        for (let i = 0; i < chains.length; i++) {
            const c = chains[i];
            const saved = snap.chains[String(c.id)];
            if (!saved) continue;
            if (saved.chainComment) {
                c.comments = [saved.chainComment];
                c.chainComment = saved.chainComment;
            } else {
                c.comments = [];
                c.chainComment = null;
            }
            const ops = c.operations;
            for (let j = 0; j < ops.length; j++) {
                const cmt = saved.operations && saved.operations[String(ops[j].id)];
                if (cmt != null) {
                    ops[j].comment = cmt;
                    if (!saved.chainComment && c.comments.indexOf(cmt) === -1) c.comments.push(cmt);
                }
            }
        }

        commentsHidden = false;
        renderChains();
        updateCommentsUI();
    }

    function updateCommentsUI() {
        const snap = loadCommentsSnapshot();
        if (commentsHidden) {
            hiddenBanner.classList.remove('spg-hidden');
            $('spgHideCommentsBtn').classList.add('spg-hidden');
            $('spgRestoreCommentsBtn').classList.remove('spg-hidden');
            if (snap && snap.savedAt) {
                const dt = new Date(snap.savedAt);
                const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
                const chainCount = Object.keys(snap.chains || {}).length;
                backupMeta.textContent = '(снимок от ' + dateStr + ', цепочек: ' + chainCount + ')';
            } else {
                backupMeta.textContent = '(снимок отсутствует)';
            }
        } else {
            hiddenBanner.classList.add('spg-hidden');
            $('spgHideCommentsBtn').classList.remove('spg-hidden');
            $('spgRestoreCommentsBtn').classList.add('spg-hidden');
        }
    }

    function askRestoreFromBackup(snap) {
        const dt = new Date(snap.savedAt);
        const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
        const chainCount = Object.keys(snap.chains || {}).length;
        let totalOps = 0;
        for (const cid in snap.chains) {
            if (snap.chains.hasOwnProperty(cid)) {
                totalOps += Object.keys(snap.chains[cid].operations || {}).length;
            }
        }
        showModal(
            'Найден сохранённый снимок комментариев',
            '<p>В localStorage есть снимок от <b>' + dateStr + '</b>:<br>' +
            'цепочек: <b>' + chainCount + '</b>, комментариев операций: <b>' + totalOps + '</b>.</p>' +
            '<p>Восстановить комментарии из снимка для цепочек, которые есть в новом файле?</p>',
            () => restoreFromBackup(),
            false
        );
    }

    // ============================================================
    //  ОТРИСОВКА ЦЕПОЧЕК
    // ============================================================
    function matchesChainSearch(c) {
        if (!chainSearchQuery) return true;
        const q = chainSearchQuery.toLowerCase();
        if (String(c.header || '').toLowerCase().indexOf(q) !== -1) return true;
        if (String(c.id).indexOf(q) !== -1) return true;
        return false;
    }

    function renderChains() {
        if (chains.length === 0) {
            chainsEl.innerHTML = '<div class="spg-empty-message">Цепочки не найдены</div>';
            chainSearchInfo.textContent = '';
            return;
        }

        let visible = 0;
        let html = '';
        for (let i = 0; i < chains.length; i++) {
            const c = chains[i];
            if (!matchesChainSearch(c)) continue;
            visible++;

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
            if (!commentsHidden && c.comments && c.comments.length > 0) {
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
                    '<th>x (чч:мм)</th>' +
                    '<th>Длит.</th>';
            if (!commentsHidden) html += '<th>Комментарий</th>';
            html += '</tr>';

            for (let j = 0; j < c.operations.length; j++) {
                const op = c.operations[j];
                html += '<tr>';
                html += '<td class="spg-num">' + (j + 1) + '</td>';
                html += '<td class="spg-row-title">' + escapeHtml(op.rowTitle || '') + '</td>';
                html += '<td>' + escapeHtml(op.label || '') + '</td>';
                html += '<td class="spg-num">' + (op.type || '') + '</td>';
                html += '<td class="spg-xcell">' + (op.x != null ? xToHHMM(op.x) : '') + '</td>';
                html += '<td class="spg-num">' + (op.duration != null ? op.duration : '') + '</td>';
                if (!commentsHidden) {
                    html += '<td class="spg-comment-cell">' +
                            (op.comment != null && String(op.comment).trim() !== ''
                                ? escapeHtml(String(op.comment))
                                : '<span class="spg-dash">—</span>') +
                            '</td>';
                }
                html += '</tr>';
            }
            if (c.operations.length === 0) {
                const colSpan = commentsHidden ? 6 : 7;
                html += '<tr><td colspan="' + colSpan + '" class="spg-empty-cell">Операций нет</td></tr>';
            }
            html += '</table></div></div></div>';
        }

        if (visible === 0) {
            chainsEl.innerHTML = '<div class="spg-empty-message">По запросу «' +
                escapeHtml(chainSearchQuery) + '» ничего не найдено</div>';
        } else {
            chainsEl.innerHTML = html;
            chainsEl.querySelectorAll('.spg-caret').forEach(el => el.addEventListener('click', onCaretClick));
            chainsEl.querySelectorAll('.spg-chain-head').forEach(el => el.addEventListener('click', onHeadClick));
            chainsEl.querySelectorAll('.spg-chain-head input[type=checkbox]').forEach(el => el.addEventListener('click', onCheckboxClick));
        }

        chainSearchInfo.textContent = chainSearchQuery
            ? 'Найдено: ' + visible + ' из ' + chains.length
            : 'Всего: ' + chains.length;
    }

    chainSearchInput.oninput = () => {
        chainSearchQuery = chainSearchInput.value.trim();
        renderChains();
    };

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
        for (let i = 0; i < chains.length; i++) {
            if (matchesChainSearch(chains[i])) selectedIds[chains[i].id] = true;
        }
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

    // ============================================================
    //  РЕЖИМЫ
    // ============================================================
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

    // ============================================================
    //  ПРЕВЬЮ
    // ============================================================
    function getSelectedChains() {
        const out = [];
        for (let i = 0; i < chains.length; i++) {
            if (selectedIds[chains[i].id]) out.push(chains[i]);
        }
        return out;
    }
    function getValidTrainsCount() {
        let n = 0;
        for (let i = 0; i < trainsList.length; i++) {
            if (trainsList[i].status === 'ok') n++;
        }
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
        const okCount = getValidTrainsCount();
        const totalCopies2 = selected.length * okCount;
        previewInfo.innerHTML =
            'Режим: <b>по расписанию</b>. Строк: <b>' + trainsList.length +
            '</b>, валидных: <b>' + okCount + '</b>.<br>' +
            'Копий: <b>' + totalCopies2 + '</b>. Итог: <b>' + (chains.length + totalCopies2) + '</b> цепочек.<br>' +
            '<b>Поезд-1</b> → comment первой операции (по метке «перегон»), ' +
            '<b>поезд-2</b> → последней.';
    }
    $('spgCopyCount').oninput = updatePreview;
    $('spgShiftMinutes').oninput = updatePreview;

    // ============================================================
    //  CSV
    // ============================================================
    trainsFileInput.onchange = function () {
        if (trainsFileInput.files.length === 0) return;
        const file = trainsFileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            trainsStatus.innerHTML = '<div class="spg-info-block spg-red">Только CSV-файл.</div>';
            return;
        }
        trainsStatus.innerHTML = '<div class="spg-info-block spg-blue">Читаю: ' + escapeHtml(file.name) + '</div>';
        const reader = new FileReader();
        reader.onerror = () => { trainsStatus.innerHTML = '<div class="spg-info-block spg-red">Ошибка чтения</div>'; };
        reader.onload = (e) => {
            try {
                const rows = parseCsv(e.target.result);
                processTrainRows(rows);
                trainsStatus.innerHTML = '<div class="spg-info-block spg-blue">Загружено: ' + escapeHtml(file.name) + '</div>';
            } catch (err) {
                trainsStatus.innerHTML = '<div class="spg-info-block spg-red">Ошибка CSV: ' + escapeHtml(err.message) + '</div>';
            }
        };
        reader.readAsText(file, 'UTF-8');
    };

    function parseCsv(text) {
        if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
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

    function isHeaderRow(row) {
        if (!row || row.length === 0) return false;
        const joined = row.join(' ').toLowerCase();
        return joined.indexOf('номер') !== -1 || joined.indexOf('поезд') !== -1
            || joined.indexOf('время') !== -1 || joined.indexOf('начал') !== -1;
    }

    function processTrainRows(rows) {
        trainsList = [];
        const skippedIncomplete = [];
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length < 2) continue;
            if (isHeaderRow(r)) continue;
            const train1 = String(r[0] == null ? '' : r[0]).trim();
            const s1 = String(r[1] == null ? '' : r[1]).trim();
            const e1 = String(r[2] == null ? '' : r[2]).trim();
            const s2 = String(r[3] == null ? '' : r[3]).trim();
            const e2 = String(r[4] == null ? '' : r[4]).trim();
            const train2 = r.length >= 6 ? String(r[5] == null ? '' : r[5]).trim() : '';

            if (train1 && s1 && e1 && train2 && s2 && e2) {
                trainsList.push(buildTrainRow(train1, s1, e1, s2, e2, train2));
            } else {
                skippedIncomplete.push({ train1, start1: s1, end1: e1, train2, reason: 'неполные данные' });
            }
        }
        renderTrainsPreview();
        updatePreview();
        if (skippedIncomplete.length > 0) showSkippedIncomplete(skippedIncomplete);
    }

    function buildTrainRow(train1, start1, end1, start2, end2, train2) {
        const minsStart1 = parseTimeString(start1);
        const minsEnd1 = parseTimeString(end1);
        const minsStart2 = parseTimeString(start2);
        const minsEnd2 = parseTimeString(end2);
        const valid = minsStart1 != null && minsEnd1 != null && minsStart2 != null && minsEnd2 != null
                    && minsEnd1 > minsStart1 && minsEnd2 > minsStart2;
        return {
            train1, start1, end1, start2, end2, train2,
            s1m: minsStart1, e1m: minsEnd1, s2m: minsStart2, e2m: minsEnd2,
            status: valid ? 'ok' : 'text'
        };
    }

    function parseTimeString(s) {
        s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        if (!s) return null;
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

    // ============================================================
    //  ОТРИСОВКА РАСПИСАНИЯ
    // ============================================================
    function renderTrainsPreview() {
        let okCount = 0;
        let html = '';
        for (let i = 0; i < trainsList.length; i++) {
            const t = trainsList[i];
            if (t.status === 'ok') okCount++;
            const trCls = t.status === 'text' ? ' class="spg-err"' : '';
            html += '<tr' + trCls + ' data-idx="' + i + '">';
            html += '<td class="spg-num">' + (i + 1) + '</td>';
            html += '<td><input type="text" class="spg-cell-input spg-train-input" value="' +
                    escapeAttr(t.train1) + '" data-idx="' + i + '" data-field="train1"></td>';
            html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                    escapeAttr(t.start1) + '" data-idx="' + i + '" data-field="start1" placeholder="чч:мм"></td>';
            html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                    escapeAttr(t.end1) + '" data-idx="' + i + '" data-field="end1" placeholder="чч:мм"></td>';
            html += '<td><input type="text" class="spg-cell-input spg-train-input" value="' +
                    escapeAttr(t.train2) + '" data-idx="' + i + '" data-field="train2"></td>';
            html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                    escapeAttr(t.start2) + '" data-idx="' + i + '" data-field="start2" placeholder="чч:мм"></td>';
            html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                    escapeAttr(t.end2) + '" data-idx="' + i + '" data-field="end2" placeholder="чч:мм"></td>';
            html += '<td><button type="button" class="spg-btn spg-small spg-danger" data-action="del" data-idx="' + i + '" title="Удалить">✕</button></td>';
            html += '</tr>';
        }
        if (trainsList.length === 0) {
            html = '<tr><td colspan="8" class="spg-empty-cell">Таблица пуста. Нажмите «＋ Добавить» или загрузите CSV.</td></tr>';
        }
        trainsPreviewBody.innerHTML = html;
        trainsTotal.textContent = trainsList.length;
        trainsValid.textContent = okCount;

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
        trainsList[idx][field] = input.value;
        if (field === 'start1' || field === 'end1' || field === 'start2' || field === 'end2') recalcTrainRow(idx);
        updateRowClass(idx);
        updatePreview();
    }
    function onCellBlur(e) {
        const input = e.currentTarget;
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        if (isNaN(idx) || !trainsList[idx]) return;
        updateRowClass(idx);
    }
    function onCellKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
    }

    function recalcTrainRow(idx) {
        const t = trainsList[idx];
        t.s1m = parseTimeString(t.start1);
        t.e1m = parseTimeString(t.end1);
        t.s2m = parseTimeString(t.start2);
        t.e2m = parseTimeString(t.end2);
        const valid = t.s1m != null && t.e1m != null && t.s2m != null && t.e2m != null
                    && t.e1m > t.s1m && t.e2m > t.s2m;
        t.status = valid ? 'ok' : 'text';
    }

    function updateRowClass(idx) {
        const row = trainsPreviewBody.querySelector('tr[data-idx="' + idx + '"]');
        if (!row) return;
        row.classList.remove('spg-err');
        if (trainsList[idx].status === 'text') row.classList.add('spg-err');
    }

    function onDeleteRow(e) {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (isNaN(idx)) return;
        trainsList.splice(idx, 1);
        renderTrainsPreview();
        updatePreview();
    }

    $('spgAddTrainRowBtn').onclick = () => {
        trainsList.push({
            train1: '', start1: '', end1: '', start2: '', end2: '', train2: '',
            s1m: null, e1m: null, s2m: null, e2m: null, status: 'text'
        });
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

    function showSkippedIncomplete(items) {
        let rowsHtml = '';
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            rowsHtml += '<tr>' +
                '<td class="spg-num">' + (i + 1) + '</td>' +
                '<td>' + escapeHtml(it.train1) + '</td>' +
                '<td>' + escapeHtml(it.start1) + '</td>' +
                '<td>' + escapeHtml(it.end1) + '</td>' +
                '<td>' + escapeHtml(it.train2) + '</td>' +
                '<td style="color:#92400e">' + escapeHtml(it.reason) + '</td>' +
                '</tr>';
        }
        const html =
            '<p>Некоторые строки CSV <b>не будут обработаны</b>.</p>' +
            '<table class="spg-trains-table" style="margin-top:12px;">' +
            '<thead><tr><th>#</th><th>Поезд-1</th><th>Начало</th><th>Конец</th><th>Поезд-2</th><th>Причина</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody></table>';
        showModal('Пропущенные строки', html, null, true);
    }

    // ============================================================
    //  ЛОГИКА КОПИРОВАНИЯ
    // ============================================================
    function isPeregonOp(op) {
        return String(op.label || '').toLowerCase().indexOf(PEREgon_KEYWORD) !== -1;
    }

    function findChainAnchors(chain) {
        const ops = chain.operations;
        const peregonOps = [];
        for (let i = 0; i < ops.length; i++) if (isPeregonOp(ops[i])) peregonOps.push(ops[i]);
        let firstOpId = null, lastOpId = null, prostoyId = null;
        if (peregonOps.length > 0) {
            let firstP = null, lastP = null, minX = null, maxX = null;
            for (let p = 0; p < peregonOps.length; p++) {
                const opP = peregonOps[p];
                const x = (typeof opP.x === 'number') ? opP.x : null;
                if (x === null) continue;
                if (minX === null || x < minX) { minX = x; firstP = opP; }
                if (maxX === null || x > maxX) { maxX = x; lastP = opP; }
            }
            if (firstP) firstOpId = firstP.id;
            if (lastP) lastOpId = lastP.id;
        }
        if (firstOpId === null || lastOpId === null) {
            let minXAll = null, maxXAll = null, firstAll = null, lastAll = null;
            for (let j = 0; j < ops.length; j++) {
                const op = ops[j];
                const xo = (typeof op.x === 'number') ? op.x : null;
                if (xo === null) continue;
                if (minXAll === null || xo < minXAll) { minXAll = xo; firstAll = op; }
                if (maxXAll === null || xo > maxXAll) { maxXAll = xo; lastAll = op; }
            }
            if (firstOpId === null && firstAll) firstOpId = firstAll.id;
            if (lastOpId === null && lastAll) lastOpId = lastAll.id;
        }
        for (let k = 0; k < ops.length; k++) {
            if (String(ops[k].label || '').trim() === PROSTOY_LABEL) {
                prostoyId = ops[k].id;
                break;
            }
        }
        return { firstOpId, lastOpId, prostoyId };
    }

    function layoutChainOperations(chain, trainRow) {
        const K = MINUTE_TO_X;
        const s1 = trainRow.s1m, e1 = trainRow.e1m, s2 = trainRow.s2m, e2 = trainRow.e2m;
        const train1 = trainRow.train1, train2 = trainRow.train2;

        const anchors = findChainAnchors(chain);
        const firstOpId = anchors.firstOpId, lastOpId = anchors.lastOpId, prostoyId = anchors.prostoyId;

        const indexed = chain.operations.map((op, idx) => ({ op, idx }));
        indexed.sort((a, b) => {
            const ax = (typeof a.op.x === 'number') ? a.op.x : 0;
            const bx = (typeof b.op.x === 'number') ? b.op.x : 0;
            if (ax !== bx) return ax - bx;
            return a.idx - b.idx;
        });
        const sorted = indexed.map(it => it.op);

        let prostoySortedIdx = -1;
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].id === prostoyId) { prostoySortedIdx = i; break; }
        }
        if (prostoySortedIdx === -1) prostoySortedIdx = Math.floor(sorted.length / 2);

        const result = [];
        for (let j = 0; j < sorted.length; j++) {
            const op = sorted[j];
            const opId = op.id;
            const dur = (typeof op.duration === 'number') ? op.duration : 0;
            if (opId === firstOpId) {
                result.push({ opSrc: op, newX: s1 * K, newDuration: e1 - s1, newComment: train1 });
                continue;
            }
            if (opId === lastOpId && opId !== firstOpId) {
                result.push({ opSrc: op, newX: s2 * K, newDuration: e2 - s2, newComment: train2 });
                continue;
            }
            if (opId === prostoyId) {
                result.push({ opSrc: op, newX: e1 * K, newDuration: s2 - e1, newComment: null });
                continue;
            }
            if (j < prostoySortedIdx) {
                result.push({ opSrc: op, newX: e1 * K - dur * K, newDuration: dur, newComment: null });
            } else {
                result.push({ opSrc: op, newX: s2 * K, newDuration: dur, newComment: null });
            }
        }
        return result;
    }

    function applyReplication() {
        const data = deepClone(sourceData);
        const gd = data.graphData;
        if (!gd) throw new Error('Не найден graphData');
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
                        isLocked: chain.isLocked, id: newChainId
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
            for (let s2i = 0; s2i < selected.length; s2i++) {
                const chain2 = selected[s2i];
                for (let ti = 0; ti < trainsList.length; ti++) {
                    const t = trainsList[ti];
                    if (t.status !== 'ok') continue;
                    const newChainId2 = nextId();
                    const headerText = chain2.header + ' — ' + t.train1 + ' / ' + t.train2;
                    techChains.push({
                        header: headerText, isLocked: chain2.isLocked, id: newChainId2,
                        comment: t.train1 + ' / ' + t.train2
                    });
                    const layout = layoutChainOperations(chain2, t);
                    for (let li = 0; li < layout.length; li++) {
                        const item = layout[li];
                        const opSrc2 = item.opSrc;
                        const targetRow2 = findRowById(rows, opSrc2.rowId);
                        if (!targetRow2) continue;
                        if (!targetRow2.operations) targetRow2.operations = [];
                        const originalOp2 = findOpById(targetRow2.operations, opSrc2.id);
                        if (!originalOp2) continue;
                        const newOp2 = deepClone(originalOp2);
                        newOp2.id = nextId();
                        newOp2.chainId = newChainId2;
                        newOp2.x = item.newX;
                        if (item.newDuration != null) newOp2.duration = item.newDuration;
                        if (item.newComment != null && String(item.newComment).trim() !== '') {
                            newOp2.comment = item.newComment;
                        } else {
                            delete newOp2.comment;
                        }
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

    // ============================================================
    //  ПРИМЕНЕНИЕ
    // ============================================================
    $('spgApplyBtn').onclick = () => {
        if (Object.keys(selectedIds).length === 0) { spgAlert('Выберите хотя бы одну цепочку.'); return; }
        if (copyMode === 'trains') {
            const okCount = getValidTrainsCount();
            if (okCount === 0) { spgAlert('Добавьте строки в расписание или загрузите CSV.'); return; }
        }
        doApply();
    };

    function doApply() {
        try {
            const res = applyReplication();
            replicatedData = res.data;
            resultInfo.innerHTML =
                'Готово! Создано копий: <b>' + res.totalCopies + '</b>. ' +
                'Цепочек было: <b>' + chains.length + '</b>, стало: <b>' + (chains.length + res.totalCopies) + '</b>.';
            resultBox.classList.remove('spg-hidden');
            resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            spgAlert('Ошибка: ' + err.message);
            console.error(err);
        }
    }

    // ============================================================
    //  СКАЧИВАНИЕ
    // ============================================================
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
        if (!replicatedData) { spgAlert('Сначала нажмите «Применить копирование».'); return; }
        makeDownload('СПГ_with_copies.json', JSON.stringify(replicatedData));
    };

    // ============================================================
    //  СТАРТ
    // ============================================================
    renderTrainsPreview();
    updateCommentsUI();
}
