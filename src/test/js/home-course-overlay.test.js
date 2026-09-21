const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync('src/main/resources/static/js/home-course-overlay.js', 'utf8'), context);
const api = context.window.HomeCourseOverlay;
const spot = (id, x, y) => ({spotId: id, courseId: id, courseCode: '동일 코드', courseName: 'DB 이름', xPercent: x, yPercent: y});
test('arbitrary course count grouped by identity, zero positioned omitted; single and multiple bounds', () => {
    const result = api.groups([spot(11, 30, 40), spot(11, 60, 70), spot(12, 50, 50), spot(13, null, null),
        ...Array.from({length: 7}, (_, i) => spot(20 + i, 10, 20))]);
    assert.equal(result.length, 9);
    assert.equal(result[0].spots.length, 2);
    assert.equal(JSON.stringify(result[0].bounds), JSON.stringify({left: 22, right: 68, top: 30, bottom: 80}));
    assert.equal(result[1].bounds.right - result[1].bounds.left, 16);
    assert.equal(result[1].bounds.bottom - result[1].bounds.top, 20);
    assert.equal(result[0].name, 'DB 이름');
});
test('bounds clamp at each image edge and all coordinates remain unchanged', () => {
    const spots = [spot(1, 0, 100), spot(1, 100, 0)];
    const before = JSON.stringify(spots), bounds = api.groups(spots)[0].bounds;
    assert.equal(JSON.stringify(bounds), JSON.stringify({left: 0, right: 100, top: 0, bottom: 100}));
    assert.equal(JSON.stringify(spots), before);
    assert.equal(api.groups([spot(1, -1, 10), spot(2, 20, ''), spot(3, Infinity, 20)]).length, 0);
});
const demoInput = Array.from({length: 18}, (_, i) => ({...spot(100 + Math.floor(i / 3), 10 + i, 20 + i), spotId: 200 + i}));
test('spot demo is deterministic, bounded, distinct within each HC and independent of response order', () => {
    const before = JSON.stringify(demoInput);
    const courses = api.groups(demoInput);
    const reversed = api.groups([...demoInput].reverse());
    for (const course of courses) for (const metric of ['stress', 'relaxation']) {
        const values = course.spots.map(s => api.spotChange(s, metric));
        assert.equal(new Set(values).size, values.length);
        assert.ok(values.every(v => v >= -60 && v <= 60));
        for (const s of course.spots) {
            const other = reversed.find(c => c.id === course.id).spots.find(o => o.spotId === s.spotId);
            assert.equal(api.spotChange(s, metric), api.spotChange(other, metric));
        }
        assert.equal(api.aggregate(course, metric), values.reduce((a, b) => a + b, 0) / values.length);
    }
    assert.equal(JSON.stringify(demoInput), before);
});
test('each three-course cycle contains clearly negative, neutral and positive HC means', () => {
    for (const count of [3, 6, 9, 30]) {
        const input = Array.from({length: count * 2}, (_, i) => ({...spot(100 + Math.floor(i / 2), 20, 30), spotId: i + 1}));
        const courses = api.groups(input);
        for (const metric of ['stress', 'relaxation']) {
            const means = courses.map(c => api.aggregate(c, metric));
            assert.ok(means.some(v => v < -36));
            assert.ok(means.some(v => v > 36));
            assert.ok(means.some(v => Math.abs(v) < 12));
        }
    }
});
test('signed labels preserve stress and relaxation direction', () => {
    assert.equal(api.formatChange(-24, 'stress'), '스트레스 24% 감소');
    assert.equal(api.formatChange(8, 'stress'), '스트레스 8% 증가');
    assert.equal(api.formatChange(31, 'relaxation'), '이완감 31% 증가');
    assert.equal(api.formatChange(-7, 'relaxation'), '이완감 7% 감소');
    assert.match(api.formatChange(0, 'stress'), /변화 없음/);
});
test('HC mean excludes unpositioned HS after generating individual demo values', () => {
    const input = demoInput.map((s, i) => i === 0 ? {...s, xPercent: null} : s);
    const generated = api.demoSpots(input);
    const courses = api.groups(input);
    assert.equal(courses[0].spots.length, 2);
    for (const metric of ['stress', 'relaxation']) {
        const expected = generated.slice(1, 3).map(s => api.spotChange(s, metric));
        assert.equal(api.aggregate(courses[0], metric), (expected[0] + expected[1]) / 2);
    }
});
test('metric colors move green/amber/red in the correct direction', () => {
    function hue(color) { return Number(color.match(/hsl\(([0-9.]+)/)[1]); }
    assert.ok(hue(api.metricColor(-35, 'stress')) > hue(api.metricColor(35, 'stress')));
    assert.ok(hue(api.metricColor(35, 'relaxation')) > hue(api.metricColor(-35, 'relaxation')));
    assert.ok(hue(api.metricColor(0, 'stress')) > 50 && hue(api.metricColor(0, 'stress')) < 70);
    assert.equal(hue(api.metricColor(-35, 'stress')), hue(api.metricColor(35, 'relaxation')));
});
test('badge search avoids hotspots, stays within desktop/mobile planes and never changes region', () => {
    for (const plane of [{w: 1000, h: 700}, {w: 334, h: 220}]) {
        const bounds = {left: 10, right: 70, top: 10, bottom: 70}, before = JSON.stringify(bounds);
        const obstacle = {x: 0, y: 0, w: plane.w, h: 65};
        const pos = api.badgePosition(bounds, {w: 110, h: 40}, plane, [obstacle]);
        assert.ok(pos.y >= 65); assert.ok(pos.x >= 0 && pos.x + pos.w <= plane.w);
        assert.ok(pos.y + pos.h <= plane.h); assert.equal(JSON.stringify(bounds), before);
    }
});
test('exact obstacle edges find a narrow mobile gap missed by grid candidates', () => {
    const plane = {w: 285, h: 211}, size = {w: 75, h: 37};
    const obstacles = [{x: 52, y: 15, w: 62, h: 62}, {x: 197, y: 22, w: 62, h: 62},
        {x: 217, y: 0, w: 62, h: 51}];
    const pos = api.badgePosition({left: 72, right: 95, top: 0, bottom: 35}, size, plane, obstacles);
    assert.ok(pos.x >= 114 && pos.x + pos.w <= 197);
    assert.ok(pos.y <= 4);
});
test('photo-only visual layers preserve hotspot priority and mobile styling', () => {
    const css = fs.readFileSync('src/main/resources/static/css/home-spatial.css', 'utf8');
    assert.match(css, /\.monitoring-course-regions, \.monitoring-course-badges\s*\{[^}]*pointer-events: none/);
    assert.match(css, /\.monitoring-course-regions\s*\{[^}]*z-index: 1/);
    assert.match(css, /\.monitoring-course-badges\s*\{[^}]*z-index: 2/);
    assert.match(css, /\.monitoring-hotspots\s*\{ z-index: 3/);
    assert.match(css, /stroke-opacity: \.98/);
    assert.match(css, /stroke-width: 2\.5/);
    assert.match(css, /fill-opacity: \.24/);
    assert.match(css, /vector-effect: non-scaling-stroke/);
    const js = fs.readFileSync('src/main/resources/static/js/home-spatial.js', 'utf8');
    assert.doesNotMatch(js, /style\.(fillOpacity|strokeOpacity)/);
    assert.match(js, /region\.style\.fill = color/);
    assert.match(js, /region\.style\.stroke = color/);
    assert.match(js, /value\.style\.color = color/);
    const html = fs.readFileSync('src/main/resources/templates/home.html', 'utf8');
    assert.match(html, /id="hcStress" aria-pressed="true"/);
    assert.match(html, /Demo 데이터/);
});

test('photo groups use arbitrary identities, keep pairs horizontal, avoid collisions and preserve input', () => {
    for (const width of [300, 334, 696, 1040]) {
        const input = [2, 2, 2, 1, 5].flatMap((count, course) => Array.from({length: count}, (_, i) => ({
            ...spot(31 + course, 15 + course * 12, 10 + i * 30), spotId: course * 10 + i
        })));
        const groups = api.groups(input), before = JSON.stringify(groups);
        const result = api.photoLayout(groups, width, width * .74);
        assert.equal(JSON.stringify(groups), before);
        for (const box of result.courses) {
            assert.ok(box.x >= 0 && box.x + box.w <= width);
            assert.ok(box.y >= 0 && box.y + box.h <= result.height);
            if (box.spots.length === 2) assert.equal(box.spots[0].y, box.spots[1].y);
            for (const other of result.courses) if (box !== other)
                assert.ok(box.x + box.w <= other.x || other.x + other.w <= box.x || box.y + box.h <= other.y || other.y + other.h <= box.y);
        }
    }
});
