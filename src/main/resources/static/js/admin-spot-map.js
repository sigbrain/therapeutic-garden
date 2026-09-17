(function () {
    'use strict';
    const course = document.getElementById('courseId');
    const latitude = document.getElementById('latitude');
    const longitude = document.getElementById('longitude');
    const container = document.getElementById('spot-map');
    const status = document.getElementById('spot-map-status');
    if (![course, latitude, longitude, container, status].every(Boolean)) return;

    let map, marker;
    const unavailable = '지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    function number(value) {
        return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
    }
    function validPosition(lat, lng) {
        return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }
    function preview(move) {
        const lat = number(latitude.value), lng = number(longitude.value);
        if (!validPosition(lat, lng)) return;
        const position = new kakao.maps.LatLng(lat, lng);
        if (!marker) marker = new kakao.maps.Marker({map: map, position: position});
        else marker.setPosition(position);
        if (move) map.setCenter(position);
    }
    function selectCourse(initial) {
        try {
            if (!window.kakao || !window.kakao.maps || !window.kakao.maps.Map) throw new Error('SDK unavailable');
            const option = course.options[course.selectedIndex];
            container.style.visibility = option && option.value ? 'visible' : 'hidden';
            if (!option || !option.value) { status.textContent = ''; return; }
            let lat = number(option.dataset.centerLatitude), lng = number(option.dataset.centerLongitude);
            if (!validPosition(lat, lng)) {
                lat = number(option.dataset.latitude);
                lng = number(option.dataset.longitude);
            }
            if (!validPosition(lat, lng)) throw new Error('Invalid map center');
            const center = new kakao.maps.LatLng(lat, lng);
            const zoom = number(option.dataset.mapLevel);
            const level = Number.isInteger(zoom) && zoom >= 1 && zoom <= 14 ? zoom : 3;
            if (!map) {
                map = new kakao.maps.Map(container, {center: center, level: level});
                kakao.maps.event.addListener(map, 'click', function (event) {
                    const lat = event.latLng.getLat(), lng = event.latLng.getLng();
                    if (!validPosition(lat, lng)) return;
                    latitude.value = lat;
                    longitude.value = lng;
                    preview(false);
                    status.textContent = '';
                });
            } else {
                map.relayout();
                map.setCenter(center);
                map.setLevel(level);
            }
            // 표시용 코스/Site 중심은 저장하지 않는다. 코스 변경 시 지정한 HS 위치도 유지한다.
            preview(initial);
            status.textContent = '';
        } catch (error) {
            status.textContent = unavailable;
        }
    }
    course.addEventListener('change', function () { selectCourse(false); });
    selectCourse(true);
})();
