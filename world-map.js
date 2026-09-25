// ============================================================
//  ЖИВАЯ ЗАСТАВКА: КАРТА МИРА ИЗ ТОЧЕК (в стиле Apple Watch)
//  + день/ночь, терминатор, города, часы, погода (Open-Meteo)
//  + адаптация под мобильные (обрезка по долготе)
//  + панель погоды показывает только города с visible !== false
//  + читаемые подписи городов (белая обводка)
// ============================================================

(function initWorldMap() {
    'use strict';

    let canvas, ctx, W, H;
    let animationId = null;
    let lastFrame = 0;
    let clockPanel = null;

    let isMapVisible = true;
    let weatherData = {};
    let weatherTimer = null;
    const WEATHER_CACHE_TTL = 10 * 60 * 1000;

    // --------------------------------------------------------
    //  ГОРОДА — сохраняются в localStorage
    // --------------------------------------------------------
    const CITIES_STORAGE_KEY = 'worldMapCities';

    const DEFAULT_CITIES = [
        { name: 'Москва',       lat: 55.75, lon: 37.62,  tz: 3,  my: true,  visible: true },
        { name: 'Лондон',       lat: 51.51, lon: -0.13,  tz: 0,  my: false, visible: true },
        { name: 'Нью-Йорк',     lat: 40.71, lon: -74.01, tz: -5, my: false, visible: true },
        { name: 'Лос-Анджелес', lat: 34.05, lon: -118.24, tz: -8, my: false, visible: true },
        { name: 'Токио',        lat: 35.68, lon: 139.69, tz: 9,  my: false, visible: true },
        { name: 'Сидней',       lat: -33.87, lon: 151.21, tz: 10, my: false, visible: true },
        { name: 'Дубай',        lat: 25.20, lon: 55.27,  tz: 4,  my: false, visible: true },
        { name: 'Сан-Паулу',    lat: -23.55, lon: -46.63, tz: -3, my: false, visible: true },
    ];

    let CITIES = loadCities();

    function loadCities() {
        try {
            const saved = localStorage.getItem(CITIES_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(c => ({
                        ...c,
                        visible: c.visible !== false
                    }));
                }
            }
        } catch (e) {}
        return JSON.parse(JSON.stringify(DEFAULT_CITIES));
    }

    function saveCities(cities) {
        try {
            localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(cities));
        } catch (e) {}
    }

    function getCitiesList() {
        return JSON.parse(JSON.stringify(CITIES));
    }

    function setCitiesList(cities) {
        CITIES = Array.isArray(cities) ? cities.map(c => ({
            ...c,
            visible: c.visible !== false
        })) : [];
        saveCities(CITIES);
        rebuildClockPanel();

        Object.keys(weatherData).forEach(name => {
            if (!CITIES.find(c => c.name === name)) delete weatherData[name];
        });

        renderAllWeather();
    }

    window.getCitiesList = getCitiesList;
    window.setCitiesList = setCitiesList;

    // --------------------------------------------------------
    //  ПОЛИГОНЫ КОНТИНЕНТОВ
    // --------------------------------------------------------
    const CONTINENT_POLYGONS = [
        // ─── СЕВЕРНАЯ АМЕРИКА ───
        [
            [-168,65],[-166,62],[-164,60],[-161,59],[-158,57],[-155,58],[-152,58],[-150,60],
            [-148,60],[-145,60],[-142,60],[-140,60],[-137,59],[-134,56],[-131,53],[-128,52],
            [-126,50],[-124,48],[-124,45],[-124,42],[-122,38],[-120,35],[-118,34],[-116,32],
            [-114,30],[-112,27],[-110,24],[-108,23],[-106,22],[-104,20],[-100,19],[-98,18],
            [-96,17],[-94,16],[-92,15],[-89,16],[-87,15],[-84,11],[-82,9],[-80,8],
            [-79,9],[-81,12],[-83,14],[-86,15],[-88,17],[-90,20],[-94,22],[-97,26],
            [-97,29],[-94,30],[-91,29],[-88,30],[-85,30],[-83,28],[-81,26],[-80,25],
            [-81,28],[-79,32],[-77,35],[-75,37],[-73,40],[-71,42],[-68,44],[-66,45],
            [-64,46],[-62,48],[-60,49],[-58,50],[-56,52],[-58,55],[-60,58],[-64,60],
            [-66,62],[-68,64],[-70,66],[-73,67],[-76,68],[-80,70],[-85,71],[-90,72],
            [-95,72],[-100,72],[-105,72],[-110,72],[-115,71],[-120,70],[-125,70],[-130,70],
            [-135,70],[-140,70],[-145,70],[-150,71],[-155,71],[-160,70],[-165,69],[-168,67],
            [-168,65]
        ],
        // ─── ГРЕНЛАНДИЯ ───
        [
            [-73,78],[-70,79],[-67,80],[-63,81],[-58,82],[-52,82],[-48,83],[-42,83],
            [-37,83],[-32,82],[-28,81],[-25,80],[-23,78],[-21,76],[-20,74],[-22,72],
            [-24,70],[-27,69],[-30,68],[-34,67],[-38,65],[-41,62],[-44,60],[-47,59],
            [-50,60],[-52,62],[-55,64],[-58,66],[-61,68],[-64,70],[-67,72],[-70,74],
            [-73,78]
        ],
        // ─── ЮЖНАЯ АМЕРИКА ───
        [
            [-81,-4],[-80,-2],[-79,1],[-78,4],[-77,7],[-75,10],[-73,11],[-71,12],
            [-68,12],[-65,11],[-63,11],[-61,10],[-60,7],[-59,4],[-56,3],[-53,4],
            [-51,2],[-50,-1],[-48,-2],[-46,-2],[-44,-2],[-42,-3],[-40,-4],[-38,-5],
            [-36,-6],[-35,-8],[-37,-10],[-38,-12],[-39,-15],[-40,-18],[-42,-22],[-44,-23],
            [-46,-24],[-48,-25],[-50,-28],[-52,-31],[-54,-33],[-57,-35],[-59,-37],[-61,-39],
            [-63,-42],[-65,-45],[-67,-48],[-68,-50],[-69,-52],[-70,-54],[-72,-54],[-74,-52],
            [-75,-50],[-74,-47],[-74,-44],[-73,-41],[-73,-38],[-72,-35],[-71,-32],[-71,-29],
            [-71,-26],[-71,-23],[-71,-20],[-71,-18],[-73,-16],[-75,-15],[-76,-14],[-78,-12],
            [-79,-10],[-80,-8],[-80,-6],[-81,-4]
        ],
        // ─── ЕВРАЗИЯ ───
        [
            [-9,43],[-8,44],[-7,44],[-5,44],[-3,43],[-1,43],[0,43],[2,43],
            [1,46],[-1,46],[-3,48],[-5,48],[-1,49],[0,50],
            [2,51],[4,52],[6,53],[8,54],[10,54],[12,54],
            [14,54],[16,54],[18,55],[20,55],[22,56],
            [24,58],[26,59],[28,60],[30,60],[28,62],[26,64],[25,66],[24,68],[26,69],
            [30,70],[35,70],[40,70],[45,68],[50,69],[55,70],[60,70],[65,71],
            [70,72],[75,72],[80,74],[85,75],[90,76],[95,77],[100,77],[105,77],
            [110,76],[115,75],[120,74],[125,73],[130,73],[135,72],[140,73],
            [145,72],[150,71],[155,70],[160,70],[165,69],[170,68],[175,67],
            [180,66],[180,64],[178,63],[175,62],[172,61],[170,60],
            [168,58],[165,56],[162,55],[160,54],[158,52],[156,51],[155,50],
            [150,48],[147,47],[145,46],[143,45],[140,44],
            [141,42],[140,40],[139,37],[138,35],[136,34],[134,34],[132,33],
            [129,34],[127,34],[126,35],[125,37],[124,38],[122,38],
            [120,36],[118,34],[116,32],[114,30],[112,28],
            [110,22],[108,20],[106,18],[105,15],[107,12],[109,10],
            [106,8],[104,6],[102,6],[100,8],[98,10],[96,12],[94,14],[92,16],
            [90,22],[88,22],[86,20],[84,18],[82,16],[80,14],
            [78,10],[77,8],[75,10],[73,15],[72,18],[70,22],
            [68,24],[66,26],[62,27],[58,26],[56,25],[52,27],
            [50,27],[48,29],[50,25],[54,24],[56,22],[58,18],[56,14],[54,12],
            [50,12],[48,14],[44,12],[42,16],[39,21],[37,24],[35,28],
            [34,30],[35,32],[36,36],[32,36],[28,36],[26,38],[25,40],[24,38],
            [22,40],[20,39],[18,40],[16,38],[14,40],[12,44],
            [13,42],[15,40],[17,38],[16,36],[14,38],[12,42],
            [8,44],[3,42],[0,40],[-3,37],[-5,36],[-7,37],
            [-9,38],[-9,40],[-9,43]
        ],
        // ─── АРАВИЙСКИЙ ПОЛУОСТРОВ ───
        [
            [34,28],[36,28],[38,26],[40,24],[43,22],[46,20],[48,18],[50,17],
            [52,17],[55,22],[56,24],[54,24],[52,26],[48,28],[44,30],[42,30],
            [40,30],[38,30],[36,30],[34,28]
        ],
        // ─── ИНДОСТАН ───
        [
            [68,22],[70,22],[72,20],[74,18],[76,14],[77,10],[78,8],[80,10],
            [82,14],[84,16],[86,18],[88,20],[90,22],[88,24],[86,24],[84,24],
            [82,26],[80,26],[78,26],[76,26],[74,24],[72,24],[70,26],[68,24],
            [68,22]
        ],
        // ─── ЮГО-ВОСТОЧНАЯ АЗИЯ ───
        [
            [95,22],[97,22],[99,22],[101,22],[103,22],[105,22],[107,22],[109,20],
            [109,18],[108,16],[107,14],[106,12],[105,10],[104,8],[103,6],[102,4],
            [100,6],[98,8],[96,12],[95,16],[95,20],[95,22]
        ],
        // ─── СУМАТРА ───
        [
            [95,5],[97,5],[100,3],[103,1],[105,-2],[106,-5],[104,-6],[102,-5],
            [100,-3],[98,-1],[96,2],[95,5]
        ],
        // ─── ЯВА ───
        [
            [105,-6],[107,-6],[110,-7],[113,-8],[114,-8],[113,-7],[110,-7],
            [107,-6],[105,-6]
        ],
        // ─── КАЛИМАНТАН ───
        [
            [109,2],[111,2],[114,2],[116,2],[118,4],[118,6],[116,7],[112,7],
            [110,6],[108,4],[109,2]
        ],
        // ─── СУЛАВЕСИ ───
        [
            [119,1],[121,1],[123,2],[125,2],[124,0],[123,-2],[121,-4],[120,-5],
            [119,-3],[118,-1],[119,1]
        ],
        // ─── НОВАЯ ГВИНЕЯ ───
        [
            [131,-1],[134,-1],[138,-1],[141,-2],[145,-5],[148,-8],[150,-10],
            [147,-9],[144,-8],[141,-7],[138,-6],[135,-4],[132,-3],[131,-1]
        ],
        // ─── АФРИКА ───
        [
            [-17,15],[-17,17],[-16,19],[-16,21],[-15,23],[-14,25],[-13,27],[-12,29],
            [-11,31],[-9,33],[-7,34],[-5,35],[-3,36],[-1,36],[1,36],[3,37],
            [5,37],[7,37],[9,37],[11,37],[13,36],[15,34],[17,32],[19,31],
            [21,31],[23,32],[25,32],[27,32],[29,31],[31,31],[33,30],[35,29],
            [36,27],[37,25],[38,23],[39,21],[40,19],[41,17],[42,15],[43,13],
            [44,11],[45,10],[46,9],[47,8],[48,7],[49,6],[50,5],[51,4],
            [51,2],[50,0],[49,-2],[47,-4],[45,-5],[43,-6],[41,-7],[39,-8],
            [37,-10],[35,-12],[34,-14],[33,-16],[32,-18],[31,-20],[30,-22],[29,-25],
            [28,-27],[27,-29],[26,-31],[25,-33],[24,-34],[22,-34],[20,-35],[18,-34],
            [16,-33],[14,-32],[12,-30],[11,-28],[10,-26],[9,-23],[8,-20],[8,-17],
            [8,-14],[7,-11],[7,-8],[6,-5],[5,-2],[4,1],[3,3],[2,5],
            [0,6],[-2,6],[-4,6],[-6,7],[-8,8],[-10,10],[-12,12],[-14,13],
            [-15,14],[-17,15]
        ],
        // ─── МАДАГАСКАР ───
        [
            [50,-13],[50,-15],[50,-17],[49,-19],[48,-21],[47,-23],[46,-25],[45,-25],
            [44,-24],[44,-22],[44,-20],[45,-18],[46,-16],[47,-14],[48,-13],[50,-13]
        ],
        // ─── АВСТРАЛИЯ ───
        [
            [113,-22],[113,-25],[114,-27],[114,-30],[115,-33],[116,-35],[118,-35],[120,-34],
            [122,-34],[124,-33],[126,-32],[128,-32],[130,-32],[132,-32],[134,-32],[136,-34],
            [137,-35],[139,-37],[141,-38],[143,-39],[145,-39],[147,-39],[149,-38],[151,-37],
            [153,-30],[153,-27],[153,-25],[151,-23],[149,-21],[147,-19],[145,-17],[143,-15],
            [141,-13],[139,-12],[137,-12],[135,-12],[133,-11],[131,-11],[129,-13],[127,-14],
            [125,-15],[123,-17],[121,-18],[119,-20],[117,-21],[115,-22],[113,-22]
        ],
        // ─── ТАСМАНИЯ ───
        [
            [145,-41],[147,-41],[148,-42],[148,-44],[146,-45],[144,-44],[144,-42],[145,-41]
        ],
        // ─── НОВАЯ ЗЕЛАНДИЯ ───
        [
            [172,-34],[174,-35],[176,-37],[178,-38],[178,-40],[177,-41],[175,-42],
            [173,-43],[171,-44],[169,-45],[167,-46],[166,-46],[167,-45],[170,-43],
            [172,-41],[173,-39],[173,-37],[172,-35],[172,-34]
        ],
    ];

    // --------------------------------------------------------
    //  Проверка: точка внутри полигона
    // --------------------------------------------------------
    function isPointInPolygon(lon, lat, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function isLand(lon, lat) {
        for (let i = 0; i < CONTINENT_POLYGONS.length; i++) {
            if (isPointInPolygon(lon, lat, CONTINENT_POLYGONS[i])) return true;
        }
        return false;
    }

    // --------------------------------------------------------
    //  Видимый диапазон долгот
    // --------------------------------------------------------
    let VISIBLE_LON_RANGE = { min: -180, max: 180 };

    function updateVisibleRange() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const isPortraitMobile = isMobile && window.innerHeight > window.innerWidth;

        if (isPortraitMobile) {
            VISIBLE_LON_RANGE = { min: -20, max: 145 };
        } else if (isMobile) {
            VISIBLE_LON_RANGE = { min: -60, max: 160 };
        } else {
            VISIBLE_LON_RANGE = { min: -180, max: 180 };
        }
    }

    function project(lon, lat) {
        const range = VISIBLE_LON_RANGE;
        const rangeSize = range.max - range.min;

        return {
            x: (lon - range.min) / rangeSize * W,
            y: (90 - lat) / 180 * H,
        };
    }

    // --------------------------------------------------------
    //  Генерация точек суши
    // --------------------------------------------------------
    let LAND_POINTS = [];
    let landPointsGenerated = false;

    function generateLandPoints() {
        LAND_POINTS = [];

        const cols = Math.min(240, Math.floor(W / 5));
        const rows = Math.floor(cols / 2);

        const range = VISIBLE_LON_RANGE;
        const rangeSize = range.max - range.min;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const lon = range.min + (col + 0.5) / cols * rangeSize;
                const lat = 90 - (row + 0.5) / rows * 180;

                if (isLand(lon, lat)) {
                    LAND_POINTS.push({ lon, lat });
                }
            }
        }

        landPointsGenerated = true;
    }

    // --------------------------------------------------------
    //  Subsolar position
    // --------------------------------------------------------
    function getSolarPosition(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((date - start) / 86400000);
        const declination = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);
        const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        const longitude = (12 - utcHours) * 15;
        return { lat: declination, lon: longitude };
    }

    function isDaylight(lat, lon, sunPos) {
        const latR = lat * Math.PI / 180;
        const lonR = lon * Math.PI / 180;
        const sunLatR = sunPos.lat * Math.PI / 180;
        const sunLonR = sunPos.lon * Math.PI / 180;
        const cosDist =
            Math.sin(latR) * Math.sin(sunLatR) +
            Math.cos(latR) * Math.cos(sunLatR) * Math.cos(lonR - sunLonR);
        return cosDist > 0;
    }

    function getTwilightFactor(lat, lon, sunPos) {
        const latR = lat * Math.PI / 180;
        const lonR = lon * Math.PI / 180;
        const sunLatR = sunPos.lat * Math.PI / 180;
        const sunLonR = sunPos.lon * Math.PI / 180;
        const cosDist =
            Math.sin(latR) * Math.sin(sunLatR) +
            Math.cos(latR) * Math.cos(sunLatR) * Math.cos(lonR - sunLonR);

        const twilightZone = 0.25;
        if (cosDist > twilightZone) return 1;
        if (cosDist < -twilightZone) return 0;
        return (cosDist + twilightZone) / (twilightZone * 2);
    }

    // --------------------------------------------------------
    //  Инициализация
    // --------------------------------------------------------
    function init() {
        canvas = document.getElementById('world-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        updateVisibleRange();
        resize();

        window.addEventListener('resize', () => {
            updateVisibleRange();
            resize();
        });

        const bgMode = localStorage.getItem('desktopBackgroundMode') || 'map';
        isMapVisible = (bgMode === 'map');
        applyBackgroundMode(bgMode);

        setTimeout(applyWallpaperToLayer, 100);

        initClockPanel();
        startWeatherUpdates();

        if (isMapVisible) {
            lastFrame = performance.now();
            loop();
        }
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        W = rect.width;
        H = rect.height;

        canvas.width = W * dpr;
        canvas.height = H * dpr;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        landPointsGenerated = false;
        stars = [];
    }

    // --------------------------------------------------------
    //  Переключение фона
    // --------------------------------------------------------
    function applyBackgroundMode(mode) {
        const wpLayer = document.getElementById('wallpaper-layer');
        const worldCanvas = document.getElementById('world-canvas');
        const clockPanelEl = document.getElementById('worldClockPanel');

        const isMap = (mode === 'map');
        isMapVisible = isMap;

        if (isMap) {
            if (worldCanvas) worldCanvas.classList.remove('hidden');
            if (wpLayer) wpLayer.classList.remove('visible');
            if (clockPanelEl) clockPanelEl.classList.remove('hidden');

            if (!animationId) {
                lastFrame = performance.now();
                loop();
            }
        } else {
            if (worldCanvas) worldCanvas.classList.add('hidden');
            if (wpLayer) {
                wpLayer.classList.add('visible');
                applyWallpaperToLayer();
            }
            if (clockPanelEl) clockPanelEl.classList.add('hidden');

            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }
    }

    function applyWallpaperToLayer() {
        const wpLayer = document.getElementById('wallpaper-layer');
        if (!wpLayer) return;

        const currentId = typeof getCurrentWallpaperId === 'function'
            ? getCurrentWallpaperId()
            : null;
        const defId = typeof getDefaultWallpaperId === 'function'
            ? getDefaultWallpaperId()
            : 'default-dark';

        const wallpaper = (typeof WALLPAPERS !== 'undefined' && WALLPAPERS.length > 0)
            ? (WALLPAPERS.find(w => w.id === (currentId || defId)) || WALLPAPERS[0])
            : null;

        if (wallpaper) {
            wpLayer.style.background = wallpaper.value;
        }
    }

    window.setBackgroundMode = function(mode) {
        localStorage.setItem('desktopBackgroundMode', mode);
        applyBackgroundMode(mode);
    };

    window.getBackgroundMode = function() {
        return localStorage.getItem('desktopBackgroundMode') || 'map';
    };

    window.refreshWallpaperLayer = function() {
        if (!isMapVisible) applyWallpaperToLayer();
    };

    // --------------------------------------------------------
    //  Часы внизу — только для видимых городов
    // --------------------------------------------------------
    function initClockPanel() {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;

        clockPanel = document.createElement('div');
        clockPanel.className = 'world-clock-panel';
        clockPanel.id = 'worldClockPanel';

        desktop.appendChild(clockPanel);
        rebuildClockPanel();

        setInterval(updateClocks, 1000);
    }

    function rebuildClockPanel() {
        if (!clockPanel) return;
        clockPanel.innerHTML = '';

        // Берём только видимые города и сортируем по часовому поясу (от меньшего к большему)
        const visibleCities = CITIES
            .filter(c => c.visible !== false)
            .slice()
            .sort((a, b) => {
                const tzA = Number.isFinite(a.tz) ? a.tz : 0;
                const tzB = Number.isFinite(b.tz) ? b.tz : 0;
                if (tzA !== tzB) return tzA - tzB;

                // При равных поясах — по названию (стабильность)
                return String(a.name).localeCompare(String(b.name), 'ru');
            });

        if (visibleCities.length === 0) {
            clockPanel.innerHTML = '<div class="world-clock-empty">Нет городов для отображения. Добавьте их в Настройках → Карта.</div>';
            return;
        }

        visibleCities.forEach(city => {
            const item = document.createElement('div');
            item.className = 'world-clock-item';
            if (city.my) item.classList.add('my-location');
            item.dataset.city = city.name;

            item.innerHTML = `
                <span class="day-icon"></span>
                <span class="world-clock-city">${city.name}</span>
                <span class="world-clock-time">--:--</span>
                <span class="world-clock-date">--</span>
                <div class="weather-row loading"><span class="weather-icon">⏳</span></div>
            `;

            clockPanel.appendChild(item);
        });

        updateClocks();
        renderAllWeather();
    }

    function updateClocks() {
        if (!clockPanel) return;

        const now = new Date();
        const sunPos = getSolarPosition(now);

        const visibleCities = CITIES.filter(c => c.visible !== false);

        visibleCities.forEach(city => {
            const item = clockPanel.querySelector(`[data-city="${cssEscape(city.name)}"]`);
            if (!item) return;

            const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
            const cityTime = new Date(utcMs + city.tz * 3600000);

            const hh = String(cityTime.getHours()).padStart(2, '0');
            const mm = String(cityTime.getMinutes()).padStart(2, '0');
            const day = cityTime.getDate();
            const month = cityTime.getMonth() + 1;
            const dayOfWeek = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][cityTime.getDay()];

            const timeEl = item.querySelector('.world-clock-time');
            const dateEl = item.querySelector('.world-clock-date');
            const iconEl = item.querySelector('.day-icon');

            if (timeEl) timeEl.textContent = `${hh}:${mm}`;
            if (dateEl) dateEl.textContent = `${dayOfWeek}, ${day}.${String(month).padStart(2, '0')}`;

            const isDay = isDaylight(city.lat, city.lon, sunPos);
            if (iconEl) iconEl.textContent = isDay ? '☀️' : '🌙';
        });
    }

    // --------------------------------------------------------
    //  🌤️ Погода — только для видимых городов
    // --------------------------------------------------------
    function startWeatherUpdates() {
        if (weatherTimer) clearInterval(weatherTimer);
        setTimeout(loadAllWeather, 1500);
        weatherTimer = setInterval(loadAllWeather, WEATHER_CACHE_TTL);
    }

    async function loadAllWeather() {
        const visibleCities = CITIES.filter(c => c.visible !== false);
        if (visibleCities.length === 0) return;

        const allFresh = visibleCities.every(city => {
            const cached = weatherData[city.name];
            return cached && !cached.error && Date.now() - cached.ts < WEATHER_CACHE_TTL;
        });

        if (allFresh) {
            renderAllWeather();
            return;
        }

        visibleCities.forEach(city => {
            const row = document.querySelector(`[data-city="${cssEscape(city.name)}"] .weather-row`);
            if (row) {
                row.className = 'weather-row loading';
                row.innerHTML = '<span class="weather-icon">⏳</span>';
            }
        });

        const lats = visibleCities.map(c => c.lat).join(',');
        const lons = visibleCities.map(c => c.lon).join(',');

        const units = localStorage.getItem('weatherUnits')
            || (window.APP_CONFIG?.WEATHER_UNITS)
            || 'metric';
        const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';

        const url = 'https://api.open-meteo.com/v1/forecast' +
            `?latitude=${lats}` +
            `&longitude=${lons}` +
            '&current=temperature_2m,weather_code,is_day,apparent_temperature,relative_humidity_2m,wind_speed_10m' +
            `&temperature_unit=${tempUnit}` +
            '&wind_speed_unit=ms' +
            '&timezone=auto';

        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const data = await resp.json();
            const results = Array.isArray(data) ? data : [data];

            results.forEach((result, idx) => {
                const city = visibleCities[idx];
                if (!city || !result || !result.current) return;

                const current = result.current;
                const code = current.weather_code;
                const isDay = current.is_day === 1;

                weatherData[city.name] = {
                    temp: Math.round(current.temperature_2m ?? 0),
                    feelsLike: Math.round(current.apparent_temperature ?? 0),
                    humidity: Math.round(current.relative_humidity_2m ?? 0),
                    windSpeed: (current.wind_speed_10m ?? 0).toFixed(1),
                    icon: getWeatherEmojiFromCode(code, isDay),
                    desc: getWeatherDescription(code),
                    ts: Date.now(),
                };
            });

            renderAllWeather();
        } catch (e) {
            console.warn('[Weather] Ошибка загрузки:', e.message);
            visibleCities.forEach(city => {
                weatherData[city.name] = { error: true, ts: Date.now() };
            });
            renderAllWeather();
        }
    }

    function getWeatherEmojiFromCode(code, isDay) {
        if (code === 0) return isDay ? '☀️' : '🌙';
        if (code === 1) return isDay ? '🌤️' : '🌙';
        if (code === 2) return isDay ? '⛅' : '☁️';
        if (code === 3) return '☁️';
        if (code === 45 || code === 48) return '🌫️';
        if (code >= 51 && code <= 55) return '🌦️';
        if (code === 56 || code === 57) return '🌧️';
        if (code >= 61 && code <= 65) return '🌧️';
        if (code === 66 || code === 67) return '🌧️';
        if (code >= 71 && code <= 75) return '❄️';
        if (code === 77) return '🌨️';
        if (code >= 80 && code <= 82) return '🌦️';
        if (code === 85 || code === 86) return '🌨️';
        if (code === 95) return '⛈️';
        if (code === 96 || code === 99) return '⛈️';
        return '🌡️';
    }

    function getWeatherDescription(code) {
        const descriptions = {
            0: 'ясно', 1: 'преимущ. ясно', 2: 'переменная обл.', 3: 'пасмурно',
            45: 'туман', 48: 'изморозь',
            51: 'слабая морось', 53: 'морось', 55: 'сильная морось',
            56: 'лед. морось', 57: 'лед. морось',
            61: 'слабый дождь', 63: 'дождь', 65: 'сильный дождь',
            66: 'лед. дождь', 67: 'лед. дождь',
            71: 'слабый снег', 73: 'снег', 75: 'сильный снег', 77: 'снежные зёрна',
            80: 'ливень', 81: 'ливень', 82: 'сильный ливень',
            85: 'снегопад', 86: 'снегопад',
            95: 'гроза', 96: 'гроза с градом', 99: 'гроза с градом',
        };
        return descriptions[code] || '—';
    }

    function renderAllWeather() {
        CITIES.filter(c => c.visible !== false).forEach(city => renderCityWeather(city));
    }

    function renderCityWeather(city) {
        const item = document.querySelector(`[data-city="${cssEscape(city.name)}"]`);
        if (!item) return;

        const showWeather = localStorage.getItem('weatherShow') !== '0';
        let row = item.querySelector('.weather-row');

        if (!showWeather) {
            if (row) row.remove();
            return;
        }

        if (!row) {
            row = document.createElement('div');
            row.className = 'weather-row loading';
            row.innerHTML = '<span class="weather-icon">⏳</span>';
            item.appendChild(row);
        }

        const data = weatherData[city.name];

        if (!data) {
            row.className = 'weather-row loading';
            row.innerHTML = '<span class="weather-icon">⏳</span>';
            return;
        }

        if (data.error) {
            row.className = 'weather-row error';
            row.innerHTML = '<span class="weather-icon">⚠️</span><span class="weather-desc">н/д</span>';
            return;
        }

        const style = localStorage.getItem('weatherStyle') || 'icon-temp-desc';
        const weatherUnits = localStorage.getItem('weatherUnits')
            || (window.APP_CONFIG?.WEATHER_UNITS)
            || 'metric';
        const unit = weatherUnits === 'imperial' ? 'F' : 'C';

        row.className = 'weather-row updating';
        row.title = `Ощущается: ${data.feelsLike}°${unit} · Влажность: ${data.humidity}% · Ветер: ${data.windSpeed} м/с`;

        let html = '';
        if (style === 'icon-temp') {
            html = `<span class="weather-icon">${data.icon}</span><span class="weather-temp">${data.temp}°${unit}</span>`;
        } else if (style === 'temp-only') {
            html = `<span class="weather-temp">${data.temp}°${unit}</span>`;
        } else {
            html = `
                <span class="weather-icon">${data.icon}</span>
                <span class="weather-temp">${data.temp}°${unit}</span>
                <span class="weather-desc">${data.desc}</span>
            `;
        }
        row.innerHTML = html;

        setTimeout(() => {
            if (row.classList.contains('updating')) {
                row.classList.remove('updating');
            }
        }, 600);
    }

    function cssEscape(str) {
        return String(str).replace(/"/g, '\\"');
    }

    // --------------------------------------------------------
    //  Звёзды
    // --------------------------------------------------------
    let stars = [];
    function initStars() {
        stars = [];
        const count = Math.floor((W * H) / 12000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.2 + 0.2,
                phase: Math.random() * Math.PI * 2,
                speed: 0.01 + Math.random() * 0.02,
            });
        }
    }

    function drawStars(t) {
        if (stars.length === 0) initStars();

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#02040a');
        bg.addColorStop(0.5, '#040812');
        bg.addColorStop(1, '#060a16');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        stars.forEach(s => {
            const alpha = 0.25 + Math.sin(t * s.speed * 3 + s.phase) * 0.25;
            ctx.fillStyle = `rgba(180, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // --------------------------------------------------------
    //  Точки континентов
    // --------------------------------------------------------
    function drawLandPoints(sunPos) {
        if (!landPointsGenerated) generateLandPoints();

        const dotSize = Math.max(1, Math.min(W, H) / 400);

        const dayColor = { r: 130, g: 200, b: 140 };
        const nightColor = { r: 40, g: 70, b: 90 };
        const twilightColor = { r: 180, g: 140, b: 120 };

        LAND_POINTS.forEach(pt => {
            const p = project(pt.lon, pt.lat);

            if (p.x < -10 || p.x > W + 10) return;

            const tw = getTwilightFactor(pt.lat, pt.lon, sunPos);

            let r, g, b;

            if (tw >= 1) {
                r = dayColor.r; g = dayColor.g; b = dayColor.b;
            } else if (tw <= 0) {
                r = nightColor.r; g = nightColor.g; b = nightColor.b;
            } else {
                if (tw < 0.5) {
                    const t2 = tw / 0.5;
                    r = nightColor.r + (twilightColor.r - nightColor.r) * t2;
                    g = nightColor.g + (twilightColor.g - nightColor.g) * t2;
                    b = nightColor.b + (twilightColor.b - nightColor.b) * t2;
                } else {
                    const t2 = (tw - 0.5) / 0.5;
                    r = twilightColor.r + (dayColor.r - twilightColor.r) * t2;
                    g = twilightColor.g + (dayColor.g - twilightColor.g) * t2;
                    b = twilightColor.b + (dayColor.b - twilightColor.b) * t2;
                }
            }

            const alpha = 0.5 + tw * 0.5;

            ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // --------------------------------------------------------
    //  Subsolar-точка (солнце)
    // --------------------------------------------------------
    function drawSunPoint(sunPos) {
        const p = project(sunPos.lon, sunPos.lat);

        if (p.x < -100 || p.x > W + 100) return;

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 100);
        glow.addColorStop(0, 'rgba(255, 240, 180, 0.6)');
        glow.addColorStop(0.4, 'rgba(255, 200, 100, 0.15)');
        glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 100, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 245, 200, 0.95)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // --------------------------------------------------------
    //  Маркеры городов
    //  • Видимые (visible !== false) — яркие, белые подписи
    //  • Скрытые — приглушённые, серые подписи
    //  • «Мой город» — синяя подпись + пульсация
    //  • Все подписи с чёрной обводкой (strokeText) для читаемости на любом фоне
    // --------------------------------------------------------
    function drawCityMarkers(sunPos) {
        const t = performance.now() / 1000;

        CITIES.forEach(city => {
            const p = project(city.lon, city.lat);

            if (p.x < -50 || p.x > W + 50) return;

            const isDay = isDaylight(city.lat, city.lon, sunPos);
            const isMe = city.my;
            const isVisible = city.visible !== false;

            const baseRadius = isMe ? 4 : (isVisible ? 3 : 2.5);

            // ---- Свечение вокруг точки ----
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, baseRadius * 4);
            const glowColor = isMe
                ? '74, 158, 255'
                : (isDay ? '255, 220, 120' : '140, 180, 255');
            glow.addColorStop(0, `rgba(${glowColor}, ${isVisible ? 0.4 : 0.2})`);
            glow.addColorStop(1, `rgba(${glowColor}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, baseRadius * 4, 0, Math.PI * 2);
            ctx.fill();

            // ---- Точка ----
            ctx.beginPath();
            ctx.arc(p.x, p.y, baseRadius, 0, Math.PI * 2);
            ctx.fillStyle = isMe
                ? '#4a9eff'
                : (isDay ? '#ffd76a' : '#8ab4ff');
            ctx.globalAlpha = isVisible ? 1 : 0.5;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = isMe ? 1.5 : 1;
            ctx.stroke();

            // ---- Пульсация «Мой город» ----
            if (isMe) {
                const pulseRadius = baseRadius * 2 + Math.sin(t * 2) * baseRadius;
                ctx.strokeStyle = `rgba(74, 158, 255, ${0.6 + Math.sin(t * 2) * 0.3})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // ---- Подпись с чёрной обводкой ----
            ctx.font = isMe
                ? '600 11px -apple-system, sans-serif'
                : '500 10px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const labelX = p.x + baseRadius + 5;
            const labelY = p.y;

            // Обводка (контур)
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.strokeText(city.name, labelX, labelY);

            // Заливка
            if (isMe) {
                ctx.fillStyle = '#4a9eff';
            } else if (isVisible) {
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = 'rgba(200, 200, 200, 0.85)';
            }
            ctx.fillText(city.name, labelX, labelY);
        });
    }

    // --------------------------------------------------------
    //  Главный цикл
    // --------------------------------------------------------
    function loop() {
        const now = performance.now();
        if (now - lastFrame < 33) {
            animationId = requestAnimationFrame(loop);
            return;
        }
        lastFrame = now;

        const t = now / 1000;
        const sunPos = getSolarPosition(new Date());

        drawStars(t);
        drawLandPoints(sunPos);
        drawSunPoint(sunPos);
        drawCityMarkers(sunPos);

        animationId = requestAnimationFrame(loop);
    }

    // --------------------------------------------------------
    //  Пауза при скрытии
    // --------------------------------------------------------
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationId) cancelAnimationFrame(animationId);
            animationId = null;
        } else {
            if (!animationId && isMapVisible) {
                lastFrame = performance.now();
                loop();
            }
        }
    });

    // --------------------------------------------------------
    //  Публичные функции для настроек
    // --------------------------------------------------------
    window.refreshWeather = function() {
        renderAllWeather();
    };

    window.reloadWeather = function() {
        Object.keys(weatherData).forEach(k => delete weatherData[k]);
        loadAllWeather();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
