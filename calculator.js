// ============================================================
//  КАЛЬКУЛЯТОР в стиле macOS (фиксированный размер)
// ============================================================

function createCalculatorApp() {
    const html = `
        <div class="calculator">
            <div class="calc-display">0</div>
            <div class="calc-grid">
                <button class="calc-btn func" data-action="clear">AC</button>
                <button class="calc-btn func" data-action="sign">+/−</button>
                <button class="calc-btn func" data-action="percent">%</button>
                <button class="calc-btn operator" data-op="/">÷</button>

                <button class="calc-btn number" data-num="7">7</button>
                <button class="calc-btn number" data-num="8">8</button>
                <button class="calc-btn number" data-num="9">9</button>
                <button class="calc-btn operator" data-op="*">×</button>

                <button class="calc-btn number" data-num="4">4</button>
                <button class="calc-btn number" data-num="5">5</button>
                <button class="calc-btn number" data-num="6">6</button>
                <button class="calc-btn operator" data-op="-">−</button>

                <button class="calc-btn number" data-num="1">1</button>
                <button class="calc-btn number" data-num="2">2</button>
                <button class="calc-btn number" data-num="3">3</button>
                <button class="calc-btn operator" data-op="+">+</button>

                <button class="calc-btn number zero" data-num="0">0</button>
                <button class="calc-btn number" data-num=".">,</button>
                <button class="calc-btn operator" data-action="equals">=</button>
            </div>
        </div>
    `;

    const win = createWindow({
        title: 'Calculator',
        width: 300,
        height: 500,
        content: html,
    });
    win.dataset.app = 'calculator';

    // 🔒 Фиксируем размер окна калькулятора — убираем ручки ресайза
    win.querySelectorAll('.resizer').forEach(r => r.remove());
    win.style.minWidth = '300px';
    win.style.maxWidth = '300px';
    win.style.minHeight = '500px';
    win.style.maxHeight = '500px';

    const body = win.querySelector('.window-body');
    body.style.padding = '0';
    body.style.overflow = 'hidden';

    initCalculator(win);
    return win;
}

// ------------------------------------------------------------
//  Логика калькулятора
// ------------------------------------------------------------
function initCalculator(win) {
    const display = win.querySelector('.calc-display');
    const buttons = win.querySelectorAll('.calc-btn');

    let current = '0';
    let previous = null;
    let operator = null;
    let waitingForNew = false;

    const MAX_DIGITS = 9;

    function updateDisplay() {
        let text = current;

        if (text === 'Ошибка') {
            display.textContent = text;
            display.style.fontSize = '42px';
            return;
        }

        if (text.includes('.')) {
            const [int, dec] = text.split('.');
            const intFmt = Number(int).toLocaleString('ru-RU');
            text = intFmt + ',' + dec;
        } else {
            text = Number(text).toLocaleString('ru-RU');
        }

        display.textContent = text;
        const len = text.length;
        if (len > 9) display.style.fontSize = '34px';
        else if (len > 7) display.style.fontSize = '42px';
        else display.style.fontSize = '56px';
    }

    function inputDigit(d) {
        if (current === 'Ошибка') current = '0';

        if (waitingForNew) {
            current = d;
            waitingForNew = false;
        } else {
            if (current.replace('-', '').replace('.', '').length >= MAX_DIGITS) return;
            current = current === '0' ? d : current + d;
        }
        updateDisplay();
    }

    function inputDot() {
        if (current === 'Ошибка') current = '0';

        if (waitingForNew) {
            current = '0.';
            waitingForNew = false;
            return updateDisplay();
        }
        if (!current.includes('.')) {
            current += '.';
            updateDisplay();
        }
    }

    function chooseOperator(op) {
        win.querySelectorAll('.operator').forEach(b => b.classList.remove('active'));

        if (operator && !waitingForNew) {
            const result = calculate(previous, current, operator);
            previous = result;
            current = result;
            updateDisplay();
        } else {
            previous = current;
        }

        operator = op;
        waitingForNew = true;

        const activeBtn = win.querySelector(`[data-op="${op}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    function calculate(a, b, op) {
        const A = parseFloat(a);
        const B = parseFloat(b);
        let r;
        switch (op) {
            case '+': r = A + B; break;
            case '-': r = A - B; break;
            case '*': r = A * B; break;
            case '/':
                if (B === 0) return 'Ошибка';
                r = A / B;
                break;
            default: return b;
        }
        if (!isFinite(r)) return 'Ошибка';
        return String(parseFloat(r.toFixed(10)));
    }

    function equals() {
        if (!operator) return;
        const result = calculate(previous, current, operator);
        current = result;
        previous = null;
        operator = null;
        waitingForNew = true;
        win.querySelectorAll('.operator').forEach(b => b.classList.remove('active'));
        updateDisplay();
    }

    function clearAll() {
        current = '0';
        previous = null;
        operator = null;
        waitingForNew = false;
        win.querySelectorAll('.operator').forEach(b => b.classList.remove('active'));
        updateDisplay();
    }

    function toggleSign() {
        if (current === '0' || current === 'Ошибка') return;
        current = current.startsWith('-') ? current.slice(1) : '-' + current;
        updateDisplay();
    }

    function percent() {
        if (current === 'Ошибка') return;
        if (previous !== null && (operator === '+' || operator === '-')) {
            current = String(parseFloat(previous) * parseFloat(current) / 100);
        } else {
            current = String(parseFloat(current) / 100);
        }
        updateDisplay();
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.blur();

            if (btn.dataset.num !== undefined) {
                if (btn.dataset.num === '.') inputDot();
                else inputDigit(btn.dataset.num);
                return;
            }
            if (btn.dataset.op) {
                chooseOperator(btn.dataset.op);
                return;
            }
            const action = btn.dataset.action;
            if (action === 'clear') clearAll();
            else if (action === 'sign') toggleSign();
            else if (action === 'percent') percent();
            else if (action === 'equals') equals();
        });
    });

    function onKey(e) {
        if (!win.classList.contains('focused')) return;

        const k = e.key;
        if (/^[0-9]$/.test(k)) inputDigit(k);
        else if (k === '.' || k === ',') inputDot();
        else if (k === '+') chooseOperator('+');
        else if (k === '-') chooseOperator('-');
        else if (k === '*') chooseOperator('*');
        else if (k === '/') { e.preventDefault(); chooseOperator('/'); }
        else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
        else if (k === 'Escape') clearAll();
        else if (k === 'Backspace') {
            if (waitingForNew || current === 'Ошибка') return;
            current = current.length > 1 ? current.slice(0, -1) : '0';
            if (current === '-' || current === '') current = '0';
            updateDisplay();
        }
        else if (k === '%') percent();
    }

    document.addEventListener('keydown', onKey);

    win.querySelector('.close').addEventListener('click', () => {
        document.removeEventListener('keydown', onKey);
    });

    updateDisplay();
}
