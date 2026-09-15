/**
 * Вибрация.
 *
 * Проверять здесь по существу нечего — кроме одного: модуль обязан молчать
 * там, где вибрации нет. В Safari на iPad её нет вовсе, и падение в этом
 * месте уронило бы обработчик ответа, то есть занятие целиком.
 */

import { describe, it, equal, assert } from '../runner.js';
import { дрожь } from '../../js/core/haptics.js';

describe('Вибрация', () => {

    it('знает, есть ли она на этом устройстве', () => {
        equal(typeof дрожь.доступна, 'boolean');
    });

    it('не падает, даже когда её нет', () => {
        const было = navigator.vibrate;

        try {
            // Как на iPad: метода просто нет
            delete Navigator.prototype.vibrate;
            navigator.vibrate = undefined;

            дрожь.верно();
            дрожь.мимо();
            дрожь.касание();

            equal(дрожь.доступна, false);
        } finally {
            if (было) navigator.vibrate = было;
        }
    });

    it('работает и когда она есть', () => {
        const было = navigator.vibrate;
        const вызовы = [];

        navigator.vibrate = (р) => { вызовы.push(р); return true; };

        try {
            дрожь.верно();
            дрожь.мимо();

            equal(вызовы.length, 2);
            assert(Array.isArray(вызовы[1]), 'промах должен отличаться рисунком, а не силой');
        } finally {
            navigator.vibrate = было;
        }
    });

    it('отказ вибрации не выходит наружу', () => {
        const было = navigator.vibrate;
        navigator.vibrate = () => { throw new Error('нельзя'); };

        try {
            дрожь.касание();
        } finally {
            navigator.vibrate = было;
        }
    });
});
