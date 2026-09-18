const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../../main/resources/static/js/admin-image-gallery.js'), 'utf8');

function gallery(count = 3) {
    const main = count ? {src: 'representative.png', alt: '대표 사진'} : null;
    const badge = {hidden: false};
    const caption = {textContent: '대표 사진'};
    const thumbnails = count > 1 ? Array.from({length: count}, (_, i) => ({
        dataset: {imageUrl: `image-${i}.png`, imageName: i === 1 ? '<unsafe>.png' : `사진 ${i}`, representative: String(i === 0)},
        attributes: {'aria-pressed': String(i === 0)},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, listener) { this[name] = listener; }
    })) : [];
    return {main, badge, caption, thumbnails,
        querySelector(selector) {
            return {'[data-gallery-main]': main, '[data-gallery-badge]': badge, '[data-gallery-caption]': caption}[selector];
        },
        querySelectorAll() { return thumbnails; }
    };
}
function run(galleries) { vm.runInNewContext(script, {document: {querySelectorAll: () => galleries}}); }

test('empty and single-image galleries work without thumbnail controls', () => {
    const empty = gallery(0), single = gallery(1);
    assert.doesNotThrow(() => run([empty, single]));
    assert.equal(single.main.src, 'representative.png');
    assert.equal(single.badge.hidden, false);
});
test('thumbnail selection updates large image, filename, representative badge and pressed state', () => {
    const state = gallery(); run([state]);
    state.thumbnails[1].click();
    assert.equal(state.main.src, 'image-1.png');
    assert.equal(state.main.alt, '<unsafe>.png');
    assert.equal(state.caption.textContent, '<unsafe>.png');
    assert.equal(state.badge.hidden, true);
    assert.deepEqual(state.thumbnails.map(button => button.attributes['aria-pressed']), ['false', 'true', 'false']);
    state.thumbnails[0].click();
    assert.equal(state.badge.hidden, false);
    assert.equal(state.main.src, 'image-0.png');
});
test('multiple galleries do not affect each other', () => {
    const first = gallery(), second = gallery(); run([first, second]);
    second.thumbnails[2].click();
    assert.equal(first.main.src, 'representative.png');
    assert.equal(second.main.src, 'image-2.png');
});
