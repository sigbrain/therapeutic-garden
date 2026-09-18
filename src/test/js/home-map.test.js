const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('src/main/resources/static/js/home-map.js', 'utf8');
function setup() {
    const elements = {};
    function element(id) {
        return elements[id] ||= {hidden: true, dataset: {}, classList: {add() {}, remove() {}},
            addEventListener(event, fn) { this[event] = fn; }, add() {},
            removeAttribute(name) { delete this[name]; }, querySelector() { return element('dialog'); }};
    }
    const select = element('siteSelect');
    select.options = [1, 2, 3].map(id => ({value: String(id), dataset: {name: 'Site ' + id,
        address: '주소', latitude: String(36 + id), longitude: '127', mapLevel: String(id + 2),
        representativeImageUrl: id < 3 ? '/authenticated/site-' + id : ''}}));
    select.selectedIndex = 0;
    const maps = [], circles = [], markers = [];
    const kakao = {maps: {
        LatLng: function(lat, lng) { this.lat = lat; this.lng = lng; },
        Map: function(el, options) { Object.assign(this, options); this.setCenter = x => this.center = x; this.setLevel = x => this.level = x; maps.push(this); },
        Circle: function(options) { Object.assign(this, options); this.setMap = m => this.map = m; this.setOptions = x => Object.assign(this, x); circles.push(this); },
        Marker: function(options) { Object.assign(this, options); this.setMap = m => this.map = m; markers.push(this); },
        event: {addListener(target, event, fn) { target[event] = fn; }}
    }};
    const survey = {participants: [], metrics: {stress: {name: 'VAS', spatial: true}}, range() {}, courseMean() {},
        normalize() {}, getSurveyColor() { return '#abc'; }, renderSpot() {}, renderModal() {}};
    const context = {document: {getElementById: element, querySelector: element, addEventListener() {}, body: {style: {}}},
        window: {kakao, HomeSurvey: survey}, kakao, Option: function() {},
        fetch: async url => ({ok: true, json: async () => url.endsWith('/courses')
            ? [{centerLatitude: 37, centerLongitude: 127, radius: 10}]
            : [{code: 'HS1', name: '정원', courseCode: 'HC1', courseName: '코스', latitude: 37, longitude: 127,
                representativeImageUrl: '/authenticated/hs-1'}]})};
    vm.createContext(context); vm.runInContext(script, context);
    return {elements, maps, circles, markers, context, change(index) { select.selectedIndex = index; select.change(); }};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('Site selection replaces representative image and keeps map center/level movement', async () => {
    const ui = setup(); await flush();
    assert.equal(ui.elements.siteImage.src, '/authenticated/site-1');
    ui.elements.siteImage.onload(); assert.equal(ui.elements.siteImageEmpty.hidden, true);
    ui.change(1); await flush();
    assert.equal(ui.elements.siteImage.src, '/authenticated/site-2');
    assert.equal(ui.maps.length, 1); assert.equal(ui.maps[0].center.lat, 38); assert.equal(ui.maps[0].level, 4);
    assert.equal(ui.circles[0].map, null); assert.equal(ui.markers[0].map, null);
    assert.equal(ui.circles.at(-1).map, ui.maps[0]); assert.equal(ui.markers.at(-1).map, ui.maps[0]);
});
test('missing Site representative and image load failure use placeholder without static fallback', () => {
    const ui = setup(); ui.elements.siteImage.onerror();
    assert.equal(ui.elements.siteImage.hidden, true); assert.equal(ui.elements.siteImageEmpty.hidden, false);
    ui.change(2);
    assert.equal(ui.elements.siteImage.src, undefined); assert.equal(ui.elements.siteImageEmpty.hidden, false);
    assert.match(ui.elements.siteImageEmpty.textContent, /Site 3/);
});
test('HS marker opens API representative image, refreshed URL and code/name placeholder', async () => {
    const ui = setup(); await flush(); ui.markers[0].click();
    assert.equal(ui.elements.spotImage.src, '/authenticated/hs-1');
    ui.context.showSpotInformation({code: 'HS1', name: '정원', representativeImageUrl: 'https://signed.example/new'});
    assert.equal(ui.elements.spotImage.src, 'https://signed.example/new');
    ui.context.showSpotInformation({code: 'HS2', name: '숲'});
    assert.equal(ui.elements.spotImage.src, undefined); assert.equal(ui.elements.spotImageEmpty.hidden, false);
    assert.match(ui.elements.spotImageEmpty.textContent, /HS2 숲/);
});
test('Monitoring runtime has no filename inference or static Site/HS image mapping', () => {
    assert.doesNotMatch(script, /\/images\/site|objectKey|toLowerCase\(\)|\.jpeg/);
});
