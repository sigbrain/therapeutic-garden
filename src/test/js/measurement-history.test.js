const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function node(tag) {
    return {tag, children: [], attrs: {}, events: {}, textContent: '',
        append(...children) {this.children.push(...children);},
        replaceChildren(...children) {this.children=children;},
        setAttribute(k,v) {this.attrs[k]=v;},
        addEventListener(k,v) {this.events[k]=v;}};
}
const context={window:{},document:{createElement:node,createElementNS:(_,t)=>node(t),getElementById:()=>null}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/main/resources/static/js/measurement-history.js','utf8'),context);
const render=context.window.MeasurementHistory.render;
const all=n=>[n,...n.children.flatMap(all)];
const metric=(baseline,post)=>({baseline,post,changeDisplay:baseline==null?'계산 불가':String(post-baseline),rateDisplay:'25.0% 감소'});
const record=(date,baseline,post)=>({measurementDate:date,stress:metric(baseline,post),emotional:metric(baseline,post)});
test('actual history graphs and table switch Spot and clear stale Member values',()=>{
    const container=node('div');
    render(container,[{spotCode:'HS1',spotName:'정원',records:[]},{spotCode:'HS2',spotName:'원',records:[record('2026-08-14',20,15),record('2026-08-19',null,12)]}]);
    const select=all(container).find(n=>n.tag==='select');
    assert.equal(select.value,'');
    assert.equal(select.children[0].textContent,'HS 선택');
    assert.equal(all(container).filter(n=>n.tag==='svg').length,0);
    assert.equal(all(container).filter(n=>n.tag==='table').length,0);
    select.value='HS2';select.events.change();
    assert.equal(all(container).filter(n=>n.tag==='svg').length,2);
    assert.ok(all(container).some(n=>n.tag==='td'&&n.textContent==='2026-08-14'));
    assert.ok(all(container).some(n=>n.tag==='td'&&n.textContent==='측정 없음'));
    select.value='HS1';select.events.change();
    assert.equal(all(container).filter(n=>n.tag==='svg').length,0);
    assert.ok(all(container).some(n=>n.textContent==='측정 기록 없음'));
    render(container,[{spotCode:'HS1',spotName:'정원',records:[record('2026-09-04',30,20)]}]);
    assert.equal(all(container).filter(n=>n.tag==='svg').length,0);
    const next=all(container).find(n=>n.tag==='select');next.value='HS1';next.events.change();
    assert.ok(!all(container).some(n=>n.textContent==='2026-08-14'));
    assert.ok(all(container).some(n=>n.textContent==='2026-09-04'));
});
test('missing baseline produces no fabricated dot and missing history no graph',()=>{
    const container=node('div');
    render(container,[{spotCode:'HS1',spotName:'정원',records:[record('2026-08-14',null,0)]}]);
    const select=all(container).find(n=>n.tag==='select');select.value='HS1';select.events.change();
    assert.equal(all(container).filter(n=>n.tag==='circle').length,2);
    render(container,[]);
    assert.equal(all(container).filter(n=>n.tag==='svg').length,0);
});
test('optional default Spot renders immediately and keeps a missing HS1 selected',()=>{
    const container=node('div');
    render(container,[{spotCode:'HS1',spotName:'호스타 정원',records:[record('2026-09-04',30,20)]},
        {spotCode:'HS2',spotName:'곶자왈원',records:[]}],{defaultSpotCode:'HS1'});
    const select=all(container).find(n=>n.tag==='select');
    assert.equal(select.value,'HS1');
    assert.equal(select.children[1].textContent,'HS1 · 호스타 정원');
    assert.equal(all(container).filter(n=>n.tag==='svg').length,2);

    render(container,[{spotCode:'HS1',spotName:'호스타 정원',records:[]},
        {spotCode:'HS2',spotName:'곶자왈원',records:[record('2026-09-05',20,10)]}],{defaultSpotCode:'HS1'});
    const missingSelect=all(container).find(n=>n.tag==='select');
    assert.equal(missingSelect.value,'HS1');
    assert.equal(all(container).filter(n=>n.tag==='svg').length,0);
    assert.ok(all(container).some(n=>n.textContent==='측정 기록 없음'));
    missingSelect.value='HS2'; missingSelect.events.change();
    assert.equal(all(container).filter(n=>n.tag==='svg').length,2);
});
