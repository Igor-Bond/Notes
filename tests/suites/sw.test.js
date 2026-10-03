/**
 * Чужие кэши и воркеры на общем адресе (Р-13).
 *
 * У GitHub Pages один источник на все приложения владельца:
 * igor-bond.github.io — это и «Ноты», и журнал тренировок, и шахматы, и
 * wortschatz. А хранилище кэшей и список сервис-воркеров браузер ведёт по
 * источнику, не по каталогу. Всё, что «Ноты» стирают «у себя», они стирают
 * и у соседей — и соседи без сети перестают открываться.
 *
 * Проверяется не текст, а поведение: настоящий код исполняется на
 * подделанном хранилище, где рядом с кэшами «Нот» лежат кэши соседей. Поиск
 * по тексту пропустил бы ту же ошибку, записанную иначе.
 */

import { describe, it, equal } from '../runner.js';

/** Подделка CacheStorage: помнит имена и что из них удалили. */
function fakeCaches(names) {
    const живые = new Set(names);

    return {
        живые,
        async keys() { return [...живые]; },
        async delete(name) { return живые.delete(name); }
    };
}

const СОСЕДИ = ['workout-v294', 'chess-v40', 'wortschatz-v7'];

/**
 * Настоящий sw.js на подделанном окружении.
 *
 * Воркер — обычный скрипт без импортов, поэтому исполняется как тело
 * функции, где self и caches — параметры. Имя текущего кэша берём у него
 * же: проверка не должна знать номер версии, иначе её пришлось бы править
 * при каждом подъёме APP_VERSION.
 */
async function загрузитьВоркер(caches) {
    const код = await (await fetch('../sw.js', { cache: 'no-store' })).text();
    const обработчики = {};

    const self = {
        addEventListener: (type, fn) => { обработчики[type] = fn; },
        skipWaiting: async () => {},
        clients: { claim: async () => {} }
    };

    const CACHE_NAME = new Function('self', 'caches', `${код}\nreturn CACHE_NAME;`)(self, caches);
    return { обработчики, CACHE_NAME };
}

describe('Сервис-воркер и соседи по адресу', () => {

    /*
     * Сейчас это уже так — проверка сторожит, а не чинит. Журнал тренировок
     * стирал при активации «всё, кроме своего» и тем оставлял «Ноты» без
     * офлайна (его Р-213); здесь та же ошибка написалась бы одной правкой
     * фильтра.
     */
    it('при активации стирает только свои прежние кэши', async () => {
        const caches = fakeCaches([]);
        const { обработчики, CACHE_NAME } = await загрузитьВоркер(caches);

        caches.живые.add(CACHE_NAME);
        caches.живые.add('notes-v1');
        for (const имя of СОСЕДИ) caches.живые.add(имя);

        let ждать;
        обработчики.activate({ waitUntil: (p) => { ждать = p; } });
        await ждать;

        equal([...caches.живые].sort(), [CACHE_NAME, ...СОСЕДИ].sort(),
            'прошлая версия «Нот» уходит, кэши соседей остаются');
    });

    /*
     * Страница проверок живёт там же, на Pages, и снимала с источника всё:
     * и кэши, и воркеры. Кто открыл проверки на живом адресе, оставлял
     * журнал тренировок и шахматы без офлайна — а снятому воркеру отдавать
     * свой кэш уже некому, даже если кэш уцелел.
     *
     * Её скрипт исполняется здесь же, как есть, на подделках. Управляющий
     * воркер подделан «есть», поэтому скрипт заканчивается перезагрузкой, а
     * не импортом проверок, — перезагрузка и служит знаком, что он дошёл до
     * конца.
     *
     * Среди воркеров есть «/Notes-old/»: область, которая начинается с того
     * же слова, но лежит вне приложения. Снять её значило бы сравнивать
     * адреса без косой черты на конце.
     */
    it('страница проверок снимает только воркер и кэши «Нот»', async () => {
        const скрипт = [...document.scripts].find((s) => s.textContent.includes('getRegistrations'));
        const { CACHE_NAME } = await загрузитьВоркер(fakeCaches([]));

        const снятые = [];
        const регистрация = (scope) => ({ scope, unregister: async () => { снятые.push(scope); return true; } });

        const navigator = {
            serviceWorker: {
                controller: {},
                getRegistrations: async () => [
                    регистрация('https://igor-bond.github.io/Notes/'),
                    регистрация('https://igor-bond.github.io/workout/'),
                    регистрация('https://igor-bond.github.io/Chess/'),
                    регистрация('https://igor-bond.github.io/Notes-old/')
                ]
            }
        };

        const caches = fakeCaches([CACHE_NAME, 'notes-v1', ...СОСЕДИ]);

        const готово = new Promise((resolve, reject) => {
            const location = {
                href: 'https://igor-bond.github.io/Notes/tests/index.html',
                reload: resolve
            };

            new Function('navigator', 'caches', 'location', 'globalThis', скрипт.textContent)(
                navigator, caches, location, {});

            setTimeout(() => reject(new Error('скрипт не дошёл до перезагрузки')), 2000);
        });

        await готово;

        equal(снятые, ['https://igor-bond.github.io/Notes/'], 'воркеры соседей не трогаются');
        equal([...caches.живые].sort(), [...СОСЕДИ].sort(),
            'кэши «Нот» уходят все, кэши соседей остаются');
    });
});
