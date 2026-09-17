(function () {
    'use strict';
    const address = document.getElementById('address');
    const latitude = document.getElementById('latitude');
    const longitude = document.getElementById('longitude');
    const level = document.getElementById('mapLevel');
    const button = document.getElementById('site-location-search');
    const container = document.getElementById('site-location-map');
    const status = document.getElementById('site-location-status');
    if (![address, latitude, longitude, level, button, container, status].every(Boolean)) return;

    let map, marker, geocoder;
    let version = 0;
    const unavailable = '지도 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    function number(value) {
        return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
    }
    function validPosition(lat, lng) {
        return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }
    function validLevel(value) {
        return Number.isInteger(value) && value >= 1 && value <= 14;
    }
    function showPosition(lat, lng, move) {
        const position = new kakao.maps.LatLng(lat, lng);
        if (!marker) marker = new kakao.maps.Marker({map: map, position: position});
        else { marker.setPosition(position); marker.setMap(map); }
        if (move) map.setCenter(position);
    }
    function applyPosition(lat, lng, move) {
        latitude.value = lat;
        longitude.value = lng;
        showPosition(lat, lng, move);
    }
    function search() {
        const selectedAddressFailure = '주소는 입력했지만 위치를 찾지 못했습니다. 기존 위치를 유지했습니다. 지도에서 위치를 확인해 주세요.';
        const requestVersion = ++version;
        if (!map || !geocoder) { status.textContent = '주소는 입력했지만 지도 서비스를 불러오지 못했습니다. 기존 위치를 유지했습니다. 잠시 후 다시 시도해 주세요.'; return; }
        const query = address.value.trim();
        if (!query) { status.textContent = '주소 검색에서 주소를 선택해 주세요.'; return; }
        status.textContent = '';
        try {
            geocoder.addressSearch(query, function (results, resultStatus) {
                if (requestVersion !== version) return;
                const result = resultStatus === kakao.maps.services.Status.OK && Array.isArray(results)
                    ? results.find(item => item && validPosition(number(item.y), number(item.x))) : null;
                if (!result) {
                    status.textContent = selectedAddressFailure;
                    return;
                }
                // Kakao 응답은 y가 위도, x가 경도다. 주소 입력값은 유지한다.
                applyPosition(number(result.y), number(result.x), true);
                status.textContent = '';
            });
        } catch (error) {
            status.textContent = selectedAddressFailure;
        }
    }
    const modal = document.getElementById('site-postcode-modal');
    const embed = document.getElementById('site-postcode-embed');
    const closeButton = document.getElementById('site-postcode-close');
    const modalStatus = document.getElementById('site-postcode-status');
    let previousOverflow = '';
    let backdropPointerDown = false;
    function closePostcode() {
        if (!modal || !modal.open) return;
        ++version;
        modal.close();
        embed.replaceChildren();
        document.body.style.overflow = previousOverflow;
        button.focus({preventScroll: true});
    }
    function openPostcode() {
        if (modal && modal.open) return;
        const selectionVersion = ++version;
        if (!modal || !embed || !closeButton || !modalStatus || !modal.showModal
                || !window.kakao || typeof window.kakao.Postcode !== 'function') {
            status.textContent = '주소 검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
            return;
        }
        embed.replaceChildren();
        modalStatus.textContent = '';
        previousOverflow = document.body.style.overflow;
        try {
            modal.showModal();
            document.body.style.overflow = 'hidden';
            closeButton.focus();
            new kakao.Postcode({
                width: '100%', height: '100%', focusInput: false,
                oncomplete: function (data) {
                    if (!modal.open || selectionVersion !== version) return;
                    const selected = data && (data.userSelectedType === 'R' ? data.roadAddress
                        : data.userSelectedType === 'J' ? data.jibunAddress : '');
                    if (typeof selected !== 'string' || !selected.trim() || selected.length > address.maxLength) {
                        modalStatus.textContent = '선택한 주소를 사용할 수 없습니다. 도로명 또는 지번 주소를 다시 선택해 주세요.';
                        return;
                    }
                    address.value = selected;
                    closePostcode();
                    search();
                }
            }).embed(embed, {q: address.value.trim(), autoClose: false});
        } catch (error) {
            closePostcode();
            status.textContent = '주소 검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        }
    }
    button.addEventListener('click', openPostcode);
    if (modal && closeButton) {
        closeButton.addEventListener('click', closePostcode);
        // Native modal dialog keeps background content inert and contains keyboard focus.
        // The external iframe's DOM and keyboard events are not accessed.
        modal.addEventListener('cancel', function (event) {
            event.preventDefault();
            closePostcode();
        });
        modal.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !event.isComposing) {
                event.preventDefault();
                closePostcode();
            }
        });
        function outsideModal(event) {
            const rect = modal.getBoundingClientRect();
            return event.target === modal && (event.clientX < rect.left || event.clientX > rect.right
                || event.clientY < rect.top || event.clientY > rect.bottom);
        }
        modal.addEventListener('pointerdown', function (event) { backdropPointerDown = outsideModal(event); });
        modal.addEventListener('click', function (event) {
            if (backdropPointerDown && outsideModal(event)) closePostcode();
            backdropPointerDown = false;
        });
    }
    try {
        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.Map) throw new Error('SDK unavailable');
        const lat = number(latitude.value), lng = number(longitude.value), zoom = number(level.value);
        const hasPosition = validPosition(lat, lng);
        // 서울 시청 부근의 표시용 중심이며 Form 값이나 DB 기본값으로 사용하지 않는다.
        map = new kakao.maps.Map(container, {
            center: new kakao.maps.LatLng(hasPosition ? lat : 37.5665, hasPosition ? lng : 126.9780),
            level: validLevel(zoom) ? zoom : 3
        });
        if (hasPosition) showPosition(lat, lng, false);
        kakao.maps.event.addListener(map, 'click', function (event) {
            ++version;
            const lat = event.latLng.getLat(), lng = event.latLng.getLng();
            if (!validPosition(lat, lng)) return;
            applyPosition(lat, lng, false);
            status.textContent = '';
        });
        level.addEventListener('input', function () {
            const zoom = number(level.value);
            if (validLevel(zoom)) map.setLevel(zoom);
        });
        if (!kakao.maps.services || !kakao.maps.services.Geocoder) throw new Error('Geocoder unavailable');
        geocoder = new kakao.maps.services.Geocoder();
        status.textContent = '';
    } catch (error) {
        status.textContent = unavailable;
    }
})();
