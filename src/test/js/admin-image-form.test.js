const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ImageDraft = require('../../main/resources/static/js/admin-image-form.js');
const file = (name = 'new.png', type = 'image/png', size = 100) => ({name, type, size});
const draft = () => new ImageDraft([{key: 'e:1', representative: true}, {key: 'e:2'}, {key: 'e:3'}]);
test('representative changes stay in memory and only one is selected', () => {
    const state = draft(); state.select(state.items[1]);
    assert.equal(state.payload().imageRepresentative, 'e:2');
    assert.equal(state.items.filter(i => i.representative).length, 1);
});
test('existing deletion is pending and deleting representative falls back', () => {
    const state = draft(); state.remove(state.items[0]);
    assert.equal(state.payload().imageDeleted, 'e:1');
    assert.equal(state.payload().imageRepresentative, 'e:2');
});
test('moving existing and new images gives consistent multipart indexes', () => {
    const state = draft(); state.add([file('D.png'), file('E.png')]);
    const item = state.items[4]; state.select(item); state.move(item, -1); state.move(item, -1);
    assert.deepEqual(state.payload(), {files: [item.file, state.items[4].file], imageOrder: 'e:1,e:2,n:0,e:3,n:1', imageDeleted: '', imageRepresentative: 'n:0'});
});
test('removing unsaved files excludes them from submission without server deletion', () => {
    const state = draft(); state.add([file()]); state.select(state.items[3]); state.remove(state.items[3]);
    assert.equal(state.payload().files.length, 0); assert.equal(state.payload().imageDeleted, '');
    assert.equal(state.payload().imageRepresentative, 'e:1');
});
test('all images removed means no representative', () => {
    const state = draft(); [...state.items].forEach(i => state.remove(i));
    assert.equal(state.payload().imageOrder, ''); assert.equal(state.payload().imageRepresentative, '');
});
test('new form permits representative and ordering before registration', () => {
    const state = new ImageDraft([]); state.add([file('a.png'), file('b.png')]);
    state.select(state.items[1]); state.move(state.items[1], -1);
    assert.equal(state.payload().imageRepresentative, 'n:0'); assert.equal(state.payload().files[0].name, 'b.png');
});
test('invalid batch leaves previous draft intact and validates total selected count', () => {
    const state = draft();
    for (const files of [[file('bad.gif', 'image/gif')], [file('big.png', 'image/png', 10485761)], [file('empty.png', 'image/png', 0)], Array.from({length: 11}, () => file())]) {
        assert.throws(() => state.add(files)); assert.equal(state.items.length, 3);
    }
    state.add(Array.from({length: 10}, () => file()));
    assert.throws(() => state.add([file()]));
});
test('leaving and reopening discards unsubmitted changes', () => {
    const state = draft(); state.remove(state.items[0]); state.move(state.items[1], -1);
    assert.equal(draft().payload().imageOrder, 'e:1,e:2,e:3');
});
test('missing representative and boundary moves have safe defaults', () => {
    const state = new ImageDraft([{key: 'e:1'}, {key: 'e:2'}]);
    state.move(state.items[0], -1); state.move(state.items[1], 1);
    assert.equal(state.payload().imageRepresentative, 'e:1'); assert.equal(state.payload().imageOrder, 'e:1,e:2');
});
test('pages without editor do nothing and editor has no network operations', () => {
    const script = fs.readFileSync('src/main/resources/static/js/admin-image-form.js', 'utf8');
    assert.doesNotThrow(() => vm.runInNewContext(script, {document: {getElementById: () => null, querySelector: () => null}}));
    assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|\.submit\(|requestSubmit\(/);
});

function editor() {
    class Element {
        constructor() { this.children = []; this.dataset = {}; this.listeners = {}; }
        append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
        after() {}
        setAttribute() {}
        replaceChildren() { this.children = []; }
        remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
        querySelector(selector) { return this.children.find(child => child.className === selector.slice(1)); }
        addEventListener(type, listener) { this.listeners[type] = listener; }
    }
    const form = new Element(), grid = new Element(), input = new Element(), empty = new Element();
    for (const [key, representative] of [['e:1', 'true'], ['e:2', 'false']]) {
        const node = new Element(); node.dataset = {key, representative}; grid.append(node);
    }
    let created = 0, revoked = 0;
    vm.runInNewContext(fs.readFileSync('src/main/resources/static/js/admin-image-form.js', 'utf8'), {
        document: {getElementById: id => id === 'place-form' ? form : input,
            querySelector: selector => selector === '[data-image-editor]' ? grid : empty,
            createElement: () => new Element()},
        FormDataEvent: function () {}, URL: {createObjectURL: () => `blob:${++created}`, revokeObjectURL: () => revoked++}
    });
    return {form, grid, input, empty, get revoked() { return revoked; },
        click(index, label) {
            const button = grid.children[index].querySelector('.image-actions').children.find(b => b.textContent === label);
            assert.equal(button.type, 'button'); button.listeners.click();
        },
        payload() {
            const data = new Map([['name', '수정 이름'], ['_csrf', 'token'], ['files', []]]);
            form.listeners.formdata({formData: {delete: key => data.delete(key), set: (key, value) => data.set(key, value),
                append: (key, value) => data.set(key, [...(data.get(key) || []), value])}});
            return data;
        }
    };
}
test('actual editor buttons defer changes until formdata and preserve parent fields and CSRF', () => {
    const ui = editor();
    ui.click(1, '대표 이미지로 설정'); ui.click(1, '위로 이동'); ui.click(1, '삭제');
    assert.equal(ui.grid.children.length, 1);
    const payload = ui.payload();
    assert.equal(payload.get('imageOrder'), 'e:2'); assert.equal(payload.get('imageRepresentative'), 'e:2');
    assert.equal(payload.get('imageDeleted'), 'e:1'); assert.equal(payload.get('name'), '수정 이름');
    assert.equal(payload.get('_csrf'), 'token');
});
test('actual input accumulates selections, releases removed preview, submits only remaining files', () => {
    const ui = editor(); ui.input.files = [file('D.png'), file('E.png')]; ui.input.listeners.change();
    assert.equal(ui.input.value, ''); assert.equal(ui.grid.children.length, 4);
    ui.click(2, '대표 이미지로 설정'); ui.click(3, '삭제');
    const payload = ui.payload();
    assert.equal(payload.get('files').length, 1); assert.equal(payload.get('files')[0].name, 'D.png');
    assert.equal(payload.get('imageRepresentative'), 'n:0'); assert.equal(ui.revoked, 1);
});
