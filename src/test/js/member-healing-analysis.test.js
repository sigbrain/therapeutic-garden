const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('participant analysis renders inline Summary and defaults History to HS1 on page load', () => {
    const elements = {};
    function node(id) {
        return elements[id] ||= {id};
    }
    const calls = {};
    const document = {getElementById: node};
    const effects = [{spotCode: 'HS1'}], history = [{spotCode: 'HS1', records: []}];
    const context = {document, window: {memberHealingEffects: effects, memberMeasurementHistory: history,
        HomeSurvey: {
            renderHighlights(container, data) { calls.highlights = [container, data]; },
            renderSummary(container, data) { calls.summary = [container, data]; }
        }, MeasurementHistory: {render(container, data, options) { calls.history = [container, data, options]; }}}};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('src/main/resources/static/js/member-healing-analysis.js', 'utf8'), context);
    assert.equal(calls.highlights[1], effects);
    assert.equal(calls.summary[1], effects);
    assert.equal(calls.history[1], history);
    assert.equal(calls.history[2].defaultSpotCode, 'HS1');
    assert.equal(elements.openMemberAnalysisButton, undefined);
    assert.equal(elements.memberAnalysisModal, undefined);
});
