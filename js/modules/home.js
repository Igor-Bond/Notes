/**
 * Экран выбора уровня — он же главный.
 *
 * Первое, что видит ребёнок, это не меню и не настройки, а семь карточек,
 * каждая из которых начинает занятие одним нажатием. Всё остальное —
 * звук, сброс, версия — уехало в подвал: взрослому оно нужно раз в месяц,
 * ребёнку не нужно никогда.
 *
 * Сверху — сколько звёзд собрано из всех возможных. В девять лет это первый
 * вопрос к такому приложению, и отвечать на него россыпью звёздочек по
 * карточкам значит не отвечать вовсе: их пришлось бы складывать глазами.
 */

import { ui } from '../core/ui.js';
import { actions } from '../core/actions.js';
import { УРОВНИ } from '../core/levels.js';
import { хранилище } from '../core/store.js';
import { нарисоватьКлюч } from '../core/staff.js';
import { дрожь } from '../core/haptics.js';
import { VERSION } from '../version.js';
import { app } from '../app.js';
import { начать } from './drill.js';

/** Три звезды на уровень — вот и весь потолок. */
const ЗВЁЗД_ВСЕГО = УРОВНИ.length * 3;

function собрано() {
    return УРОВНИ.reduce((сумма, у) => сумма + хранилище.уровень(у.id).звёзды, 0);
}

function карточка(уровень) {
    const пройдено = хранилище.уровень(уровень.id);
    const ключ = уровень.вопросы[0].ключ;
    const взят = пройдено.звёзды === 3;

    return ui.html`
        <button class="level ${взят ? 'done' : ''}"
                data-action="уровень" data-id="${уровень.id}">
            <span class="badge">
                ${ui.raw(нарисоватьКлюч(ключ))}
                ${взят ? ui.html`<span class="badge-check" aria-label="Уровень пройден">✓</span>` : ''}
            </span>
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
        const есть = собрано();

        return ui.html`
            <div class="head">
                <h1>Ноты</h1>
                <p class="head-sub">Выбери, что учим сегодня</p>
            </div>

            <div class="total">
                <div class="total-line">
                    <span class="total-label">Собрано звёзд</span>
                    <span class="total-count">${есть} из ${ЗВЁЗД_ВСЕГО} <span class="star on">★</span></span>
                </div>
                <div class="bar">
                    <div class="bar-fill" style="--доля: ${(есть / ЗВЁЗД_ВСЕГО).toFixed(3)}"></div>
                </div>
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

actions.on('уровень', (el) => {
    дрожь.касание();
    начать(el.dataset.id);
});

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
