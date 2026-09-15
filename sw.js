/**
 * Тренажёр нот — сервис-воркер.
 *
 * Стратегии:
 *   - переходы по страницам (HTML) → сначала сеть, при неудаче кэш index.html
 *   - код и стили (js, css)        → сначала сеть, чтобы правки доезжали сразу
 *   - значки                       → сначала кэш, меняются вместе с версией
 *
 * У «сначала сеть» есть срок ожидания: без него запуск на слабой связи ждал
 * бы ответа до срабатывания таймаута самого браузера, хотя рабочая копия
 * лежит в кэше. Занятие начинается там, где связи может не быть вовсе, —
 * в машине по дороге в музыкальную школу, — и офлайн здесь не запасной
 * режим, а обычный.
 *
 * ВАЖНО: при изменении состава файлов поднимать APP_VERSION, иначе у
 * установленных приложений останется старый кэш.
 */

const APP_VERSION = 'v3';
const CACHE_NAME = `notes-${APP_VERSION}`;

const СРОК_СЕТИ = 3000;

const ФАЙЛЫ = [
    './',
    'index.html',
    'manifest.json',
    'css/style.css',

    'assets/icon-192.png',
    'assets/icon-512.png',
    'assets/icon-maskable-192.png',
    'assets/icon-maskable-512.png',

    'js/main.js',
    'js/app.js',
    'js/version.js',

    'js/core/actions.js',
    'js/core/drill.js',
    'js/core/haptics.js',
    'js/core/levels.js',
    'js/core/notes.js',
    'js/core/staff.js',
    'js/core/store.js',
    'js/core/tone.js',
    'js/core/ui.js',

    'js/modules/drill.js',
    'js/modules/home.js',
    'js/modules/result.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            /*
             * Каждый файл кладётся отдельно.
             *
             * cache.addAll валит установку целиком, стоит одному адресу
             * ответить не так, — и приложение остаётся вовсе без офлайна
             * из-за одного значка.
             */
            .then((кэш) => Promise.all(ФАЙЛЫ.map((адрес) => кэш.add(адрес).catch(
                (e) => console.warn('[SW] Не удалось положить в кэш', адрес, e)
            ))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((имена) => Promise.all(имена
                .filter((имя) => имя.startsWith('notes-') && имя !== CACHE_NAME)
                .map((имя) => caches.delete(имя))))
            .then(() => self.clients.claim())
    );
});

/** Сеть со сроком: не дождались — берём из кэша. */
function изСети(запрос) {
    return new Promise((готово, мимо) => {
        const часы = setTimeout(() => мимо(new Error('Сеть не ответила')), СРОК_СЕТИ);

        fetch(запрос).then((ответ) => {
            clearTimeout(часы);
            готово(ответ);
        }).catch((e) => {
            clearTimeout(часы);
            мимо(e);
        });
    });
}

self.addEventListener('fetch', (event) => {
    const запрос = event.request;

    if (запрос.method !== 'GET') return;

    const адрес = new URL(запрос.url);
    if (адрес.origin !== location.origin) return;

    const значок = /\.(png|svg|ico)$/.test(адрес.pathname);

    // Значки — сначала кэш: они не меняются иначе как вместе с версией,
    // а ходить за ними в сеть на каждом запуске незачем
    if (значок) {
        event.respondWith(
            caches.match(запрос).then((найдено) => найдено || fetch(запрос).then((ответ) => {
                const копия = ответ.clone();
                caches.open(CACHE_NAME).then((кэш) => кэш.put(запрос, копия));
                return ответ;
            }))
        );
        return;
    }

    event.respondWith(
        изСети(запрос)
            .then((ответ) => {
                if (ответ.ok) {
                    const копия = ответ.clone();
                    caches.open(CACHE_NAME).then((кэш) => кэш.put(запрос, копия));
                }
                return ответ;
            })
            .catch(() => caches.match(запрос)
                // Переход по адресу вроде #/занятие/октава в офлайне ведёт
                // в тот же index.html — своего файла у него нет
                .then((найдено) => найдено
                    || (запрос.mode === 'navigate' ? caches.match('index.html') : undefined)
                    || new Response('Нет сети', { status: 503, statusText: 'Нет сети' })))
    );
});
