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


/*
 * 선택된 Site의 DB 좌표를 이용해
 * 기본 지도 중심 생성
 */
var siteMapCenter =
    new kakao.maps.LatLng(
        Number(selectedSite.dataset.latitude),
        Number(selectedSite.dataset.longitude)
    );


/* ================================
   Kakao Map 생성
================================ */

var container =
    document.getElementById(
        'map'
    );


var options = {

    center: siteMapCenter,

    level: Number(
        selectedSite.dataset.mapLevel
    )

};


var map =
    new kakao.maps.Map(
        container,
        options
    );


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
   Alpha Power 임시 데이터

   Alpha Power의 실제 데이터 구조는
   아직 결정되지 않았기 때문에
   현재는 테스트용 값만 사용한다.

   나중에 실제 Alpha Power 데이터가
   연결되면 이 부분을 제거한다.
================================ */

var temporaryAlphaPower = {

    'HC-A': 90,
    'HC-B': 50,
    'HC-C': 5

};


/* ================================
   Alpha Power → 무지개 색상
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


var spotAlphaPower =
    document.getElementById(
        'spotAlphaPower'
    );


var spotImage =
    document.getElementById(
        'spotImage'
    );


/* ================================
   Site 기본 정보 표시
================================ */

function showSiteInformation(siteOption) {

    siteName.textContent =
        siteOption.dataset.name;


    siteAddress.textContent =
        siteOption.dataset.address;

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


            /*
             * DB에서 받은 HC 중심 좌표
             */
            var center =
                new kakao.maps.LatLng(
                    course.centerLatitude,
                    course.centerLongitude
                );


            /*
             * Alpha Power는 아직
             * 실제 DB 데이터가 없으므로
             * 임시값 사용
             */
            var alphaPower =
                temporaryAlphaPower[
                    course.code
                    ];


            /*
             * 임시값이 없는 경우
             * 가장 낮은 값으로 처리
             */
            if (alphaPower === undefined) {
                alphaPower = 0;
            }


            var courseColor =
                getAlphaPowerColor(
                    alphaPower
                );


            var circle =
                new kakao.maps.Circle({

                    center: center,

                    radius: course.radius,

                    strokeWeight: 0,

                    fillColor: courseColor,
                    fillOpacity: 0.22

                });


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


    /*
     * 이미지 경로는 아직 DB에 없으므로
     * 현재 파일 구조를 이용한 임시 처리
     *
     * 예:
     * HS1 → hs1.jpeg
     */
    spotImage.src =
        '/images/site1/healing-spots/'
        + spot.code.toLowerCase()
        + '.jpeg';


    spotImage.alt =
        spot.code
        + ' '
        + spot.name;


    /*
     * 클릭한 HS가 속한 HC의
     * 임시 Alpha Power 조회
     */
    var alphaPower =
        temporaryAlphaPower[
            spot.courseCode
            ];


    if (alphaPower !== undefined) {

        spotAlphaPower.textContent =
            alphaPower;

    } else {

        spotAlphaPower.textContent =
            '--';

    }


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


    /*
     * Site가 변경될 수도 있으므로
     * 기존 지도 객체부터 제거
     */
    clearHealingSpaceMap();


    try {


        /*
         * 특정 Site의 HC 조회
         *
         * 예:
         * /api/sites/1/courses
         */
        var courseResponse =
            await fetch(
                '/api/sites/'
                + siteId
                + '/courses'
            );


        /*
         * 특정 Site의 HS 조회
         */
        var spotResponse =
            await fetch(
                '/api/sites/'
                + siteId
                + '/spots'
            );


        /*
         * HTTP 요청 자체가 실패한 경우
         */
        if (!courseResponse.ok) {

            throw new Error(
                'HealingCourse 조회 실패'
            );

        }


        if (!spotResponse.ok) {

            throw new Error(
                'HealingSpot 조회 실패'
            );

        }


        /*
         * 서버가 보내준 JSON을
         * JavaScript 객체 배열로 변환
         */
        healingCourses =
            await courseResponse.json();


        healingSpots =
            await spotResponse.json();


        /*
         * DB 데이터를 이용해
         * 지도에 HC / HS 표시
         */
        drawHealingCourses();

        drawHealingSpots();


    } catch (error) {

        console.error(
            'Healing Space 데이터를 불러오는 중 오류가 발생했습니다.',
            error
        );

    }

}


/* ================================
   페이지 최초 실행
================================ */

/*
 * 첫 번째 Site 이름 / 주소 표시
 */
showSiteInformation(
    selectedSite
);


/*
 * 첫 번째 Site의 HC / HS를
 * DB에서 조회해서 지도에 표시
 */
loadHealingSpace(
    selectedSite.value
);


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


        sitePanel.scrollTop = 0;

    }
);


/* ================================
   Site 선택
================================ */

siteSelect.addEventListener(
    'change',
    function() {


        /*
         * 새로 선택된 Site
         */
        var selectedSite =
            siteSelect.options[
                siteSelect.selectedIndex
                ];


        /*
         * 선택된 Site의 DB 좌표
         */
        var siteMapCenter =
            new kakao.maps.LatLng(
                Number(
                    selectedSite.dataset.latitude
                ),
                Number(
                    selectedSite.dataset.longitude
                )
            );


        /*
         * 지도 중심 이동
         */
        map.setCenter(
            siteMapCenter
        );


        /*
         * DB의 mapLevel 적용
         */
        map.setLevel(
            Number(
                selectedSite.dataset.mapLevel
            )
        );


        /*
         * Site 이름 / 주소 변경
         */
        showSiteInformation(
            selectedSite
        );


        /*
         * HS 상세 화면을 보고 있었다면
         * Site 기본 정보 화면으로 복귀
         */
        spotInformationPanel
            .classList
            .add('hidden');


        siteInformationPanel
            .classList
            .remove('hidden');


        sitePanel.scrollTop = 0;


        /*
         * 선택된 Site ID를 이용해서
         * 해당 Site의 HC / HS를 DB에서 다시 조회
         */
        loadHealingSpace(
            selectedSite.value
        );

    }
);