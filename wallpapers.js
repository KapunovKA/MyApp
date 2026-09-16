// ============================================================
//  ОБОИ РАБОЧЕГО СТОЛА + АВТОСМЕНА ПОД ТЕМУ СИСТЕМЫ
// ============================================================

const WALLPAPERS = [
    {
        id: 'default-light',
        name: 'Рассвет',
        theme: 'light',
        value: 'linear-gradient(135deg, #a8c0ff 0%, #d4a5e8 50%, #f5b8c8 100%)',
    },
    {
        id: 'default-dark',
        name: 'Океан',
        theme: 'dark',
        value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e57c2 100%)',
    },
    {
        id: 'sunset',
        name: 'Закат',
        theme: 'light',
        value: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 50%, #a044ff 100%)',
    },
    {
        id: 'mint',
        name: 'Мята',
        theme: 'light',
        value: 'linear-gradient(135deg, #a8e6cf 0%, #7dd3c0 50%, #4db6ac 100%)',
    },
    {
        id: 'mono',
        name: 'Графит',
        theme: 'dark',
        value: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    },
    {
        id: 'big-sur',
        name: 'Big Sur',
        theme: 'dark',
        value: 'linear-gradient(180deg, #0f2027 0%, #203a43 40%, #2c5364 70%, #4a7bc4 100%)',
    },
    {
        id: 'monterey',
        name: 'Monterey',
        theme: 'dark',
        value: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
    },
    {
        id: 'ventura',
        name: 'Ventura',
        theme: 'light',
        value: 'linear-gradient(135deg, #ff512f 0%, #dd2476 50%, #8e2de2 100%)',
    },
    {
        id: 'sonoma',
        name: 'Sonoma',
        theme: 'light',
        value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 50%, #f5b8c8 100%)',
    },
];

const WALLPAPER_STORAGE_KEY = 'desktopWallpaperId';
const WALLPAPER_MANUAL_KEY = 'desktopWallpaperManual'; // '1' — пользователь выбрал вручную

// ------------------------------------------------------------
//  Получить текущие обои
// ------------------------------------------------------------
function getCurrentWallpaperId() {
    return localStorage.getItem(WALLPAPER_STORAGE_KEY) || null;
}

function isWallpaperManual() {
    return localStorage.getItem(WALLPAPER_MANUAL_KEY) === '1';
}

function setWallpaperManual(isManual) {
    if (isManual) {
        localStorage.setItem(WALLPAPER_MANUAL_KEY, '1');
    } else {
        localStorage.removeItem(WALLPAPER_MANUAL_KEY);
    }
}

function getWallpaperById(id) {
    return WALLPAPERS.find(w => w.id === id) || null;
}

function applyWallpaper(id) {
    const wp = getWallpaperById(id);
    if (!wp) return false;

    const desktop = document.getElementById('desktop');
    if (!desktop) return false;

    desktop.style.background = wp.value;
    localStorage.setItem(WALLPAPER_STORAGE_KEY, id);
    return true;
}

/**
 * Обои по умолчанию для текущей темы системы
 */
function getDefaultWallpaperId() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'default-dark' : 'default-light';
}

/**
 * Применить обои при смене системной темы.
 * Работает ТОЛЬКО если пользователь не выбирал вручную.
 */
function handleSystemThemeChange(e) {
    if (isWallpaperManual()) return;

    const targetId = e.matches ? 'default-dark' : 'default-light';
    applyWallpaper(targetId);

    // Уведомить пользователя
    if (window.showNotification) {
        window.showNotification({
            title: 'Обои обновлены',
            message: `Системная тема: ${e.matches ? 'тёмная' : 'светлая'}`,
            type: 'info',
            icon: '🖼️',
            duration: 2500,
        });
    }
}

/**
 * Установить обои вручную (из Settings)
 */
function setWallpaperManually(id) {
    const result = applyWallpaper(id);
    if (result) {
        setWallpaperManual(true);
    }
    return result;
}

/**
 * Сбросить ручной выбор — вернуться к авто-режиму
 */
function resetWallpaperToAuto() {
    setWallpaperManual(false);
    applyWallpaper(getDefaultWallpaperId());
}

/**
 * Инициализация
 */
function initWallpaper() {
    let savedId = getCurrentWallpaperId();

    // Если сохранённых нет ИЛИ ручного выбора нет — берём под тему
    if (!savedId || !getWallpaperById(savedId) || !isWallpaperManual()) {
        savedId = getDefaultWallpaperId();
    }

    applyWallpaper(savedId);

    // Слушаем смену системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange);
}

window.addEventListener('load', initWallpaper);
