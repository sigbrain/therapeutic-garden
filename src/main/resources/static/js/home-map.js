/* ================================
   Kakao Map 생성
================================ */

var container =
    document.getElementById('map');


/*
 * 방배 Site 기본 지도 중심
 */
var siteMapCenter =
    new kakao.maps.LatLng(
        37.48405230687292,
        126.98882349727562
    );


var options = {
    center: siteMapCenter,
    level: 3
};


var map =
    new kakao.maps.Map(
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
        image: '/images/site1/healing-spots/hs1.jpeg',

        lat: 37.48577591872291,
        lng: 126.98839637835367
    },

    {
        id: 'HS2',
        name: '곶자왈원',
        course: 'HC-A',
        courseName: '회복 코스',
        image: '/images/site1/healing-spots/hs2.jpeg',

        lat: 37.48552596813059,
        lng: 126.98923311873006
    },

    {
        id: 'HS3',
        name: '가든 위스퍼스',
        course: 'HC-B',
        courseName: '감각 코스',
        image: '/images/site1/healing-spots/hs3.jpeg',

        lat: 37.483215042958435,
        lng: 126.99118380982651
    },

    {
        id: 'HS4',
        name: '콜로네이드 가든',
        course: 'HC-B',
        courseName: '감각 코스',
        image: '/images/site1/healing-spots/hs4.jpeg',

        lat: 37.483142914225716,
        lng: 126.99056196515338
    },

    {
        id: 'HS5',
        name: '블로썸 가든',
        course: 'HC-C',
        courseName: '힐링 코스',
        image: '/images/site1/healing-spots/hs5.jpeg',

        lat: 37.48283188337498,
        lng: 126.98849859102245
    },

    {
        id: 'HS6',
        name: '극림원',
        course: 'HC-C',
        courseName: '힐링 코스',
        image: '/images/site1/healing-spots/hs6.jpeg',

        lat: 37.48207726403847,
        lng: 126.9882499689662
    }

];


/* ================================
   Healing Course 데이터

   Alpha Power는 현재 테스트용 임시값

   HS는 별도의 Alpha Power를 가지지 않고,
   자신이 속한 HC의 Alpha Power를 사용한다.
================================ */

var healingCourses = [

    {
        id: 'HC-A',
        name: '회복 코스',

        centerLat: 37.4856509,
        centerLng: 126.9888147,

        radius: 90,

        alphaPower: 90
    },

    {
        id: 'HC-B',
        name: '감각 코스',

        centerLat: 37.4831789,
        centerLng: 126.9908729,

        radius: 80,

        alphaPower: 50
    },

    {
        id: 'HC-C',
        name: '힐링 코스',

        centerLat: 37.4824545,
        centerLng: 126.9883743,

        radius: 90,

        alphaPower: 5
    }

];


/* ================================
   Alpha Power → 무지개 색상

   낮음
   보라
   ↓
   파랑
   ↓
   청록
   ↓
   초록
   ↓
   노랑
   ↓
   주황
   ↓
   빨강
   높음
================================ */

function getAlphaPowerColor(alphaPower) {

    if (alphaPower >= 85) {
        return '#ef4444';
    }

    if (alphaPower >= 70) {
        return '#f97316';
    }

    if (alphaPower >= 55) {
        return '#eab308';
    }

    if (alphaPower >= 40) {
        return '#22c55e';
    }

    if (alphaPower >= 25) {
        return '#06b6d4';
    }

    if (alphaPower >= 10) {
        return '#3b82f6';
    }

    return '#8b5cf6';
}


/* ================================
   Healing Course 영역 표시
================================ */

healingCourses.forEach(
    function(course) {


        var center =
            new kakao.maps.LatLng(
                course.centerLat,
                course.centerLng
            );


        /*
         * Alpha Power 값으로
         * HC 색상 결정
         */
        var courseColor =
            getAlphaPowerColor(
                course.alphaPower
            );


        var circle =
            new kakao.maps.Circle({

                center: center,

                // 단위: m
                radius: course.radius,

                // 테두리 없음
                strokeWeight: 0,

                // 내부
                fillColor: courseColor,
                fillOpacity: 0.22

            });


        circle.setMap(map);

    }
);


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


var spotAlphaPower =
    document.getElementById(
        'spotAlphaPower'
    );


/*
 * Healing Spot 이미지
 */
var spotImage =
    document.getElementById(
        'spotImage'
    );


/* ================================
   HS 상세 정보 표시
================================ */

function showSpotInformation(spot) {


    // HS 번호
    spotId.textContent =
        spot.id;


    // HS 이름
    spotName.textContent =
        spot.name;


    // Healing Course
    spotCourse.textContent =
        spot.course
        + ' · '
        + spot.courseName;


    // HS 이미지 변경
    spotImage.src =
        spot.image;


    // 이미지 alt 변경
    spotImage.alt =
        spot.id
        + ' '
        + spot.name;


    /*
     * 클릭한 HS가 속한
     * Healing Course 찾기
     */
    var course =
        healingCourses.find(
            function(course) {

                return course.id === spot.course;

            }
        );


    /*
     * 해당 HC의 Alpha Power를
     * HS 상세 화면에도 표시
     */
    if (course) {

        spotAlphaPower.textContent =
            course.alphaPower;

    } else {

        spotAlphaPower.textContent =
            '--';

    }


    // Site 기본 정보 숨기기
    siteInformationPanel
        .classList
        .add('hidden');


    // HS 상세 정보 표시
    spotInformationPanel
        .classList
        .remove('hidden');


    /*
     * 왼쪽 패널을 아래로 내려놓았더라도
     * HS를 클릭하면 맨 위로 복귀
     */
    sitePanel.scrollTop = 0;

}


/* ================================
   Healing Spot 마커 생성
================================ */

healingSpots.forEach(
    function(spot) {


        var position =
            new kakao.maps.LatLng(
                spot.lat,
                spot.lng
            );


        var marker =
            new kakao.maps.Marker({

                position: position

            });


        // 지도에 마커 표시
        marker.setMap(map);


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


/* ================================
   Site 기본 정보로 돌아가기
================================ */

showSitePanelButton.addEventListener(
    'click',
    function() {


        // HS 상세 정보 숨기기
        spotInformationPanel
            .classList
            .add('hidden');


        // Site 기본 정보 표시
        siteInformationPanel
            .classList
            .remove('hidden');


        // 왼쪽 패널 맨 위로 복귀
        sitePanel.scrollTop = 0;

    }
);


/* ================================
   Site 선택
================================ */

var siteSelect =
    document.getElementById(
        'siteSelect'
    );


/*
 * 현재 Site가 방배 하나뿐이므로
 * 클릭하면 방배 Site 위치와 배율로 복귀
 *
 * 나중에 Site가 여러 개가 되면
 * change 이벤트로 변경해서
 * 각 Site의 좌표와 level을 사용하면 된다.
 */
siteSelect.addEventListener(
    'click',
    function() {


        map.setCenter(
            siteMapCenter
        );


        map.setLevel(3);

    }
);