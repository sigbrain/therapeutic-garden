/* Read-only monitoring view. The image itself defines the percentage coordinate plane. */
window.HomeSpatial = function(onSelect) {
    var canvas = document.getElementById('monitoringCanvas');
    var status = document.getElementById('monitoringStatus');
    var settings = document.getElementById('monitoringSettings');
    var version = 0;
    var buttons = [];
    var selectedId = null;
    function select(spotId) {
        selectedId = spotId;
        buttons.forEach(entry => entry.button.setAttribute('aria-pressed', String(entry.id === spotId)));
    }
    async function load(site) {
        var current = ++version;
        selectedId = null;
        buttons = [];
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
            placed.forEach(spot => {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'monitoring-hotspot';
                button.style.left = spot.xPercent + '%';
                button.style.top = spot.yPercent + '%';
                button.setAttribute('aria-label', spot.code + ' · ' + spot.name + ' 정보 보기');
                button.setAttribute('aria-pressed', String(spot.spotId === selectedId));
                button.title = spot.code + ' · ' + spot.name;
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
                label.textContent = spot.code || spot.name;
                // Keep the circle centered on the saved coordinate, including image edges.
                if (Number(spot.yPercent) > 85) label.classList.add('above');
                button.append(circle, label);
                button.addEventListener('click', () => onSelect({...spot, representativeImageUrl: spot.readUrl}));
                buttons.push({id: spot.spotId, button: button});
                overlay.append(button);
            });
            image.addEventListener('load', () => {
                if (current !== version) return;
                canvas.hidden = false;
                status.textContent = placed.length ? '' : '설정된 HS 위치가 없습니다.';
            });
            image.addEventListener('error', () => {
                if (current !== version) return;
                canvas.hidden = true;
                status.textContent = '모니터링 이미지를 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.';
                settings.hidden = false;
            });
            canvas.append(image, overlay);
            image.src = layout.image.readUrl;
        } catch (error) {
            if (current !== version) return;
            status.textContent = '공간 모니터링을 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.';
            settings.hidden = false;
        }
    }
    return {load: load, select: select};
};
