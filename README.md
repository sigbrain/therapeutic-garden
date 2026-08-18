# 일정 관리 시스템

관리자와 참가자의 일정을 효율적으로 관리하기 위해 개발한  
Spring Boot 기반 일정 관리 웹 애플리케이션입니다.

관리자는 참가자 정보와 전체 일정을 등록·수정·삭제하고 달력으로 확인할 수 있으며,  
참가자는 로그인 후 본인에게 등록된 일정과 세부 Healing Spot 정보를 확인할 수 있습니다.

---

## 기술 스택

### Backend
- Java 21
- Spring Boot 4.1.0
- Spring MVC
- Spring Data JPA
- Spring Security PasswordEncoder
- MySQL

### Frontend
- Thymeleaf
- HTML
- CSS
- JavaScript
- FullCalendar

### Build
- Gradle

---

## 주요 도메인

### Admin

관리자 계정 정보를 관리합니다.

관리자는 로그인 후 참가자 및 전체 일정 관리 기능을 사용할 수 있습니다.

---

### Member

참가자 정보를 관리합니다.

주요 정보:

- 참가자 번호
- 그룹 번호
- 로그인 아이디
- 비밀번호
- 이름
- 전화번호

참가자는 본인의 계정으로 로그인하여 자신에게 등록된 일정만 조회할 수 있습니다.

---

### Schedule

참가자에게 등록되는 일정을 관리합니다.

주요 정보:

- 참가자
- 일정 날짜
- 코스
- 날씨
- 기온
- 습도

하나의 Schedule은 여러 개의 ScheduleSpot을 가질 수 있습니다.

---

### ScheduleSpot

하나의 일정에 포함되는 세부 Healing Spot 방문 정보를 관리합니다.

주요 정보:

- 스팟 번호
- 시작 시간
- 방문 순서
- 연결된 일정

현재 사용되는 Healing Spot은 다음과 같습니다.

| 스팟 | 장소 |
|---|---|
| HS1 | 호스타 정원 |
| HS2 | 곶자왈원 |
| HS3 | 가든 위스퍼스 |
| HS4 | 콜로네이드 가든 |
| HS5 | 블로썸 가든 |
| HS6 | 극림원 |

---

# 주요 기능

## 공통

- 관리자 / 참가자 로그인 구분
- BCrypt 기반 비밀번호 암호화
- Session 기반 로그인 상태 관리
- 관리자 / 참가자 전용 Interceptor 적용
- 권한에 따른 페이지 접근 제한

---

## 관리자 기능

### 참가자 관리

- 참가자 목록 조회
- 참가자 상세 조회
- 참가자 정보 수정
- 참가자 삭제
- 참가자 번호 중복 검사
- 로그인 아이디 중복 검사
- 이름 및 전화번호 관리
- 전화번호 `010-XXXX-XXXX` 형식 입력 및 표시
- 참가자 삭제 시 해당 참가자의 일정 및 ScheduleSpot 함께 삭제
- 그룹별 색상 표시

그룹 색상은 다음과 같이 구분합니다.

- 1그룹: 보라색
- 2그룹: 청록색
- 3그룹: 장미색

---

### 일정 관리

- 전체 일정 목록 조회
- 새 일정 등록
- 일정 상세 조회
- 일정 수정
- 일정 삭제
- ScheduleSpot 등록 및 수정
- 일정 삭제 시 연결된 ScheduleSpot 함께 삭제
- 일정 날짜순 정렬
- 그룹순 정렬

---

### 일정 등록 편의 기능

일정 등록 시 반복 입력을 줄이기 위해 코스와 Healing Spot에 따른 기본값을 자동으로 설정합니다.

#### 코스별 기본 스팟

| 코스 | 기본 첫 번째 스팟 |
|---|---|
| A | HS1 |
| B | HS3 |
| C | HS5 |

첫 번째 스팟을 선택하면 연결된 두 번째 스팟이 자동으로 선택됩니다.

| 첫 번째 스팟 | 두 번째 스팟 |
|---|---|
| HS1 | HS2 |
| HS2 | HS1 |
| HS3 | HS4 |
| HS4 | HS3 |
| HS5 | HS6 |
| HS6 | HS5 |

첫 번째 시작 시간의 기본값은 `09:00`이며,  
두 번째 스팟의 시작 시간은 첫 번째 시작 시간을 기준으로 자동 계산됩니다.

자동 입력된 값은 관리자가 필요에 따라 직접 수정할 수 있습니다.

---

## 관리자 전체 일정 달력

FullCalendar를 이용하여 관리자가 전체 참가자의 일정을 월간 달력으로 확인할 수 있습니다.

하루에 여러 참가자의 일정이 존재할 수 있기 때문에 참가자를 개별적으로 모두 표시하는 대신  
일정을 그룹 단위로 묶어서 표시합니다.

그룹은 기존 그룹 색상과 동일하게 구분됩니다.

- 1그룹: 보라색
- 2그룹: 청록색
- 3그룹: 장미색

그룹 일정을 클릭하면 해당 날짜와 그룹에 속한 참가자 목록을 확인할 수 있으며,  
참가자 번호를 선택하면 해당 일정의 상세 페이지로 이동합니다.

일정 상세 페이지에서는 진입 경로를 유지하여  
달력에서 접근한 경우 다시 관리자 달력으로 돌아갈 수 있습니다.

---

## 참가자 기능

### 참가자 로그인

참가자는 발급된 로그인 아이디와 비밀번호를 이용해 로그인합니다.

로그인 후에는 다른 참가자의 일정이 아닌  
본인에게 등록된 일정만 조회할 수 있습니다.

---

### 나의 일정 달력

FullCalendar를 이용하여 본인의 일정을 월간 달력으로 확인할 수 있습니다.

달력에는 다음과 같이 코스가 표시됩니다.

- 코스 A
- 코스 B
- 코스 C

일정에 마우스를 올리면 클릭 가능한 UI가 표시되며,  
일정을 클릭하면 해당 일정의 상세정보를 조회합니다.

---

### 일정 상세 조회

참가자가 달력에서 일정을 클릭하면 해당 Schedule의 ID를 이용해  
백엔드 API에 상세정보를 요청합니다.

```text
일정 클릭
    ↓
scheduleId 확인
    ↓
GET /member/api/schedules/{scheduleId}
    ↓
로그인 참가자의 일정인지 검증
    ↓
Schedule + ScheduleSpot 조회
    ↓
DTO를 JSON으로 반환
    ↓
JavaScript로 상세 카드 출력
```

상세 화면에서는 다음 정보를 확인할 수 있습니다.

- 일정 날짜
- 코스
- 그룹
- 날씨
- Healing Spot
- 방문 순서
- 시작 시간

일정 상세정보를 불러오면 해당 상세 카드 위치로 자동 스크롤됩니다.

또한 다른 참가자의 `scheduleId`를 직접 요청하더라도  
본인의 일정이 아니면 상세정보에 접근할 수 없도록 처리했습니다.

---

# 날씨 API 연동

일정 등록 및 수정 시 날짜와 시간을 기준으로 날씨 정보를 조회할 수 있습니다.

조회한 날씨 데이터는 일정에 저장하여 참가자 일정 상세 화면에서도 확인할 수 있습니다.

저장되는 주요 날씨 정보:

- 날씨
- 기온
- 습도

---

# 일정 수정 방식

일정 수정은 JPA Dirty Checking을 이용합니다.

```text
Schedule 조회
ScheduleSpot 조회
        ↓
Entity의 update() 메서드 호출
        ↓
@Transactional 종료
        ↓
JPA 변경 감지
        ↓
UPDATE SQL 실행
```

별도의 Repository `save()` 호출 없이  
영속 상태의 Entity 값을 변경하여 수정합니다.

---

# 일정 삭제 방식

ScheduleSpot이 Schedule을 참조하고 있기 때문에  
자식 데이터를 먼저 삭제한 후 부모 Schedule을 삭제합니다.

```text
ScheduleSpot 삭제
        ↓
Schedule 삭제
```

참가자를 삭제하는 경우에도 연결된 데이터를 순서대로 삭제합니다.

```text
Member
  ↓
Schedule
  ↓
ScheduleSpot
```

실제 삭제 순서는 외래 키 관계를 고려하여 다음과 같이 처리합니다.

```text
ScheduleSpot 삭제
        ↓
Schedule 삭제
        ↓
Member 삭제
```

삭제 요청은 GET이 아닌 POST 요청으로 처리하며,  
관리자 화면에서 삭제 전 confirm 창을 표시합니다.

---

# 프로젝트 구조

```text
src/main/java/com/example/manage

├── config
├── controller
├── domain
├── dto
├── interceptor
├── repository
└── service
```

화면은 관리자와 참가자 영역으로 분리되어 있습니다.

```text
templates

├── admin
│   ├── home.html
│   ├── login.html
│   ├── member-list.html
│   ├── member-detail.html
│   ├── member-edit.html
│   ├── schedule-list.html
│   ├── schedule-form.html
│   ├── schedule-edit.html
│   ├── schedule-detail.html
│   └── schedule-calendar.html
│
└── member
    ├── login.html
    └── home.html
```

---

# 향후 개발

현재 관리자/참가자 일정 관리에 필요한 핵심 기능은 구현된 상태입니다.

향후 실제 연구 데이터를 저장하고 일정 및 Healing Spot과 연결하는 기능을 추가할 예정입니다.

주요 개발 예정 기능:

1. EEG / PPG 등 측정 데이터 저장
2. 측정 데이터를 ScheduleSpot과 연결
3. CSV 기반 연구 데이터 처리
4. 데이터 저장 구조 설계
5. Validation 및 예외 처리 보완
6. UI 최종 정리
7. 운영 환경 배포 및 테스트

---

# 향후 측정 데이터 구조

추후 참가자의 EEG, PPG 등의 측정 데이터를  
일정별 Healing Spot과 연결하여 관리할 예정입니다.

예상 구조는 다음과 같습니다.

```text
Member
  ↓
Schedule
  ↓
ScheduleSpot
  ↓
MeasurementSession
  ↓
EEG / PPG / 기타 측정 데이터
```

이를 통해 최종적으로 다음 관계를 관리하는 것을 목표로 합니다.

```text
참가자
  ↓
특정 날짜의 일정
  ↓
특정 Healing Spot
  ↓
해당 위치에서 측정된 생체신호 데이터
```

하루 일정에서 여러 개의 측정 데이터 파일이 생성될 수 있으므로  
향후 측정 세션과 실제 데이터 파일을 분리하여 관리할 수 있도록 구조를 확장할 예정입니다.

---

# 실행 환경

- Java 21
- Spring Boot 4.1.0
- MySQL
- Gradle

애플리케이션 실행 후 다음 주소로 접속합니다.

```text
http://localhost:8080
```