/**
 * Экран выбора уровня — он же главный.
 *
 * Первое, что видит ребёнок, это не меню и не настройки, а семь карточек,
 * каждая из которых начинает занятие одним нажатием. Всё остальное —
 * звук, сброс, версия — уехало в подвал: взрослому оно нужно раз в месяц,
 * ребёнку не нужно никогда.
 */

import { ui } from '../core/ui.js';
import { actions } from '../core/actions.js';
import { УРОВНИ } from '../core/levels.js';
import { хранилище } from '../core/store.js';
import { нарисоватьКлюч } from '../core/staff.js';
import { VERSION } from '../version.js';
import { app } from '../app.js';
import { начать } from './drill.js';

function карточка(уровень) {
    const пройдено = хранилище.уровень(уровень.id);
    const ключ = уровень.вопросы[0].ключ;

    return ui.html`
        <button class="level ${пройдено.звёзды === 3 ? 'done' : ''}"
                data-action="уровень" data-id="${уровень.id}">
            <span class="level-clef">${ui.raw(нарисоватьКлюч(ключ))}</span>
            <span class="level-text">
                <span class="level-name">${уровень.имя}</span>
                <span class="level-sub">${уровень.подпись}</span>
                <span class="level-stars">${ui.звёзды(пройдено.звёзды)}</span>
            </span>
            <span class="level-count">${уровень.вопросы.length}</span>
        </button>
    `;
}

export const home = {

    render() {
        return ui.html`
            <div class="head">
                <h1>Ноты</h1>
                <p class="head-sub">Выбери, что учим сегодня</p>
            </div>

            <div class="levels">
                ${УРОВНИ.map(карточка)}
            </div>

            <div class="footer">
                <label class="switch">
                    <input type="checkbox" data-change="звук" ${хранилище.звук ? 'checked' : ''}>
                    <span>Звук</span>
                </label>

                <button class="quiet-btn" data-action="сброс">Начать всё заново</button>
                <p class="version">Версия ${VERSION}</p>
            </div>
        `;
    }
};

actions.on('уровень', (el) => начать(el.dataset.id));

actions.onChange('звук', (el) => {
    хранилище.звук = el.checked;
});

/**
 * Сброс спрашивает подтверждение.
 *
 * Кнопка стоит на экране, до которого ребёнок дотягивается сам, а стирает
 * она всё, что он собрал за месяц. Вопрос здесь не формальность: это
 * единственное, что стоит между случайным нажатием и пустыми карточками.
 */
actions.on('сброс', () => {
    if (!confirm('Стереть все звёзды и начать заново?')) return;

    хранилище.сбросить();
    app.render();
});
