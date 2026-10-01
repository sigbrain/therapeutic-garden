/* Photo-only HC visualization. No stored coordinates or analytical results are changed. */
window.HomeCourseOverlay = (function() {
    function groups(spots) {
        var courses = new Map();
        spots.filter(Boolean).forEach(spot => {
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
    // Read-only display geometry, anchored to saved course bounds. Never modifies API coordinates.
    function photoLayout(courses, width, imageHeight) {
        var diameter = width >= 800 ? 180 : width >= 550 ? 145 : 110;
        diameter = Math.min(diameter, Math.max(40, width - 32));
        var gap = 16, padding = 12, cell = Math.min(Math.max(diameter, width < 550 ? Math.min(140, (width - padding * 2 - gap) / 2) : 160), width - padding * 2);
        var placed = [], height = imageHeight;
        courses.forEach(course => {
            var columns = Math.max(1, Math.min(course.spots.length, 3, Math.floor((width - padding * 2 + gap) / (cell + gap))));
            var rows = Math.ceil(course.spots.length / columns);
            var w = columns * cell + (columns - 1) * gap + padding * 2;
            var h = 64 + rows * (diameter + 54) + (rows - 1) * gap + padding;
            var preferred = {x: (course.bounds.left + course.bounds.right) / 200 * width - w / 2,
                y: course.bounds.top / 100 * imageHeight};
            var clamp = p => ({x: Math.max(0, Math.min(width - w, p.x)), y: Math.max(0, p.y), w: w, h: h});
            var candidates = [clamp(preferred), clamp({x: preferred.x, y: 0})];
            placed.forEach(other => {
                [preferred.x, 0, width - w, other.x - w - gap, other.x + other.w + gap].forEach(x => {
                    [preferred.y, 0, other.y - h - gap, other.y + other.h + gap].forEach(y => candidates.push(clamp({x: x, y: y})));
                });
            });
            var free = candidates.filter(p => placed.every(o => !overlap(
                {x: p.x - gap / 2, y: p.y - gap / 2, w: p.w + gap, h: p.h + gap}, o)));
            // Additional courses grow the stage vertically instead of shrinking photos or clipping labels.
            if (!free.length) free.push(clamp({x: preferred.x, y: Math.max(0, ...placed.map(o => o.y + o.h + gap))}));
            var score = p => Math.hypot(p.x - preferred.x, p.y - preferred.y) + Math.max(0, p.y + p.h - imageHeight) * 2;
            var box = free.reduce((best, p) => score(p) < score(best) ? p : best);
            box.courseId = course.id;
            box.spots = course.spots.map((spot, index) => {
                var row = Math.floor(index / columns), count = Math.min(columns, course.spots.length - row * columns);
                return {id: spot.spotId, x: box.x + (w - count * cell - (count - 1) * gap) / 2 + (index % columns) * (cell + gap) + cell / 2,
                    y: box.y + 64 + row * (diameter + 54 + gap), labelWidth: cell};
            });
            placed.push(box);
            height = Math.max(height, box.y + box.h);
        });
        return {courses: placed, height: height, diameter: diameter};
    }
    // Give the upper-right HC-B group the same edge breathing room as HC-C.
    // This changes display geometry only; API/DB coordinates and input objects stay untouched.
    function applyCourseBreathingRoom(geometry, courses, width) {
        var reference = courses.find(c => c.code === 'HC-C');
        var target = courses.find(c => c.code === 'HC-B');
        var referenceBox = reference && geometry.courses.find(box => box.courseId === reference.id);
        var targetBox = target && geometry.courses.find(box => box.courseId === target.id);
        if (!referenceBox || !targetBox) return geometry;
        var inset = Math.max(0, width - referenceBox.x - referenceBox.w);
        if (!inset) return geometry;
        var shifted = geometry.courses.map(box => box !== targetBox ? box : {...box,
            x: box.x - inset, y: box.y + inset,
            spots: box.spots.map(spot => ({...spot, x: spot.x - inset, y: spot.y + inset}))});
        return {...geometry, courses: shifted,
            height: Math.max(geometry.height, targetBox.y + inset + targetBox.h)};
    }
    // HC-B is the only clamped right-edge course in the current layout. Match HC-C's
    // visual inset as far as the unchanged HS photo geometry safely permits.
    function visualBoundary(box, courses, width, diameter, boxes) {
        var base = 2;
        var right = box.x + box.w - base;
        var course = courses.find(c => c.id === box.courseId);
        if (course && course.code === 'HC-B') {
            var reference = courses.find(c => c.code === 'HC-C');
            var referenceBox = reference ? boxes.find(b => b.courseId === reference.id) : null;
            var targetInset = referenceBox ? Math.max(base, width - (referenceBox.x + referenceBox.w) + base) : base;
            var rightmostPhoto = Math.max(...box.spots.map(s => s.x + diameter / 2));
            right = Math.max(rightmostPhoto + base, width - targetInset);
        }
        return {x: box.x + base, y: box.y + base,
            width: Math.max(0, right - box.x - base), height: Math.max(0, box.h - base * 2)};
    }
    return {photoLayout: photoLayout, applyCourseBreathingRoom: applyCourseBreathingRoom,
        groups: groups, badgePosition: badgePosition, visualBoundary: visualBoundary};
})();
