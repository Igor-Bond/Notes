/**
 * Экраны и маршрутизация.
 *
 * Маршрут живёт в адресной строке после решётки: #/занятие/октава. Так
 * работает кнопка «назад» браузера — на планшете ребёнок жмёт её первой, —
 * и так приложение остаётся набором статических файлов: серверных правил
 * переписывания путей на GitHub Pages нет.
 */

import { home } from './modules/home.js';
import { занятиеЭкран } from './modules/drill.js';
import { итогЭкран } from './modules/result.js';

/**
 * Список экранов собирается при первом обращении, а не при загрузке модуля.
 *
 * Здесь круговая зависимость: app.js импортирует экраны, а каждый экран
 * импортирует app.js ради перехода и перерисовки. Модули ES такое допускают,
 * но пока модуль не доисполнен, его переменные недоступны, и сборка списка
 * прямо в теле файла падает, стоит проверке импортировать экран первым.
 */
let ЭКРАНЫ = null;

function экраны() {
    if (!ЭКРАНЫ) {
        ЭКРАНЫ = {
            выбор: home,
            занятие: занятиеЭкран,
            итог: итогЭкран
        };
    }

    return ЭКРАНЫ;
}

const ПО_УМОЛЧАНИЮ = 'выбор';

function разобрать(hash) {
    const части = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    const имя = decodeURIComponent(части[0] || ПО_УМОЛЧАНИЮ);

    return {
        name: экраны()[имя] ? имя : ПО_УМОЛЧАНИЮ,
        param: части[1] ? decodeURIComponent(части[1]) : null
    };
}

export const app = {

    route: { name: ПО_УМОЛЧАНИЮ, param: null },

    init() {
        window.addEventListener('hashchange', () => {
            app.route = разобрать(location.hash);
            app.render();
        });

        app.route = разобрать(location.hash);
        app.render();
    },

    /** Переход. Адрес меняется, отрисовку вызовет hashchange. */
    go(имя, параметр) {
        const адрес = параметр ? `#/${имя}/${encodeURIComponent(параметр)}` : `#/${имя}`;

        if (location.hash === адрес) {
            // Тот же адрес события не вызовет, а перерисовать надо: «ещё
            // раз» на итоге ведёт на тот же уровень с новым занятием
            app.route = разобрать(адрес);
            return app.render();
        }

        location.hash = адрес;
    },

    render() {
        const место = document.getElementById('screen');
        if (!место) return;

        const экран = экраны()[app.route.name] || home;

        try {
            место.innerHTML = String(экран.render(app.route.param));
            место.scrollTop = 0;
        } catch (e) {
            console.error('[Экран] Не удалось нарисовать:', e);
            место.innerHTML = '<div class="empty-note">Экран не открылся. Попробуйте обновить страницу.</div>';
        }

        экран.after?.(app.route.param);
    }
};
