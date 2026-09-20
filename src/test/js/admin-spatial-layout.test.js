const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const SpatialDraft = require('../../main/resources/static/js/admin-spatial-layout.js');
const script = fs.readFileSync('src/main/resources/static/js/admin-spatial-layout.js', 'utf8');
const items = () => [{id: '1', code: 'HS1', x: null, y: null}, {id: '2', code: 'HS2', x: 10, y: 20}];
const rect = {left: 100, top: 50, width: 800, height: 400};
test('click uses actual image rectangle, excluding outer padding', () => {
    const state = new SpatialDraft(items()); state.select('1');
    assert.equal(state.place(400, 300, rect), true);
    assert.equal(state.selected.x, 37.5); assert.equal(state.selected.y, 62.5);
});
test('repeated clicks move one marker and another selection places independently', () => {
    const state = new SpatialDraft(items()); state.select('1'); state.place(400, 300, rect); state.place(500, 250, rect);
    assert.equal(state.items.length, 2); assert.equal(state.items[0].x, 50);
    state.select('2'); state.place(300, 150, rect); assert.equal(state.items[1].x, 25); assert.equal(state.items[0].x, 50);
});
test('clear and draft changes never mutate saved initial state', () => {
    const saved = items(), state = new SpatialDraft(saved); state.clear('2');
    assert.equal(state.items[1].x, null); assert.equal(state.items[1].y, null); assert.equal(saved[1].x, 10);
    assert.equal(new SpatialDraft(saved).items[1].x, 10);
});
test('percentage position is stable across image resize', () => {
    const state = new SpatialDraft(items()); state.select('1'); state.place(500, 250, rect);
    state.place(300, 150, {...rect, width: 400, height: 200});
    assert.equal(state.selected.x, 50); assert.equal(state.selected.y, 50);
});
test('invalid selection, unloaded image and outside clicks do not place', () => {
    const state = new SpatialDraft(items()); assert.equal(state.place(200, 200, rect), false);
    state.select('1');
    for (const [x, y, r] of [[0, 0, rect], [901, 100, rect], [NaN, 100, rect], [200, 100, {...rect, width: 0}]])
        assert.equal(state.place(x, y, r), false);
    assert.equal(state.selected.x, null);
});
test('all image edges are accepted and precision is four decimal places', () => {
    const state = new SpatialDraft(items()); state.select('1'); state.place(100, 50, rect);
    assert.equal(state.selected.x, 0); assert.equal(state.selected.y, 0);
    state.place(900, 450, rect); assert.equal(state.selected.x, 100); assert.equal(state.selected.y, 100);
    state.place(101, 51, {...rect, width: 300, height: 300}); assert.equal(state.selected.x, .3333);
});
function editor(withPhoto = false, count = 2) {
    class Element {
        constructor() { this.children = []; this.listeners = {}; this.attributes = {}; this.style = {}; this.dataset = {}; this.value = ''; }
        append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
        remove() { this.parent.children = this.parent.children.filter(node => node !== this); }
        replaceChildren() { this.children = []; }
        setAttribute(key, value) { this.attributes[key] = value; }
        addEventListener(name, fn) { this.listeners[name] = fn; }
        querySelector(selector) { return this.fields[selector]; }
    }
    const form = new Element(), image = new Element(), markers = new Element(), status = new Element(), save = new Element();
    const rows = Array.from({length: count}, (_, i) => {
        const row = new Element(); row.dataset = {spotId: String(i + 1), code: `HS${i + 1}`, name: '정원', url: withPhoto && i === 0 ? '/admin/spots/1/images/1/content' : ''};
        row.fields = Object.fromEntries(['[data-x]', '[data-y]', '[data-select]', '[data-clear]', '[data-position-status]'].map(key => [key, new Element()]));
        return row;
    });
    form.querySelectorAll = () => rows;
    image.naturalWidth = 800; image.rect = {...rect}; image.getBoundingClientRect = () => image.rect;
    const window = new Element();
    vm.runInNewContext(script, {document: {getElementById: id => ({'spatial-form': form, 'spatial-image': image, 'spatial-markers': markers, 'spatial-status': status, 'spatial-save': save}[id]), createElement: () => new Element()}, window});
    return {form, image, markers, status, save, rows, window,
        select(i) { rows[i].fields['[data-select]'].listeners.click(); },
        click(x, y) { image.listeners.click({clientX: x, clientY: y}); }
    };
}
test('actual UI stages hidden inputs, moves marker, selects other HS, clears and submits', () => {
    const ui = editor(); ui.select(0); ui.click(500, 250);
    assert.equal(ui.markers.children.length, 1); assert.equal(ui.markers.children[0].style.left, '50%');
    assert.equal(ui.rows[0].fields['[data-x]'].value, 50);
    ui.click(300, 150); assert.equal(ui.markers.children.length, 1); assert.equal(ui.markers.children[0].style.left, '25%');
    ui.select(1); ui.click(400, 300); assert.equal(ui.markers.children.length, 2);
    ui.rows[0].fields['[data-clear]'].listeners.click(); assert.equal(ui.markers.children.length, 1);
    assert.equal(ui.rows[0].fields['[data-x]'].value, ''); assert.equal(ui.rows[0].fields['[data-y]'].value, '');
    let warning = false; ui.window.listeners.beforeunload({preventDefault: () => { warning = true; }}); assert.equal(warning, true);
    ui.form.listeners.submit({preventDefault: () => assert.fail('valid submit')});
    warning = false; ui.window.listeners.beforeunload({preventDefault: () => { warning = true; }}); assert.equal(warning, false);
});
test('actual marker fallback uses HS code; failed representative photo exposes fallback', () => {
    const ui = editor(true); ui.select(0); ui.click(500, 250);
    const circle = ui.markers.children[0].children[0]; assert.equal(circle.textContent, 'HS1');
    assert.equal(circle.children[0].src, '/admin/spots/1/images/1/content'); circle.children[0].listeners.error(); assert.equal(circle.children.length, 0);
    ui.select(1); ui.click(400, 300); assert.equal(ui.markers.children[1].children[0].textContent, 'HS2');
    assert.equal(ui.markers.children[1].children[0].children.length, 0);
});
test('actual resize retains percentage styles and marker selection does not reposition it', () => {
    const ui = editor(); ui.select(0); ui.click(500, 250); ui.image.rect.width = 400; ui.image.rect.height = 200;
    ui.markers.children[0].listeners.click(); assert.equal(ui.markers.children[0].style.left, '50%'); assert.equal(ui.markers.children[0].style.top, '50%');
});
test('image load failure and zero HS prevent accidental save; absent page is safe', () => {
    const ui = editor(); ui.image.listeners.error(); assert.equal(ui.save.disabled, true);
    assert.equal(editor(false, 0).save.disabled, true);
    assert.doesNotThrow(() => vm.runInNewContext(script, {document: {getElementById: () => null}}));
    assert.doesNotMatch(script, /fetch\(|XMLHttpRequest/);
});
