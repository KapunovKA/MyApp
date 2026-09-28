// ============================================================
//  СПГ — Технологические цепочки (v6)
//  + новый алгоритм копирования по расписанию
//  + исправленная логика скрытия/восстановления комментариев
//  + привязка снимка к исходному файлу (sourceHash)
// ============================================================

const SPG_MINUTE_TO_X = 2;
const SPG_PROSTOY_LABEL = 'простой вагона в ожидании';
const SPG_PEREGON_KEYWORD = 'перегон';
const SPG_LS_KEY = 'spg_comments_backup_v1';

// Хэш строки (djb2) — для привязки снимка к файлу
function spgHashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0xffffffff;
    }
    return (hash >>> 0).toString(16);
}

// Цвет обводки поезда по номеру
function spgGetStrokeColorForTrain(trainNum) {
    if (trainNum == null) return null;
    const s = String(trainNum).trim();
    const m = s.match(/^(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (isNaN(n)) return null;
    if (n >= 6014 && n <= 6999) return '#008000';
    if (n >= 7100 && n <= 7399) return '#0000ff';
    if (n >= 7600 && n <= 7900) return '#800080';
    return null;
}

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
                <!-- ЦЕПОЧКИ -->
                <div class="spg-section spg-hidden" id="spgChainsBox">
                    <div class="spg-section-title">Найденные технологические цепочки</div>

                    <!-- Баннер: найден снимок -->
                    <div class="spg-hidden-banner spg-hidden" id="spgRestoreBanner" style="background:rgba(74,158,255,0.12);color:#4a9eff;border:1px solid rgba(74,158,255,0.35);">
                        <span>💾</span>
                        <span><b>Найден снимок комментариев</b> в localStorage.</span>
                        <span class="spg-meta" id="spgRestoreBannerMeta"></span>
                        <div class="spg-spacer"></div>
                        <button type="button" class="spg-btn spg-small spg-primary" id="spgDownloadRestoredBtn" title="Применить снимок и скачать файл">⬇ Скачать (с комментариями)</button>
                        <button type="button" class="spg-btn spg-small spg-success" id="spgLoadFromLsBtn">↺ Загрузить комментарии</button>
                        <button type="button" class="spg-btn spg-small spg-danger" id="spgForgetLsBtn">🗑 Забыть снимок</button>
                    </div>

                    <!-- Баннер: комментарии скрыты -->
                    <div class="spg-hidden-banner spg-hidden" id="spgHiddenBanner">
                        <span>👁</span>
                        <span>Комментарии скрыты.</span>
                        <span class="spg-meta" id="spgBackupMeta"></span>
                        <div class="spg-spacer"></div>
                        <button type="button" class="spg-btn spg-small spg-primary" id="spgDownloadHiddenBtn" title="Скачать файл без комментариев">⬇ Скачать (без комментариев)</button>
                        <button type="button" class="spg-btn spg-small spg-success" id="spgRestoreTopBtn">↺ Показать комментарии</button>
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
                        <button type="button" class="spg-btn spg-warn" id="spgHideCommentsBtn">👁 Скрыть комм.</button>
                        <button type="button" class="spg-btn spg-success spg-hidden" id="spgRestoreCommentsBtn">↺ Показать комм.</button>
                        <span class="spg-info" id="spgSelectedInfo">Выбрано: 0</span>
                    </div>

                    <div class="spg-chains-scroll" id="spgChainsScroll">
                        <div id="spgChains"></div>
                    </div>
                </div>

                <!-- ПАРАМЕТРЫ КОПИРОВАНИЯ -->
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
                        <div style="margin-top:16px;">
                            <button type="button" class="spg-btn spg-primary spg-big" id="spgApplyCountBtn">Применить копирование</button>
                        </div>
                    </div>

                    <div id="spgModeTrainsPanel">
                        <div id="spgCopyWindowsContainer"></div>

                        <div class="spg-copy-window-actions" style="margin-top:16px;">
                            <button type="button" class="spg-btn spg-small" id="spgAddWindowBtn">＋ Добавить окно расписания</button>
                            <div class="spg-spacer"></div>
                            <span class="spg-info">Всего скопировано: <b id="spgTotalCopiesApplied">0</b></span>
                        </div>

                        <div class="spg-info-block spg-blue" id="spgPreviewInfo" style="margin-top:12px;">
                            Выберите цепочки для настройки.
                        </div>
                    </div>
                </div>

                <!-- РЕЗУЛЬТАТ -->
                <div class="spg-section spg-hidden" id="spgResultBox">
                    <div class="spg-section-title">Результат</div>
                    <div class="spg-info-block spg-green" id="spgResultInfo"></div>
                    <div class="spg-toolbar" style="margin-top:12px;">
                        <button type="button" class="spg-btn spg-primary spg-big" id="spgDownloadFullBtn">⬇ Скачать файл</button>
                        <button type="button" class="spg-btn" id="spgResetCopiesBtn">↺ Сбросить копии</button>
                    </div>

                    <div class="spg-section-title" style="margin-top:16px;">Цепочки в итоговом файле</div>
                    <div class="spg-table-scroll" style="max-height:420px;">
                        <table class="spg-trains-table" id="spgResultChainsTable">
                            <thead>
                                <tr>
                                    <th style="width:40px">#</th>
                                    <th>Название</th>
                                    <th style="width:160px">chainId</th>
                                    <th style="width:70px">Операций</th>
                                    <th style="width:140px">Комментарий</th>
                                    <th style="width:90px">Источник</th>
                                </tr>
                            </thead>
                            <tbody id="spgResultChainsBody"></tbody>
                        </table>
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
        width: 1100,
        height: 800,
        content: html,
    });
    win.dataset.app = 'spg';
    win.style.minWidth = '640px';
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
    const drop = $('spgDrop');
    const fileInput = $('spgFileInput');
    const fileNameEl = $('spgFileName');
    const chainsBox = $('spgChainsBox');
    const chainsEl = $('spgChains');
    const copyBox = $('spgCopyBox');
    const resultBox = $('spgResultBox');
    const resultInfo = $('spgResultInfo');
    const previewInfo = $('spgPreviewInfo');
    const selectedInfo = $('spgSelectedInfo');
    const hiddenBanner = $('spgHiddenBanner');
    const backupMeta = $('spgBackupMeta');
    const restoreBanner = $('spgRestoreBanner');
    const restoreBannerMeta = $('spgRestoreBannerMeta');
    const chainSearchInput = $('spgChainSearchInput');
    const chainSearchInfo = $('spgChainSearchInfo');
    const copyWindowsContainer = $('spgCopyWindowsContainer');
    const totalCopiesApplied = $('spgTotalCopiesApplied');

    // ---------- Состояние ----------
    let sourceData = null;
    let workingData = null;
    let sourceHash = null;         // хэш исходного JSON — привязка снимка
    let chains = [];
    let selectedIds = {};
    let mainChainId = null;
    let mainOpId = null;
    let collapsedChainIds = {};
    let replicatedData = null;

    let commentsHidden = false;
    let chainSearchQuery = '';

    let copyMode = 'trains';
    let copyWindows = [];
    let nextWindowId = 1;
    let totalCopiesCount = 0;

    // Кэш снимка — чтобы не дёргать localStorage при каждом renderChains
    let _snapshotCache = undefined;
    function invalidateSnapshotCache() { _snapshotCache = undefined; }

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
    function getStrokeColorForTrain(trainNum) {
        return spgGetStrokeColorForTrain(trainNum);
    }
    function pluralizeRu(n, one, few, many) {
        const m10 = n % 10;
        const m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
        return many;
    }

    // ============================================================
    //  localStorage — снимок комментариев
    // ============================================================

    // Сохраняем снимок из chains (а не из workingData) — так
    // даже после скрытия комментариев снимок можно перезаписать
    // корректно, если пользователь не восстанавливал их.
    function saveCommentsSnapshot() {
        if (!workingData || !sourceHash) return false;

        const snapshot = {
            version: 1,
            savedAt: new Date().toISOString(),
            sourceHash: sourceHash,
            chains: {}
        };
        let totalSaved = 0;

        // Собираем комментарии из workingData (там всегда полные данные)
        const gd = workingData.graphData;
        if (!gd) return false;

        const techChains = gd.techChains || [];
        const rows = gd.rows || [];

        const opsByChain = {};
        for (let i = 0; i < rows.length; i++) {
            const ops = rows[i].operations || [];
            for (let j = 0; j < ops.length; j++) {
                const op = ops[j];
                if (op.chainId == null) continue;
                const key = String(op.chainId);
                if (!opsByChain[key]) opsByChain[key] = {};
                if (op.comment != null && String(op.comment).trim() !== '') {
                    opsByChain[key][String(op.id)] = String(op.comment).trim();
                    totalSaved++;
                }
            }
        }

        for (let k = 0; k < techChains.length; k++) {
            const tc = techChains[k];
            const idStr = String(tc.id);
            const chainComment = (tc.comment != null && String(tc.comment).trim() !== '')
                ? String(tc.comment).trim()
                : null;
            const opCmts = opsByChain[idStr] || {};
            if (chainComment || Object.keys(opCmts).length > 0) {
                snapshot.chains[idStr] = {
                    chainComment: chainComment,
                    operations: opCmts
                };
            }
        }

        if (Object.keys(snapshot.chains).length === 0) return false;

        try {
            localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
            invalidateSnapshotCache();
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    function loadCommentsSnapshot() {
        if (_snapshotCache !== undefined) return _snapshotCache;
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) { _snapshotCache = null; return null; }
            const data = JSON.parse(raw);
            if (!data || data.version !== 1 || !data.chains) {
                _snapshotCache = null;
                return null;
            }
            _snapshotCache = data;
            return data;
        } catch (e) {
            _snapshotCache = null;
            return null;
        }
    }

    function deleteCommentsSnapshot() {
        try {
            localStorage.removeItem(LS_KEY);
            invalidateSnapshotCache();
        } catch (e) {}
    }

    // Копия workingData с удалёнными комментариями — для скачивания
    function buildDataWithoutComments(data) {
        const copy = deepClone(data);
        const gd = copy.graphData;
        if (!gd) return copy;
        const rows = gd.rows || [];
        for (let i = 0; i < rows.length; i++) {
            const ops = rows[i].operations || [];
            for (let j = 0; j < ops.length; j++) {
                if (ops[j].comment !== undefined) delete ops[j].comment;
            }
        }
        const tcs = gd.techChains || [];
        for (let k = 0; k < tcs.length; k++) {
            if (tcs[k].comment !== undefined) delete tcs[k].comment;
        }
        return copy;
    }

    // Восстановление комментариев в workingData из снимка.
    // Возвращает { restoredChains, restoredOps } или null.
    function restoreCommentsFromSnapshot() {
        const snap = loadCommentsSnapshot();
        if (!snap) return null;
        if (!workingData) return null;
        const gd = workingData.graphData;
        if (!gd) return null;

        const allOpComments = {};
        const allChainComments = {};
        for (const cid in snap.chains) {
            if (!snap.chains.hasOwnProperty(cid)) continue;
            const saved = snap.chains[cid];
            if (saved.chainComment) allChainComments[cid] = saved.chainComment;
            for (const opId in saved.operations) {
                if (saved.operations.hasOwnProperty(opId)) {
                    allOpComments[opId] = saved.operations[opId];
                }
            }
        }

        let restoredChains = 0;
        let restoredOps = 0;

        const tcs = gd.techChains || [];
        for (let k = 0; k < tcs.length; k++) {
            const idStr = String(tcs[k].id);
            if (allChainComments[idStr]) {
                tcs[k].comment = allChainComments[idStr];
                restoredChains++;
            }
        }

        const rows = gd.rows || [];
        for (let i = 0; i < rows.length; i++) {
            const ops = rows[i].operations || [];
            for (let j = 0; j < ops.length; j++) {
                const op = ops[j];
                const opIdStr = String(op.id);
                if (allOpComments[opIdStr]) {
                    op.comment = allOpComments[opIdStr];
                    restoredOps++;
                }
            }
        }

        return { restoredChains: restoredChains, restoredOps: restoredOps };
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
            workingData = deepClone(data);
            sourceHash = spgHashString(JSON.stringify(data));
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
                    id: op.id, label: op.label, type: op.type, x: op.x,
                    duration: op.duration, iconId: op.iconId, comment: op.comment,
                    strokeColor: op.strokeColor, rowId: row.id, rowTitle: row.title
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
        mainChainId = null;
        mainOpId = null;
        collapsedChainIds = {};
        replicatedData = null;
        chainSearchQuery = '';
        chainSearchInput.value = '';

        copyWindows = [];
        nextWindowId = 1;
        totalCopiesCount = 0;
        addCopyWindow();

        commentsHidden = false;

        renderChains();
        updateSelectedInfo();
        updatePreview();

        chainsBox.classList.remove('spg-hidden');
        copyBox.classList.remove('spg-hidden');
        resultBox.classList.add('spg-hidden');

        renderResultChains();
        updateCommentsUI();
        updateRestoreBanner();
    }

    // ============================================================
    //  СКРЫТИЕ / ВОССТАНОВЛЕНИЕ КОММЕНТАРИЕВ
    // ============================================================

    // Скрыть комментарии в UI.
    // workingData и chains НЕ трогаем — только флаг + перерисовка.
    // Это позволяет позже:
    //   - восстановить комментарии из workingData (если снимок не нужен);
    //   - сохранить снимок ещё раз без потери данных.
    $('spgHideCommentsBtn').onclick = () => {
        const ok = saveCommentsSnapshot();
        if (!ok) {
            // Нечего сохранять — комментариев нет. Всё равно скрываем.
        }
        commentsHidden = true;
        renderChains();
        updateCommentsUI();
        updateRestoreBanner();
    };

    // Показать комментарии: восстановить из снимка в workingData,
    // затем пересобрать chains из workingData.
    $('spgRestoreCommentsBtn').onclick = () => doRestoreFromLs();
    $('spgRestoreTopBtn').onclick = () => doRestoreFromLs();

    $('spgForgetLsBtn').onclick = () => {
        spgConfirm('Удалить снимок комментариев из localStorage?', () => {
            deleteCommentsSnapshot();
            updateRestoreBanner();
            updateCommentsUI();
        });
    };

    $('spgLoadFromLsBtn').onclick = () => doRestoreFromLs();

    function doRestoreFromLs() {
        const res = restoreCommentsFromSnapshot();
        if (!res) {
            spgAlert('Снимок комментариев не найден в localStorage.');
            return;
        }
        rebuildChainsFromWorkingData();
        commentsHidden = false;
        renderChains();
        updateCommentsUI();
        updateRestoreBanner();
    }

    // Пересборка chains из workingData.
    // Используется при восстановлении комментариев и при сбросе копий.
    // ВАЖНО: при скрытии комментариев НЕ вызывается — см. выше.
    function rebuildChainsFromWorkingData() {
        const gd = workingData && workingData.graphData;
        if (!gd) return;

        const rows = gd.rows || [];
        const techChains = gd.techChains || [];

        const opsByChain = {};
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ops = row.operations || [];
            for (let j = 0; j < ops.length; j++) {
                const op = ops[j];
                if (op.chainId == null) continue;
                const key = String(op.chainId);
                if (!opsByChain[key]) opsByChain[key] = [];
                opsByChain[key].push({
                    id: op.id, label: op.label, type: op.type, x: op.x,
                    duration: op.duration, iconId: op.iconId, comment: op.comment,
                    strokeColor: op.strokeColor, rowId: row.id, rowTitle: row.title
                });
            }
        }

        for (let i = 0; i < chains.length; i++) {
            const c = chains[i];
            const key = String(c.id);
            const ops = opsByChain[key] || [];
            c.operations = ops;
            c.chainComment = null;
            for (let tcIdx = 0; tcIdx < techChains.length; tcIdx++) {
                if (techChains[tcIdx].id === c.id) {
                    if (techChains[tcIdx].comment != null && String(techChains[tcIdx].comment).trim() !== '') {
                        c.chainComment = String(techChains[tcIdx].comment).trim();
                    }
                    break;
                }
            }
            const cmts = {};
            if (c.chainComment) cmts[c.chainComment] = true;
            for (let oi = 0; oi < ops.length; oi++) {
                const cmt = ops[oi].comment;
                if (cmt != null && String(cmt).trim() !== '') cmts[String(cmt).trim()] = true;
            }
            c.comments = Object.keys(cmts);
        }
    }

    function updateCommentsUI() {
        if (commentsHidden) {
            hiddenBanner.classList.remove('spg-hidden');
            $('spgHideCommentsBtn').classList.add('spg-hidden');
            $('spgRestoreCommentsBtn').classList.remove('spg-hidden');
            const snap = loadCommentsSnapshot();
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

    function updateRestoreBanner() {
        const snap = loadCommentsSnapshot();
        if (!snap || !snap.savedAt) {
            restoreBanner.classList.add('spg-hidden');
            return;
        }
        // Скрываем баннер, если комментарии и так показаны
        if (commentsHidden) {
            restoreBanner.classList.add('spg-hidden');
            return;
        }
        // Если снимок от другого файла — предупреждаем
        let mismatchNote = '';
        if (sourceHash && snap.sourceHash && snap.sourceHash !== sourceHash) {
            mismatchNote = ' <b style="color:#b91c1c">Снимок от другого файла!</b>';
        }
        const dt = new Date(snap.savedAt);
        const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
        const chainCount = Object.keys(snap.chains || {}).length;
        let totalOps = 0;
        for (const cid in snap.chains) {
            if (snap.chains.hasOwnProperty(cid)) {
                totalOps += Object.keys(snap.chains[cid].operations || {}).length;
            }
        }
        restoreBannerMeta.innerHTML = '(от ' + dateStr + ': цепочек ' + chainCount +
            ', комментариев ' + totalOps + ')' + mismatchNote;
        restoreBanner.classList.remove('spg-hidden');
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
            const isMain = (mainChainId === c.id);
            const collapsed = !!collapsedChainIds[c.id];
            const cls = 'spg-chain' + (selected ? ' selected' : '') + (isMain ? ' is-main' : '');
            const checkedAttr = selected ? ' checked' : '';

            html += '<div class="' + cls + '" data-chain-id="' + c.id + '">';
            html += '<div class="spg-chain-head" data-id="' + c.id + '">';
            html += '<span class="spg-caret" data-caret="' + c.id + '">' +
                    (collapsed ? '▶' : '▼') + '</span>';
            html += '<input type="checkbox" data-id="' + c.id + '"' + checkedAttr + '>';

            if (selected) {
                const radioChecked = isMain ? ' checked' : '';
                html += '<label class="spg-main-radio" title="Сделать основной">' +
                        '<input type="radio" name="spgMainChain" data-main-radio="' + c.id + '"' + radioChecked + '>' +
                        '★ Основная</label>';
            } else {
                html += '<span class="spg-main-radio off"><input type="radio" disabled>★ Основная</span>';
            }

            html += '<span class="spg-chain-title">' + escapeHtml(c.header) + '</span>';
            html += '<span class="spg-chain-id">[chainId: ' + c.id + ']</span>';
            html += '<span class="spg-chain-meta">' + c.operations.length + ' операций</span>';
            if (c.isLocked) html += '<span class="spg-lock">locked</span>';
            if (!commentsHidden && c.comments && c.comments.length > 0) {
                html += '<span class="spg-cmt-badge">комм.: ' + escapeHtml(c.comments.join(', ')) + '</span>';
            }
            html += '</div>';

            if (isMain && !collapsed) {
                html += '<div class="spg-main-op-row">';
                html += '<span>🎯 Основная операция (якорь):</span>';
                html += '<select data-main-op-select="' + c.id + '">';
                for (let oi = 0; oi < c.operations.length; oi++) {
                    const opm = c.operations[oi];
                    const opLabel = (opm.label || '') + ' (x=' + (opm.x != null ? opm.x : '?') +
                                    ', строка "' + (opm.rowTitle || '') + '")';
                    const selectedAttr = (opm.id === mainOpId) ? ' selected' : '';
                    html += '<option value="' + opm.id + '"' + selectedAttr + '>' +
                            escapeHtml(opLabel) + '</option>';
                }
                html += '</select>';
                if (mainOpId == null) {
                    html += '<span style="color:#ff3b30; font-size:11px;">← выберите операцию</span>';
                }
                html += '</div>';
            }

            html += '<div class="spg-chain-body"' + (collapsed ? ' style="display:none"' : '') + '>';
            html += '<div class="spg-chain-table-scroll"><table class="spg-chain-table">';
            html += '<tr><th style="width:36px">#</th><th>Строка</th><th>Операция</th>' +
                    '<th>Тип</th><th>x (чч:мм)</th><th>Длит.</th><th>Цвет</th>';
            if (!commentsHidden) html += '<th>Комментарий</th>';
            html += '</tr>';

            for (let j = 0; j < c.operations.length; j++) {
                const op2 = c.operations[j];
                const isThisMainOp = (isMain && op2.id === mainOpId);
                const rowCls = isThisMainOp ? ' class="spg-is-main-op"' : '';

                const sc = op2.strokeColor;
                let strokeCell;
                if (sc && String(sc).trim() !== '') {
                    strokeCell = '<span class="spg-stroke-swatch" style="background:' + escapeAttr(sc) + '"></span>' +
                                 '<span class="spg-stroke-code">' + escapeHtml(sc) + '</span>';
                } else {
                    strokeCell = '<span class="spg-dash">—</span>';
                }

                html += '<tr' + rowCls + '>';
                html += '<td class="spg-num">' + (j + 1) + (isThisMainOp ? ' 🎯' : '') + '</td>';
                html += '<td class="spg-row-title">' + escapeHtml(op2.rowTitle || '') + '</td>';
                html += '<td>' + escapeHtml(op2.label || '') + '</td>';
                html += '<td class="spg-num">' + (op2.type || '') + '</td>';
                html += '<td class="spg-xcell">' + (op2.x != null ? xToHHMM(op2.x) : '') + '</td>';
                html += '<td class="spg-num">' + (op2.duration != null ? op2.duration : '') + '</td>';
                html += '<td class="spg-stroke-cell">' + strokeCell + '</td>';
                if (!commentsHidden) {
                    html += '<td class="spg-comment-cell">' +
                            (op2.comment != null && String(op2.comment).trim() !== ''
                              ? escapeHtml(String(op2.comment))
                              : '<span class="spg-dash">—</span>') +
                            '</td>';
                }
                html += '</tr>';
            }
            if (c.operations.length === 0) {
                const colSpan = commentsHidden ? 7 : 8;
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
            chainsEl.querySelectorAll('input[data-main-radio]').forEach(el => {
                el.addEventListener('click', onMainRadioClick);
                el.addEventListener('change', onMainRadioClick);
            });
            chainsEl.querySelectorAll('select[data-main-op-select]').forEach(el => {
                el.addEventListener('change', onMainOpChange);
            });
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
        if (e.target.classList && e.target.classList.contains('spg-main-radio')) return;
        if (e.target.tagName === 'INPUT' && e.target.type === 'radio') return;
        if (e.target.tagName === 'SELECT') return;
        const id = Number(e.currentTarget.getAttribute('data-id'));
        toggleChain(id);
    }
    function onCheckboxClick(e) {
        e.stopPropagation();
        const id = Number(e.currentTarget.getAttribute('data-id'));
        toggleChain(id);
    }
    function onMainRadioClick(e) {
        e.stopPropagation();
        const id = Number(e.currentTarget.getAttribute('data-main-radio'));
        if (!selectedIds[id]) return;
        mainChainId = id;
        mainOpId = null;
        autoPickMainOp();
        renderChains();
        updateSelectedInfo();
        updatePreview();
    }
    function onMainOpChange(e) {
        e.stopPropagation();
        const id = Number(e.currentTarget.getAttribute('data-main-op-select'));
        const val = Number(e.currentTarget.value);
        mainChainId = id;
        mainOpId = val;
        renderChains();
        updateSelectedInfo();
        updatePreview();
    }

    function autoPickMainOp() {
        if (mainChainId == null) return;
        let c = null;
        for (let i = 0; i < chains.length; i++) {
            if (chains[i].id === mainChainId) { c = chains[i]; break; }
        }
        if (!c || c.operations.length === 0) return;

        for (let j = 0; j < c.operations.length; j++) {
            if (String(c.operations[j].label || '').trim() === PROSTOY_LABEL) {
                mainOpId = c.operations[j].id;
                return;
            }
        }
        let first = null, minX = null;
        for (let k = 0; k < c.operations.length; k++) {
            const x = c.operations[k].x;
            if (typeof x !== 'number') continue;
            if (minX === null || x < minX) { minX = x; first = c.operations[k]; }
        }
        if (first) mainOpId = first.id;
    }

    function toggleChain(id) {
        if (selectedIds[id]) {
            delete selectedIds[id];
            if (mainChainId === id) { mainChainId = null; mainOpId = null; }
        } else {
            selectedIds[id] = true;
            if (mainChainId === null) {
                mainChainId = id;
                autoPickMainOp();
            }
        }
        renderChains();
        updateSelectedInfo();
        updatePreview();
    }
    function updateSelectedInfo() {
        const n = Object.keys(selectedIds).length;
        let mainName = '';
        if (mainChainId != null) {
            for (let i = 0; i < chains.length; i++) {
                if (chains[i].id === mainChainId) { mainName = ' | Основная: ' + chains[i].header; break; }
            }
        }
        selectedInfo.textContent = 'Выбрано: ' + n + ' из ' + chains.length + mainName;
    }

    $('spgSelectAllBtn').onclick = () => {
        for (let i = 0; i < chains.length; i++) {
            if (matchesChainSearch(chains[i])) selectedIds[chains[i].id] = true;
        }
        if (mainChainId === null) {
            for (let j = 0; j < chains.length; j++) {
                if (selectedIds[chains[j].id]) {
                    mainChainId = chains[j].id;
                    autoPickMainOp();
                    break;
                }
            }
        }
        renderChains(); updateSelectedInfo(); updatePreview();
    };
    $('spgClearAllBtn').onclick = () => {
        selectedIds = {};
        mainChainId = null;
        mainOpId = null;
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

    function updatePreview() {
        const selected = getSelectedChains();
        if (selected.length === 0) {
            previewInfo.textContent = 'Выберите хотя бы одну цепочку.';
            return;
        }
        if (copyMode === 'count') return;

        let mainChain = null;
        for (let i = 0; i < selected.length; i++) {
            if (selected[i].id === mainChainId) { mainChain = selected[i]; break; }
        }

        let totalTrains = 0, validTrains = 0;
        for (let w = 0; w < copyWindows.length; w++) {
            const tl = copyWindows[w].trainsList;
            for (let ti = 0; ti < tl.length; ti++) {
                totalTrains++;
                if (tl[ti].status === 'ok') validTrains++;
            }
        }

        if (!mainChain) {
            previewInfo.innerHTML =
                '<span style="color:#ff3b30">Не выбрана основная цепочка. Кликните ★ у одной из выбранных.</span><br>' +
                'Окон расписания: <b>' + copyWindows.length + '</b>. Строк всего: <b>' + totalTrains + '</b>.';
            return;
        }
        if (mainOpId == null) {
            previewInfo.innerHTML =
                '<span style="color:#ff3b30">⚠ Не выбрана основная операция. Выберите её в блоке цепочек.</span><br>' +
                'Основная цепочка: <b>' + escapeHtml(mainChain.header) + '</b>.';
            return;
        }

        const auxCount = selected.length - 1;
        previewInfo.innerHTML =
            'Основная: <b>' + escapeHtml(mainChain.header) + '</b>. ' +
            'Вспомогательных: <b>' + auxCount + '</b>.<br>' +
            'Окон расписания: <b>' + copyWindows.length + '</b>. ' +
            'Строк всего: <b>' + totalTrains + '</b>, валидных: <b>' + validTrains + '</b>.<br>' +
            'Проверка: <b>начало копии на строке якорной операции &lt; конец занятости строки</b>.';
    }

    // ============================================================
    //  ОКНА РАСПИСАНИЙ
    // ============================================================
    function addCopyWindow() {
        const id = nextWindowId++;
        copyWindows.push({ id: id, trainsList: [], applied: false, appliedCount: 0 });
        renderCopyWindows();
        updatePreview();
    }
    function removeCopyWindow(id) {
        spgConfirm('Удалить это окно расписания? Уже созданные копии не откатываются.', () => {
            const arr = [];
            for (let i = 0; i < copyWindows.length; i++) {
                if (copyWindows[i].id !== id) arr.push(copyWindows[i]);
            }
            copyWindows = arr;
            renderCopyWindows();
            updatePreview();
        });
    }
    $('spgAddWindowBtn').onclick = () => { addCopyWindow(); };

    function renderCopyWindows() {
        let html = '';
        for (let i = 0; i < copyWindows.length; i++) {
            const w = copyWindows[i];
            let okCount = 0;
            for (let t = 0; t < w.trainsList.length; t++) {
                if (w.trainsList[t].status === 'ok') okCount++;
            }
            const appliedCls = w.applied ? ' applied' : '';
            const appliedBadge = w.applied
                ? '<span class="spg-applied-badge">✔ Применено (' + w.appliedCount + ')</span>' : '';

            html += '<div class="spg-copy-window' + appliedCls + '" data-window-id="' + w.id + '">';
            html += '<div class="spg-copy-window-header">';
            html += '<span class="spg-copy-window-title">Расписание #' + w.id + '</span>';
            html += appliedBadge;
            html += '<div class="spg-spacer"></div>';
            html += '<span class="spg-copy-window-stats">Строк: <b>' + w.trainsList.length +
                    '</b>, валидных: <b>' + okCount + '</b></span>';
            html += '<input type="file" accept=".csv" data-csv-window="' + w.id + '" class="spg-file-inline">';
            html += '<button type="button" class="spg-btn spg-small" data-add-row="' + w.id + '">＋ Строка</button>';
            html += '<button type="button" class="spg-btn spg-small spg-danger" data-clear-window="' + w.id + '">✕ Очистить</button>';
            html += '<button type="button" class="spg-btn spg-small spg-danger" data-remove-window="' + w.id + '">🗑</button>';
            html += '</div>';

            html += '<div class="spg-table-scroll">';
            html += '<table class="spg-trains-table" data-table="' + w.id + '">';
            html += '<thead><tr>' +
                    '<th style="width:36px">#</th>' +
                    '<th style="width:110px">Поезд-1</th>' +
                    '<th style="width:90px">Начало</th>' +
                    '<th style="width:90px">Конец</th>' +
                    '<th style="width:110px">Поезд-2</th>' +
                    '<th style="width:90px">Начало 2</th>' +
                    '<th style="width:90px">Конец 2</th>' +
                    '<th style="width:60px">✕</th>' +
                    '</tr></thead>';
            html += '<tbody data-body="' + w.id + '">';

            if (w.trainsList.length === 0) {
                html += '<tr><td colspan="8" class="spg-empty-cell">' +
                        'Таблица пуста. Нажмите «＋ Строка» или загрузите CSV.</td></tr>';
            } else {
                for (let k = 0; k < w.trainsList.length; k++) {
                    const t = w.trainsList[k];
                    const trCls = (t.status === 'text') ? ' class="spg-err"' : '';
                    html += '<tr' + trCls + ' data-row-idx="' + k + '">';
                    html += '<td class="spg-num">' + (k + 1) + '</td>';
                    html += '<td><input type="text" class="spg-cell-input spg-train-input" value="' +
                            escapeAttr(t.train1) + '" data-win="' + w.id + '" data-idx="' + k + '" data-field="train1"></td>';
                    html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                            escapeAttr(t.start1) + '" data-win="' + w.id + '" data-idx="' + k + '" data-field="start1" placeholder="чч:мм"></td>';
                    html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                            escapeAttr(t.end1) + '" data-win="' + w.id + '" data-idx="' + k + '" data-field="end1" placeholder="чч:мм"></td>';
                    html += '<td><input type="text" class="spg-cell-input spg-train-input" value="' +
                            escapeAttr(t.train2) + '" data-win="' + w.id + '" data-idx="' + k + '" data-field="train2"></td>';
                    html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                            escapeAttr(t.start2) + '" data-win="' + w.id + '" data-idx="' + k + '" data-field="start2" placeholder="чч:мм"></td>';
                    html += '<td><input type="text" class="spg-cell-input spg-time-input" value="' +
                            escapeAttr(t.end2) + '" data-win="' + w.id + '" data-idx="' + k + '" data-field="end2" placeholder="чч:мм"></td>';
                    html += '<td><button type="button" class="spg-btn spg-small spg-danger" data-del-row="' + w.id + '" data-idx="' + k + '">✕</button></td>';
                    html += '</tr>';
                }
            }
            html += '</tbody></table></div>';

            html += '<div class="spg-copy-window-actions">';
            html += '<button type="button" class="spg-btn spg-primary" data-apply-window="' + w.id + '">' +
                    (w.applied ? '↻ Применить ещё раз' : '✚ Применить это расписание') + '</button>';
            html += '</div>';

            html += '</div>';
        }
        copyWindowsContainer.innerHTML = html;

        copyWindowsContainer.querySelectorAll('input[data-csv-window]').forEach(el => el.addEventListener('change', onCsvLoad));
        copyWindowsContainer.querySelectorAll('button[data-add-row]').forEach(el => el.addEventListener('click', onAddRow));
        copyWindowsContainer.querySelectorAll('button[data-clear-window]').forEach(el => el.addEventListener('click', onClearWindow));
        copyWindowsContainer.querySelectorAll('button[data-remove-window]').forEach(el => el.addEventListener('click', onRemoveWindow));
        copyWindowsContainer.querySelectorAll('button[data-del-row]').forEach(el => el.addEventListener('click', onDelRow));
        copyWindowsContainer.querySelectorAll('button[data-apply-window]').forEach(el => el.addEventListener('click', onApplyWindow));
        copyWindowsContainer.querySelectorAll('input.spg-cell-input').forEach(inp => {
            inp.addEventListener('input', onCellInput);
            inp.addEventListener('blur', onCellBlur);
            inp.addEventListener('keydown', onCellKeydown);
        });

        totalCopiesApplied.textContent = totalCopiesCount;
    }

    function findWindowById(id) {
        for (let i = 0; i < copyWindows.length; i++) {
            if (copyWindows[i].id === id) return copyWindows[i];
        }
        return null;
    }

    function onCsvLoad(e) {
        const wId = parseInt(e.currentTarget.getAttribute('data-csv-window'), 10);
        const w = findWindowById(wId);
        if (!w) return;
        const file = e.currentTarget.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            spgAlert('Только CSV-файл.');
            return;
        }
        const reader = new FileReader();
        const inputEl = e.currentTarget;
        reader.onerror = () => spgAlert('Ошибка чтения');
        reader.onload = (ev) => {
            try {
                const rows = parseCsv(ev.target.result);
                processTrainRowsAppend(w, rows);
                w.applied = false;
                renderCopyWindows();
                updatePreview();
                inputEl.value = '';
            } catch (err) {
                spgAlert('Ошибка CSV: ' + err.message);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    function onAddRow(e) {
        const wId = parseInt(e.currentTarget.getAttribute('data-add-row'), 10);
        const w = findWindowById(wId);
        if (!w) return;
        w.trainsList.push({
            train1: '', start1: '', end1: '', start2: '', end2: '', train2: '',
            s1m: null, e1m: null, s2m: null, e2m: null, status: 'text'
        });
        w.applied = false;
        renderCopyWindows();
        updatePreview();
        const lastIdx = w.trainsList.length - 1;
        setTimeout(() => {
            const inp = copyWindowsContainer.querySelector(
                'input.spg-train-input[data-win="' + wId + '"][data-idx="' + lastIdx + '"]');
            if (inp) inp.focus();
        }, 50);
    }

    function onClearWindow(e) {
        const wId = parseInt(e.currentTarget.getAttribute('data-clear-window'), 10);
        const w = findWindowById(wId);
        if (!w) return;
        if (w.trainsList.length === 0) return;
        spgConfirm('Очистить расписание #' + wId + '?', () => {
            w.trainsList = [];
            w.applied = false;
            renderCopyWindows();
            updatePreview();
        });
    }

    function onRemoveWindow(e) {
        const wId = parseInt(e.currentTarget.getAttribute('data-remove-window'), 10);
        removeCopyWindow(wId);
    }

    function onDelRow(e) {
        const wId = parseInt(e.currentTarget.getAttribute('data-del-row'), 10);
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        const w = findWindowById(wId);
        if (!w || isNaN(idx)) return;
        w.trainsList.splice(idx, 1);
        w.applied = false;
        renderCopyWindows();
        updatePreview();
    }

    function onCellInput(e) {
        const input = e.currentTarget;
        const wId = parseInt(input.getAttribute('data-win'), 10);
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        const field = input.getAttribute('data-field');
        const w = findWindowById(wId);
        if (!w || isNaN(idx) || !w.trainsList[idx]) return;
        w.trainsList[idx][field] = input.value;
        if (field === 'start1' || field === 'end1' || field === 'start2' || field === 'end2') {
            recalcTrainRow(w.trainsList[idx]);
        }
        const row = input.parentElement.parentElement;
        if (row) {
            row.classList.remove('spg-err');
            if (w.trainsList[idx].status === 'text') row.classList.add('spg-err');
        }
        w.applied = false;
        updatePreview();
    }
    function onCellBlur(e) {}
    function onCellKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
    }

    function recalcTrainRow(t) {
        t.s1m = parseTimeString(t.start1);
        t.e1m = parseTimeString(t.end1);
        t.s2m = parseTimeString(t.start2);
        t.e2m = parseTimeString(t.end2);
        const valid = t.s1m != null && t.e1m != null && t.s2m != null && t.e2m != null
                    && t.e1m > t.s1m && t.e2m > t.s2m;
        t.status = valid ? 'ok' : 'text';
    }

    function onApplyWindow(e) {
        const wId = parseInt(e.currentTarget.getAttribute('data-apply-window'), 10);
        const w = findWindowById(wId);
        if (!w) return;

        if (Object.keys(selectedIds).length === 0) { spgAlert('Выберите хотя бы одну цепочку.'); return; }
        if (mainChainId == null) { spgAlert('Выберите основную цепочку (★).'); return; }
        if (mainOpId == null) {
            showModal(
                'Выберите основную операцию',
                '<p>Для применения копирования по расписанию нужно указать <b>основную операцию</b> ' +
                'в основной цепочке.</p>' +
                '<p>Как правило, это <b>«простой вагона в ожидании»</b> или другая ключевая операция.</p>',
                null, true
            );
            return;
        }

        let okCount = 0;
        for (let i = 0; i < w.trainsList.length; i++) {
            if (w.trainsList[i].status === 'ok') okCount++;
        }
        if (okCount === 0) { spgAlert('В расписании #' + wId + ' нет валидных строк.'); return; }

        try {
            applyReplicationForWindow(w, (res) => {
                const failed = res.failedTrains || [];
                w.applied = true;
                w.appliedCount = res.totalCopies;
                totalCopiesCount += res.totalCopies;

                let msg = 'Расписание #' + wId + ': создано копий <b>' + res.totalCopies + '</b>.';
                if (failed.length > 0) {
                    msg += ' <span style="color:#ff3b30">Пропущено поездов: <b>' + failed.length + '</b>.</span>';
                }
                msg += ' Всего по всем расписаниям: <b>' + totalCopiesCount + '</b>.';

                resultInfo.innerHTML = msg;
                resultBox.classList.remove('spg-hidden');

                renderCopyWindows();
                renderResultChains();
                updatePreview();
            });
        } catch (err) {
            spgAlert('Ошибка: ' + err.message);
            console.error(err);
        }
    }

    // ============================================================
    //  CSV ПАРСИНГ
    // ============================================================
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

    function processTrainRowsAppend(w, rows) {
        const skipped = [];
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
                w.trainsList.push(buildTrainRow(train1, s1, e1, s2, e2, train2));
            } else {
                skipped.push({ train1, start1: s1, end1: e1, train2 });
            }
        }
        if (skipped.length > 0) showSkippedIncomplete(skipped);
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
    //  МОДАЛЬНЫЕ ОКНА (специальные)
    // ============================================================
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
                '<td style="color:#b8860b">неполные данные</td>' +
                '</tr>';
        }
        const html =
            '<p>Некоторые строки CSV <b>не будут обработаны</b>.</p>' +
            '<table class="spg-trains-table" style="margin-top:12px;">' +
            '<thead><tr><th>#</th><th>Поезд-1</th><th>Начало</th><th>Конец</th><th>Поезд-2</th><th>Причина</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody></table>';
        showModal('Пропущенные строки', html, null, true);
    }

    function showCollisionDialog(pendingTrains, onResult) {
        let rowsHtml = '';
        for (let i = 0; i < pendingTrains.length; i++) {
            const t = pendingTrains[i];
            rowsHtml += '<tr>' +
                '<td class="spg-num">' + (i + 1) + '</td>' +
                '<td>' + escapeHtml(t.train1) + '</td>' +
                '<td>' + escapeHtml(t.start1) + '</td>' +
                '<td>' + escapeHtml(t.train2) + '</td>' +
                '</tr>';
        }
        const html =
            '<p>Следующие поезда <b>нельзя разместить без нахлёста</b> ' +
            'ни по одной из выбранных цепочек:</p>' +
            '<table class="spg-trains-table" style="margin-top:12px;">' +
            '<thead><tr><th style="width:40px">#</th><th>Поезд-1</th><th>Начало</th><th>Поезд-2</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody></table>' +
            '<p style="margin-top:12px; font-size:13px; color:var(--popup-text-muted);">' +
            'Если подтвердить — операции будут скопированы <b>с нахлёстом</b> по основной цепочке. ' +
            'Если отменить — поезда будут пропущены.' +
            '</p>';

        $('spgModalTitle').textContent = 'Поезда с перехлёстом';
        $('spgModalText').innerHTML = html;

        const okBtn = $('spgModalOk');
        const cancelBtn = $('spgModalCancel');
        const okTextOrig = okBtn.textContent;
        const cancelTextOrig = cancelBtn.textContent;

        okBtn.textContent = 'Да, разместить с перехлёстом';
        cancelBtn.textContent = 'Нет, пропустить';

        $('spgModalBackdrop').classList.remove('spg-hidden');
        cancelBtn.style.display = '';

        function cleanup() {
            $('spgModalBackdrop').classList.add('spg-hidden');
            okBtn.textContent = okTextOrig;
            cancelBtn.textContent = cancelTextOrig;
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        }

        okBtn.onclick = function () { cleanup(); onResult(true); };
        cancelBtn.onclick = function () { cleanup(); onResult(false); };
    }

    // ============================================================
    //  ЛОГИКА КОПИРОВАНИЯ (НОВЫЙ АЛГОРИТМ)
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
        const sc1 = getStrokeColorForTrain(train1);
        const sc2 = getStrokeColorForTrain(train2);
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
                result.push({ opSrc: op, newX: s1 * K, newDuration: e1 - s1,
                              newComment: train1, newStrokeColor: sc1, isAnchor: 'first' });
                continue;
            }
            if (opId === lastOpId && opId !== firstOpId) {
                result.push({ opSrc: op, newX: s2 * K, newDuration: e2 - s2,
                              newComment: train2, newStrokeColor: sc2, isAnchor: 'last' });
                continue;
            }
            if (opId === prostoyId) {
                result.push({ opSrc: op, newX: e1 * K, newDuration: s2 - e1,
                              newComment: null, newStrokeColor: null, isAnchor: null });
                continue;
            }
            if (j < prostoySortedIdx) {
                result.push({ opSrc: op, newX: e1 * K - dur * K, newDuration: dur,
                              newComment: null, newStrokeColor: null, isAnchor: null });
            } else {
                result.push({ opSrc: op, newX: s2 * K, newDuration: dur,
                              newComment: null, newStrokeColor: null, isAnchor: null });
            }
        }
        return result;
    }

    function layoutHasCollision(layout, mainRowId, data) {
        let newStart = null;
        for (let i = 0; i < layout.length; i++) {
            const item = layout[i];
            if (item.opSrc.rowId !== mainRowId) continue;
            if (newStart === null || item.newX < newStart) newStart = item.newX;
        }
        if (newStart === null) return false;

        let occupiedEnd = null;
        const rows = (data.graphData && data.graphData.rows) || [];
        for (let r = 0; r < rows.length; r++) {
            if (rows[r].id !== mainRowId) continue;
            const ops = rows[r].operations || [];
            for (let k = 0; k < ops.length; k++) {
                const op = ops[k];
                if (typeof op.x !== 'number') continue;
                const dur = (typeof op.duration === 'number') ? op.duration : 0;
                const end = op.x + dur * MINUTE_TO_X;
                if (occupiedEnd === null || end > occupiedEnd) occupiedEnd = end;
            }
            break;
        }

        if (occupiedEnd === null) return false;
        return newStart < occupiedEnd;
    }

    function applyLayoutToRows(data, layout, newChainId, nextIdFn) {
        const gd = data.graphData;
        const rows = gd.rows || [];
        for (let i = 0; i < layout.length; i++) {
            const item = layout[i];
            const opSrc = item.opSrc;
            let targetRow = null;
            for (let r = 0; r < rows.length; r++) {
                if (rows[r].id === opSrc.rowId) { targetRow = rows[r]; break; }
            }
            if (!targetRow) continue;
            if (!Array.isArray(targetRow.operations)) targetRow.operations = [];

            let originalOp = null;
            for (let k = 0; k < targetRow.operations.length; k++) {
                if (targetRow.operations[k].id === opSrc.id) { originalOp = targetRow.operations[k]; break; }
            }
            if (!originalOp) continue;

            const newOp = deepClone(originalOp);
            newOp.id = nextIdFn();
            newOp.chainId = newChainId;
            newOp.x = item.newX;
            if (item.newDuration != null) newOp.duration = item.newDuration;

            if (item.newComment != null && String(item.newComment).trim() !== '') {
                newOp.comment = item.newComment;
            } else {
                delete newOp.comment;
            }

            if (item.isAnchor === 'first' || item.isAnchor === 'last') {
                if (item.newStrokeColor != null) {
                    newOp.strokeColor = item.newStrokeColor;
                }
            } else {
                delete newOp.strokeColor;
            }

            targetRow.operations.push(newOp);
        }
    }

    function findMainOpRowId() {
        if (mainChainId == null || mainOpId == null) return null;
        let c = null;
        for (let i = 0; i < chains.length; i++) {
            if (chains[i].id === mainChainId) { c = chains[i]; break; }
        }
        if (!c) return null;
        for (let j = 0; j < c.operations.length; j++) {
            if (c.operations[j].id === mainOpId) return c.operations[j].rowId;
        }
        return null;
    }

    function applyReplicationForWindow(w, onDone) {
        if (!workingData) workingData = deepClone(sourceData);
        const data = workingData;
        const gd = data.graphData;
        if (!gd) throw new Error('Не найден graphData');

        const selected = getSelectedChains();
        let mainChain = null;
        for (let i = 0; i < selected.length; i++) {
            if (selected[i].id === mainChainId) { mainChain = selected[i]; break; }
        }
        if (!mainChain) throw new Error('Не выбрана основная цепочка.');

        const mainRowId = findMainOpRowId();
        if (mainRowId == null) throw new Error('Не найдена строка основной операции.');

        const chainOrder = [mainChain];
        for (let j = 0; j < selected.length; j++) {
            if (selected[j].id !== mainChainId) chainOrder.push(selected[j]);
        }

        const existingIds = {};
        const rows = gd.rows || [];
        const techChains = gd.techChains || [];
        for (let r = 0; r < rows.length; r++) {
            if (!rows[r].operations) continue;
            for (let o = 0; o < rows[r].operations.length; o++) {
                const op = rows[r].operations[o];
                if (op.id != null) existingIds[op.id] = true;
                if (op.chainId != null) existingIds[op.chainId] = true;
            }
        }
        for (let t = 0; t < techChains.length; t++) existingIds[techChains[t].id] = true;

        let baseId = Date.now();
        function nextId() {
            while (existingIds[baseId]) baseId++;
            existingIds[baseId] = true;
            return baseId;
        }

        let totalCopies = 0;
        const failedTrains = [];
        const pendingCollisions = [];

        for (let ti = 0; ti < w.trainsList.length; ti++) {
            const tr = w.trainsList[ti];
            if (tr.status !== 'ok') continue;

            let placed = false;
            for (let ci = 0; ci < chainOrder.length; ci++) {
                const ch = chainOrder[ci];
                const layout = layoutChainOperations(ch, tr);

                if (layoutHasCollision(layout, mainRowId, data)) continue;

                const newChainId = nextId();
                data.graphData.techChains.push({
                    header: ch.header + ' — ' + tr.train1 + ' / ' + tr.train2,
                    isLocked: ch.isLocked,
                    id: newChainId,
                    comment: tr.train1 + ' / ' + tr.train2
                });

                applyLayoutToRows(data, layout, newChainId, nextId);
                totalCopies++;
                placed = true;
                break;
            }

            if (!placed) pendingCollisions.push(tr);
        }

        if (pendingCollisions.length > 0) {
            showCollisionDialog(pendingCollisions, (confirmed) => {
                if (confirmed) {
                    for (let pi = 0; pi < pendingCollisions.length; pi++) {
                        const ptr = pendingCollisions[pi];
                        const mainLayout = layoutChainOperations(mainChain, ptr);
                        const newChainId2 = nextId();
                        data.graphData.techChains.push({
                            header: mainChain.header + ' — ' + ptr.train1 + ' / ' + ptr.train2,
                            isLocked: mainChain.isLocked,
                            id: newChainId2,
                            comment: ptr.train1 + ' / ' + ptr.train2
                        });
                        applyLayoutToRows(data, mainLayout, newChainId2, nextId);
                        totalCopies++;
                    }
                    onDone({ totalCopies: totalCopies, failedTrains: failedTrains, pending: pendingCollisions });
                } else {
                    for (let fi = 0; fi < pendingCollisions.length; fi++) {
                        failedTrains.push({
                            train1: pendingCollisions[fi].train1,
                            train2: pendingCollisions[fi].train2,
                            start1: pendingCollisions[fi].start1
                        });
                    }
                    onDone({ totalCopies: totalCopies, failedTrains: failedTrains, pending: pendingCollisions });
                }
            });
        } else {
            onDone({ totalCopies: totalCopies, failedTrains: failedTrains, pending: [] });
        }
    }

    function applyCountMode() {
        if (!workingData) workingData = deepClone(sourceData);
        const data = workingData;
        const gd = data.graphData;
        if (!gd) throw new Error('Не найден graphData');
        const selected = getSelectedChains();
        const count = clampInt($('spgCopyCount').value, 1, 200, 1);
        const minutes = clampInt($('spgShiftMinutes').value, 1, 1440, 15);
        const shiftX = minutes * MINUTE_TO_X;
        const prefix = ($('spgCopyPrefix').value || 'копия').trim() || 'копия';

        const existingIds = {};
        const rows = gd.rows || [];
        const techChains = gd.techChains || [];
        for (let r = 0; r < rows.length; r++) {
            if (!rows[r].operations) continue;
            for (let o = 0; o < rows[r].operations.length; o++) {
                const op = rows[r].operations[o];
                if (op.id != null) existingIds[op.id] = true;
                if (op.chainId != null) existingIds[op.chainId] = true;
            }
        }
        for (let t = 0; t < techChains.length; t++) existingIds[techChains[t].id] = true;

        let baseId = Date.now();
        function nextId() {
            while (existingIds[baseId]) baseId++;
            existingIds[baseId] = true;
            return baseId;
        }

        let totalCopies = 0;
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
                    let targetRow = null;
                    for (let ri = 0; ri < rows.length; ri++) {
                        if (rows[ri].id === opSrc.rowId) { targetRow = rows[ri]; break; }
                    }
                    if (!targetRow) continue;
                    if (!targetRow.operations) targetRow.operations = [];
                    let originalOp = null;
                    for (let oi2 = 0; oi2 < targetRow.operations.length; oi2++) {
                        if (targetRow.operations[oi2].id === opSrc.id) { originalOp = targetRow.operations[oi2]; break; }
                    }
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
        return { totalCopies: totalCopies, failedTrains: [] };
    }

    // ============================================================
    //  РЕЗУЛЬТАТ И СБРОС
    // ============================================================
    $('spgApplyCountBtn').onclick = () => {
        if (Object.keys(selectedIds).length === 0) { spgAlert('Выберите хотя бы одну цепочку.'); return; }
        try {
            const res = applyCountMode();
            totalCopiesCount += res.totalCopies;
            resultInfo.innerHTML =
                'По количеству: создано копий <b>' + res.totalCopies + '</b>. ' +
                'Всего по всем расписаниям: <b>' + totalCopiesCount + '</b>.';
            resultBox.classList.remove('spg-hidden');
            renderCopyWindows();
            renderResultChains();
            updatePreview();
        } catch (err) {
            spgAlert('Ошибка: ' + err.message);
            console.error(err);
        }
    };

    function renderResultChains() {
        const tbody = $('spgResultChainsBody');
        if (!tbody) return;
        if (!workingData) {
            tbody.innerHTML = '<tr><td colspan="6" class="spg-empty-cell">Пока ничего не создано</td></tr>';
            return;
        }
        const gd = workingData.graphData || {};
        const techChains = gd.techChains || [];
        const rows = gd.rows || [];
        const opsCount = {};
        for (let i = 0; i < rows.length; i++) {
            const ops = rows[i].operations || [];
            for (let j = 0; j < ops.length; j++) {
                const cid = String(ops[j].chainId);
                opsCount[cid] = (opsCount[cid] || 0) + 1;
            }
        }
        const originalIds = {};
        if (sourceData && sourceData.graphData && sourceData.graphData.techChains) {
            const srcTc = sourceData.graphData.techChains;
            for (let s = 0; s < srcTc.length; s++) originalIds[String(srcTc[s].id)] = true;
        }
        let html = '';
        for (let k = 0; k < techChains.length; k++) {
            const tc = techChains[k];
            const idStr = String(tc.id);
            const isOriginal = !!originalIds[idStr];
            const srcLabel = isOriginal
                ? '<span style="color:#34c759; font-weight:600;">оригинал</span>'
                : '<span style="color:#4a9eff; font-weight:600;">копия</span>';
            const cmt = tc.comment != null && String(tc.comment).trim() !== ''
                ? escapeHtml(String(tc.comment))
                : '<span class="spg-dash">—</span>';
            html += '<tr>';
            html += '<td class="spg-num">' + (k + 1) + '</td>';
            html += '<td>' + escapeHtml(tc.header || '') + '</td>';
            html += '<td class="spg-num">' + escapeHtml(idStr) + '</td>';
            html += '<td class="spg-num">' + (opsCount[idStr] || 0) + '</td>';
            html += '<td>' + cmt + '</td>';
            html += '<td>' + srcLabel + '</td>';
            html += '</tr>';
        }
        if (techChains.length === 0) {
            html = '<tr><td colspan="6" class="spg-empty-cell">Цепочек нет</td></tr>';
        }
        tbody.innerHTML = html;
    }

    // ============================================================
    //  КНОПКИ СКАЧИВАНИЯ
    // ============================================================

    // Основная кнопка в блоке «Результат» — скачивает workingData как есть.
    // Если комментарии скрыты, всё равно скачивает с ними (это полный файл).
    $('spgDownloadFullBtn').onclick = () => {
        if (!workingData) { spgAlert('Сначала примените копирование.'); return; }
        makeDownload('СПГ_with_copies.json', JSON.stringify(workingData));
    };

    // Кнопка в жёлтом баннере — скачивает копию БЕЗ комментариев.
    // workingData НЕ модифицируется.
    $('spgDownloadHiddenBtn').onclick = () => {
        if (!workingData) { spgAlert('Сначала примените копирование.'); return; }
        const clean = buildDataWithoutComments(workingData);
        makeDownload('СПГ_no_comments.json', JSON.stringify(clean));
    };

    // Кнопка в синем баннере — восстанавливает комментарии в workingData,
    // пересобирает chains и скачивает полный файл.
    $('spgDownloadRestoredBtn').onclick = () => {
        if (!workingData) { spgAlert('Сначала примените копирование.'); return; }
        const res = restoreCommentsFromSnapshot();
        if (!res) {
            spgAlert('Снимок комментариев не найден.');
            return;
        }
        rebuildChainsFromWorkingData();
        commentsHidden = false;
        renderChains();
        updateCommentsUI();
        updateRestoreBanner();
        makeDownload('СПГ_with_comments.json', JSON.stringify(workingData));
    };

    $('spgResetCopiesBtn').onclick = () => {
        if (!sourceData) return;
        spgConfirm('Сбросить все созданные копии? Вернётся исходное состояние.', () => {
            workingData = deepClone(sourceData);
            totalCopiesCount = 0;
            for (let i = 0; i < copyWindows.length; i++) {
                copyWindows[i].applied = false;
                copyWindows[i].appliedCount = 0;
            }
            chains = [];
            analyze(workingData);
            resultBox.classList.add('spg-hidden');
            renderCopyWindows();
            renderResultChains();
            updatePreview();
        });
    };

    function makeDownload(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType || 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    // ============================================================
    //  СТАРТ
    // ============================================================
    updateCommentsUI();
    updateRestoreBanner();
    renderResultChains();
}
