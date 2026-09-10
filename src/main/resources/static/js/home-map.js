/* ================================
   Site 데이터
================================ */

var siteSelect =
    document.getElementById(
        'siteSelect'
    );


/*
 * 현재 선택된 Site
 */
var selectedSite =
    siteSelect.options[
        siteSelect.selectedIndex
        ];


// Site가 없거나 SDK 로딩에 실패해도 정보 패널은 사용할 수 있다.
var map = null;
var survey = window.HomeSurvey;
var selectedSpot = null;
var selectedParticipant = 'all';
var selectedMetric = 'stress';
var loadVersion = 0;
function validNumber(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}
function validPosition(latitude, longitude) {
    return validNumber(latitude) && validNumber(longitude)
        && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;
}
function moveSiteMap(site) {
    if (!site || !validPosition(site.dataset.latitude, site.dataset.longitude)) return;
    if (!window.kakao || !window.kakao.maps) {
        document.getElementById('map').textContent = '지도를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.';
        return;
    }
    var center = new kakao.maps.LatLng(Number(site.dataset.latitude), Number(site.dataset.longitude));
    var level = validNumber(site.dataset.mapLevel) ? Number(site.dataset.mapLevel) : 3;
    if (!map) map = new kakao.maps.Map(document.getElementById('map'), {center: center, level: level});
    else { map.setCenter(center); map.setLevel(level); }
}

/* ================================
   Healing Space 데이터

   HC / HS 데이터는 더 이상
   JavaScript에 직접 작성하지 않는다.

   선택된 Site의 ID를 이용해서
   Spring Boot API로부터 조회한다.
================================ */

var healingCourses = [];
var healingSpots = [];


/*
 * 지도에 생성된 HC Circle과
 * HS Marker를 보관한다.
 *
 * Site를 변경했을 때 기존 객체를
 * 지도에서 제거하기 위해 필요하다.
 */
var courseCircles = [];
var spotMarkers = [];


/* ================================
   왼쪽 정보 패널 요소
================================ */

var sitePanel =
    document.querySelector(
        '.site-panel'
    );


var siteInformationPanel =
    document.getElementById(
        'siteInformationPanel'
    );


var spotInformationPanel =
    document.getElementById(
        'spotInformationPanel'
    );


var showSitePanelButton =
    document.getElementById(
        'showSitePanelButton'
    );


/*
 * Site 정보
 */
var siteName =
    document.getElementById(
        'siteName'
    );


var siteAddress =
    document.getElementById(
        'siteAddress'
    );


/*
 * Healing Spot 정보
 */
var spotId =
    document.getElementById(
        'spotId'
    );


var spotName =
    document.getElementById(
        'spotName'
    );


var spotCourse =
    document.getElementById(
        'spotCourse'
    );


var spotImage =
    document.getElementById(
        'spotImage'
    );


/* ================================
   Site 기본 정보 표시
================================ */

function showSiteInformation(siteOption) {

    siteName.textContent = siteOption ? siteOption.dataset.name : '등록된 Site가 없습니다.';
    siteAddress.textContent = siteOption ? siteOption.dataset.address : '';
    setImage(document.getElementById('siteImage'), document.getElementById('siteImageEmpty'),
        getSiteImage(siteOption), siteOption ? siteOption.dataset.name : 'Site');

}


/* ================================
   기존 지도 객체 제거

   Site를 변경할 때
   이전 Site의 HC / HS가 지도에
   남아있지 않도록 제거한다.
================================ */

function clearHealingSpaceMap() {


    /*
     * 기존 HealingCourse Circle 제거
     */
    courseCircles.forEach(
        function(circle) {

            circle.setMap(null);

        }
    );


    /*
     * 기존 HealingSpot Marker 제거
     */
    spotMarkers.forEach(
        function(marker) {

            marker.setMap(null);

        }
    );


    /*
     * 보관 배열도 비운다.
     */
    courseCircles = [];
    spotMarkers = [];

}


/* ================================
   Healing Course 영역 표시
================================ */

function drawHealingCourses() {


    healingCourses.forEach(
        function(course) {


            if (!map || !validPosition(course.centerLatitude, course.centerLongitude)
                || !validNumber(course.radius) || Number(course.radius) <= 0) return;
            var center = new kakao.maps.LatLng(course.centerLatitude, course.centerLongitude);
            var courseColor = courseAnalysisColor(course);

            var circle =
                new kakao.maps.Circle({

                    center: center,

                    radius: course.radius,

                    strokeWeight: 0,

                    fillColor: courseColor,
                    fillOpacity: 0.22

                });


            circle.surveyCourse = course;
            circle.setMap(map);


            /*
             * 나중에 Site 변경 시
             * 제거할 수 있도록 저장
             */
            courseCircles.push(
                circle
            );

        }
    );

}


/* ================================
   HS 상세 정보 표시
================================ */

function showSpotInformation(spot) {


    /*
     * DB의 code
     * 예: HS1
     */
    spotId.textContent =
        spot.code;


    spotName.textContent =
        spot.name;


    /*
     * HealingSpotResponse에 담긴
     * HC 정보 사용
     */
    spotCourse.textContent =
        spot.courseCode
        + ' · '
        + spot.courseName;


    selectedSpot = spot;
    showSitePanelButton.classList.remove('hidden');
    // TEMP: 방배 HS 이미지 규칙. 향후 DB imagePath로 교체한다.
    var imagePath = getSiteImage(selectedSite) === '/images/site1/site1.png' && spot.code
        ? '/images/site1/healing-spots/' + encodeURIComponent(spot.code.toLowerCase()) + '.jpeg' : null;
    setImage(spotImage, document.getElementById('spotImageEmpty'), imagePath, spot.code + ' ' + spot.name);
    updateAnalysis();

    /*
     * Site 기본 정보 숨기기
     */
    siteInformationPanel
        .classList
        .add('hidden');


    /*
     * HS 상세 정보 표시
     */
    spotInformationPanel
        .classList
        .remove('hidden');


    sitePanel.scrollTop = 0;

}


/* ================================
   Healing Spot 마커 표시
================================ */

function drawHealingSpots() {


    healingSpots.forEach(
        function(spot) {


            /*
             * DB에서 받은 HS 좌표
             */
            if (!map || !validPosition(spot.latitude, spot.longitude)) return;
            var position =
                new kakao.maps.LatLng(
                    spot.latitude,
                    spot.longitude
                );


            var marker =
                new kakao.maps.Marker({

                    position: position

                });


            marker.setMap(map);


            /*
             * 나중에 Site 변경 시
             * 제거할 수 있도록 저장
             */
            spotMarkers.push(
                marker
            );


            /*
             * HS 마커 클릭
             */
            kakao.maps.event.addListener(
                marker,
                'click',
                function() {

                    showSpotInformation(
                        spot
                    );

                }
            );

        }
    );

}


/* ================================
   Healing Space DB 데이터 조회
================================ */

async function loadHealingSpace(siteId) {
    var version = ++loadVersion;
    clearHealingSpaceMap();
    healingCourses = [];
    healingSpots = [];
    var status = document.getElementById('spaceStatus');
    status.textContent = '공간 정보를 불러오는 중입니다.';
    try {
        var responses = await Promise.all([
            fetch('/api/sites/' + encodeURIComponent(siteId) + '/courses'),
            fetch('/api/sites/' + encodeURIComponent(siteId) + '/spots')
        ]);
        if (responses.some(response => !response.ok)) throw new Error('공간 조회 실패');
        var data = await Promise.all(responses.map(response => response.json()));
        if (version !== loadVersion) return;
        if (!data.every(Array.isArray)) throw new Error('잘못된 공간 응답');
        healingCourses = data[0].filter(Boolean);
        healingSpots = data[1].filter(Boolean);
        drawHealingCourses();
        drawHealingSpots();
        status.textContent = [
            !healingCourses.length ? '등록된 Healing Course가 없습니다.' : '',
            !healingSpots.length ? '등록된 Healing Spot이 없습니다.' : '',
            map && courseCircles.length < healingCourses.length ? '좌표 또는 반경이 없는 Course는 지도에서 제외됩니다.' : '',
            map && spotMarkers.length < healingSpots.length ? '좌표가 없는 Spot은 지도에서 제외됩니다.' : ''
        ].filter(Boolean).join(' ');
        updateAnalysis();
    } catch (error) {
        if (version !== loadVersion) return;
        clearHealingSpaceMap();
        healingCourses = [];
        healingSpots = [];
        status.textContent = '공간 정보를 불러오지 못했습니다. Site를 다시 선택하거나 새로고침해 주세요.';
    }
}

// TODO: Site imagePath가 DB에 추가되면 이 임시 이름 매핑 제거.
// 알 수 없는 Site를 PK/목록 순서로 추정하지 않는다.
function getSiteImage(site) {
    if (!site) return null;
    var images = {
        '디에이치 방배': '/images/site1/site1.png',
        '세브란스 병원': '/images/site2/site2.jpeg'
    };
    return images[site.dataset.name] || null;
}
function setImage(image, empty, path, alt) {
    image.hidden = true;
    empty.hidden = false;
    image.onload = function() { image.hidden = false; empty.hidden = true; };
    image.onerror = function() { image.hidden = true; empty.hidden = false; };
    image.alt = alt;
    if (path) image.src = path;
    else image.removeAttribute('src');
}
function courseAnalysisColor(course) {
    var raw = survey.courseMean(selectedMetric, selectedParticipant, selectedSite.value, course, healingSpots);
    return survey.getSurveyColor(survey.normalize(selectedMetric, raw));
}
function updateAnalysis() {
    courseCircles.forEach(circle => circle.setOptions({fillColor: courseAnalysisColor(circle.surveyCourse)}));
    document.getElementById('surveyLegendTitle').textContent = survey.metrics[selectedMetric].name;
    document.getElementById('surveyLegendRange').textContent = survey.range(selectedMetric);
    document.getElementById('surveyLegendContext').textContent = survey.metrics[selectedMetric].spatial
        ? 'Spot 5회 평균 → Course 평균 · 회색: 데이터 없음'
        : '주간 설문 5회 평균 · 모든 Course에 동일 적용';
    if (selectedSpot) survey.renderSpot(document.getElementById('spotAnalysis'), {
        metric: selectedMetric, participant: selectedParticipant, site: selectedSite.value, spot: selectedSpot
    });
    if (!modal.hidden) renderAnalysisModal();
}
function showSitePanel() {
    selectedSpot = null;
    showSitePanelButton.classList.add('hidden');
    spotInformationPanel.classList.add('hidden');
    siteInformationPanel.classList.remove('hidden');
    sitePanel.scrollTop = 0;
}
var participantSelect = document.getElementById('participantSelect');
survey.participants.forEach(participant => participantSelect.add(new Option(participant, participant)));
participantSelect.addEventListener('change', function() { selectedParticipant = this.value; updateAnalysis(); });
document.getElementById('metricSelect').addEventListener('change', function() { selectedMetric = this.value; updateAnalysis(); });
showSitePanelButton.addEventListener('click', showSitePanel);
siteSelect.addEventListener('change', function() {
    selectedSite = siteSelect.options[siteSelect.selectedIndex];
    closeAnalysisModal();
    showSitePanel();
    showSiteInformation(selectedSite);
    moveSiteMap(selectedSite);
    if (selectedSite) loadHealingSpace(selectedSite.value);
});

var modal = document.getElementById('analysisModal');
var dialog = modal.querySelector('[role="dialog"]');
var previousFocus = null;
var previousOverflow = '';
function renderAnalysisModal() {
    document.getElementById('analysisModalTitle').textContent = selectedParticipant === 'all'
        ? '전체 참가자 평균 분석' : selectedParticipant + ' 개인 분석';
    document.getElementById('analysisModalSite').textContent = selectedSite ? selectedSite.dataset.name : '';
    survey.renderModal(document.getElementById('analysisModalContent'), {
        participant: selectedParticipant, site: selectedSite ? selectedSite.value : '', courses: healingCourses, spots: healingSpots
    });
}
function closeAnalysisModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = previousOverflow;
    if (previousFocus) previousFocus.focus();
}
document.getElementById('openAnalysisButton').addEventListener('click', function() {
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    renderAnalysisModal();
    modal.hidden = false;
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    document.getElementById('closeAnalysisButton').focus();
});
document.getElementById('closeAnalysisButton').addEventListener('click', closeAnalysisModal);
modal.addEventListener('click', event => { if (event.target === modal) closeAnalysisModal(); });
document.addEventListener('keydown', function(event) {
    if (modal.hidden) return;
    if (event.key === 'Escape') closeAnalysisModal();
    if (event.key === 'Tab') {
        var controls = Array.from(dialog.querySelectorAll('button, summary, [tabindex="0"]'));
        var first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
        }
    }
});
showSiteInformation(selectedSite);
updateAnalysis();
if (selectedSite) {
    moveSiteMap(selectedSite);
    loadHealingSpace(selectedSite.value);
} else {
    siteSelect.disabled = true;
    document.getElementById('map').textContent = '등록된 Site가 없습니다.';
}
