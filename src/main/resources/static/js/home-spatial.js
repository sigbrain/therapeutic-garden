/* Read-only monitoring view. The image itself defines the percentage coordinate plane. */
window.HomeSpatial = function(onSelect) {
    var canvas = document.getElementById('monitoringCanvas');
    var status = document.getElementById('monitoringStatus');
    var settings = document.getElementById('monitoringSettings');
    var version = 0;
    var buttons = [];
    var selectedId = null;
    var courses = [], badges = [];
    var metric = 'stress';
    var effects = window.HomeCourseOverlay;
    var metricButtons = ['hcStress', 'hcRelaxation'].map(id => document.getElementById(id));
    function updateMetric(next) {
        metric = next;
        metricButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(metric === (index ? 'relaxation' : 'stress'))));
        badges.forEach(entry => {
            var change = effects.aggregate(entry.course, metric);
            var color = effects.metricColor(change, metric);
            entry.value.textContent = effects.formatChange(change, metric);
            entry.value.style.color = color;
            entry.region.style.fill = color;
            entry.region.style.stroke = color;
        });
    }
    metricButtons.forEach((button, index) => button.addEventListener('click', () => updateMetric(index ? 'relaxation' : 'stress')));
    function positionBadges() {
        var width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height) return;
        var obstacles = buttons.map(entry => {
            var diameter = entry.button.offsetWidth + 14;
            return {x: width * entry.xPercent / 100 - diameter / 2,
                y: height * entry.yPercent / 100 - diameter / 2, w: diameter, h: diameter};
        });
        badges.forEach(entry => {
            var pos = effects.badgePosition(entry.course.bounds,
                {w: entry.badge.offsetWidth, h: entry.badge.offsetHeight}, {w: width, h: height}, obstacles);
            entry.badge.style.left = pos.x / width * 100 + '%';
            entry.badge.style.top = pos.y / height * 100 + '%';
            obstacles.push(pos);
        });
    }
    function select(spotId) {
        selectedId = spotId;
        buttons.forEach(entry => entry.button.setAttribute('aria-pressed', String(entry.id === spotId)));
    }
    function positionLabels() {
        positionBadges();
        var width = canvas.clientWidth;
        if (!width) return;
        buttons.forEach(entry => {
            entry.label.style.maxWidth = Math.min(200, Math.max(0, width - 16)) + 'px';
            var half = entry.label.offsetWidth / 2;
            var center = width * entry.xPercent / 100;
            // Move only the label; the photo remains on its saved percentage coordinate.
            var boundedCenter = Math.min(Math.max(center, half + 8), width - half - 8);
            entry.label.style.marginLeft = (boundedCenter - center) + 'px';
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
        canvas.replaceChildren();
        canvas.hidden = true;
        settings.hidden = true;
        status.textContent = site ? '공간 정보를 불러오는 중입니다.' : '등록된 Site가 없습니다.';
        if (!site) return;
        settings.href = '/admin/sites/' + encodeURIComponent(site.value) + '/spatial-layout';
        try {
            var response = await fetch(settings.href + '/data', {cache: 'no-store'});
            if (!response.ok) throw new Error('공간 조회 실패');
            var layout = await response.json();
            if (current !== version) return;
            if (!layout || !Array.isArray(layout.spots) || String(layout.siteId) !== site.value) throw new Error('잘못된 공간 응답');
            if (!layout.image) {
                status.textContent = '모니터링 이미지가 아직 설정되지 않았습니다.';
                settings.hidden = false;
                return;
            }
            if (!layout.image.readUrl) throw new Error('모니터링 이미지 URL 없음');
            var image = document.createElement('img');
            image.className = 'monitoring-image';
            image.alt = layout.name + ' 모니터링 이미지';
            image.referrerPolicy = 'no-referrer';
            var overlay = document.createElement('div');
            overlay.className = 'monitoring-hotspots';
            var placed = layout.spots.filter(spot => [spot.xPercent, spot.yPercent].every(value =>
                value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
                && Number(value) >= 0 && Number(value) <= 100));
            courses = effects.groups(layout.spots);
            var regions = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            regions.setAttribute('viewBox', '0 0 100 100');
            regions.setAttribute('preserveAspectRatio', 'none');
            regions.setAttribute('aria-hidden', 'true');
            regions.setAttribute('class', 'monitoring-course-regions');
            var badgeLayer = document.createElement('div');
            badgeLayer.className = 'monitoring-course-badges';
            badgeLayer.setAttribute('aria-label', 'HC 공간효과 예시 데이터');
            courses.forEach((course, index) => {
                var bounds = course.bounds;
                var region = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                Object.entries({x: bounds.left, y: bounds.top, width: bounds.right - bounds.left,
                    height: bounds.bottom - bounds.top,
                    // Flatten corners at the image edge so even edge-positioned HS centers stay inside.
                    rx: Math.min(6, ...course.spots.map(s => Math.min(Number(s.xPercent) - bounds.left, bounds.right - Number(s.xPercent)))),
                    ry: Math.min(7, ...course.spots.map(s => Math.min(Number(s.yPercent) - bounds.top, bounds.bottom - Number(s.yPercent)))),
                    class: 'hc-tone-' + index % 3}).forEach(([key, value]) => region.setAttribute(key, value));
                regions.append(region);
                var badge = document.createElement('div');
                badge.className = 'monitoring-course-badge hc-tone-' + index % 3;
                var title = document.createElement('span');
                title.textContent = [course.code, course.name].filter(Boolean).join(' · ');
                var value = document.createElement('strong');
                var change = effects.aggregate(course, metric);
                value.textContent = effects.formatChange(change, metric);
                var color = effects.metricColor(change, metric);
                region.style.fill = color;
                region.style.stroke = color;
                value.style.color = color;
                badge.append(title, value);
                badgeLayer.append(badge);
                badges.push({course: course, badge: badge, value: value, region: region});
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
                label.textContent = [spot.code, spot.name].filter(Boolean).join(' · ');
                label.setAttribute('aria-hidden', 'true');
                button.append(circle, label);
                button.addEventListener('click', () => onSelect({...spot, representativeImageUrl: spot.readUrl}));
                button.addEventListener('mouseenter', positionLabels);
                button.addEventListener('focus', positionLabels);
                buttons.push({id: spot.spotId, button: button, label: label, xPercent: Number(spot.xPercent), yPercent: Number(spot.yPercent)});
                overlay.append(button);
            });
            image.addEventListener('load', () => {
                if (current !== version) return;
                canvas.hidden = false;
                positionLabels();
                status.textContent = placed.length ? '' : '설정된 HS 위치가 없습니다.';
            });
            image.addEventListener('error', () => {
                if (current !== version) return;
                canvas.hidden = true;
                status.textContent = '모니터링 이미지를 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.';
                settings.hidden = false;
            });
            canvas.append(image, regions, badgeLayer, overlay);
            image.src = layout.image.readUrl;
        } catch (error) {
            if (current !== version) return;
            status.textContent = '공간 모니터링을 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.';
            settings.hidden = false;
        }
    }
    return {load: load, select: select};
};
