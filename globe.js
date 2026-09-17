// ============================================================
//  ЖИВАЯ ЗАСТАВКА: ГЛОБУС + ТЕРМИНАТОР (как в часах iPhone)
// ============================================================

(function initGlobe() {
    'use strict';

    let canvas, ctx, W, H, cx, cy, R;
    let animationId = null;
    let lastFrame = 0;

    // --------------------------------------------------------
    //  Континенты — упрощённые полигоны в градусах (широта, долгота)
    //  Данные — грубые контуры материков
    // --------------------------------------------------------
    const CONTINENTS = {
        // Северная Америка
        northAmerica: [
            [71,-141],[70,-130],[69,-115],[72,-100],[73,-85],[70,-70],[60,-65],
            [50,-60],[45,-65],[43,-70],[40,-73],[35,-76],[30,-81],[26,-80],
            [25,-90],[25,-97],[22,-97],[20,-105],[23,-110],[30,-115],[33,-118],
            [40,-124],[48,-125],[55,-130],[60,-140],[65,-140],[71,-141]
        ],
        // Южная Америка
        southAmerica: [
            [12,-72],[11,-64],[8,-60],[5,-52],[0,-50],[-5,-35],[-10,-36],
            [-20,-40],[-25,-48],[-35,-56],[-45,-66],[-52,-70],[-55,-68],
            [-50,-73],[-42,-73],[-35,-72],[-25,-70],[-18,-70],[-10,-78],
            [-4,-80],[-1,-80],[4,-77],[8,-76],[10,-75],[12,-72]
        ],
        // Европа + Азия
        eurasia: [
            [71,25],[70,40],[72,70],[73,100],[74,130],[72,150],[68,180],
            [65,180],[62,175],[60,160],[58,140],[52,140],[48,135],[45,135],
            [42,130],[40,128],[35,127],[30,122],[25,120],[22,115],[20,110],
            [15,105],[10,105],[5,102],[2,100],[5,95],[10,90],[15,85],
            [20,80],[22,75],[25,70],[25,60],[30,55],[35,40],[35,30],
            [40,26],[42,20],[38,15],[35,10],[32,5],[30,-5],[35,-10],
            [40,-10],[45,-10],[50,-5],[52,5],[55,10],[58,15],[62,10],
            [65,15],[70,25],[71,25]
        ],
        // Африка
        africa: [
            [37,10],[37,0],[35,-5],[33,-10],[30,-17],[25,-17],[20,-17],
            [15,-17],[10,-15],[5,-10],[5,-5],[5,0],[3,10],[0,10],
            [-5,12],[-10,14],[-17,12],[-22,14],[-28,17],[-34,20],[-35,25],
            [-34,30],[-28,32],[-20,35],[-15,40],[-10,40],[-5,40],[0,42],
            [5,45],[10,50],[12,50],[15,40],[20,38],[25,35],[30,32],
            [32,28],[35,20],[37,15],[37,10]
        ],
        // Австралия
        australia: [
            [-12,132],[-12,142],[-15,145],[-20,150],[-25,153],[-30,153],
            [-33,152],[-38,146],[-38,140],[-35,138],[-32,133],[-31,127],
            [-32,122],[-34,116],[-30,115],[-25,113],[-20,120],[-17,122],
            [-15,125],[-13,128],[-12,132]
        ],
        // Гренландия
        greenland: [
            [83,-35],[82,-25],[80,-20],[75,-20],[70,-25],[65,-40],[60,-45],
            [60,-50],[65,-55],[70,-55],[75,-60],[80,-55],[83,-45],[83,-35]
        ],
        // Антарктида (условно)
        antarctica: [
            [-70,-180],[-70,-150],[-70,-100],[-70,-50],[-70,0],[-70,50],
            [-70,100],[-70,150],[-70,180],[-90,180],[-90,-180],[-70,-180]
        ],
    };

    // --------------------------------------------------------
    //  Инициализация
    // --------------------------------------------------------
    function init() {
        canvas = document.getElementById('globe-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);

        lastFrame = performance.now();
        loop();
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight - 36; // высота Menu Bar

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Центр и радиус глобуса
        cx = W / 2;
        cy = H / 2;
        R = Math.min(W, H) * 0.32;
    }

    // --------------------------------------------------------
    //  Солнечное положение (subsolar point)
    //  Возвращает широту/долготу точки, где солнце в зените
    // --------------------------------------------------------
    function getSolarPosition(date) {
        // День года
        const start = new Date(date.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((date - start) / 86400000);

        // Склонение солнца — широта подсolarной точки
        const declination = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);

        // Долгота — зависит от времени UTC
        const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
        // В полдень по Гринвичу subsolar на 0°, в полночь — на 180°
        const longitude = (12 - utcHours) * 15;

        return {
            lat: declination * Math.PI / 180,
            lon: longitude * Math.PI / 180,
        };
    }

    // --------------------------------------------------------
    //  Проекция: сферические координаты → 2D (ортографическая)
    //  Наклон — 23.5° (как наклон оси Земли)
    // --------------------------------------------------------
    function project(lat, lon, tiltAxis = 23.5 * Math.PI / 180) {
        // Широта и долгота в радианах
        const phi = lat;
        const lambda = lon;

        // Ортографическая проекция с наклоном оси
        const cosLat = Math.cos(phi);
        const sinLat = Math.sin(phi);

        // Вращение вокруг оси Y (долгота) и наклон вокруг X
        const x0 = cosLat * Math.sin(lambda);
        const y0 = sinLat;
        const z0 = cosLat * Math.cos(lambda);

        // Наклон оси
        const cosT = Math.cos(tiltAxis);
        const sinT = Math.sin(tiltAxis);

        const y1 = y0 * cosT - z0 * sinT;
        const z1 = y0 * sinT + z0 * cosT;

        return {
            x: cx + x0 * R,
            y: cy - y1 * R,
            visible: z1 >= 0,
            z: z1,
        };
    }

    // --------------------------------------------------------
    //  Определить, освещена ли точка (день/ночь)
    //  Скалярное произведение нормали точки и направления на солнце
    // --------------------------------------------------------
    function isDaylight(lat, lon, sunPos) {
        const dLat = lat;
        const dLon = lon;

        // Вектор нормали точки на сфере
        const nx = Math.cos(dLat) * Math.cos(dLon);
        const ny = Math.sin(dLat);
        const nz = Math.cos(dLat) * Math.sin(dLon);

        // Вектор направления на солнце
        const sx = Math.cos(sunPos.lat) * Math.cos(sunPos.lon);
        const sy = Math.sin(sunPos.lat);
        const sz = Math.cos(sunPos.lat) * Math.sin(sunPos.lon);

        // Скалярное произведение > 0 — освещена
        return (nx * sx + ny * sy + nz * sz) > 0;
    }

    // --------------------------------------------------------
    //  Звёзды — генерируются один раз
    // --------------------------------------------------------
    let stars = null;
    function initStars() {
        stars = [];
        const count = 300;
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.4 + 0.3,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.005,
            });
        }
    }

    // --------------------------------------------------------
    //  Отрисовка звёздного фона
    // --------------------------------------------------------
    function drawStars(t) {
        // Градиентный фон неба
        const skyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H));
        skyGrad.addColorStop(0, '#0a0a1a');
        skyGrad.addColorStop(0.5, '#05050f');
        skyGrad.addColorStop(1, '#000005');

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // Звёзды
        if (!stars) initStars();
        stars.forEach(star => {
            star.twinkle += star.speed;
            const alpha = 0.4 + Math.sin(star.twinkle) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // --------------------------------------------------------
    //  Отрисовка глобуса
    // --------------------------------------------------------
    function drawGlobe(t) {
        const now = new Date();
        const sunPos = getSolarPosition(now);

        // ---- Атмосферное свечение вокруг Земли ----
        const atmoGrad = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.4);
        atmoGrad.addColorStop(0, 'rgba(74, 158, 255, 0.15)');
        atmoGrad.addColorStop(0.5, 'rgba(74, 158, 255, 0.05)');
        atmoGrad.addColorStop(1, 'rgba(74, 158, 255, 0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // ---- Основа Земли (океан) ----
        const earthGrad = ctx.createRadialGradient(
            cx - R * 0.3, cy - R * 0.3, R * 0.1,
            cx, cy, R
        );
        earthGrad.addColorStop(0, '#1a4d80');
        earthGrad.addColorStop(0.7, '#0a2d5c');
        earthGrad.addColorStop(1, '#04152e');

        ctx.fillStyle = earthGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();

        // ---- Континенты ----
        Object.values(CONTINENTS).forEach(polygon => {
            drawContinent(polygon, sunPos);
        });

        // ---- Терминатор (граница дня и ночи) ----
        drawTerminator(sunPos);

        // ---- Блик от солнца ----
        drawSunGlint(sunPos);

        // ---- Внешний контур Земли ----
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();

        // ---- Внутреннее свечение (граница) ----
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.15)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawContinent(polygon, sunPos) {
        // Проходим по точкам полигона, рисуем только видимые
        ctx.beginPath();
        let started = false;

        for (let i = 0; i < polygon.length; i++) {
            const [lat, lon] = polygon[i];
            const p = project(lat * Math.PI / 180, lon * Math.PI / 180);

            if (!p.visible) {
                // Точка не видна — прерываем путь
                if (started) {
                    ctx.stroke();
                    started = false;
                }
                continue;
            }

            if (!started) {
                ctx.moveTo(p.x, p.y);
                started = true;
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }

        // Цвет — средне-зелёный, приглушённый
        ctx.fillStyle = 'rgba(45, 90, 60, 0.9)';
        ctx.fill();

        // Обводка
        ctx.strokeStyle = 'rgba(80, 150, 90, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Затемнение ночной стороны — повторная отрисовка с маской
        // (сначала рисуем континент целиком, потом маскируем ночную часть)
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        drawNightOverlay(sunPos);
        ctx.restore();
    }

    function drawNightOverlay(sunPos) {
        // Проходим по всей видимой области и затемняем ночную сторону
        // Упрощённый способ: градиент от subsolar точки
        const p = project(sunPos.lat, sunPos.lon);
        if (!p.visible) return;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 1.6);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.55, 'rgba(0, 10, 30, 0.5)');
        grad.addColorStop(0.75, 'rgba(0, 10, 30, 0.8)');
        grad.addColorStop(1, 'rgba(0, 5, 20, 0.9)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    function drawTerminator(sunPos) {
        // Терминатор — большой круг, перпендикулярный направлению на солнце
        // Находим точки на этом круге, видимые на сфере

        // Вектор от центра Земли к солнцу
        const sx = Math.cos(sunPos.lat) * Math.cos(sunPos.lon);
        const sy = Math.sin(sunPos.lat);
        const sz = Math.cos(sunPos.lat) * Math.sin(sunPos.lon);

        // Находим два перпендикулярных вектора
        // v1 = нормаль к (0,1,0) и s
        let v1x = -sz, v1y = 0, v1z = sx;
        const v1len = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z) || 1;
        v1x /= v1len; v1y /= v1len; v1z /= v1len;

        // v2 = s × v1
        const v2x = sy * v1z - sz * v1y;
        const v2y = sz * v1x - sx * v1z;
        const v2z = sx * v1y - sy * v1x;

        // Точки на терминаторе: cos(t)*v1 + sin(t)*v2
        ctx.beginPath();
        let started = false;

        const SEGMENTS = 180;
        for (let i = 0; i <= SEGMENTS; i++) {
            const t = (i / SEGMENTS) * Math.PI * 2;

            const px = Math.cos(t) * v1x + Math.sin(t) * v2x;
            const py = Math.cos(t) * v1y + Math.sin(t) * v2y;
            const pz = Math.cos(t) * v1z + Math.sin(t) * v2z;

            // Точка видна, если pz (относительно оси Z проекции) > 0
            // Но нам нужна проверка видимости относительно камеры
            // Приблизительно: если z-координата на сфере > 0 (с учётом наклона оси)

            // Используем ту же логику проекции
            const lat = Math.asin(py);
            const lon = Math.atan2(pz, px);
            const pr = project(lat, lon);

            if (!pr.visible) {
                if (started) {
                    ctx.stroke();
                    started = false;
                }
                continue;
            }

            if (!started) {
                ctx.moveTo(pr.x, pr.y);
                started = true;
            } else {
                ctx.lineTo(pr.x, pr.y);
            }
        }

        // Стиль терминатора
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.75)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 200, 100, 0.8)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function drawSunGlint(sunPos) {
        const p = project(sunPos.lat, sunPos.lon);
        if (!p.visible) return;

        const glintGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 0.7);
        glintGrad.addColorStop(0, 'rgba(255, 250, 220, 0.5)');
        glintGrad.addColorStop(0.2, 'rgba(255, 220, 150, 0.2)');
        glintGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');

        ctx.fillStyle = glintGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    // --------------------------------------------------------
    //  Главный цикл
    // --------------------------------------------------------
    function loop() {
        const now = performance.now();

        // Ограничиваем до 30 FPS — экономия батареи
        if (now - lastFrame < 33) {
            animationId = requestAnimationFrame(loop);
            return;
        }
        lastFrame = now;

        // Очистка
        ctx.clearRect(0, 0, W, H);

        // Слои
        drawStars(now / 1000);
        drawGlobe(now / 1000);

        animationId = requestAnimationFrame(loop);
    }

    // --------------------------------------------------------
    //  Остановка при скрытии страницы (экономия батареи)
    // --------------------------------------------------------
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationId) cancelAnimationFrame(animationId);
            animationId = null;
        } else {
            if (!animationId) {
                lastFrame = performance.now();
                loop();
            }
        }
    });

    // --------------------------------------------------------
    //  Запуск
    // --------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();