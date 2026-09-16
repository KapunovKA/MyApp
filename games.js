// ============================================================
//  ПРИЛОЖЕНИЕ «ИГРЫ» — Сапёр, Пятнашки, Судоку + история
// ============================================================

const GAMES_HISTORY_KEY = 'gamesHistory';
const GAMES_MAX_HISTORY = 50;

// ------------------------------------------------------------
//  Хранилище истории
// ------------------------------------------------------------
function ghLoad() {
    try {
        const raw = localStorage.getItem(GAMES_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function ghSave(list) {
    try {
        localStorage.setItem(GAMES_HISTORY_KEY, JSON.stringify(list.slice(0, GAMES_MAX_HISTORY)));
    } catch (e) {}
}

function ghAdd(entry) {
    const list = ghLoad();
    list.unshift({
        ...entry,
        timestamp: Date.now(),
    });
    ghSave(list);
}

function ghClear() {
    localStorage.removeItem(GAMES_HISTORY_KEY);
}

function ghFormatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHr < 24) return `${diffHr} ч назад`;
    if (diffDay < 7) return `${diffDay} дн назад`;

    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

// ------------------------------------------------------------
//  Создание UI
// ------------------------------------------------------------
function createGamesApp() {
    const html = `
        <div class="games-app">
            <!-- Вкладки -->
            <div class="games-tabs">
                <button class="games-tab active" data-game="minesweeper">💣 Сапёр</button>
                <button class="games-tab" data-game="puzzle">🔢 Пятнашки</button>
                <button class="games-tab" data-game="sudoku">🧩 Судоку</button>
            </div>

            <!-- САПЁР -->
            <div class="game-panel active" id="panel-minesweeper">
                <div class="game-header">
                    <div class="game-stat">
                        <span class="game-stat-label">Мины</span>
                        <span class="game-stat-value" id="msMines">10</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Время</span>
                        <span class="game-stat-value" id="msTime">0:00</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Рекорд</span>
                        <span class="game-stat-value positive" id="msBest">—</span>
                    </div>
                    <div class="game-header-spacer"></div>
                    <button class="game-btn primary" id="msStartBtn">▶ Новая игра</button>
                    <button class="game-btn" id="msHistoryBtn">📜 История</button>
                </div>
                <div class="game-board-wrapper">
                    <div class="minesweeper-wrapper">
                        <div class="minesweeper-difficulty">
                            <button class="diff-btn active" data-diff="easy">😊 Лёгкий (9×9)</button>
                            <button class="diff-btn" data-diff="medium">😐 Средний (12×12)</button>
                            <button class="diff-btn" data-diff="hard">😰 Сложный (16×16)</button>
                        </div>
                        <div class="minesweeper-board" id="msBoard"></div>
                    </div>
                    <div class="game-win-overlay" id="msOverlay">
                        <div class="game-win-card">
                            <div class="game-win-icon" id="msResultIcon">🎉</div>
                            <div class="game-win-title" id="msResultTitle">Победа!</div>
                            <div class="game-win-message" id="msResultMessage">—</div>
                            <div class="game-win-record" id="msRecordBadge" style="display: none;">
                                🏆 Новый рекорд!
                            </div>
                            <div class="game-win-actions">
                                <button class="game-btn primary" id="msRetryBtn">▶ Ещё раз</button>
                                <button class="game-btn" id="msCloseBtn">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ПЯТНАШКИ -->
            <div class="game-panel" id="panel-puzzle">
                <div class="game-header">
                    <div class="game-stat">
                        <span class="game-stat-label">Ходы</span>
                        <span class="game-stat-value" id="pzMoves">0</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Время</span>
                        <span class="game-stat-value" id="pzTime">0:00</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Рекорд</span>
                        <span class="game-stat-value positive" id="pzBest">—</span>
                    </div>
                    <div class="game-header-spacer"></div>
                    <button class="game-btn primary" id="pzNewBtn">🔀 Перемешать</button>
                    <button class="game-btn" id="pzHistoryBtn">📜 История</button>
                </div>
                <div class="game-board-wrapper">
                    <div class="puzzle-wrapper">
                        <div class="puzzle-board" id="pzBoard"></div>
                    </div>
                    <div class="game-win-overlay" id="pzOverlay">
                        <div class="game-win-card">
                            <div class="game-win-icon">🎉</div>
                            <div class="game-win-title">Победа!</div>
                            <div class="game-win-message" id="pzResultMessage">—</div>
                            <div class="game-win-record" id="pzRecordBadge" style="display: none;">
                                🏆 Новый рекорд!
                            </div>
                            <div class="game-win-actions">
                                <button class="game-btn primary" id="pzRetryBtn">🔀 Ещё раз</button>
                                <button class="game-btn" id="pzCloseBtn">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- СУДОКУ -->
            <div class="game-panel" id="panel-sudoku">
                <div class="game-header">
                    <div class="game-stat">
                        <span class="game-stat-label">Сложность</span>
                        <span class="game-stat-value" id="sdDifficulty">Лёгкий</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Время</span>
                        <span class="game-stat-value" id="sdTime">0:00</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Ошибок</span>
                        <span class="game-stat-value negative" id="sdErrors">0</span>
                    </div>
                    <div class="game-stat">
                        <span class="game-stat-label">Рекорд</span>
                        <span class="game-stat-value positive" id="sdBest">—</span>
                    </div>
                    <div class="game-header-spacer"></div>
                    <button class="game-btn primary" id="sdNewBtn">🎲 Новая игра</button>
                    <button class="game-btn" id="sdHistoryBtn">📜 История</button>
                </div>
                <div class="game-board-wrapper">
                    <div class="sudoku-wrapper">
                        <div class="sudoku-difficulty">
                            <button class="diff-btn active" data-sdiff="easy">😊 Лёгкий</button>
                            <button class="diff-btn" data-sdiff="medium">😐 Средний</button>
                            <button class="diff-btn" data-sdiff="hard">😰 Сложный</button>
                            <button class="diff-btn" data-sdiff="expert">😈 Эксперт</button>
                        </div>
                        <div class="sudoku-board" id="sdBoard"></div>
                        <div class="sudoku-keypad" id="sdKeypad">
                            <button class="sudoku-key" data-num="1">1</button>
                            <button class="sudoku-key" data-num="2">2</button>
                            <button class="sudoku-key" data-num="3">3</button>
                            <button class="sudoku-key" data-num="4">4</button>
                            <button class="sudoku-key" data-num="5">5</button>
                            <button class="sudoku-key" data-num="6">6</button>
                            <button class="sudoku-key" data-num="7">7</button>
                            <button class="sudoku-key" data-num="8">8</button>
                            <button class="sudoku-key" data-num="9">9</button>
                        </div>
                        <div class="sudoku-actions">
                            <button class="game-btn" id="sdEraseBtn">🧽 Стереть</button>
                            <button class="game-btn" id="sdHintBtn">💡 Подсказка</button>
                        </div>
                    </div>
                    <div class="game-win-overlay" id="sdOverlay">
                        <div class="game-win-card">
                            <div class="game-win-icon">🎉</div>
                            <div class="game-win-title">Судоку решено!</div>
                            <div class="game-win-message" id="sdResultMessage">—</div>
                            <div class="game-win-record" id="sdRecordBadge" style="display: none;">
                                🏆 Новый рекорд!
                            </div>
                            <div class="game-win-actions">
                                <button class="game-btn primary" id="sdRetryBtn">🎲 Ещё раз</button>
                                <button class="game-btn" id="sdCloseBtn">Закрыть</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- История -->
            <div class="game-history-panel" id="gameHistoryPanel">
                <div class="game-history-title">
                    <span id="historyTitle">📜 История игр</span>
                    <button class="game-history-clear" id="historyClearBtn">Очистить</button>
                </div>
                <div class="game-history-list" id="historyList"></div>
            </div>
        </div>
    `;

    const win = createWindow({
        title: 'Игры',
        width: 720,
        height: 720,
        content: html,
    });
    win.dataset.app = 'games';
    win.style.minWidth = '420px';
    win.style.minHeight = '540px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    initGamesApp(win);
    return win;
}

// ------------------------------------------------------------
//  Инициализация
// ------------------------------------------------------------
function initGamesApp(win) {
    let currentGame = 'minesweeper';

    // ============================================================
    //  Вкладки
    // ============================================================
    const tabs = win.querySelectorAll('.games-tab');
    const panels = win.querySelectorAll('.game-panel');

    const GAME_TITLES = {
        minesweeper: '💣 Сапёр',
        puzzle: '🔢 Пятнашки',
        sudoku: '🧩 Судоку',
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const game = tab.dataset.game;
            if (game === currentGame) return;

            currentGame = game;

            tabs.forEach(t => t.classList.toggle('active', t === tab));
            panels.forEach(p => {
                p.classList.toggle('active', p.id === `panel-${game}`);
            });

            win.querySelector('#historyTitle').textContent = `📜 История: ${GAME_TITLES[game]}`;
            renderHistory();
        });
    });

    // ============================================================
    //  История
    // ============================================================
    const historyPanel = win.querySelector('#gameHistoryPanel');
    const historyList = win.querySelector('#historyList');
    let historyVisible = false;

    function renderHistory() {
        const all = ghLoad();
        const filtered = all.filter(h => h.game === currentGame).slice(0, 20);

        if (filtered.length === 0) {
            historyList.innerHTML = '<div class="game-history-empty">Пока нет сыгранных партий</div>';
            return;
        }

        historyList.innerHTML = filtered.map(h => {
            const medal = h.record ? '🏆' : '🎮';
            const badge = h.record ? 'РЕКОРД' : (h.result || '—');
            const time = h.time ? `${Math.floor(h.time / 60)}:${String(h.time % 60).padStart(2, '0')}` : '';
            return `
                <div class="game-history-item ${h.record ? 'record' : ''}">
                    <span class="gh-medal">${medal}</span>
                    <div class="gh-info">
                        <span class="gh-result">${h.label || h.result || '—'}</span>
                        <span class="gh-date">${ghFormatDate(h.timestamp)}</span>
                    </div>
                    ${time ? `<span class="gh-time">⏱ ${time}</span>` : ''}
                    <span class="gh-badge">${badge}</span>
                </div>
            `;
        }).join('');
    }

    function toggleHistory() {
        historyVisible = !historyVisible;
        historyPanel.classList.toggle('visible', historyVisible);
        if (historyVisible) renderHistory();
    }

    win.querySelector('#msHistoryBtn').addEventListener('click', toggleHistory);
    win.querySelector('#pzHistoryBtn').addEventListener('click', toggleHistory);
    win.querySelector('#sdHistoryBtn').addEventListener('click', toggleHistory);

    win.querySelector('#historyClearBtn').addEventListener('click', () => {
        if (!confirm('Очистить всю историю игр?')) return;
        ghClear();
        renderHistory();
        if (window.showNotification) {
            window.showNotification({
                title: 'История очищена',
                message: 'Все результаты удалены',
                type: 'info',
                icon: '📜',
                duration: 2500,
            });
        }
    });

    // ============================================================
    //  САПЁР
    // ============================================================
    const MS_DIFFICULTIES = {
        easy: { size: 9, mines: 10 },
        medium: { size: 12, mines: 22 },
        hard: { size: 16, mines: 40 },
    };

    const msState = {
        difficulty: 'easy',
        size: 9,
        mines: 10,
        board: [],
        revealed: 0,
        flags: 0,
        started: false,
        finished: false,
        startTime: 0,
        timer: null,
        elapsed: 0,
    };

    const msBoardEl = win.querySelector('#msBoard');
    const msMinesEl = win.querySelector('#msMines');
    const msTimeEl = win.querySelector('#msTime');
    const msBestEl = win.querySelector('#msBest');
    const msOverlay = win.querySelector('#msOverlay');

    function msGetBestKey() {
        return `msBestTime_${msState.difficulty}`;
    }

    function msUpdateBestDisplay() {
        const best = localStorage.getItem(msGetBestKey());
        msBestEl.textContent = best
            ? `${Math.floor(parseInt(best) / 60)}:${String(parseInt(best) % 60).padStart(2, '0')}`
            : '—';
    }

    function msUpdateHeader() {
        msMinesEl.textContent = msState.mines - msState.flags;
        msTimeEl.textContent = `${Math.floor(msState.elapsed / 60)}:${String(msState.elapsed % 60).padStart(2, '0')}`;
    }

    function msFormatTime(sec) {
        return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }

    function msStart() {
        const cfg = MS_DIFFICULTIES[msState.difficulty];
        msState.size = cfg.size;
        msState.mines = cfg.mines;
        msState.board = [];
        msState.revealed = 0;
        msState.flags = 0;
        msState.started = false;
        msState.finished = false;
        msState.elapsed = 0;

        if (msState.timer) clearInterval(msState.timer);
        msState.timer = null;

        for (let y = 0; y < msState.size; y++) {
            for (let x = 0; x < msState.size; x++) {
                msState.board.push({
                    x, y,
                    mine: false,
                    revealed: false,
                    flagged: false,
                    adjacent: 0,
                });
            }
        }

        msBoardEl.style.gridTemplateColumns = `repeat(${msState.size}, 1fr)`;
        msBoardEl.innerHTML = '';
        msState.board.forEach((cell, i) => {
            const btn = document.createElement('button');
            btn.className = 'ms-cell';
            btn.dataset.i = i;
            btn.addEventListener('click', () => msReveal(i));
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                msFlag(i);
            });
            msBoardEl.appendChild(btn);
        });

        msOverlay.classList.remove('show');
        msUpdateHeader();
        msUpdateBestDisplay();
    }

    function msPlaceMines(excludeIdx) {
        const exclude = new Set([excludeIdx]);
        const exCell = msState.board[excludeIdx];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = exCell.x + dx;
                const ny = exCell.y + dy;
                if (nx >= 0 && nx < msState.size && ny >= 0 && ny < msState.size) {
                    exclude.add(ny * msState.size + nx);
                }
            }
        }

        const available = [];
        msState.board.forEach((c, i) => {
            if (!exclude.has(i)) available.push(i);
        });

        for (let i = 0; i < msState.mines; i++) {
            const randIdx = Math.floor(Math.random() * available.length);
            const idx = available.splice(randIdx, 1)[0];
            msState.board[idx].mine = true;
        }

        msState.board.forEach(cell => {
            if (cell.mine) return;
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cell.x + dx;
                    const ny = cell.y + dy;
                    if (nx >= 0 && nx < msState.size && ny >= 0 && ny < msState.size) {
                        if (msState.board[ny * msState.size + nx].mine) count++;
                    }
                }
            }
            cell.adjacent = count;
        });
    }

    function msStartTimer() {
        msState.startTime = Date.now();
        msState.timer = setInterval(() => {
            msState.elapsed = Math.floor((Date.now() - msState.startTime) / 1000);
            msUpdateHeader();
        }, 1000);
    }

    function msReveal(idx) {
        if (msState.finished) return;
        const cell = msState.board[idx];
        if (!cell || cell.revealed || cell.flagged) return;

        if (!msState.started) {
            msState.started = true;
            msPlaceMines(idx);
            msStartTimer();
        }

        if (cell.mine) {
            msGameOver('lose', idx);
            return;
        }

        msRevealCell(idx);
        msCheckWin();
    }

    function msRevealCell(idx) {
        const cell = msState.board[idx];
        if (!cell || cell.revealed || cell.flagged) return;

        cell.revealed = true;
        msState.revealed++;

        const btn = msBoardEl.children[idx];
        btn.classList.add('open');
        if (cell.adjacent > 0) {
            btn.textContent = cell.adjacent;
            btn.classList.add('n' + cell.adjacent);
        }

        if (cell.adjacent === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cell.x + dx;
                    const ny = cell.y + dy;
                    if (nx >= 0 && nx < msState.size && ny >= 0 && ny < msState.size) {
                        const nIdx = ny * msState.size + nx;
                        if (!msState.board[nIdx].revealed) {
                            msRevealCell(nIdx);
                        }
                    }
                }
            }
        }
    }

    function msFlag(idx) {
        if (msState.finished) return;
        const cell = msState.board[idx];
        if (!cell || cell.revealed) return;

        cell.flagged = !cell.flagged;
        msState.flags += cell.flagged ? 1 : -1;

        const btn = msBoardEl.children[idx];
        btn.classList.toggle('flagged', cell.flagged);
        btn.textContent = cell.flagged ? '🚩' : '';

        msUpdateHeader();
    }

    function msCheckWin() {
        const totalSafe = msState.size * msState.size - msState.mines;
        if (msState.revealed === totalSafe) {
            msGameOver('win');
        }
    }

    function msGameOver(result, hitIdx) {
        msState.finished = true;
        if (msState.timer) clearInterval(msState.timer);

        if (result === 'lose') {
            msState.board.forEach((cell, i) => {
                if (cell.mine) {
                    const btn = msBoardEl.children[i];
                    btn.classList.add('mine');
                    if (!btn.textContent) btn.textContent = '💣';
                }
            });
            if (hitIdx !== undefined) {
                msBoardEl.children[hitIdx].classList.add('mine-hit');
            }
        }

        const time = msState.elapsed;
        let isRecord = false;

        if (result === 'win') {
            const best = parseInt(localStorage.getItem(msGetBestKey())) || Infinity;
            if (time < best) {
                isRecord = true;
                localStorage.setItem(msGetBestKey(), String(time));
                msUpdateBestDisplay();
            }
        }

        const diffLabel = {
            easy: 'Лёгкий',
            medium: 'Средний',
            hard: 'Сложный',
        }[msState.difficulty] || '—';

        ghAdd({
            game: 'minesweeper',
            label: `${diffLabel} · ${msFormatTime(time)}`,
            result: result === 'win' ? 'Победа' : 'Проигрыш',
            record: isRecord,
            time: time,
        });

        if (result === 'win') {
            win.querySelector('#msResultIcon').textContent = '🎉';
            win.querySelector('#msResultTitle').textContent = 'Победа!';
            win.querySelector('#msResultMessage').innerHTML = `Время: <strong>${msFormatTime(time)}</strong>`;
        } else {
            win.querySelector('#msResultIcon').textContent = '💥';
            win.querySelector('#msResultTitle').textContent = 'Проигрыш';
            win.querySelector('#msResultMessage').innerHTML = `Попали на мину через <strong>${msFormatTime(time)}</strong>`;
        }

        win.querySelector('#msRecordBadge').style.display = isRecord ? 'inline-flex' : 'none';
        msOverlay.classList.add('show');

        if (isRecord && window.showNotification) {
            window.showNotification({
                title: '🏆 Новый рекорд!',
                message: `Сапёр: ${msFormatTime(time)}`,
                type: 'success',
                icon: '💣',
                duration: 4000,
            });
        }

        if (historyVisible) renderHistory();
    }

    win.querySelector('#msStartBtn').addEventListener('click', msStart);
    win.querySelector('#msRetryBtn').addEventListener('click', msStart);
    win.querySelector('#msCloseBtn').addEventListener('click', () => msOverlay.classList.remove('show'));

    win.querySelectorAll('.diff-btn[data-diff]').forEach(btn => {
        btn.addEventListener('click', () => {
            win.querySelectorAll('.diff-btn[data-diff]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            msState.difficulty = btn.dataset.diff;
            msStart();
        });
    });

    msStart();

    // ============================================================
    //  ПЯТНАШКИ
    // ============================================================
    const PZ_SIZE = 4;
    const PZ_TOTAL = PZ_SIZE * PZ_SIZE;

    const pzState = {
        tiles: [],
        emptyIdx: 15,
        moves: 0,
        started: false,
        finished: false,
        startTime: 0,
        timer: null,
        elapsed: 0,
    };

    const pzBoardEl = win.querySelector('#pzBoard');
    const pzMovesEl = win.querySelector('#pzMoves');
    const pzTimeEl = win.querySelector('#pzTime');
    const pzBestEl = win.querySelector('#pzBest');
    const pzOverlay = win.querySelector('#pzOverlay');

    function pzUpdateBestDisplay() {
        const best = localStorage.getItem('puzzleBest');
        if (best) {
            try {
                const parsed = JSON.parse(best);
                pzBestEl.textContent = `${parsed.moves} ходов`;
            } catch (e) {
                pzBestEl.textContent = '—';
            }
        } else {
            pzBestEl.textContent = '—';
        }
    }

    function pzUpdateHeader() {
        pzMovesEl.textContent = pzState.moves;
        pzTimeEl.textContent = `${Math.floor(pzState.elapsed / 60)}:${String(pzState.elapsed % 60).padStart(2, '0')}`;
    }

    function pzFormatTime(sec) {
        return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }

    function pzIsSolved() {
        for (let i = 0; i < PZ_TOTAL - 1; i++) {
            if (pzState.tiles[i] !== i + 1) return false;
        }
        return true;
    }

    function pzGetNeighbors(idx) {
        const row = Math.floor(idx / PZ_SIZE);
        const col = idx % PZ_SIZE;
        const result = [];
        if (row > 0) result.push(idx - PZ_SIZE);
        if (row < PZ_SIZE - 1) result.push(idx + PZ_SIZE);
        if (col > 0) result.push(idx - 1);
        if (col < PZ_SIZE - 1) result.push(idx + 1);
        return result;
    }

    function pzSwap(targetIdx) {
        const emptyIdx = pzState.emptyIdx;
        [pzState.tiles[emptyIdx], pzState.tiles[targetIdx]] = [pzState.tiles[targetIdx], pzState.tiles[emptyIdx]];
        pzState.emptyIdx = targetIdx;
    }

    function pzShuffle() {
        pzState.tiles = [];
        for (let i = 1; i < PZ_TOTAL; i++) pzState.tiles.push(i);
        pzState.tiles.push(0);
        pzState.emptyIdx = PZ_TOTAL - 1;

        let lastMove = -1;
        for (let i = 0; i < 500; i++) {
            const neighbors = pzGetNeighbors(pzState.emptyIdx);
            const valid = neighbors.filter(n => n !== lastMove);
            const pick = valid[Math.floor(Math.random() * valid.length)];
            lastMove = pzState.emptyIdx;
            pzSwap(pick);
        }

        if (pzIsSolved()) pzShuffle();
    }

    function pzDraw() {
        pzBoardEl.innerHTML = '';
        pzState.tiles.forEach((value, idx) => {
            const tile = document.createElement('button');
            tile.className = 'puzzle-tile';
            if (value === 0) {
                tile.classList.add('empty');
            } else {
                tile.textContent = value;
                if (value === idx + 1) tile.classList.add('correct');
                tile.addEventListener('click', () => pzMove(idx));
            }
            pzBoardEl.appendChild(tile);
        });
    }

    function pzMove(idx) {
        if (pzState.finished) return;

        const neighbors = pzGetNeighbors(pzState.emptyIdx);
        if (!neighbors.includes(idx)) return;

        if (!pzState.started) {
            pzState.started = true;
            pzStartTimer();
        }

        pzSwap(idx);
        pzState.moves++;
        pzDraw();
        pzUpdateHeader();

        if (pzIsSolved()) {
            pzWin();
        }
    }

    function pzStartTimer() {
        pzState.startTime = Date.now();
        pzState.timer = setInterval(() => {
            pzState.elapsed = Math.floor((Date.now() - pzState.startTime) / 1000);
            pzUpdateHeader();
        }, 1000);
    }

    function pzNewGame() {
        pzState.moves = 0;
        pzState.elapsed = 0;
        pzState.started = false;
        pzState.finished = false;

        if (pzState.timer) clearInterval(pzState.timer);
        pzState.timer = null;

        pzShuffle();
        pzDraw();
        pzUpdateHeader();
        pzUpdateBestDisplay();
        pzOverlay.classList.remove('show');
    }

    function pzWin() {
        pzState.finished = true;
        if (pzState.timer) clearInterval(pzState.timer);

        const moves = pzState.moves;
        const time = pzState.elapsed;

        const bestRaw = localStorage.getItem('puzzleBest');
        let best = null;
        try { best = bestRaw ? JSON.parse(bestRaw) : null; } catch (e) {}

        const isRecord = !best || moves < best.moves;
        if (isRecord) {
            localStorage.setItem('puzzleBest', JSON.stringify({ moves, time }));
            pzUpdateBestDisplay();
        }

        ghAdd({
            game: 'puzzle',
            label: `${moves} ходов`,
            result: 'Победа',
            record: isRecord,
            time: time,
        });

        win.querySelector('#pzResultMessage').innerHTML =
            `Ходов: <strong>${moves}</strong> · Время: <strong>${pzFormatTime(time)}</strong>`;
        win.querySelector('#pzRecordBadge').style.display = isRecord ? 'inline-flex' : 'none';
        pzOverlay.classList.add('show');

        if (isRecord && window.showNotification) {
            window.showNotification({
                title: '🏆 Новый рекорд!',
                message: `Пятнашки: ${moves} ходов`,
                type: 'success',
                icon: '🔢',
                duration: 4000,
            });
        }

        if (historyVisible) renderHistory();
    }

    win.querySelector('#pzNewBtn').addEventListener('click', pzNewGame);
    win.querySelector('#pzRetryBtn').addEventListener('click', pzNewGame);
    win.querySelector('#pzCloseBtn').addEventListener('click', () => pzOverlay.classList.remove('show'));

    pzNewGame();

    // ============================================================
    //  СУДОКУ
    // ============================================================
    const SD_DIFFICULTIES = {
        easy:   { cellsToRemove: 35, label: 'Лёгкий' },
        medium: { cellsToRemove: 45, label: 'Средний' },
        hard:   { cellsToRemove: 52, label: 'Сложный' },
        expert: { cellsToRemove: 58, label: 'Эксперт' },
    };

    const sdState = {
        difficulty: 'easy',
        solution: [],
        puzzle: [],
        given: [],
        selected: null,
        errors: 0,
        hints: 0,
        finished: false,
        startTime: 0,
        timer: null,
        elapsed: 0,
        generating: false,
    };

    const sdBoardEl = win.querySelector('#sdBoard');
    const sdKeypadEl = win.querySelector('#sdKeypad');
    const sdTimeEl = win.querySelector('#sdTime');
    const sdErrorsEl = win.querySelector('#sdErrors');
    const sdBestEl = win.querySelector('#sdBest');
    const sdDifficultyEl = win.querySelector('#sdDifficulty');
    const sdOverlay = win.querySelector('#sdOverlay');

    // ---------- Генерация судоку ----------
    function sdGenerateSolution() {
        const grid = Array.from({ length: 9 }, () => new Array(9).fill(0));

        function isValid(grid, row, col, num) {
            for (let i = 0; i < 9; i++) {
                if (grid[row][i] === num) return false;
                if (grid[i][col] === num) return false;
            }
            const br = Math.floor(row / 3) * 3;
            const bc = Math.floor(col / 3) * 3;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (grid[br + r][bc + c] === num) return false;
                }
            }
            return true;
        }

        function fill(grid) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                        for (const num of nums) {
                            if (isValid(grid, row, col, num)) {
                                grid[row][col] = num;
                                if (fill(grid)) return true;
                                grid[row][col] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }

        fill(grid);
        return grid;
    }

    function sdCountSolutions(grid, limit = 2) {
        let count = 0;

        function isValid(grid, row, col, num) {
            for (let i = 0; i < 9; i++) {
                if (grid[row][i] === num) return false;
                if (grid[i][col] === num) return false;
            }
            const br = Math.floor(row / 3) * 3;
            const bc = Math.floor(col / 3) * 3;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (grid[br + r][bc + c] === num) return false;
                }
            }
            return true;
        }

        function solve(grid) {
            if (count >= limit) return;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isValid(grid, row, col, num)) {
                                grid[row][col] = num;
                                solve(grid);
                                grid[row][col] = 0;
                                if (count >= limit) return;
                            }
                        }
                        return;
                    }
                }
            }
            count++;
        }

        solve(grid.map(r => [...r]));
        return count;
    }

    function sdGeneratePuzzle(cellsToRemove) {
        const solution = sdGenerateSolution();
        const puzzle = solution.map(r => [...r]);
        const given = Array.from({ length: 9 }, () => new Array(9).fill(true));

        const positions = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push([r, c]);
            }
        }
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        let removed = 0;
        for (const [r, c] of positions) {
            if (removed >= cellsToRemove) break;

            const backup = puzzle[r][c];
            puzzle[r][c] = 0;

            const copies = puzzle.map(row => [...row]);
            if (sdCountSolutions(copies, 2) !== 1) {
                puzzle[r][c] = backup;
            } else {
                given[r][c] = false;
                removed++;
            }
        }

        return { solution, puzzle, given };
    }

    // ---------- UI ----------
    function sdFormatTime(sec) {
        return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }

    function sdUpdateBestDisplay() {
        const best = localStorage.getItem(`sudokuBest_${sdState.difficulty}`);
        if (best) {
            try {
                const parsed = JSON.parse(best);
                sdBestEl.textContent = sdFormatTime(parsed.time);
            } catch (e) {
                sdBestEl.textContent = '—';
            }
        } else {
            sdBestEl.textContent = '—';
        }
    }

    function sdUpdateHeader() {
        sdTimeEl.textContent = sdFormatTime(sdState.elapsed);
        sdErrorsEl.textContent = sdState.errors;
        sdDifficultyEl.textContent = SD_DIFFICULTIES[sdState.difficulty].label;
    }

    function sdRenderBoard() {
        sdBoardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const value = sdState.puzzle[r][c];
                const cell = document.createElement('button');
                cell.className = 'sudoku-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add('border-right');
                if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add('border-bottom');

                if (sdState.given[r][c]) {
                    cell.classList.add('given');
                    cell.textContent = value;
                } else if (value !== 0) {
                    cell.classList.add('user');
                    cell.textContent = value;

                    if (value !== sdState.solution[r][c]) {
                        cell.classList.add('wrong');
                    }
                }

                cell.addEventListener('click', () => sdSelectCell(r, c));
                sdBoardEl.appendChild(cell);
            }
        }

        sdApplyHighlights();
    }

    function sdApplyHighlights() {
        const cells = sdBoardEl.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => cell.classList.remove('selected', 'highlighted', 'highlighted-same'));

        if (sdState.selected === null) return;

        const { r, c } = sdState.selected;
        const selectedValue = sdState.puzzle[r][c];

        cells.forEach(cell => {
            const cr = parseInt(cell.dataset.r);
            const cc = parseInt(cell.dataset.c);

            const sameRow = cr === r;
            const sameCol = cc === c;
            const sameBlock = Math.floor(cr / 3) === Math.floor(r / 3) &&
                              Math.floor(cc / 3) === Math.floor(c / 3);

            if (cr === r && cc === c) {
                cell.classList.add('selected');
            } else if (sameRow || sameCol || sameBlock) {
                cell.classList.add('highlighted');
            }

            if (selectedValue !== 0 && sdState.puzzle[cr][cc] === selectedValue) {
                cell.classList.add('highlighted-same');
            }
        });
    }

    function sdUpdateKeypad() {
        const counts = new Array(10).fill(0);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const v = sdState.puzzle[r][c];
                if (v !== 0 && v === sdState.solution[r][c]) {
                    counts[v]++;
                }
            }
        }

        sdKeypadEl.querySelectorAll('.sudoku-key').forEach(key => {
            const num = parseInt(key.dataset.num);
            const count = counts[num];
            const isEmpty = count >= 9;
            key.classList.toggle('depleted', isEmpty);
            key.disabled = isEmpty;

            let badge = key.querySelector('.key-count');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'key-count';
                key.appendChild(badge);
            }
            badge.textContent = count < 9 ? String(9 - count) : '';
        });
    }

    // ---------- Игровая логика ----------
    function sdSelectCell(r, c) {
        if (sdState.finished || sdState.generating) return;
        if (sdState.given[r][c]) return;

        if (sdState.selected && sdState.selected.r === r && sdState.selected.c === c) {
            sdState.selected = null;
        } else {
            sdState.selected = { r, c };
        }
        sdApplyHighlights();
    }

    function sdInputNumber(num) {
        if (sdState.finished || sdState.generating) return;
        if (!sdState.selected) return;

        const { r, c } = sdState.selected;
        if (sdState.given[r][c]) return;

        const prev = sdState.puzzle[r][c];

        if (prev === num) {
            sdState.puzzle[r][c] = 0;
        } else {
            sdState.puzzle[r][c] = num;

            if (num !== sdState.solution[r][c]) {
                sdState.errors++;
                if (window.showNotification && sdState.errors % 3 === 0) {
                    window.showNotification({
                        title: 'Ошибки',
                        message: `Уже ${sdState.errors} ошибок`,
                        type: 'warning',
                        icon: '⚠️',
                        duration: 2000,
                    });
                }
            }
        }

        sdRenderBoard();
        sdUpdateHeader();
        sdUpdateKeypad();
        sdCheckWin();
    }

    function sdErase() {
        if (sdState.finished || sdState.generating) return;
        if (!sdState.selected) return;

        const { r, c } = sdState.selected;
        if (sdState.given[r][c]) return;

        sdState.puzzle[r][c] = 0;
        sdRenderBoard();
        sdUpdateKeypad();
    }

    function sdHint() {
        if (sdState.finished || sdState.generating) return;

        const candidates = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!sdState.given[r][c] && sdState.puzzle[r][c] !== sdState.solution[r][c]) {
                    candidates.push([r, c]);
                }
            }
        }

        if (candidates.length === 0) {
            if (window.showNotification) {
                window.showNotification({
                    title: 'Подсказка',
                    message: 'Нечего подсказывать — всё верно!',
                    type: 'info',
                    icon: '💡',
                    duration: 2500,
                });
            }
            return;
        }

        const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
        const wasEmpty = sdState.puzzle[r][c] === 0;

        sdState.puzzle[r][c] = sdState.solution[r][c];
        sdState.hints++;

        if (!wasEmpty) {
            sdState.errors = Math.max(0, sdState.errors - 1);
        }

        sdState.selected = { r, c };
        sdRenderBoard();
        sdUpdateHeader();
        sdUpdateKeypad();
        sdCheckWin();

        if (window.showNotification) {
            window.showNotification({
                title: 'Подсказка',
                message: `Строка ${r + 1}, столбец ${c + 1}: ${sdState.solution[r][c]}`,
                type: 'info',
                icon: '💡',
                duration: 2500,
            });
        }
    }

    function sdCheckWin() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (sdState.puzzle[r][c] !== sdState.solution[r][c]) return;
            }
        }
        sdWin();
    }

    function sdWin() {
        sdState.finished = true;
        if (sdState.timer) clearInterval(sdState.timer);

        const time = sdState.elapsed;
        const cleanRun = sdState.errors === 0 && sdState.hints === 0;
        const bestKey = `sudokuBest_${sdState.difficulty}`;
        const bestRaw = localStorage.getItem(bestKey);
        let best = null;
        try { best = bestRaw ? JSON.parse(bestRaw) : null; } catch (e) {}

        const isRecord = cleanRun && (!best || time < best.time);

        if (isRecord) {
            localStorage.setItem(bestKey, JSON.stringify({ time, errors: 0, hints: 0 }));
            sdUpdateBestDisplay();
        }

        ghAdd({
            game: 'sudoku',
            label: `${SD_DIFFICULTIES[sdState.difficulty].label} · ${sdFormatTime(time)}`,
            result: cleanRun ? 'Идеально' : 'Решено',
            record: isRecord,
            time: time,
        });

        let msg = `Время: <strong>${sdFormatTime(time)}</strong>`;
        if (sdState.hints > 0) msg += ` · Подсказок: ${sdState.hints}`;
        if (sdState.errors > 0) msg += ` · Ошибок: ${sdState.errors}`;
        if (cleanRun) msg += ' · ✨ Идеально!';

        win.querySelector('#sdResultMessage').innerHTML = msg;
        win.querySelector('#sdRecordBadge').style.display = isRecord ? 'inline-flex' : 'none';
        sdOverlay.classList.add('show');

        if (isRecord && window.showNotification) {
            window.showNotification({
                title: '🏆 Новый рекорд!',
                message: `Судоку (${SD_DIFFICULTIES[sdState.difficulty].label}): ${sdFormatTime(time)}`,
                type: 'success',
                icon: '🧩',
                duration: 4000,
            });
        }

        if (historyVisible) renderHistory();
    }

    function sdStartTimer() {
        sdState.startTime = Date.now();
        if (sdState.timer) clearInterval(sdState.timer);
        sdState.timer = setInterval(() => {
            sdState.elapsed = Math.floor((Date.now() - sdState.startTime) / 1000);
            sdUpdateHeader();
        }, 1000);
    }

    function sdNewGame() {
        if (sdState.generating) return;
        sdState.generating = true;

        const cfg = SD_DIFFICULTIES[sdState.difficulty];

        sdState.finished = false;
        sdState.selected = null;
        sdState.errors = 0;
        sdState.hints = 0;
        sdState.elapsed = 0;

        if (sdState.timer) clearInterval(sdState.timer);
        sdState.timer = null;

        sdBoardEl.innerHTML = '';
        const loading = document.createElement('div');
        loading.style.gridColumn = '1 / -1';
        loading.style.display = 'flex';
        loading.style.alignItems = 'center';
        loading.style.justifyContent = 'center';
        loading.style.fontSize = '14px';
        loading.style.color = 'var(--popup-text-muted)';
        loading.style.padding = '40px 0';
        loading.textContent = '⏳ Генерация судоку...';
        sdBoardEl.appendChild(loading);

        sdKeypadEl.querySelectorAll('.sudoku-key').forEach(k => {
            k.disabled = true;
            k.classList.remove('depleted');
        });

        setTimeout(() => {
            const { solution, puzzle, given } = sdGeneratePuzzle(cfg.cellsToRemove);
            sdState.solution = solution;
            sdState.puzzle = puzzle;
            sdState.given = given;
            sdState.generating = false;

            sdRenderBoard();
            sdUpdateHeader();
            sdUpdateKeypad();
            sdUpdateBestDisplay();
            sdOverlay.classList.remove('show');

            sdStartTimer();
        }, 60);
    }

    // ---------- Обработчики Судоку ----------
    win.querySelector('#sdNewBtn').addEventListener('click', sdNewGame);
    win.querySelector('#sdRetryBtn').addEventListener('click', sdNewGame);
    win.querySelector('#sdCloseBtn').addEventListener('click', () => sdOverlay.classList.remove('show'));
    win.querySelector('#sdEraseBtn').addEventListener('click', sdErase);
    win.querySelector('#sdHintBtn').addEventListener('click', sdHint);

    win.querySelectorAll('[data-sdiff]').forEach(btn => {
        btn.addEventListener('click', () => {
            win.querySelectorAll('[data-sdiff]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sdState.difficulty = btn.dataset.sdiff;
            sdUpdateBestDisplay();
            sdNewGame();
        });
    });

    sdKeypadEl.querySelectorAll('.sudoku-key').forEach(key => {
        key.addEventListener('click', () => {
            const num = parseInt(key.dataset.num);
            sdInputNumber(num);
        });
    });

    function sdKeyHandler(e) {
        if (!win.classList.contains('focused')) return;
        if (currentGame !== 'sudoku') return;
        if (sdState.generating) return;

        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            sdInputNumber(parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            sdErase();
        } else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            if (sdState.selected === null) {
                sdState.selected = { r: 0, c: 0 };
            } else {
                let { r, c } = sdState.selected;
                if (e.key === 'ArrowUp') r = (r + 8) % 9;
                if (e.key === 'ArrowDown') r = (r + 1) % 9;
                if (e.key === 'ArrowLeft') c = (c + 8) % 9;
                if (e.key === 'ArrowRight') c = (c + 1) % 9;
                sdState.selected = { r, c };
            }
            sdApplyHighlights();
        }
    }
    document.addEventListener('keydown', sdKeyHandler);

    // Стартовая игра Судоку
    sdNewGame();

    // ============================================================
    //  Очистка при закрытии
    // ============================================================
    win.querySelector('.close').addEventListener('click', () => {
        if (msState.timer) clearInterval(msState.timer);
        if (pzState.timer) clearInterval(pzState.timer);
        if (sdState.timer) clearInterval(sdState.timer);
        document.removeEventListener('keydown', sdKeyHandler);
    });

    // Стартовая отрисовка истории
    renderHistory();
}
