/* Photo-only HC visualization. No stored coordinates or analytical results are changed. */
window.HomeCourseOverlay = (function() {
    function groups(spots) {
        var courses = new Map();
        demoSpots(spots).forEach(spot => {
            if (spot.courseId == null || ![spot.xPercent, spot.yPercent].every(v =>
                v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100)) return;
            var key = String(spot.courseId);
            if (!courses.has(key)) courses.set(key, {id: key, code: spot.courseCode, name: spot.courseName, spots: []});
            courses.get(key).spots.push(spot);
        });
        return Array.from(courses.values()).sort((a, b) => a.id.localeCompare(b.id)).map(course => {
            var xs = course.spots.map(s => Number(s.xPercent)), ys = course.spots.map(s => Number(s.yPercent));
            course.bounds = {left: Math.max(0, Math.min(...xs) - 8), right: Math.min(100, Math.max(...xs) + 8),
                top: Math.max(0, Math.min(...ys) - 10), bottom: Math.min(100, Math.max(...ys) + 10)};
            return course;
        });
    }
    // TEMPORARY DEMO ONLY. TODO: replace this adapter with real HealingSpot-level VAS data.
    // Never persist these illustrative values or expose them as measured results.
    function hashValue(value) {
        var hash = 0;
        for (var char of String(value)) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
        hash = (hash ^ (hash >>> 16)) >>> 0;
        hash = Math.imul(hash, 0x45d9f3b) >>> 0;
        return (hash ^ (hash >>> 16)) >>> 0;
    }
    function demoSpots(spots) {
        // Site-local, stable course bands; no course codes or particular IDs are special.
        // Generate on copies before excluding unpositioned HS. Never mutate API/DB data.
        var ids = Array.from(new Set(spots.filter(s => s.courseId != null).map(s => String(s.courseId)))).sort();
        var bands = [-48, 0, 48];
        var values = new Map();
        ids.forEach((id, courseIndex) => {
            var members = Array.from(new Set(spots.filter(s => String(s.courseId) === id).map(s => String(s.spotId))));
            ['stress', 'relaxation'].forEach((metric, metricIndex) => {
                members.sort((a, b) => hashValue(a + ':' + metric) - hashValue(b + ':' + metric) || a.localeCompare(b));
                members.forEach((spotId, rank) => {
                    // Disjoint variation intervals guarantee different values within a course.
                    var fraction = hashValue(spotId + ':' + metric) / 4294967296;
                    var variation = -12 + 24 * (rank + fraction) / members.length;
                    values.set(id + ':' + spotId + ':' + metric, bands[(courseIndex + metricIndex) % bands.length] + variation);
                });
            });
        });
        return spots.map(spot => Object.assign({}, spot, {demoChanges: {
            stress: values.get(String(spot.courseId) + ':' + spot.spotId + ':stress'),
            relaxation: values.get(String(spot.courseId) + ':' + spot.spotId + ':relaxation')
        }}));
    }
    function spotChange(spot, metric) {
        return spot.demoChanges[metric];
    }
    function aggregate(course, metric) {
        var total = course.spots.reduce((sum, spot) => sum + spotChange(spot, metric), 0);
        return total / course.spots.length;
    }
    function formatChange(change, metric) {
        var rounded = Math.round(Math.abs(change));
        if (rounded === 0) return metric === 'relaxation' ? '이완감 변화 없음' : '스트레스 변화 없음';
        var positive = change > 0;
        var direction = positive ? '증가' : '감소';
        return (metric === 'relaxation' ? '이완감 ' : '스트레스 ') + rounded + '% ' + direction;
    }
    function metricColor(change, metric) {
        // Positive score means a good change: stress decrease or relaxation increase.
        var goodChange = metric === 'relaxation' ? change : -change;
        var hue = 60 + Math.max(-40, Math.min(40, goodChange)) * 1.5;
        return 'hsl(' + hue.toFixed(1) + ' 58% 43%)';
    }
    function overlap(a, b) {
        return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
            Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    }
    // Small bounded candidate search: move only badges, never HS coordinates.
    function badgePosition(bounds, size, plane, obstacles) {
        var preferred = {x: (bounds.left + bounds.right) / 200 * plane.w - size.w / 2,
            y: bounds.top / 100 * plane.h + 4};
        var clamp = p => ({x: Math.max(0, Math.min(plane.w - size.w, p.x)),
            y: Math.max(0, Math.min(plane.h - size.h, p.y)), w: size.w, h: size.h});
        var candidates = [clamp(preferred)];
        // Include exact obstacle edges: a coarse grid alone misses narrow free gaps on mobile.
        obstacles.forEach(o => {
            [o.x - size.w - 2, o.x + o.w + 2, preferred.x].forEach(x => {
                [o.y - size.h - 2, o.y + o.h + 2, preferred.y].forEach(y => candidates.push(clamp({x: x, y: y})));
            });
        });
        for (var y = 0; y <= 8; y++) for (var x = 0; x <= 8; x++)
            candidates.push(clamp({x: (plane.w - size.w) * x / 8, y: (plane.h - size.h) * y / 8}));
        function score(p) {
            return obstacles.reduce((sum, o) => sum + overlap(p, o), 0) * 10000 +
                Math.hypot(p.x - preferred.x, p.y - preferred.y);
        }
        return candidates.reduce((best, p) => score(p) < score(best) ? p : best);
    }
    return {groups: groups, demoSpots: demoSpots, spotChange: spotChange, aggregate: aggregate, formatChange: formatChange,
        metricColor: metricColor, badgePosition: badgePosition};
})();
