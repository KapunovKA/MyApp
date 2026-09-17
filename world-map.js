// ============================================================
//  ЖИВАЯ ЗАСТАВКА: КАРТА МИРА + ТЕРМИНАТОР v3
//  + города, часы, погода (Open-Meteo), сумерки
// ============================================================

(function initWorldMap() {
    'use strict';

    let canvas, ctx, W, H;
    let animationId = null;
    let lastFrame = 0;
    let clockPanel = null;

    let isMapVisible = true;
    let weatherData = {}; // { cityName: { temp, icon, desc, ts, ... } }
    let weatherTimer = null;
    const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 минут

    // --------------------------------------------------------
    //  ГОРОДА — сохраняются в localStorage
    // --------------------------------------------------------
    const CITIES_STORAGE_KEY = 'worldMapCities';

    const DEFAULT_CITIES = [
        { name: 'Москва',       lat: 55.75, lon: 37.62,  tz: 3,  my: true },
        { name: 'Лондон',       lat: 51.51, lon: -0.13,  tz: 0,  my: false },
        { name: 'Нью-Йорк',     lat: 40.71, lon: -74.01, tz: -5, my: false },
        { name: 'Лос-Анджелес', lat: 34.05, lon: -118.24, tz: -8, my: false },
        { name: 'Токио',        lat: 35.68, lon: 139.69, tz: 9,  my: false },
        { name: 'Сидней',       lat: -33.87, lon: 151.21, tz: 10, my: false },
        { name: 'Дубай',        lat: 25.20, lon: 55.27,  tz: 4,  my: false },
        { name: 'Сан-Паулу',    lat: -23.55, lon: -46.63, tz: -3, my: false },
    ];

    let CITIES = loadCities();

    function loadCities() {
        try {
            const saved = localStorage.getItem(CITIES_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
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

    // Публичные API для settings.js
    function getCitiesList() {
        return JSON.parse(JSON.stringify(CITIES));
    }

    function setCitiesList(cities) {
        CITIES = Array.isArray(cities) ? cities : [];
        saveCities(CITIES);
        rebuildClockPanel();
        // Сбросим кеш погоды для удалённых городов
        Object.keys(weatherData).forEach(name => {
            if (!CITIES.find(c => c.name === name)) {
                delete weatherData[name];
            }
        });
    }

    window.getCitiesList = getCitiesList;
    window.setCitiesList = setCitiesList;

    // --------------------------------------------------------
    //  Детальные контуры континентов
    // --------------------------------------------------------
    const CONTINENTS = [
        // ─── Северная Америка ───
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
        // ─── Гренландия ───
        [
            [-73,78],[-70,79],[-67,80],[-63,81],[-58,82],[-52,82],[-48,83],[-42,83],
            [-37,83],[-32,82],[-28,81],[-25,80],[-23,78],[-21,76],[-20,74],[-22,72],
            [-24,70],[-27,69],[-30,68],[-34,67],[-38,65],[-41,62],[-44,60],[-47,59],
            [-50,60],[-52,62],[-55,64],[-58,66],[-61,68],[-64,70],[-67,72],[-70,74],
            [-73,78]
        ],
        // ─── Южная Америка ───
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
        // ─── Евразия ───
        [
            [5,58],[7,60],[9,62],[11,63],[14,65],[17,67],[20,68],[23,69],
            [26,70],[29,70],[32,70],[35,70],[38,68],[41,67],[44,66],[47,67],
            [50,68],[53,69],[56,69],[59,69],[62,70],[65,71],[68,72],[71,72],
            [74,72],[77,73],[80,74],[84,74],[88,75],[92,76],[96,76],[100,77],
            [104,77],[108,76],[112,75],[116,74],[120,73],[124,73],[128,72],[132,72],
            [136,72],[140,73],[144,72],[148,71],[152,70],[156,70],[160,69],[164,68],
            [168,68],[172,67],[176,66],[180,65],[180,62],[178,60],[175,59],[172,58],
            [168,57],[164,56],[160,56],[156,57],[152,59],[148,60],[144,60],[140,59],
            [137,57],[135,55],[133,53],[131,50],[129,48],[127,46],[125,44],[123,42],
            [121,40],[119,37],[117,35],[115,33],[113,30],[111,28],[109,25],[107,22],
            [105,20],[103,17],[101,15],[100,12],[99,10],[98,8],[99,7],[100,8],
            [101,10],[102,13],[102,16],[101,18],[99,20],[97,21],[95,22],[93,23],
            [91,24],[89,26],[87,27],[85,28],[83,30],[81,31],[79,33],[77,35],
            [75,37],[73,39],[71,40],[69,41],[67,42],[65,42],[63,41],[61,41],
            [59,42],[57,42],[55,41],[53,41],[51,40],[49,39],[47,38],[45,38],
            [43,38],[41,39],[39,40],[37,40],[35,40],[33,40],[31,40],[29,40],
            [27,38],[25,36],[23,37],[21,38],[19,39],[17,41],[15,42],[13,43],
            [11,44],[9,44],[7,44],[5,44],[3,43],[1,43],[-1,43],[-3,42],
            [-5,42],[-7,42],[-9,42],[-9,40],[-9,38],[-9,36],[-7,36],[-5,36],
            [-3,36],[-1,37],[1,38],[3,40],[5,42],[7,44],[9,46],[11,47],
            [13,46],[15,45],[17,44],[19,43],[21,43],[23,45],[25,46],[27,47],
            [29,47],[31,47],[33,48],[35,49],[37,50],[39,50],[41,49],[43,48],
            [45,47],[47,46],[49,47],[51,48],[53,49],[55,50],[57,51],[59,52],
            [61,53],[63,54],[65,55],[67,56],[69,57],[71,58],[73,59],[75,60],
            [77,61],[79,62],[81,63],[83,64],[85,65],[87,66],[89,66],[91,66],
            [93,66],[95,66],[97,67],[99,67],[101,68],[103,68],[105,68],[107,68],
            [109,68],[111,68],[113,68],[115,68],[117,68],[119,68],[121,68],[123,68],
            [125,68],[127,68],[129,68],[131,68],[133,68],[135,68],[137,67],[139,67],
            [141,66],[143,65],[145,64],[147,63],[149,62],[151,61],[153,60],[155,59],
            [157,58],[159,57],[161,56],[163,55],[165,54],[167,53],[169,52],[171,51],
            [173,50],[175,50],[177,50],[179,50],[180,50]
        ],
        // ─── Индия ───
        [
            [68,24],[70,23],[72,22],[74,21],[76,20],[78,18],[80,16],[82,14],
            [84,12],[86,11],[88,10],[89,11],[90,13],[90,16],[90,19],[89,22],
            [88,23],[86,24],[84,25],[82,26],[80,27],[78,28],[76,29],[74,30],
            [72,30],[70,28],[69,26],[68,24]
        ],
        // ─── Юго-Восточная Азия ───
        [
            [95,20],[97,20],[99,20],[101,21],[103,22],[105,22],[107,21],[109,20],
            [109,17],[108,15],[107,13],[106,11],[105,9],[104,7],[103,5],[102,3],
            [101,2],[100,4],[99,6],[98,9],[97,12],[96,15],[95,18],[95,20]
        ],
        // ─── Африка ───
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
        // ─── Мадагаскар ───
        [
            [50,-13],[50,-15],[50,-17],[49,-19],[48,-21],[47,-23],[46,-25],[45,-25],
            [44,-24],[44,-22],[44,-20],[45,-18],[46,-16],[47,-14],[48,-13],[50,-13]
        ],
        // ─── Австралия ───
        [
            [113,-22],[113,-25],[114,-27],[114,-30],[115,-33],[116,-35],[118,-35],[120,-34],
            [122,-34],[124,-33],[126,-32],[128,-32],[130,-32],[132,-32],[134,-32],[136,-34],
            [137,-35],[139,-37],[141,-38],[143,-39],[145,-39],[147,-39],[149,-38],[151,-37],
            [153,-30],[153,-27],[153,-25],[151,-23],[149,-21],[147,-19],[145,-17],[143,-15],
            [141,-13],[139,-12],[137,-12],[135,-12],[133,-11],[131,-11],[129,-13],[127,-14],
            [125,-15],[123,-17],[121,-18],[119,-20],[117,-21],[115,-22],[113,-22]
        ],
        // ─── Новая Зеландия ───
        [
            [172,-34],[174,-35],[176,-37],[178,-38],[178,-40],[177,-41],[175,-42],
            [173,-43],[171,-44],[169,-45],[167,-46],[166,-46],[167,-45],[170,-43],
            [172,-41],[173,-39],[173,-37],[172,-35],[172,-34]
        ],
        // ─── Антарктида ───
        [
            [-180,-70],[-170,-71],[-160,-72],[-150,-73],[-140,-74],[-130,-74],[-120,-74],
            [-110,-73],[-100,-73],[-90,-72],[-80,-71],[-70,-70],[-60,-69],[-50,-69],
            [-40,-69],[-30,-69],[-20,-70],[-10,-70],[0,-70],[10,-69],[20,-69],
            [30,-68],[40,-68],[50,-67],[60,-67],[70,-66],[80,-66],[90,-65],
            [100,-65],[110,-66],[120,-66],[130,-67],[140,-68],[150,-69],[160,-70],
            [170,-71],[180,-72],[180,-90],[-180,-90],[-180,-70]
        ],
    ];

    // --------------------------------------------------------
    //  Проекция
    // --------------------------------------------------------
    function project(lon, lat) {
        return {
            x: (lon + 180) / 360 * W,
            y: (90 - lat) / 180 * H,
        };
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

    // --------------------------------------------------------
    //  Инициализация
    // --------------------------------------------------------
    function init() {
        canvas = document.getElementById('world-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);

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
        W = window.innerWidth;
        H = window.innerHeight - 36;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    //  Часы внизу экрана
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

        CITIES.forEach(city => {
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

        CITIES.forEach(city => {
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
    //  🌤️ ПОГОДА через Open-Meteo
    //  Документация: https://open-meteo.com/en/docs
    //  Без API-ключа, без регистрации, до 10 000 запросов в день
    // --------------------------------------------------------
    function startWeatherUpdates() {
        if (weatherTimer) clearInterval(weatherTimer);
        setTimeout(loadAllWeather, 1500);
        weatherTimer = setInterval(loadAllWeather, WEATHER_CACHE_TTL);
    }

    async function loadAllWeather() {
        if (CITIES.length === 0) return;

        // Проверяем кеш — если все свежие, не делаем запрос
        const allFresh = CITIES.every(city => {
            const cached = weatherData[city.name];
            return cached && !cached.error && Date.now() - cached.ts < WEATHER_CACHE_TTL;
        });

        if (allFresh) {
            renderAllWeather();
            return;
        }

        // Помечаем строки как «загружается»
        CITIES.forEach(city => {
            const row = document.querySelector(`[data-city="${cssEscape(city.name)}"] .weather-row`);
            if (row) {
                row.className = 'weather-row loading';
                row.innerHTML = '<span class="weather-icon">⏳</span>';
            }
        });

        // Формируем запрос сразу для всех городов
        // Open-Meteo позволяет перечислить несколько точек
        const lats = CITIES.map(c => c.lat).join(',');
        const lons = CITIES.map(c => c.lon).join(',');

        const units = (window.APP_CONFIG?.WEATHER_UNITS) || 'metric';
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

            // Open-Meteo возвращает либо один объект, либо массив — зависит от числа точек
            const results = Array.isArray(data) ? data : [data];

            results.forEach((result, idx) => {
                const city = CITIES[idx];
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

            CITIES.forEach(city => {
                weatherData[city.name] = { error: true, ts: Date.now() };
            });
            renderAllWeather();
        }
    }

    // WMO Weather codes → эмодзи
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

    // Описание погоды на русском
    function getWeatherDescription(code) {
        const descriptions = {
            0:  'ясно',
            1:  'преимущ. ясно',
            2:  'переменная обл.',
            3:  'пасмурно',
            45: 'туман',
            48: 'изморозь',
            51: 'слабая морось',
            53: 'морось',
            55: 'сильная морось',
            56: 'лед. морось',
            57: 'лед. морось',
            61: 'слабый дождь',
            63: 'дождь',
            65: 'сильный дождь',
            66: 'лед. дождь',
            67: 'лед. дождь',
            71: 'слабый снег',
            73: 'снег',
            75: 'сильный снег',
            77: 'снежные зёрна',
            80: 'ливень',
            81: 'ливень',
            82: 'сильный ливень',
            85: 'снегопад',
            86: 'снегопад',
            95: 'гроза',
            96: 'гроза с градом',
            99: 'гроза с градом',
        };
        return descriptions[code] || '—';
    }

    function renderAllWeather() {
        CITIES.forEach(city => renderCityWeather(city));
    }

    function renderCityWeather(city) {
        const item = document.querySelector(`[data-city="${cssEscape(city.name)}"]`);
        if (!item) return;

        let row = item.querySelector('.weather-row');
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

        const unit = (window.APP_CONFIG?.WEATHER_UNITS === 'imperial') ? 'F' : 'C';

        row.className = 'weather-row updating';
        row.title = `Ощущается: ${data.feelsLike}°${unit} · Влажность: ${data.humidity}% · Ветер: ${data.windSpeed} м/с`;
        row.innerHTML = `
            <span class="weather-icon">${data.icon}</span>
            <span class="weather-temp">${data.temp}°${unit}</span>
            <span class="weather-desc">${data.desc}</span>
        `;

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
        const count = Math.floor((W * H) / 8000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.3 + 0.2,
                phase: Math.random() * Math.PI * 2,
                speed: 0.01 + Math.random() * 0.02,
            });
        }
    }

    function drawStars(t) {
        if (stars.length === 0) initStars();

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#050810');
        bg.addColorStop(0.5, '#080c18');
        bg.addColorStop(1, '#0a0f1c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        stars.forEach(s => {
            const alpha = 0.35 + Math.sin(t * s.speed * 3 + s.phase) * 0.35;
            ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // --------------------------------------------------------
    //  Плавные сумерки
    // --------------------------------------------------------
    function drawDayNight(sunPos) {
        const sunPx = project(sunPos.lon, sunPos.lat);
        const dayRadius = Math.max(W, H) * 0.7;

        const grad = ctx.createRadialGradient(
            sunPx.x, sunPx.y, dayRadius * 0.05,
            sunPx.x, sunPx.y, dayRadius * 1.35
        );

        grad.addColorStop(0.00, 'rgba(255, 250, 220, 0)');
        grad.addColorStop(0.30, 'rgba(255, 240, 180, 0)');
        grad.addColorStop(0.48, 'rgba(255, 180, 100, 0.08)');
        grad.addColorStop(0.56, 'rgba(80, 70, 130, 0.25)');
        grad.addColorStop(0.68, 'rgba(20, 30, 80, 0.55)');
        grad.addColorStop(0.82, 'rgba(5, 10, 35, 0.8)');
        grad.addColorStop(1.00, 'rgba(0, 5, 20, 0.92)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // --------------------------------------------------------
    //  Терминатор (3 линии сумерек)
    // --------------------------------------------------------
    function drawTerminator(sunPos) {
        const segments = 240;
        const sunLatRad = sunPos.lat * Math.PI / 180;

        const angles = [0, 6, 12];
        const styles = [
            { color: 'rgba(255, 200, 100, 0.85)', width: 2, blur: 15 },
            { color: 'rgba(180, 130, 200, 0.5)',  width: 1.2, blur: 8 },
            { color: 'rgba(100, 100, 200, 0.25)', width: 0.8, blur: 5 },
        ];

        angles.forEach((angle, idx) => {
            const angleRad = angle * Math.PI / 180;
            const style = styles[idx];

            for (let branch = 0; branch < 2; branch++) {
                ctx.beginPath();
                let started = false;

                for (let i = 0; i <= segments; i++) {
                    const lat = 90 - (i / segments) * 180;
                    const latRad = lat * Math.PI / 180;

                    const denom = Math.cos(latRad) * Math.cos(sunLatRad);
                    if (Math.abs(denom) < 0.0001) {
                        if (started) { ctx.stroke(); started = false; }
                        continue;
                    }

                    const cosDiff = (Math.cos(angleRad) - Math.sin(latRad) * Math.sin(sunLatRad)) / denom;

                    if (Math.abs(cosDiff) > 1) {
                        if (started) { ctx.stroke(); started = false; }
                        continue;
                    }

                    const diff = Math.acos(cosDiff);
                    const sign = branch === 0 ? 1 : -1;
                    const lon = sunPos.lon + sign * (diff * 180 / Math.PI);
                    const p = project(normalizeLon(lon), lat);

                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }

                ctx.strokeStyle = style.color;
                ctx.lineWidth = style.width;
                ctx.shadowColor = style.color;
                ctx.shadowBlur = style.blur;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        });
    }

    function normalizeLon(lon) {
        while (lon > 180) lon -= 360;
        while (lon < -180) lon += 360;
        return lon;
    }

    // --------------------------------------------------------
    //  Континенты
    // --------------------------------------------------------
    function drawContinents() {
        CONTINENTS.forEach(polygon => {
            ctx.beginPath();

            polygon.forEach(([lon, lat], i) => {
                const p = project(lon, lat);
                if (i === 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            });

            ctx.closePath();

            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, 'rgba(45, 85, 60, 0.8)');
            grad.addColorStop(0.5, 'rgba(55, 100, 70, 0.85)');
            grad.addColorStop(1, 'rgba(45, 80, 55, 0.75)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = 'rgba(80, 150, 90, 0.5)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        });
    }

    // --------------------------------------------------------
    //  Сетка
    // --------------------------------------------------------
    function drawGrid() {
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.08)';
        ctx.lineWidth = 0.5;

        for (let lon = -180; lon <= 180; lon += 30) {
            const p1 = project(lon, 90);
            const p2 = project(lon, -90);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        for (let lat = -60; lat <= 60; lat += 30) {
            const p1 = project(-180, lat);
            const p2 = project(180, lat);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        const eq1 = project(-180, 0);
        const eq2 = project(180, 0);
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.18)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(eq1.x, eq1.y);
        ctx.lineTo(eq2.x, eq2.y);
        ctx.stroke();
    }

    // --------------------------------------------------------
    //  Subsolar-точка
    // --------------------------------------------------------
    function drawSunPoint(sunPos) {
        const p = project(sunPos.lon, sunPos.lat);

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 80);
        glow.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
        glow.addColorStop(0.3, 'rgba(255, 200, 100, 0.4)');
        glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 250, 220, 1)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 220, 130, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.stroke();
    }

    // --------------------------------------------------------
    //  Маркеры городов
    // --------------------------------------------------------
    function drawCityMarkers(sunPos) {
        CITIES.forEach(city => {
            const p = project(city.lon, city.lat);
            const isDay = isDaylight(city.lat, city.lon, sunPos);
            const isMe = city.my;

            ctx.beginPath();
            ctx.arc(p.x, p.y, isMe ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isMe ? '#4a9eff' : (isDay ? '#ffd76a' : '#8ab4ff');
            ctx.fill();

            ctx.strokeStyle = isMe ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = isMe ? 2 : 1;
            ctx.stroke();

            if (isMe) {
                const t = performance.now() / 1000;
                const pulseRadius = 10 + Math.sin(t * 2) * 3;
                ctx.strokeStyle = `rgba(74, 158, 255, ${0.5 + Math.sin(t * 2) * 0.3})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.font = isMe
                ? '600 12px -apple-system, sans-serif'
                : '500 11px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const labelX = p.x + 10;
            const labelY = p.y;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillText(city.name, labelX + 1, labelY + 1);

            ctx.fillStyle = isMe ? '#4a9eff' : 'rgba(255, 255, 255, 0.9)';
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
        drawGrid();
        drawContinents();
        drawDayNight(sunPos);
        drawTerminator(sunPos);
        drawCityMarkers(sunPos);
        drawSunPoint(sunPos);

        animationId = requestAnimationFrame(loop);
    }

    // --------------------------------------------------------
    //  Пауза при скрытии вкладки
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
