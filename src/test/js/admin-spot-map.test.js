const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../../main/resources/static/js/admin-spot-map.js'), 'utf8');

function setup({latitude = '', longitude = '', center = {}, sdk = true, failMap = false, selected = 1} = {}) {
    function input(initial) {
        let value = String(initial);
        return {get value() { return value; }, set value(next) { value = String(next); }};
    }
    const elements = {
        courseId: {selectedIndex: selected, options: [
            {value: '', dataset: {}},
            {value: '1', dataset: {latitude: '37', longitude: '127', mapLevel: '3', ...center}},
            {value: '2', dataset: {latitude: '38', longitude: '128', mapLevel: '5'}}
        ], addEventListener(event, callback) { this[event] = callback; }},
        latitude: input(latitude), longitude: input(longitude),
        'spot-map': {style: {}}, 'spot-map-status': {textContent: ''}
    };
    const maps = [], markers = [];
    const kakao = {maps: {
        LatLng: function (lat, lng) { this.lat = lat; this.lng = lng; this.getLat = () => lat; this.getLng = () => lng; },
        Map: function (container, options) {
            if (failMap) throw new Error('Map failed');
            Object.assign(this, options);
            this.setCenter = center => { this.center = center; };
            this.setLevel = level => { this.level = level; };
            this.relayout = () => {};
            maps.push(this);
        },
        Marker: function (options) {
            Object.assign(this, options);
            this.setPosition = position => { this.position = position; };
            markers.push(this);
        },
        event: {addListener(map, event, callback) { map[event] = callback; }}
    }};
    vm.runInNewContext(script, {
        document: {getElementById: id => elements[id]}, window: sdk ? {kakao} : {}, kakao: sdk ? kakao : undefined
    });
    return {elements, maps, markers,
        click(lat, lng) { maps[0].click({latLng: new kakao.maps.LatLng(lat, lng)}); },
        change(index) { elements.courseId.selectedIndex = index; elements.courseId.change(); }
    };
}

test('new spot previews Site without saving its center or adding a marker', () => {
    const {elements, maps, markers} = setup();
    assert.equal(maps[0].center.lat, 37);
    assert.equal(maps[0].center.lng, 127);
    assert.equal(maps[0].level, 3);
    assert.equal(elements.latitude.value, '');
    assert.equal(elements.longitude.value, '');
    assert.equal(markers.length, 0);
});

test('uses complete course center and falls back to Site for partial or invalid center', () => {
    for (const center of [{centerLatitude: '37.1', centerLongitude: '127.1'},
        {centerLatitude: '37.1'}, {centerLatitude: 'NaN', centerLongitude: '127.1'}]) {
        const {maps, elements} = setup({center});
        assert.equal(maps[0].center.lat, center.centerLongitude && center.centerLatitude === '37.1' ? 37.1 : 37);
        assert.equal(elements.latitude.value, '');
    }
});

test('edit and validation redisplay retain the stored position as marker and center', () => {
    const {maps, markers, elements} = setup({latitude: '37.25', longitude: '127.25'});
    assert.equal(maps[0].center.lat, 37.25);
    assert.equal(markers[0].position.lng, 127.25);
    assert.equal(elements.latitude.value, '37.25');
    assert.equal(elements.longitude.value, '127.25');
    assert.equal(elements['spot-map-status'].textContent, '');
});

test('click creates then moves one marker and updates hidden values', () => {
    const state = setup();
    state.click(37.3, 127.3);
    state.click(37.4, 127.4);
    assert.equal(state.markers.length, 1);
    assert.equal(state.markers[0].position.lat, 37.4);
    assert.equal(state.elements.latitude.value, '37.4');
    assert.equal(state.elements.longitude.value, '127.4');
    state.click(91, 181);
    assert.equal(state.elements.latitude.value, '37.4');
});

test('changing course recenters map but preserves selected HS position', () => {
    const state = setup();
    state.click(37.3, 127.3);
    state.change(2);
    assert.equal(state.maps[0].center.lat, 38);
    assert.equal(state.maps[0].level, 5);
    assert.equal(state.elements.latitude.value, '37.3');
    assert.equal(state.elements.longitude.value, '127.3');
    assert.equal(state.markers[0].position.lat, 37.3);
    state.change(0);
    assert.equal(state.elements['spot-map'].style.visibility, 'hidden');
    state.change(1);
    assert.equal(state.elements['spot-map'].style.visibility, 'visible');
    assert.equal(state.elements.latitude.value, '37.3');
});

test('selecting a first course does not auto assign coordinates', () => {
    const state = setup({selected: 0});
    assert.equal(state.maps.length, 0);
    state.change(1);
    assert.equal(state.maps.length, 1);
    assert.equal(state.elements.latitude.value, '');
    assert.equal(state.markers.length, 0);
});

test('SDK or map construction failure shows an error and preserves existing values', () => {
    for (const options of [{sdk: false}, {failMap: true}]) {
        const {elements} = setup({...options, latitude: '37.2', longitude: '127.2'});
        assert.match(elements['spot-map-status'].textContent, /지도를 불러오지 못했습니다/);
        assert.equal(elements.latitude.value, '37.2');
        assert.equal(elements.longitude.value, '127.2');
    }
});
