// ============================================================
//  ОКОННЫЙ МЕНЕДЖЕР macOS
// ============================================================

let zIndexCounter = 100;

// Определяем мобильное устройство
function isMobileDevice() {
    return window.matchMedia('(max-width: 768px)').matches;
}

// ---------- Создание окна ----------
function createWindow({ title = 'Окно', width = 600, height = 400, content = '' } = {}) {
    const win = document.createElement('div');
    win.className = 'window focused';

    const mobile = isMobileDevice();

    if (mobile) {
        win.style.left = '0';
        win.style.top = '0';
        win.style.width = '100vw';
        win.style.height = 'calc(100vh - 52px)';
    } else {
        const offset = (document.querySelectorAll('.window').length * 30) % 200;
        const x = 100 + offset;
        const y = 80 + offset;

        win.style.left = x + 'px';
        win.style.top = y + 'px';
        win.style.width = width + 'px';
        win.style.height = height + 'px';
    }

    win.style.zIndex = ++zIndexCounter;

    win.innerHTML = `
        <div class="window-header">
            <div class="window-controls">
                <button class="window-btn close"></button>
                <button class="window-btn minimize"></button>
                <button class="window-btn maximize"></button>
            </div>
            <div class="window-title">${title}</div>
        </div>
        <div class="window-body">${content}</div>
        <div class="resizer n"></div>
        <div class="resizer s"></div>
        <div class="resizer e"></div>
        <div class="resizer w"></div>
        <div class="resizer ne"></div>
        <div class="resizer nw"></div>
        <div class="resizer se"></div>
        <div class="resizer sw"></div>
    `;

    document.getElementById('desktop').appendChild(win);

    // Фокус — и мышь, и тач
    win.addEventListener('mousedown', () => focusWindow(win));
    win.addEventListener('touchstart', () => focusWindow(win), { passive: true });

    win.querySelector('.close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeWindow(win);
    });
    win.querySelector('.minimize').addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeWindow(win);
    });
    win.querySelector('.maximize').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMaximize(win);
    });

    makeDraggable(win);
    makeResizable(win);

    focusWindow(win);
    return win;
}

// ---------- Фокус ----------
function focusWindow(win) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    win.classList.add('focused');
    win.style.zIndex = ++zIndexCounter;
}

// ---------- Закрытие ----------
function closeWindow(win) {
    win.classList.add('closing');
    setTimeout(() => {
        const app = win.dataset.app;
        win.remove();
        if (app) {
            const stillOpen = [...document.querySelectorAll('.window')].some(
                w => w.dataset.app === app
            );
            if (!stillOpen) {
                const btn = document.querySelector(`.app-btn[data-app="${app}"]`);
                if (btn) btn.classList.remove('running');
            }
        }
    }, 200);
}

// ---------- Сворачивание ----------
function minimizeWindow(win) {
    win.classList.add('minimized');
}

// ---------- Разворачивание ----------
function toggleMaximize(win) {
    if (isMobileDevice()) return; // на мобильном окно и так на весь экран

    if (win.dataset.maximized === 'true') {
        Object.assign(win.style, {
            left: win.dataset.oldLeft,
            top: win.dataset.oldTop,
            width: win.dataset.oldWidth,
            height: win.dataset.oldHeight,
        });
        win.classList.remove('maximized');
        win.dataset.maximized = 'false';

        void win.offsetWidth;
        void win.offsetHeight;
        window.dispatchEvent(new Event('resize'));
    } else {
        win.dataset.oldLeft = win.style.left;
        win.dataset.oldTop = win.style.top;
        win.dataset.oldWidth = win.style.width;
        win.dataset.oldHeight = win.style.height;

        Object.assign(win.style, {
            left: '0px',
            top: '0px',
            width: '100%',
            height: '100%',
        });
        win.classList.add('maximized');
        win.dataset.maximized = 'true';

        void win.offsetWidth;
        void win.offsetHeight;
        window.dispatchEvent(new Event('resize'));
    }
}

// ---------- Перетаскивание (мышь + тач) ----------
function makeDraggable(win) {
    const header = win.querySelector('.window-header');
    let startX, startY, startLeft, startTop, dragging = false;

    function onStart(clientX, clientY, e) {
        if (e.target.closest('.window-controls')) return;
        if (isMobileDevice()) return; // на мобильном окно на весь экран — drag не нужен

        dragging = true;
        startX = clientX;
        startY = clientY;
        startLeft = win.offsetLeft;
        startTop = win.offsetTop;

        document.body.style.cursor = 'grabbing';
        if (e.cancelable) e.preventDefault();
    }

    function onMove(clientX, clientY) {
        if (!dragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const maxLeft = window.innerWidth - 60;
        const maxTop = window.innerHeight - 60;

        newLeft = Math.max(-win.offsetWidth + 60, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        win.style.left = newLeft + 'px';
        win.style.top = newTop + 'px';
    }

    function onEnd() {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = '';
        }
    }

    // Мышь
    header.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY, e));
    document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', onEnd);

    // Тач
    header.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        onStart(t.clientX, t.clientY, e);
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!dragging || e.touches.length !== 1) return;
        const t = e.touches[0];
        onMove(t.clientX, t.clientY);
        if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
}

// ---------- Изменение размера (только мышь) ----------
function makeResizable(win) {
    const MIN_W = 320;
    const MIN_H = 200;

    // На мобильных ресайз отключён
    if (isMobileDevice()) return;

    win.querySelectorAll('.resizer').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const dir = handle.classList[1];
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = win.offsetWidth;
            const startH = win.offsetHeight;
            const startL = win.offsetLeft;
            const startT = win.offsetTop;

            function onMove(ev) {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;

                let w = startW, h = startH, l = startL, t = startT;

                if (dir.includes('e')) w = Math.max(MIN_W, startW + dx);
                if (dir.includes('s')) h = Math.max(MIN_H, startH + dy);
                if (dir.includes('w')) {
                    w = Math.max(MIN_W, startW - dx);
                    l = startL + (startW - w);
                }
                if (dir.includes('n')) {
                    h = Math.max(MIN_H, startH - dy);
                    t = startT + (startH - h);
                }

                win.style.width = w + 'px';
                win.style.height = h + 'px';
                win.style.left = l + 'px';
                win.style.top = t + 'px';
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}
