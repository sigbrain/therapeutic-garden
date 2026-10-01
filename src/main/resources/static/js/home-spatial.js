/* Read-only monitoring view. Saved positions anchor course groups; photo positions are display-only. */
window.HomeSpatial = function(onSelect) {
    var canvas = document.getElementById('monitoringCanvas');
    var status = document.getElementById('monitoringStatus');
    var settings = document.getElementById('monitoringSettings');
    var space = document.querySelector('.monitoring-space');
    function updateStatus(message, loading) {
        status.textContent = message;
        status.setAttribute('data-loading', String(Boolean(loading)));
        space.setAttribute('data-loading', String(Boolean(loading)));
    }
    var version = 0;
    var buttons = [];
    var selectedId = null;
    var courses = [], badges = [];
    var effects = window.HomeCourseOverlay;
    var summary = window.HomeSurvey;
    var effectsByCode = new Map();
    var haloDebug = Boolean(window.location && /(?:\?|&)haloDebug=on(?:&|$)/.test(window.location.search || ''));
    var debugSpotValues = {HS1: 20, HS2: -15, HS3: 0, HS4: 8, HS5: -5, HS6: 25};
    function getSpotDisplay(spotId) {
        return summary.getSpotDisplay(spotId, effectsByCode);
    }
    function updateSpotEffects() {
        buttons.forEach(entry => {
            var display = getSpotDisplay(entry.code);
            entry.metric.textContent = display.metricLabel;
            entry.number.textContent = display.numberLabel;
            entry.unit.textContent = display.unitLabel;
            entry.value.className = 'monitoring-hotspot-value effect-' + display.status;
            var ringColor = display.status === 'missing' || display.status === 'neutral'
                ? 'hsl(40 35% 82%)' : display.color;
            if (entry.circle.style.setProperty) entry.circle.style.setProperty('--spot-data-color', ringColor);
            else entry.circle.style['--spot-data-color'] = ringColor;
            var result = display.value == null ? '데이터 없음' : display.numberLabel + ' ' + display.unitLabel;
            entry.button.setAttribute('aria-label', entry.name + ' · ' + display.metricLabel + ' ' + result + ' · 상세 보기');
        });
        badges.forEach(entry => {
            var score = summary.courseImprovementScore(entry.course, getSpotDisplay);
            var color = summary.scoreColor(score);
            if (entry.halo.style.setProperty) entry.halo.style.setProperty('--halo-color', color);
            else entry.halo.style['--halo-color'] = color;
            entry.badge.setAttribute('aria-label', entry.title);
        });
    }
    function setAnalysis(nextEffects) {
        effectsByCode = summary.indexByCode(nextEffects);
        if (haloDebug) Object.entries(debugSpotValues).forEach(([spotCode, value]) => effectsByCode.set(spotCode, {
            ...(effectsByCode.get(spotCode) || {}), spotCode: spotCode, hasMeasurement: true,
            stressReductionRate: value, emotionalIncreaseRate: value,
            stressChangeDisplay: summary.formatDirection(value, 'stress'),
            emotionalChangeDisplay: summary.formatDirection(value, 'emotional')
        }));
        updateSpotEffects();
    }
    function select(spotId) {
        selectedId = spotId;
        buttons.forEach(entry => entry.button.setAttribute('aria-pressed', String(entry.id === spotId)));
    }
    var currentImage = null, currentMidFocus = null, currentNearFocus = null, currentHaloLayer = null;
    function cssPixels(name, fallback) {
        if (!window.getComputedStyle) return fallback;
        var parsed = parseFloat(window.getComputedStyle(canvas).getPropertyValue(name));
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    function createFocusLayer(kind, source, key) {
        var layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        layer.setAttribute('class', 'monitoring-focus-layer monitoring-focus-' + kind + '-layer');
        layer.setAttribute('preserveAspectRatio', 'none');
        layer.setAttribute('aria-hidden', 'true');
        var definitions = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        var mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
        var maskId = 'monitoring-focus-' + kind + '-' + key;
        mask.setAttribute('id', maskId);
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
        mask.setAttribute('mask-type', 'alpha');
        var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        var filterId = maskId + '-feather';
        filter.setAttribute('id', filterId);
        filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        var blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        blur.setAttribute('in', 'SourceGraphic');
        filter.append(blur);
        var shapes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        shapes.setAttribute('filter', 'url(#' + filterId + ')');
        mask.append(shapes);
        definitions.append(mask, filter);
        var image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('class', 'monitoring-focus-image monitoring-focus-' + kind + '-image');
        image.setAttribute('preserveAspectRatio', 'none');
        image.setAttribute('mask', 'url(#' + maskId + ')');
        image.setAttribute('href', source);
        layer.append(definitions, image);
        return {layer: layer, image: image, mask: mask, filter: filter, blur: blur, shapes: shapes};
    }
    function sizeFocusLayer(focus, width, height, feather) {
        if (!focus) return;
        focus.layer.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        Object.entries({x: 0, y: 0, width: width, height: height})
            .forEach(([key, value]) => focus.mask.setAttribute(key, value));
        Object.entries({x: -feather, y: -feather, width: width + feather * 2, height: height + feather * 2})
            .forEach(([key, value]) => focus.filter.setAttribute(key, value));
        focus.blur.setAttribute('stdDeviation', feather / 2);
        Object.entries({width: width, height: height})
            .forEach(([key, value]) => focus.image.setAttribute(key, value));
    }
    function positionLabels() {
        var width = canvas.clientWidth;
        if (!width || !currentImage || !currentImage.naturalWidth) return;
        var geometry = effects.photoLayout(courses, width, width * currentImage.naturalHeight / currentImage.naturalWidth);
        geometry = effects.applyCourseBreathingRoom(geometry, courses, width);
        canvas.style.minHeight = geometry.height + 'px';
        var midFeather = Math.max(0, cssPixels('--focus-mid-feather', 36));
        var nearFeather = Math.max(0, cssPixels('--focus-near-feather', 20));
        var midPadding = Math.max(0, cssPixels('--focus-mid-padding', 20));
        var nearPadding = Math.max(0, cssPixels('--focus-near-padding', 12));
        var haloPadding = Math.max(0, cssPixels('--halo-padding', 28));
        sizeFocusLayer(currentMidFocus, width, geometry.height, midFeather);
        sizeFocusLayer(currentNearFocus, width, geometry.height, nearFeather);
        geometry.courses.forEach(box => {
            var entry = badges.find(b => b.course.id === box.courseId);
            if (entry) {
                // Adjust only the SVG boundary; photo, label and saved coordinates stay intact.
                const boundary = effects.visualBoundary(box, courses, width, geometry.diameter, geometry.courses);
                const focus = {x: Math.max(0, boundary.x - midPadding), y: Math.max(0, boundary.y - midPadding),
                    right: Math.min(width, boundary.x + boundary.width + midPadding),
                    bottom: Math.min(geometry.height, boundary.y + boundary.height + midPadding)};
                Object.entries({x: focus.x, y: focus.y, width: focus.right - focus.x,
                    height: focus.bottom - focus.y, rx: 10, ry: 10})
                    .forEach(([key, value]) => entry.midRect.setAttribute(key, value));
                entry.halo.style.left = Math.max(0, boundary.x - haloPadding) + 'px';
                entry.halo.style.top = Math.max(0, boundary.y - haloPadding) + 'px';
                entry.halo.style.width = Math.min(width, boundary.x + boundary.width + haloPadding)
                    - Math.max(0, boundary.x - haloPadding) + 'px';
                entry.halo.style.height = Math.min(geometry.height, boundary.y + boundary.height + haloPadding)
                    - Math.max(0, boundary.y - haloPadding) + 'px';
                entry.badge.style.left = box.x + 12 + 'px';
                entry.badge.style.top = box.y + 10 + 'px';
            }
            box.spots.forEach(spot => {
                var entry = buttons.find(b => b.id === spot.id);
                if (!entry) return;
                entry.button.style.left = spot.x + 'px';
                entry.button.style.top = spot.y + 'px';
                entry.button.style.width = spot.labelWidth + 'px';
                entry.circle.style.width = geometry.diameter + 'px';
                entry.circle.style.height = geometry.diameter + 'px';
                Object.entries({cx: spot.x, cy: spot.y + geometry.diameter / 2,
                    r: geometry.diameter / 2 + nearPadding})
                    .forEach(([key, value]) => entry.nearCircle.setAttribute(key, value));
            });
        });
    }
    if (window.ResizeObserver) new window.ResizeObserver(positionLabels).observe(canvas);
    else window.addEventListener('resize', positionLabels);
    async function load(site) {
        var current = ++version;
        selectedId = null;
        buttons = [];
        courses = [];
        badges = [];
        currentImage = null;
        currentMidFocus = null;
        currentNearFocus = null;
        currentHaloLayer = null;
        canvas.style.minHeight = '';
        canvas.replaceChildren();
        canvas.hidden = true;
        settings.hidden = true;
        updateStatus(site ? '공간 정보를 불러오는 중입니다.' : '등록된 Site가 없습니다.', Boolean(site));
        if (!site) return;
        settings.href = '/admin/sites/' + encodeURIComponent(site.value) + '/spatial-layout';
        try {
            var response = await fetch(settings.href + '/data', {cache: 'no-store'});
            if (!response.ok) throw new Error('공간 조회 실패');
            var layout = await response.json();
            if (current !== version) return;
            if (!layout || !Array.isArray(layout.spots) || String(layout.siteId) !== site.value) throw new Error('잘못된 공간 응답');
            if (!layout.image) {
                updateStatus('모니터링 이미지가 아직 설정되지 않았습니다.');
                settings.hidden = false;
                return;
            }
            if (!layout.image.readUrl) throw new Error('모니터링 이미지 URL 없음');
            var image = document.createElement('img');
            currentImage = image;
            image.className = 'monitoring-image';
            image.alt = layout.name + ' 모니터링 이미지';
            image.referrerPolicy = 'no-referrer';
            var overlay = document.createElement('div');
            overlay.className = 'monitoring-hotspots';
            var placed = layout.spots.filter(spot => [spot.xPercent, spot.yPercent].every(value =>
                value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
                && Number(value) >= 0 && Number(value) <= 100));
            courses = effects.groups(layout.spots);
            placed.filter(spot => spot.courseId == null).forEach(spot => courses.push({
                id: 'unassigned-' + spot.spotId, code: '', name: '', spots: [spot], unassigned: true,
                bounds: {left: Number(spot.xPercent), right: Number(spot.xPercent), top: Number(spot.yPercent), bottom: Number(spot.yPercent)}
            }));
            var midFocus = createFocusLayer('mid', layout.image.readUrl, current);
            var nearFocus = createFocusLayer('near', layout.image.readUrl, current);
            currentMidFocus = midFocus;
            currentNearFocus = nearFocus;
            var haloLayer = document.createElement('div');
            haloLayer.setAttribute('aria-hidden', 'true');
            haloLayer.setAttribute('class', 'monitoring-course-halos');
            currentHaloLayer = haloLayer;
            var badgeLayer = document.createElement('div');
            badgeLayer.className = 'monitoring-course-badges';
            badgeLayer.setAttribute('aria-label', 'Healing Course 영역');
            courses.forEach((course, index) => {
                if (course.unassigned) return;
                var midRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                midRect.setAttribute('fill', 'white');
                midFocus.shapes.append(midRect);
                var halo = document.createElement('div');
                halo.className = 'monitoring-course-halo';
                haloLayer.append(halo);
                var badge = document.createElement('div');
                badge.className = 'monitoring-course-badge hc-tone-' + index % 3;
                var title = document.createElement('span');
                var courseTitle = [course.code, course.name].filter(Boolean).join(' · ');
                title.textContent = courseTitle;
                badge.append(title);
                badgeLayer.append(badge);
                badges.push({course: course, title: courseTitle, badge: badge, halo: halo, midRect: midRect});
            });
            placed.forEach(spot => {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'monitoring-hotspot';
                button.style.left = spot.xPercent + '%';
                button.style.top = spot.yPercent + '%';
                button.setAttribute('aria-label', spot.code + ' · ' + spot.name + ' 상세 보기');
                button.setAttribute('aria-pressed', String(spot.spotId === selectedId));
                var circle = document.createElement('span');
                circle.className = 'monitoring-hotspot-circle';
                circle.textContent = spot.code || spot.name;
                var nearCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                nearCircle.setAttribute('fill', 'white');
                nearFocus.shapes.append(nearCircle);
                if (spot.readUrl) {
                    var photo = document.createElement('img');
                    photo.alt = '';
                    photo.referrerPolicy = 'no-referrer';
                    photo.addEventListener('error', () => photo.remove());
                    photo.src = spot.readUrl;
                    circle.append(photo);
                }
                var label = document.createElement('span');
                label.className = 'monitoring-hotspot-label';
                var name = [spot.code, spot.name].filter(Boolean).join(' · ');
                var metricTag = document.createElement('span');
                metricTag.className = 'monitoring-hotspot-metric';
                var spotValue = document.createElement('span');
                spotValue.className = 'monitoring-hotspot-value effect-missing';
                var number = document.createElement('strong');
                var unit = document.createElement('span');
                spotValue.append(number, unit);
                var auxiliary = document.createElement('span');
                auxiliary.className = 'monitoring-hotspot-auxiliary';
                auxiliary.setAttribute('aria-hidden', 'true');
                var spotName = document.createElement('strong');
                spotName.className = 'monitoring-hotspot-name';
                spotName.textContent = name;
                label.append(metricTag, spotValue, auxiliary, spotName);
                label.setAttribute('aria-hidden', 'true');
                button.append(circle, label);
                button.addEventListener('click', () => onSelect({...spot, representativeImageUrl: spot.readUrl}));
                button.addEventListener('mouseenter', positionLabels);
                button.addEventListener('focus', positionLabels);
                buttons.push({id: spot.spotId, code: spot.code, name: name, button: button, circle: circle,
                    label: label, metric: metricTag, value: spotValue, number: number, unit: unit,
                    auxiliary: auxiliary, nearCircle: nearCircle,
                    xPercent: Number(spot.xPercent), yPercent: Number(spot.yPercent)});
                overlay.append(button);
            });
            updateSpotEffects();
            image.addEventListener('load', () => {
                if (current !== version) return;
                canvas.hidden = false;
                positionLabels();
                updateStatus(placed.length ? '' : '설정된 HS 위치가 없습니다.');
            });
            image.addEventListener('error', () => {
                if (current !== version) return;
                canvas.hidden = true;
                updateStatus('모니터링 이미지를 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.');
                settings.hidden = false;
            });
            canvas.append(image, midFocus.layer, nearFocus.layer, haloLayer, badgeLayer, overlay);
            image.src = layout.image.readUrl;
        } catch (error) {
            if (current !== version) return;
            updateStatus('공간 모니터링을 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.');
            settings.hidden = false;
        }
    }
    return {load: load, select: select, setAnalysis: setAnalysis};
};
