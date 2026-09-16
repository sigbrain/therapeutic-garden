(function () {
    'use strict';
    const site = document.getElementById('siteId');
    const latitude = document.getElementById('centerLatitude');
    const longitude = document.getElementById('centerLongitude');
    const radius = document.getElementById('radius');
    const status = document.getElementById('course-map-status');
    if (!window.kakao || !window.kakao.maps) {
        status.textContent = '지도를 불러오지 못했습니다. 좌표와 반경은 직접 입력할 수 있습니다.';
        return;
    }
    let map, marker, circle;
    function number(value) {
        return value.trim() === '' ? NaN : Number(value);
    }
    function preview(move) {
        if (!map) return;
        const lat = number(latitude.value), lng = number(longitude.value), meters = number(radius.value);
        if (marker) marker.setMap(null);
        if (circle) circle.setMap(null);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
        const center = new kakao.maps.LatLng(lat, lng);
        marker = new kakao.maps.Marker({map: map, position: center});
        if (Number.isFinite(meters) && meters > 0) {
            circle = new kakao.maps.Circle({map: map, center: center, radius: meters,
                strokeWeight: 2, strokeColor: '#3b82f6', strokeOpacity: 0.9,
                fillColor: '#3b82f6', fillOpacity: 0.18});
        }
        if (move) map.setCenter(center);
    }
    function selectSite(initial) {
        const option = site.options[site.selectedIndex];
        if (!option || !option.value) {
            status.textContent = '사이트를 선택하면 지도를 표시합니다.';
            document.getElementById('course-map').style.visibility = 'hidden';
            return;
        }
        document.getElementById('course-map').style.visibility = 'visible';
        const center = new kakao.maps.LatLng(Number(option.dataset.latitude), Number(option.dataset.longitude));
        const level = Number(option.dataset.mapLevel);
        if (!map) {
            map = new kakao.maps.Map(document.getElementById('course-map'), {center: center, level: level});
            kakao.maps.event.addListener(map, 'click', function (event) {
                latitude.value = event.latLng.getLat();
                longitude.value = event.latLng.getLng();
                preview(false);
            });
        } else {
            map.relayout();
            map.setCenter(center);
            map.setLevel(level);
        }
        status.textContent = '지도를 클릭하면 HC 중심 좌표가 입력됩니다.';
        preview(initial);
    }
    site.addEventListener('change', function () { selectSite(false); });
    [latitude, longitude, radius].forEach(function (input) {
        input.addEventListener('input', function () { preview(input !== radius); });
    });
    selectSite(true);
})();
