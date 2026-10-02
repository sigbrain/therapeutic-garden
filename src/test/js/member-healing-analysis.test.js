const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('participant analysis reuses Summary and History renderers and keeps modal keyboard-closeable', () => {
    const elements = {};
    function node(id) {
        return elements[id] ||= {id, hidden: id === 'memberAnalysisModal', style: {}, events: {}, scrollTop: 4,
            addEventListener(type, handler) { this.events[type] = handler; },
            focus() { document.activeElement = this; },
            querySelector() { return node('memberAnalysisDialog'); },
            querySelectorAll() { return [node('closeAnalysisButton')]; },
            getClientRects() { return [1]; }, tabIndex: 0};
    }
    const calls = {};
    const document = {activeElement: null, body: {style: {overflow: 'auto'}}, events: {},
        getElementById: node, addEventListener(type, handler) { this.events[type] = handler; }};
    const effects = [{spotCode: 'HS1'}], history = [{spotCode: 'HS1', records: []}];
    const context = {document, window: {memberHealingEffects: effects, memberMeasurementHistory: history,
        HomeSurvey: {
            renderHighlights(container, data) { calls.highlights = [container, data]; },
            renderModal(container, data) { calls.summary = [container, data]; }
        }, MeasurementHistory: {render(container, data) { calls.history = [container, data]; }}}};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('src/main/resources/static/js/member-healing-analysis.js', 'utf8'), context);
    assert.equal(calls.highlights[1], effects);
    assert.equal(calls.summary[1], effects);
    assert.equal(calls.history[1], history);
    node('openMemberAnalysisButton').events.click();
    assert.equal(node('memberAnalysisModal').hidden, false);
    assert.equal(document.body.style.overflow, 'hidden');
    document.events.keydown({key: 'Escape', preventDefault() {}});
    assert.equal(node('memberAnalysisModal').hidden, true);
    assert.equal(document.body.style.overflow, 'auto');
});
