/**
 * Точка входа.
 *
 * Зависимости объявлены через import, порядком загрузки занимается браузер.
 * Inline-обработчиков onclick нет — вместо них делегирование по data-action,
 * поэтому выкладывать модули в window не нужно.
 */

import { app } from './app.js';
import { actions } from './core/actions.js';

/**
 * Упавшее действие обязано быть видно.
 *
 * Молча съеденная ошибка на тренажёре выглядит как «кнопка не работает», и
 * разбираться с этим будет не тот, кто нажимал.
 */
actions.onError((ошибка, имя) => {
    console.error(`[Действие «${имя}»]`, ошибка);
    alert(`Не получилось. Попробуйте обновить страницу.\n\n${ошибка?.message || ошибка}`);
});

window.addEventListener('error', (e) => console.error('[Страница]', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => console.error('[Обещание]', e.reason));

/**
 * Сервис-воркер: офлайн и обновления.
 *
 * Новая версия не применяется сама. Перезагрузка посреди занятия стирает
 * ответы и выглядит поломкой; лучше показать её после следующего запуска.
 */
function зарегистрироватьВоркер() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('sw.js')
        .catch((e) => console.error('[PWA] Не удалось зарегистрировать сервис-воркер:', e));
}

actions.init();
app.init();

window.addEventListener('load', зарегистрироватьВоркер);
