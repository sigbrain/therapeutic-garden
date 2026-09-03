/* ================================
   Kakao Map 생성
================================ */

var container = document.getElementById('map');

var siteMapCenter = new kakao.maps.LatLng(
    37.48405230687292,
    126.98882349727561
);

var options = {
    center: siteMapCenter,
    level: 3
};

var map = new kakao.maps.Map(
    container,
    options
);


/* ================================
   Healing Spot 데이터
================================ */

var healingSpots = [
    {
        id: 'HS1',
        name: '호스타 정원',
        course: 'HC-A',
        courseName: '회복 코스',
        lat: 37.48577591872291,
        lng: 126.98839637835367
    },
    {
        id: 'HS2',
        name: '굿자일원',
        course: 'HC-A',
        courseName: '회복 코스',
        lat: 37.48552596813059,
        lng: 126.98923311873006
    },
    {
        id: 'HS3',
        name: '가든 위스퍼스',
        course: 'HC-B',
        courseName: '감각 코스',
        lat: 37.483215042958435,
        lng: 126.99118380982651
    },
    {
        id: 'HS4',
        name: '콜로네이드 가든',
        course: 'HC-B',
        courseName: '감각 코스',
        lat: 37.483142914225716,
        lng: 126.99056196515338
    },
    {
        id: 'HS5',
        name: '블로썸 가든',
        course: 'HC-C',
        courseName: '힐링 코스',
        lat: 37.48283188337498,
        lng: 126.98849859102245
    },
    {
        id: 'HS6',
        name: '극림원',
        course: 'HC-C',
        courseName: '힐링 코스',
        lat: 37.48207726403847,
        lng: 126.9882499689662
    }
];


/* ================================
   Healing Course 테스트 데이터

   아직 실제 Alpha Power 데이터가 아니라
   지도 표현 방식 확인을 위한 임시 색상
================================ */

var healingCourses = [
    {
        id: 'HC-A',
        name: '회복 코스',

        centerLat: 37.4856509,
        centerLng: 126.9888147,

        radius: 90,

        color: '#ef4444'
    },
    {
        id: 'HC-B',
        name: '감각 코스',

        centerLat: 37.4831789,
        centerLng: 126.9908729,

        radius: 80,

        color: '#22c55e'
    },
    {
        id: 'HC-C',
        name: '힐링 코스',

        centerLat: 37.4824545,
        centerLng: 126.9883743,

        radius: 90,

        color: '#f59e0b'
    }
];


/* ================================
   Healing Course 영역 표시
================================ */

healingCourses.forEach(function(course) {

    var center = new kakao.maps.LatLng(
        course.centerLat,
        course.centerLng
    );


    var circle = new kakao.maps.Circle({

        center: center,

        // 단위: m
        radius: course.radius,

        // 테두리
        strokeWeight: 2,
        strokeColor: course.color,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',

        // 내부 색상
        fillColor: course.color,
        fillOpacity: 0.22

    });


    circle.setMap(map);

});


/* ================================
   왼쪽 정보 패널
================================ */

var siteInformationPanel =
    document.getElementById('siteInformationPanel');

var spotInformationPanel =
    document.getElementById('spotInformationPanel');

var showSitePanelButton =
    document.getElementById('showSitePanelButton');


var spotId =
    document.getElementById('spotId');

var spotName =
    document.getElementById('spotName');

var spotCourse =
    document.getElementById('spotCourse');


/* ================================
   HS 상세 정보 표시
================================ */

function showSpotInformation(spot) {

    spotId.textContent =
        spot.id;

    spotName.textContent =
        spot.name;

    spotCourse.textContent =
        spot.course
        + ' · '
        + spot.courseName;


    siteInformationPanel
        .classList
        .add('hidden');


    spotInformationPanel
        .classList
        .remove('hidden');

}


/* ================================
   Healing Spot 마커 생성
================================ */

healingSpots.forEach(function(spot) {

    var position =
        new kakao.maps.LatLng(
            spot.lat,
            spot.lng
        );


    var marker =
        new kakao.maps.Marker({
            position: position
        });


    marker.setMap(map);


    kakao.maps.event.addListener(
        marker,
        'click',
        function() {

            showSpotInformation(spot);

        }
    );

});


/* ================================
   Site 기본 정보로 돌아가기
================================ */

showSitePanelButton.addEventListener(
    'click',
    function() {

        spotInformationPanel
            .classList
            .add('hidden');

        siteInformationPanel
            .classList
            .remove('hidden');

    }
);