> From: https://chatgpt.com/share/6a79b7cc-ad20-83ee-b00a-c118cb4104f9

# you asked

message time: 2026-08-10 19:07:20

WebMCP에 대한 적용 방법?

---

# chatgpt response

WebMCP는 쉽게 말하면 **웹사이트가 AI 에이전트에게 “우리 사이트에서는 이런 기능을 이렇게 호출하면 됩니다”라고 구조화해서 알려주는 방식**입니다. 2026년 현재 Chrome 쪽에서 제안·실험 중인 웹 표준으로, 기존처럼 AI가 화면을 보고 버튼 위치를 추측해서 클릭하는 대신 사이트가 검색·예약·문의·상품조회 같은 기능을 `tool` 형태로 직접 노출할 수 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

예를 들어 현재 웹 에이전트는 연애의자격 사이트에서 “상담 신청”을 하려면 DOM을 읽고 → 버튼을 찾고 → 입력칸을 해석하고 → 클릭하는 식입니다. WebMCP를 적용하면 사이트가 개념적으로 `searchConsultant()`, `getAvailableSchedule()`, `submitDiagnosis()`, `bookConsultation()` 같은 기능을 제공하고, AI가 정해진 파라미터로 바로 실행하게 됩니다. 이런 구조는 screenshot/DOM 기반 자동화보다 빠르고 UI 변경에도 덜 깨지는 것이 핵심입니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

### 럽디 사이트에 적용한다면

특히 지금 추진 중인 **AEO 사업과 굉장히 잘 맞습니다.** 저는 WebMCP 적용을 SEO/AEO와 별개 기능으로 보기보다, 다음 단계인 **AAO(Agent Action Optimization)** 층으로 보는 게 적절하다고 봅니다.

예를 들어 `yonza.co.kr`에서 다음과 같이 만들 수 있습니다.

```text
현재 웹사이트

사용자
 ↓
Google / ChatGPT
 ↓
검색·추천
 ↓
yonza.co.kr
 ↓
사용자가 직접 클릭
 ↓
진단지
 ↓
상담신청
```

WebMCP를 적용하면:

```text
사용자
 ↓
AI Agent
 ↓
yonza.co.kr WebMCP
 ↓
┌───────────────────────┐
│ search_content        │
│ get_service           │
│ get_price             │
│ check_consultant      │
│ start_diagnosis       │
│ submit_diagnosis      │
│ request_consultation  │
└───────────────────────┘
 ↓
사이트 내 실제 행동
```

예를 들어 사용자가 AI에게 **“연애의자격에서 재회 상담 받아보고 싶은데 나한테 맞는 서비스를 찾아줘”**라고 하면, 향후 WebMCP를 지원하는 에이전트가 단순히 사이트 설명만 읽는 게 아니라 사이트가 노출한 도구를 통해 서비스 종류와 가격을 확인하고 적합한 진단을 시작시키는 구조를 만들 수 있습니다.

### 개발 방식은 두 가지입니다

WebMCP에는 크게 **Declarative API와 Imperative API** 방식이 있습니다. Chrome 공식 문서도 이 두 형태를 설명하고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

기존 HTML form이 잘 구성되어 있다면 선언형으로 시작할 수 있습니다. 예를 들어 상담 검색 폼 자체에 AI가 이해할 수 있는 의미를 붙입니다.

```html
<form
  toolname="search_consultation"
  tooldescription="사용자의 연애 문제에 맞는 상담 서비스를 검색합니다."
>
  <input
    name="problem"
    type="text"
    placeholder="예: 이별 후 재회"
  >

  <select name="service">
    <option value="single">단회상담</option>
    <option value="plan">플랜상담</option>
  </select>

  <button type="submit">
    상담 찾기
  </button>
</form>
```

하지만 럽디처럼 실제 서비스 로직이 있는 사이트라면 **JavaScript 기반 Imperative WebMCP가 훨씬 중요**합니다.

개념적으로는 이런 식입니다.

```javascript
navigator.modelContext.registerTool({
  name: "find_consultation",
  description:
    "사용자의 연애 문제에 적합한 연애의자격 상담 상품을 찾습니다.",

  inputSchema: {
    type: "object",
    properties: {
      problem: {
        type: "string",
        description: "사용자가 겪고 있는 연애 문제"
      },
      budget: {
        type: "number",
        description: "상담 예산"
      }
    },
    required: ["problem"]
  },

  async execute({ problem, budget }) {

    const response = await fetch("/api/consultation/search", {
      method: "POST",
      body: JSON.stringify({
        problem,
        budget
      })
    });

    return await response.json();
  }
});
```

그러면 AI 에이전트에게는 사실상

```text
find_consultation(
    problem="헤어진 지 2개월이고 상대방이 연락을 차단함",
    budget=300000
)
```

같은 함수가 보이는 셈입니다.

---

## 지금 만들고 있는 AEO 시뮬레이터에는 더 흥미로운 적용이 가능합니다

현재 구상하신 시스템은

> 사이트맵 → 페이지 수집 → DOM 분석 → SEO/AEO/GEO 문제 탐지 → 가상 DOM 수정 → Before/After 재측정

구조인데, 여기에 **WebMCP Readiness**를 하나의 평가축으로 추가할 수 있습니다.

그러면 기존의

```text
SEO Score
AEO Score
GEO Score
```

외에

```text
Agent Readiness Score
```

를 만들 수 있습니다.

예를 들어 어떤 병원 사이트가 있다고 하면:

```text
현재

SEO                72
AEO                41
GEO                38
Agent Readiness     4
```

AI가 사이트를 분석해서 다음을 제안합니다.

```text
발견된 기능

[진료과 검색]
[의료진 검색]
[진료시간 확인]
[예약]
[주차 안내]
[증상별 의료진 추천]
```

그리고 이를

```text
search_department
search_doctor
get_schedule
check_availability
request_booking
get_parking_info
```

라는 WebMCP tool 후보로 변환합니다.

가상 적용한 뒤:

```text
AFTER

SEO                76
AEO                81
GEO                79
Agent Readiness    91
```

라고 보여주는 식입니다.

여기에서 중요한 것은 **WebMCP 자체가 SEO 점수를 직접 올린다고 주장하면 안 된다는 것**입니다. 현재로서는 WebMCP는 검색 랭킹 표준이라기보다는 **AI 에이전트가 사이트를 이해하고 행동하기 위한 인터페이스 표준 제안**에 가깝습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

대신 제품 설명은 이렇게 가져갈 수 있습니다.

> **“검색엔진이 읽기 좋은 웹사이트”에서  
> “AI가 이해하기 좋은 웹사이트”를 넘어  
> “AI가 직접 사용할 수 있는 웹사이트”까지 평가한다.**

이게 꽤 강력한 포지셔닝입니다.

### 산업별 RAG와도 자연스럽게 붙습니다

사용자가 얘기한 금융·병원·법률·전자상거래·프랜차이즈 구조라면 산업별로 **권장 WebMCP Tool Library**를 갖는 방식이 좋습니다.

| 산업 | 추천 Agent Tool |
|---|---|
| 병원 | `find_doctor`, `get_schedule`, `check_service`, `request_booking` |
| 법률 | `find_lawyer`, `find_case`, `check_consultation`, `request_consultation` |
| 금융 | `find_product`, `compare_product`, `calculate_rate`, `request_consultation` |
| 쇼핑몰 | `search_product`, `check_stock`, `compare_product`, `add_to_cart` |
| 프랜차이즈 | `find_store`, `get_menu`, `check_hours`, `request_franchise_info` |

RAG에는 단순히 “좋은 웹페이지란 무엇인가”만 넣는 것이 아니라,

```text
병원 WebMCP ontology
법률 WebMCP ontology
금융 WebMCP ontology
Commerce WebMCP ontology
```

까지 집어넣는 겁니다.

예를 들어 병원 홈페이지에서 HTML을 분석하여 AI가

> 예약 기능이 존재하지만 Agent-accessible interface가 없습니다.

라고 판단하고,

```javascript
check_doctor_availability()
request_appointment()
```

를 생성하도록 합니다.

이것은 지금 구상 중인 **DOM 가상수정 시뮬레이터와 상당히 궁합이 좋습니다.**

---

그리고 여기에서 한 단계 더 가면 제품 구조가 오히려 더 명확해집니다.

```text
                     AI Website Simulator

              ┌──────── 현재 Website ────────┐
              │                              │
 Sitemap → Crawl → DOM → Content → Function
              │
              ▼
        ┌─────────────┐
        │ Evaluation  │
        └──────┬──────┘
               │
      ┌────────┼────────┬────────┐
      ▼        ▼        ▼        ▼
     SEO      AEO      GEO    WebMCP
                              Readiness
      │        │        │        │
      └────────┴────────┴────────┘
               │
               ▼
         AI Modification
               │
               ▼
       Virtual DOM / Tools
               │
          ┌────┴────┐
          ▼         ▼
        BEFORE    AFTER
```

개인적으로는 **WebMCP를 지금 기획 중인 시뮬레이터에 넣는 것이 꽤 중요해 보입니다.** 2026년 8월 현재 아직 proposed standard 단계라서 WebMCP 하나만을 중심으로 제품을 만드는 건 이르지만, 기존 SEO/AEO/GEO 분석기 안에 **‘Agent Readiness / WebMCP Simulator’**로 넣으면 선점 가치가 큽니다. Chrome은 이미 개발자 문서에서 이를 웹사이트가 AI 에이전트에게 structured tools를 제공하는 방식으로 공식 소개하고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

특히 장기적으로는 **SEO → AEO → GEO → Agentic Web**이라는 제품 스토리를 만들 수 있습니다. 이 방향이면 현재 만들려는 소형 LLM도 단순한 SEO 문구 수정 모델보다 훨씬 명확해집니다. **“DOM을 보고 어떤 기능을 WebMCP Tool로 만들어야 하는지 판단하고, 산업별 RAG를 이용해 tool schema와 가상 구현안을 생성하는 모델”**까지 역할을 확장할 수 있기 때문입니다.

---

# you asked

message time: 2026-08-10 19:09:19

병원 같은 경우 환자의 현재 예약 정보와 병원 정보, 의사 정보 3가지로 정리가 되는데 3개의 정보를 보여주는 웹페이지에 webMCP를 공통적인 라이브러리 처럼 설정하는 방법은?

---

# chatgpt response

가능합니다. 핵심은 **각 페이지마다 WebMCP 코드를 따로 만드는 게 아니라, 병원 공통 `Hospital WebMCP SDK`를 한 번 로드하고 페이지가 가진 데이터/기능만 어댑터로 주입**하는 구조로 만드는 것입니다. 그러면 예약·병원·의사 페이지가 달라도 동일한 tool 규격을 쓸 수 있습니다.

네. 이 경우에는 **“페이지 3개에 각각 WebMCP를 붙인다”보다 “병원용 WebMCP 공통 라이브러리를 하나 만들고, 모든 페이지에서 같은 3개 Tool을 노출한다”**가 훨씬 좋습니다.

현재 WebMCP의 Imperative API는 `document.modelContext.registerTool()`로 웹페이지 기능을 구조화된 tool로 등록하는 방식이고, Chrome도 정적인 기능은 일관되게 등록하는 방식을 권장합니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

병원이라면 저는 **공통 표준을 딱 3개부터 시작**하겠습니다.

```text
Hospital WebMCP Library
│
├─ hospital.get_info
│    └─ 병원 기본정보 / 진료과 / 위치 / 운영시간
│
├─ doctor.get_info
│    └─ 의사 / 전문분야 / 진료시간 / 소속 진료과
│
└─ appointment.get_current
     └─ 로그인한 환자의 현재 예약정보
```

중요한 건 이 세 Tool을 각각의 화면에 종속시키지 않는 것입니다.

---

## 1. 제가 추천하는 구조

현재 웹사이트가 이렇게 되어 있다고 가정해보겠습니다.

```text
/hospital
병원 정보 페이지

/doctors/123
의사 정보 페이지

/my/appointments
환자 예약 정보 페이지
```

기존 방식이라면 각각 WebMCP를 따로 작성할 수 있습니다.

하지만 그렇게 하지 말고:

```text
                 hospital-webmcp.js
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     /hospital       /doctors/123   /appointments
          │              │              │
          └──────────────┼──────────────┘
                         │
               동일 Tool 3개 제공
                         │
           ┌─────────────┼─────────────┐
           ↓             ↓             ↓
 hospital.get_info  doctor.get_info  appointment.get_current
```

이렇게 만드는 겁니다.

WebMCP는 웹사이트가 기능을 structured tool로 등록하고, 에이전트가 그 schema를 발견해서 호출하도록 하는 구조이므로 이처럼 **사이트 공통 JS에서 일관된 이름과 schema를 등록**하기 좋습니다. ([GitHub](https://github.com/webmachinelearning/webmcp?utm_source=chatgpt.com))

---

# 2. 실제로는 공통 JS 파일 하나만 사이트 전체에 삽입

예를 들어 병원 홈페이지 공통 `<head>`에:

```html
<script type="module" src="/webmcp/hospital-webmcp.js"></script>
```

하나를 넣습니다.

그러면 어떤 페이지를 보고 있든 WebMCP 라이브러리가 실행됩니다.

`hospital-webmcp.js` 안에는 다음 세 개를 공통 등록합니다.

```javascript
// hospital-webmcp.js

document.modelContext.registerTool({
  name: "hospital_get_info",

  description:
    "현재 병원의 기본 정보, 주소, 진료과, 진료시간 및 대표 연락처를 조회합니다.",

  inputSchema: {
    type: "object",
    properties: {}
  },

  async execute() {
    const response = await fetch("/api/webmcp/hospital");
    return await response.json();
  }
});


document.modelContext.registerTool({
  name: "doctor_get_info",

  description:
    "병원 의료진의 전문분야, 진료과 및 진료 가능 정보를 조회합니다.",

  inputSchema: {
    type: "object",
    properties: {
      doctorId: {
        type: "string",
        description: "조회할 의사의 ID"
      },
      name: {
        type: "string",
        description: "조회할 의사의 이름"
      }
    }
  },

  async execute(args) {
    const params = new URLSearchParams(args);

    const response =
      await fetch(`/api/webmcp/doctors?${params}`);

    return await response.json();
  }
});


document.modelContext.registerTool({
  name: "appointment_get_current",

  description:
    "현재 로그인한 환자의 예약 정보를 조회합니다.",

  inputSchema: {
    type: "object",
    properties: {}
  },

  async execute() {
    const response =
      await fetch("/api/webmcp/my/appointments", {
        credentials: "same-origin"
      });

    return await response.json();
  }
});
```

**이게 사실상 병원 공통 WebMCP SDK 1차 버전입니다.**

Chrome 공식 구현에서도 tool은 이름·설명·입력 schema와 실행 callback을 갖는 방식으로 등록됩니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

---

# 3. 그러면 AI 입장에서는 웹페이지가 아니라 '병원 시스템'처럼 보입니다

이게 상당히 중요합니다.

사용자가 현재 `/doctors/123` 페이지에 있더라도 AI는:

```text
사용 가능한 기능

hospital_get_info()
doctor_get_info()
appointment_get_current()
```

를 발견합니다.

그러면 사용자가

> "내가 예약한 의사가 누구야?"

라고 할 경우:

```text
appointment_get_current()
↓
{
  appointmentId: "A39201",
  doctorId: "D102",
  doctorName: "김OO",
  department: "정형외과",
  datetime: "2026-08-13T14:30"
}
```

를 받고,

필요하면 이어서:

```text
doctor_get_info({
    doctorId: "D102"
})
```

를 호출합니다.

그러면:

```text
{
  doctorId: "D102",
  name: "김OO",
  department: "정형외과",
  specialties: [
      "척추질환",
      "허리디스크",
      "척추관협착증"
  ],
  schedule: {...}
}
```

까지 얻을 수 있습니다.

따라서 AI는 자연스럽게:

```text
환자
 │
 │ "모레 김OO 선생님 예약인데
 │  어디로 가야하고 몇 시까지 가야해?"
 ▼

AI Agent

① appointment_get_current()
            ↓
       예약 14:30 확인

② doctor_get_info(D102)
            ↓
       정형외과 / 본관 3층

③ hospital_get_info()
            ↓
       주소 / 주차 / 접수 안내

            ↓

"8월 12일 오후 2시 30분
 김OO 원장님 진료가 예약되어 있습니다.

 정형외과는 본관 3층이고,
 초진이라면 20분 정도 일찍 도착하는 것이 좋습니다."
```

라는 **여러 페이지를 가로지르는 답변**을 만들 수 있게 됩니다.

이것이 화면 DOM을 하나씩 읽게 하는 것보다 WebMCP를 사용하는 중요한 이유입니다. WebMCP의 목적 자체가 에이전트가 UI를 추측해 조작하는 대신 사이트가 구조화된 인터페이스를 제공하도록 하는 것입니다. ([Chrome for Developers](https://developer.chrome.com/blog/webmcp-epp?utm_source=chatgpt.com))

---

# 4. 더 중요한 부분: HTML에 있는 정보를 Tool이 직접 긁으면 안 됩니다

처음에는 이런 식으로 만들고 싶어질 수 있습니다.

```javascript
const hospitalName =
  document.querySelector(".hospital-name").innerText;

const doctorName =
  document.querySelector(".doctor-name").innerText;
```

**저는 이 방식은 권하지 않습니다.**

그러면 홈페이지 디자인이 바뀔 때마다 WebMCP도 깨집니다.

대신:

```text
                 Hospital DB
                      │
             Hospital Backend
                      │
                REST / GraphQL
                      │
        ┌─────────────┴─────────────┐
        │                           │
      Web UI                  WebMCP SDK
        │                           │
 HTML 화면에 표시              AI에게 제공
```

즉 **같은 데이터를 사람이 보는 UI와 AI가 보는 WebMCP가 공유**해야 합니다.

예를 들어:

```text
GET /api/hospital
GET /api/doctors
GET /api/my/appointments
```

가 기존에 있다면 WebMCP는 그것을 wrapper만 합니다.

```javascript
WebMCP Tool
    ↓
기존 API
    ↓
기존 Backend
    ↓
기존 DB
```

따라서 병원 자체 시스템을 크게 뜯어고칠 필요가 없습니다.

---

# 5. 그리고 이것을 진짜 '공통 라이브러리'로 만들 수 있습니다

여기서 지금 구상하시는 사업과 연결되는 부분이 있습니다.

특정 병원 하나에만 만드는 게 아니라 아예:

```text
@aiarchive/webmcp-hospital
```

같은 패키지를 만드는 겁니다.

병원 A:

```javascript
HospitalMCP.init({
    hospitalApi: "/api/hospital",
    doctorApi: "/api/doctors",
    appointmentApi: "/api/my/appointments"
});
```

병원 B:

```javascript
HospitalMCP.init({
    hospitalApi: "/v1/info",
    doctorApi: "/v1/medical-staff",
    appointmentApi: "/v1/reservation"
});
```

병원 C:

```javascript
HospitalMCP.init({
    hospitalApi: "/hospitalData",
    doctorApi: "/doctorData",
    appointmentApi: "/bookingData"
});
```

실제 API는 제각각이어도,

AI에게는 전부:

```text
hospital_get_info
doctor_get_info
appointment_get_current
```

로 보이게 만드는 겁니다.

즉,

> **병원마다 다른 데이터 구조 → 하나의 Hospital Agent 표준으로 Normalization**

하는 레이어가 됩니다.

---

# 6. 제가 만든다면 한 단계 더 추상화합니다

단순히 URL만 받지 않고 **Adapter 방식**으로 만듭니다.

```javascript
HospitalMCP.init({

  hospital: async () => {
    const raw = await getHospitalData();

    return {
      id: raw.hospital_no,
      name: raw.company_name,
      address: raw.addr,
      phone: raw.tel,
      departments: raw.medical_departments
    };
  },


  doctor: async ({ id }) => {
    const raw = await getDoctor(id);

    return {
      id: raw.staff_no,
      name: raw.staff_name,
      department: raw.dept,
      specialties: raw.major_fields
    };
  },


  appointment: async () => {
    const raw = await getMyReservation();

    return {
      id: raw.reservation_no,
      doctorId: raw.staff_no,
      datetime: raw.reservation_datetime,
      status: raw.status
    };
  }

});
```

그러면 병원마다 DB 컬럼 이름이:

```text
병원 A

doctor_id
doctor_name
department
```

이거나,

```text
병원 B

staff_no
staff_nm
dept_cd
```

여도 상관없습니다.

Adapter가 이를:

```text
Hospital WebMCP Standard

doctorId
name
department
```

로 바꿉니다.

---

# 7. 결국 핵심은 'URL 표준화'가 아니라 'Ontology 표준화'입니다

여기가 가장 중요합니다.

제가 병원용 WebMCP 라이브러리를 만든다면 먼저 다음 **표준 객체 세 개**를 정의합니다.

### `Hospital`

```json
{
  "hospitalId": "H001",
  "name": "OO병원",
  "address": "...",
  "phone": "...",
  "departments": [],
  "hours": {},
  "facilities": {},
  "parking": {}
}
```

### `Doctor`

```json
{
  "doctorId": "D001",
  "name": "홍길동",
  "department": "정형외과",
  "specialties": [],
  "career": [],
  "schedule": {}
}
```

### `Appointment`

```json
{
  "appointmentId": "A001",
  "patientId": "current-user",
  "doctorId": "D001",
  "department": "정형외과",
  "datetime": "2026-08-13T14:30:00+09:00",
  "status": "confirmed",
  "location": "본관 3층"
}
```

그리고 모든 병원의 데이터를 **이 세 가지 Canonical Schema로 변환**합니다.

---

# 8. 그러면 이후 Tool 확장이 매우 쉬워집니다

처음에는 Read-only 세 개:

```text
hospital_get_info
doctor_get_info
appointment_get_current
```

부터 시작합니다.

그 다음:

```text
doctor_search
doctor_get_schedule

appointment_get_available_slots
appointment_create
appointment_change
appointment_cancel
```

을 추가합니다.

결국 이런 구조가 됩니다.

```text
Hospital WebMCP Standard
│
├── Hospital
│    ├── hospital_get_info
│    ├── hospital_get_departments
│    └── hospital_get_directions
│
├── Doctor
│    ├── doctor_search
│    ├── doctor_get_info
│    └── doctor_get_schedule
│
└── Appointment
     ├── appointment_get_current
     ├── appointment_get_available_slots
     ├── appointment_create
     ├── appointment_change
     └── appointment_cancel
```

이때 `get/read` 계열과 `create/change/cancel` 계열은 보안 수준을 분리해야 합니다.

---

## 9. 특히 예약정보는 반드시 별도로 취급해야 합니다

병원정보와 의사정보는 공개정보입니다.

```text
Hospital        PUBLIC
Doctor          PUBLIC
```

반면:

```text
Appointment     AUTHENTICATED
```

입니다.

그래서 절대로:

```javascript
appointment_get_current(patientId)
```

처럼 AI가 임의의 `patientId`를 넘기게 만들면 안 됩니다.

대신:

```javascript
appointment_get_current()
```

로 만들고,

서버가 현재 로그인 세션을 보고:

```text
Browser session
       ↓
로그인 사용자 확인
       ↓
Authorization
       ↓
해당 사용자 예약만 반환
```

해야 합니다.

WebMCP 자체도 tool 노출에 대한 권한·same-origin 및 Permissions Policy 같은 보안 모델을 두고 있으며, Chrome은 별도로 WebMCP tool 보안 가이드를 제공하고 있습니다. ([GitHub](https://github.com/webmachinelearning/webmcp?utm_source=chatgpt.com))

즉 **WebMCP를 인증 시스템으로 생각하면 안 되고**, 기존 병원 백엔드의 인증/인가 위에 WebMCP를 올려야 합니다.

---

# 10. 사실 이걸 제품화한다면 3계층으로 만드는 게 좋습니다

제가 지금 구상하시는 시뮬레이터까지 포함해서 설계한다면 다음 구조를 권합니다.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Hospital WebMCP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

① Canonical Schema
──────────────────────────────
Hospital
Doctor
Appointment

            ↓

② Hospital Adapter SDK
──────────────────────────────
A병원 API → Canonical Schema
B병원 API → Canonical Schema
C병원 API → Canonical Schema

            ↓

③ WebMCP Tool SDK
──────────────────────────────
hospital_get_info
doctor_get_info
appointment_get_current

            ↓

          AI Agent
```

이러면 **병원마다 새로 WebMCP를 개발하는 사업이 아닙니다.**

새 병원이 들어올 때 개발자가 하는 일은 거의:

```text
A병원의
병원정보 API → Hospital

의사정보 API → Doctor

예약정보 API → Appointment
```

라는 mapping 세 개뿐입니다.

---

## 그리고 이 구조는 지금 만들고 있는 시뮬레이터와 아주 잘 맞습니다

현재 웹사이트를 크롤링해서:

```text
이 사이트에는

병원 정보        발견
의사 정보        발견
예약 기능        발견
```

이라고 판단한 다음,

AI가 자동으로:

```text
추천 WebMCP Profile

Hospital Profile v1

✓ hospital_get_info
✓ doctor_get_info
✓ doctor_search
✓ appointment_get_current
△ appointment_create
△ appointment_change
△ appointment_cancel
```

를 제안할 수 있습니다.

그리고 더 발전시키면 **산업마다 이러한 Profile을 하나씩 만드는 것**이 가능합니다.

```text
AI Archive
WebMCP Industry Profiles

Hospital Profile
├ Hospital
├ Doctor
└ Appointment

Law Firm Profile
├ Firm
├ Lawyer
└ Consultation

Finance Profile
├ Company
├ Product
└ Customer Account

Commerce Profile
├ Store
├ Product
└ Order

Franchise Profile
├ Brand
├ Store
└ Franchise Inquiry
```

이렇게 되면 단순한 WebMCP 구현회사가 아니라 **“산업별 Agent Interface 표준 + 자동 변환 SDK”**를 만드는 쪽으로 갈 수 있습니다.

그리고 **지금은 `Hospital / Doctor / Appointment` 세 객체로 시작하는 게 아주 좋은 범위**입니다. 공개정보 두 종류와 인증정보 한 종류가 섞여 있어서, 향후 산업별 WebMCP 표준을 만들 때 필요한 데이터 표준화·인증·Tool 설계 문제를 모두 작은 범위에서 시험할 수 있기 때문입니다.

참고로 앞 답변의 코드에서 `navigator.modelContext`라고 표현한 부분은 현재 Chrome 문서/최신 초안 기준으로는 **`document.modelContext.registerTool()`로 잡는 것이 맞습니다.** ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

---

# you asked

message time: 2026-08-10 19:11:04

공통된 정보를 .js 파일로 만들어 볼 수 있을까?

---

# chatgpt response

가능합니다. 오히려 **공통 `.js` 파일로 분리하는 방식이 가장 적합합니다.** WebMCP는 현재 `document.modelContext.registerTool()`을 통해 JavaScript에서 tool을 등록하는 구조이기 때문에, 사이트 전체에서 공통 JS를 로드해 동일한 tool schema를 제공할 수 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

예를 들어 `hospital-webmcp.js` 하나를 만들어 병원 사이트 모든 페이지에서 불러오도록 하면 됩니다.

```html
<script type="module" src="/js/hospital-webmcp.js"></script>
```

그리고 공통 파일을 이런 식으로 구성할 수 있습니다.

```javascript
// hospital-webmcp.js
// Hospital WebMCP Common Library v0.1

(function () {
  "use strict";

  if (!document.modelContext) {
    console.warn("[Hospital WebMCP] WebMCP is not supported in this browser.");
    return;
  }

  const CONFIG = window.HOSPITAL_WEBMCP_CONFIG || {
    hospitalApi: "/api/webmcp/hospital",
    doctorsApi: "/api/webmcp/doctors",
    appointmentsApi: "/api/webmcp/my/appointments"
  };


  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(
        `Hospital WebMCP API error: ${response.status}`
      );
    }

    return response.json();
  }


  // --------------------------------------------------
  // 1. 병원 정보
  // --------------------------------------------------

  document.modelContext.registerTool({
    name: "hospital_get_info",

    description:
      "현재 병원의 기본 정보, 주소, 연락처, 진료시간, 진료과, 주차 및 방문 정보를 조회합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    execute: async () => {
      const data = await request(CONFIG.hospitalApi);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data)
          }
        ]
      };
    }
  });


  // --------------------------------------------------
  // 2. 의사 정보
  // --------------------------------------------------

  document.modelContext.registerTool({
    name: "doctor_get_info",

    description:
      "병원 의료진의 이름, 진료과, 전문분야, 경력 및 진료 일정을 조회합니다.",

    inputSchema: {
      type: "object",

      properties: {
        doctorId: {
          type: "string",
          description: "병원 내부 의사 식별자"
        },

        name: {
          type: "string",
          description: "의사의 이름"
        }
      }
    },

    execute: async ({ doctorId, name }) => {
      const params = new URLSearchParams();

      if (doctorId) {
        params.set("doctorId", doctorId);
      }

      if (name) {
        params.set("name", name);
      }

      const data = await request(
        `${CONFIG.doctorsApi}?${params.toString()}`
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data)
          }
        ]
      };
    }
  });


  // --------------------------------------------------
  // 3. 현재 환자 예약정보
  // --------------------------------------------------

  document.modelContext.registerTool({
    name: "appointment_get_current",

    description:
      "현재 로그인한 환자의 예약 정보를 조회합니다. 예약된 의료진, 진료과, 날짜와 시간, 장소 및 예약 상태를 확인할 때 사용합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    execute: async () => {
      const data = await request(
        CONFIG.appointmentsApi
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data)
          }
        ]
      };
    }
  });


  console.log(
    "[Hospital WebMCP] Common tools registered."
  );

})();
```

이 방식은 현재 WebMCP의 imperative tool registration 구조와 맞습니다. Tool에는 `name`, `description`, `inputSchema`, `execute`를 두고 에이전트가 이를 발견해 호출하게 됩니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

### 그런데 여기서 한 단계 더 만드는 것을 추천합니다

위 코드는 **WebMCP 등록부**이고, 실제 병원별 차이는 별도 설정 파일로 빼는 겁니다.

예를 들어 A병원:

```javascript
// hospital-config.js

window.HOSPITAL_WEBMCP_CONFIG = {

  hospitalApi:
    "/api/hospital/info",

  doctorsApi:
    "/api/hospital/doctors",

  appointmentsApi:
    "/api/member/reservations"

};
```

HTML에서는:

```html
<script src="/js/hospital-config.js"></script>

<script
  type="module"
  src="/js/hospital-webmcp.js">
</script>
```

그러면 B병원에서는 **공통 파일을 전혀 수정하지 않고**:

```javascript
window.HOSPITAL_WEBMCP_CONFIG = {

  hospitalApi:
    "/v1/medical-center",

  doctorsApi:
    "/v1/staff",

  appointmentsApi:
    "/v1/my-booking"

};
```

만 바꾸면 됩니다.

즉 구조가:

```text
hospital-webmcp.js
────────────────────
병원 공통

hospital_get_info
doctor_get_info
appointment_get_current


        ↑ 설정값만 주입


hospital-config.js
────────────────────
병원별

API 주소
필드 mapping
병원 ID
인증방식
```

이렇게 됩니다.

## 더 좋은 방법은 데이터 표준까지 `.js`에 넣는 것입니다

예를 들어 어느 병원 API는:

```json
{
  "staff_no": "152",
  "staff_nm": "김의사",
  "dept_nm": "정형외과",
  "major": "척추"
}
```

라고 주는데 우리가 원하는 표준은:

```json
{
  "doctorId": "152",
  "name": "김의사",
  "department": "정형외과",
  "specialties": ["척추"]
}
```

일 수 있습니다.

이런 변환까지 라이브러리에 넣습니다.

```javascript
function normalizeDoctor(raw) {

  return {
    doctorId:
      raw.doctorId ??
      raw.doctor_id ??
      raw.staff_no,

    name:
      raw.name ??
      raw.doctor_name ??
      raw.staff_nm,

    department:
      raw.department ??
      raw.dept_name ??
      raw.dept_nm,

    specialties:
      raw.specialties ??
      raw.major ??
      []
  };

}
```

병원 정보도:

```javascript
function normalizeHospital(raw) {

  return {
    hospitalId:
      raw.hospitalId ??
      raw.hospital_id,

    name:
      raw.name ??
      raw.hospital_name,

    address:
      raw.address ??
      raw.addr,

    phone:
      raw.phone ??
      raw.tel,

    departments:
      raw.departments ?? [],

    hours:
      raw.hours ?? null,

    parking:
      raw.parking ?? null
  };

}
```

예약도:

```javascript
function normalizeAppointment(raw) {

  return {
    appointmentId:
      raw.appointmentId ??
      raw.reservation_no,

    doctorId:
      raw.doctorId ??
      raw.staff_no,

    doctorName:
      raw.doctorName ??
      raw.staff_nm,

    department:
      raw.department ??
      raw.dept_nm,

    datetime:
      raw.datetime ??
      raw.reservation_datetime,

    status:
      raw.status,

    location:
      raw.location
  };

}
```

이렇게 해놓으면 **병원마다 데이터 구조가 조금 달라도 AI에게는 동일하게 보입니다.**

최종적으로 저는 파일 구조를 이렇게 만들겠습니다.

```text
/webmcp/

├── hospital-webmcp.js
│
│   WebMCP Tool 등록
│
├── hospital-schema.js
│
│   Hospital
│   Doctor
│   Appointment
│   표준 데이터 구조
│
├── hospital-normalizer.js
│
│   병원별 원본 데이터
│          ↓
│   표준 데이터 변환
│
└── hospital-config.js
    │
    병원별 API 주소
    설정
```

그런데 **초기 MVP라면 파일을 여러 개로 나눌 필요조차 없습니다.**

우선:

```text
hospital-webmcp.js
```

**한 파일 안에**

```text
CONFIG
+
Schema normalization
+
hospital_get_info
+
doctor_get_info
+
appointment_get_current
```

를 전부 넣어서 검증하는 게 좋습니다.

그리고 실제 여러 병원에 적용하기 시작할 때:

```text
공통 Library
+
병원별 Adapter
```

로 분리하면 됩니다.

특히 이렇게 만들어두면 병원 사이트의 **모든 페이지에 `<script>` 한 줄만 공통 삽입**하면 되므로, `/hospital`, `/doctor/123`, `/reservation` 같은 페이지마다 WebMCP를 따로 구축할 필요가 없습니다. WebMCP 자체도 웹페이지가 공통적으로 structured tools를 노출하는 progressive enhancement 용도로 설계되고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

그리고 현재 기준으로는 `navigator.modelContext`가 아니라 **`document.modelContext`를 사용하는 것이 맞습니다.** Chrome 문서에는 `navigator.modelContext`가 Chrome 150에서 deprecated 되었고 `document.modelContext`를 사용하라고 명시되어 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

원하시면 다음 단계에서는 제가 **실제로 바로 서버에 올릴 수 있는 `hospital-webmcp.js v0.1` 전체 소스**를 만들어서, 병원명·의사정보·환자 예약정보를 HTML에서 읽는 버전과 API에서 읽는 버전 **두 가지 방식으로** 만들어드릴 수 있습니다.

---

# you asked

message time: 2026-08-10 19:12:03

좋아요. 다음 단계에 2가지 방식을 만들어 주세요.

---

# chatgpt response

두 버전으로 나누겠습니다. **① 기존 웹페이지의 HTML/DOM에서 정보를 읽는 ‘무개조형’**, **② 병원 백엔드 API를 직접 호출하는 ‘권장형’**으로 만들고, 둘 다 같은 `hospital_get_info / doctor_get_info / appointment_get_current` 인터페이스를 갖게 하겠습니다.

좋습니다. 두 방식 모두 **같은 WebMCP tool 이름과 반환 스키마**를 쓰게 만드는 게 핵심입니다. 그러면 나중에 HTML형에서 API형으로 바꿔도 AI 입장에서는 동일한 병원으로 보입니다.

현재 Chrome 문서 기준 WebMCP는 `document.modelContext.registerTool()`을 사용하고, read-only 도구에는 `readOnlyHint: true` 같은 annotation을 붙일 수 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api))

## ① HTML/DOM에서 직접 읽는 버전

이 방식은 **기존 병원 사이트를 거의 수정할 수 없거나 API 접근이 어려울 때** 적합합니다.

```javascript
// hospital-webmcp-dom.js
// Hospital WebMCP - DOM Reader Version v0.1

(async function () {
  "use strict";

  if (!document.modelContext) {
    console.warn("[Hospital WebMCP] WebMCP is not supported.");
    return;
  }

  // --------------------------------------------------
  // 공통 유틸
  // --------------------------------------------------

  const text = (selector) => {
    const el = document.querySelector(selector);
    return el?.textContent?.trim() || null;
  };

  const texts = (selector) => {
    return [...document.querySelectorAll(selector)]
      .map(el => el.textContent?.trim())
      .filter(Boolean);
  };

  const attr = (selector, name) => {
    return document.querySelector(selector)?.getAttribute(name) || null;
  };

  const compact = (obj) => {
    return Object.fromEntries(
      Object.entries(obj).filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0)
      )
    );
  };

  const asJson = (data) => {
    return JSON.stringify(data, null, 2);
  };


  // --------------------------------------------------
  // 이 부분만 병원 HTML 구조에 맞춰 수정
  // --------------------------------------------------

  const SELECTORS = {

    hospital: {
      id: "[data-hospital-id]",
      name: ".hospital-name",
      address: ".hospital-address",
      phone: ".hospital-phone",
      hours: ".hospital-hours",
      departments: ".department-list .department",
      parking: ".parking-info"
    },

    doctor: {
      container: ".doctor-profile",
      id: "[data-doctor-id]",
      name: ".doctor-name",
      department: ".doctor-department",
      specialties: ".doctor-specialties .item",
      career: ".doctor-career .item",
      schedule: ".doctor-schedule"
    },

    appointment: {
      container: ".my-appointment",
      id: "[data-appointment-id]",
      doctorId: "[data-doctor-id]",
      doctorName: ".appointment-doctor",
      department: ".appointment-department",
      datetime: "time",
      status: ".appointment-status",
      location: ".appointment-location"
    }
  };


  // --------------------------------------------------
  // Normalizer
  // --------------------------------------------------

  function readHospital() {
    return compact({
      hospitalId:
        attr(SELECTORS.hospital.id, "data-hospital-id"),

      name:
        text(SELECTORS.hospital.name),

      address:
        text(SELECTORS.hospital.address),

      phone:
        text(SELECTORS.hospital.phone),

      hours:
        text(SELECTORS.hospital.hours),

      departments:
        texts(SELECTORS.hospital.departments),

      parking:
        text(SELECTORS.hospital.parking)
    });
  }


  function readDoctor() {
    const container =
      document.querySelector(SELECTORS.doctor.container);

    if (!container) {
      return null;
    }

    return compact({
      doctorId:
        container.querySelector(SELECTORS.doctor.id)
          ?.getAttribute("data-doctor-id"),

      name:
        container.querySelector(SELECTORS.doctor.name)
          ?.textContent?.trim(),

      department:
        container.querySelector(SELECTORS.doctor.department)
          ?.textContent?.trim(),

      specialties:
        [...container.querySelectorAll(
          SELECTORS.doctor.specialties
        )]
          .map(el => el.textContent?.trim())
          .filter(Boolean),

      career:
        [...container.querySelectorAll(
          SELECTORS.doctor.career
        )]
          .map(el => el.textContent?.trim())
          .filter(Boolean),

      schedule:
        container.querySelector(SELECTORS.doctor.schedule)
          ?.textContent?.trim()
    });
  }


  function readAppointment() {
    const container =
      document.querySelector(
        SELECTORS.appointment.container
      );

    if (!container) {
      return null;
    }

    const timeElement =
      container.querySelector(
        SELECTORS.appointment.datetime
      );

    return compact({
      appointmentId:
        container.getAttribute(
          "data-appointment-id"
        ),

      doctorId:
        container.querySelector(
          SELECTORS.appointment.doctorId
        )?.getAttribute("data-doctor-id"),

      doctorName:
        container.querySelector(
          SELECTORS.appointment.doctorName
        )?.textContent?.trim(),

      department:
        container.querySelector(
          SELECTORS.appointment.department
        )?.textContent?.trim(),

      datetime:
        timeElement?.getAttribute("datetime") ||
        timeElement?.textContent?.trim(),

      status:
        container.querySelector(
          SELECTORS.appointment.status
        )?.textContent?.trim(),

      location:
        container.querySelector(
          SELECTORS.appointment.location
        )?.textContent?.trim()
    });
  }


  // --------------------------------------------------
  // WebMCP Tool 등록
  // --------------------------------------------------

  await document.modelContext.registerTool({
    name: "hospital_get_info",

    description:
      "현재 병원의 이름, 주소, 연락처, 진료시간, 진료과와 방문 정보를 조회합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },

    execute: async () => {
      const hospital = readHospital();

      if (!hospital.name) {
        return "현재 페이지에서 병원 정보를 찾을 수 없습니다.";
      }

      return asJson(hospital);
    }
  });


  await document.modelContext.registerTool({
    name: "doctor_get_info",

    description:
      "현재 페이지에 표시된 의료진의 이름, 진료과, 전문분야, 경력 및 진료일정을 조회합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },

    execute: async () => {
      const doctor = readDoctor();

      if (!doctor) {
        return "현재 페이지에서 의료진 정보를 찾을 수 없습니다.";
      }

      return asJson(doctor);
    }
  });


  await document.modelContext.registerTool({
    name: "appointment_get_current",

    description:
      "현재 페이지에 표시된 로그인 환자의 예약 의료진, 진료과, 예약시간, 상태와 방문장소를 조회합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },

    execute: async () => {
      const appointment = readAppointment();

      if (!appointment) {
        return "현재 페이지에서 예약 정보를 찾을 수 없습니다.";
      }

      return asJson(appointment);
    }
  });


  console.log(
    "[Hospital WebMCP DOM] Tools registered"
  );

})();
```

사이트에는 이것만 넣으면 됩니다.

```html
<script
  type="module"
  src="/js/hospital-webmcp-dom.js">
</script>
```

다만 이 버전의 단점은 분명합니다.

```text
HTML 변경
   ↓
CSS class 변경
   ↓
WebMCP selector 깨짐
   ↓
정보 조회 실패
```

따라서 **PoC나 기존 레거시 병원에 빠르게 적용하는 용도**로 적합합니다.

---

# ② API에서 직접 읽는 권장 버전

실서비스는 이 방식이 좋습니다.

```javascript
// hospital-webmcp-api.js
// Hospital WebMCP - API Version v0.1

(async function () {
  "use strict";

  if (!document.modelContext) {
    console.warn("[Hospital WebMCP] WebMCP is not supported.");
    return;
  }


  // --------------------------------------------------
  // 병원별 설정
  // --------------------------------------------------

  const CONFIG = window.HOSPITAL_WEBMCP_CONFIG || {

    hospitalApi:
      "/api/webmcp/hospital",

    doctorsApi:
      "/api/webmcp/doctors",

    appointmentsApi:
      "/api/webmcp/my/appointments"

  };


  // --------------------------------------------------
  // API 공통 함수
  // --------------------------------------------------

  async function request(url) {

    const response = await fetch(url, {

      method: "GET",

      credentials: "same-origin",

      headers: {
        "Accept": "application/json"
      }

    });

    if (response.status === 401) {
      throw new Error(
        "로그인이 필요한 정보입니다."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "해당 정보에 접근할 권한이 없습니다."
      );
    }

    if (!response.ok) {
      throw new Error(
        `API 오류 (${response.status})`
      );
    }

    return response.json();
  }


  // --------------------------------------------------
  // 데이터 Normalizer
  // --------------------------------------------------

  function normalizeHospital(raw) {

    return {

      hospitalId:
        raw.hospitalId ??
        raw.hospital_id ??
        raw.id,

      name:
        raw.name ??
        raw.hospital_name,

      address:
        raw.address ??
        raw.addr,

      phone:
        raw.phone ??
        raw.tel,

      departments:
        raw.departments ?? [],

      hours:
        raw.hours ?? null,

      parking:
        raw.parking ?? null

    };
  }


  function normalizeDoctor(raw) {

    return {

      doctorId:
        raw.doctorId ??
        raw.doctor_id ??
        raw.staff_no ??
        raw.id,

      name:
        raw.name ??
        raw.doctor_name ??
        raw.staff_nm,

      department:
        raw.department ??
        raw.department_name ??
        raw.dept_nm,

      specialties:
        raw.specialties ??
        raw.major_fields ??
        raw.major ??
        [],

      career:
        raw.career ?? [],

      schedule:
        raw.schedule ?? null

    };
  }


  function normalizeAppointment(raw) {

    return {

      appointmentId:
        raw.appointmentId ??
        raw.appointment_id ??
        raw.reservation_no,

      doctorId:
        raw.doctorId ??
        raw.doctor_id ??
        raw.staff_no,

      doctorName:
        raw.doctorName ??
        raw.doctor_name ??
        raw.staff_nm,

      department:
        raw.department ??
        raw.dept_nm,

      datetime:
        raw.datetime ??
        raw.appointment_datetime ??
        raw.reservation_datetime,

      status:
        raw.status,

      location:
        raw.location ?? null

    };
  }


  // --------------------------------------------------
  // hospital_get_info
  // --------------------------------------------------

  await document.modelContext.registerTool({

    name: "hospital_get_info",

    description:
      "현재 병원의 이름, 주소, 연락처, 진료과, 운영시간, 주차 및 방문 정보를 조회합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },

    execute: async () => {

      try {

        const raw =
          await request(CONFIG.hospitalApi);

        return JSON.stringify(
          normalizeHospital(raw),
          null,
          2
        );

      } catch (error) {

        return JSON.stringify({
          error: error.message
        });

      }
    }

  });


  // --------------------------------------------------
  // doctor_get_info
  // --------------------------------------------------

  await document.modelContext.registerTool({

    name: "doctor_get_info",

    description:
      "의료진의 이름, 진료과, 전문분야, 경력 및 진료일정을 조회합니다.",

    inputSchema: {

      type: "object",

      properties: {

        doctorId: {
          type: "string",
          description:
            "병원 내부 의료진 식별자"
        },

        name: {
          type: "string",
          description:
            "조회할 의료진 이름"
        }

      }

    },

    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },

    execute: async ({
      doctorId,
      name
    }) => {

      try {

        const params =
          new URLSearchParams();

        if (doctorId) {
          params.set(
            "doctorId",
            doctorId
          );
        }

        if (name) {
          params.set(
            "name",
            name
          );
        }

        const raw = await request(
          `${CONFIG.doctorsApi}?${params}`
        );

        const normalized =
          Array.isArray(raw)
            ? raw.map(normalizeDoctor)
            : normalizeDoctor(raw);

        return JSON.stringify(
          normalized,
          null,
          2
        );

      } catch (error) {

        return JSON.stringify({
          error: error.message
        });

      }
    }

  });


  // --------------------------------------------------
  // appointment_get_current
  // --------------------------------------------------

  await document.modelContext.registerTool({

    name: "appointment_get_current",

    description:
      "현재 로그인한 환자의 예약 의료진, 진료과, 날짜, 시간, 상태와 방문장소를 조회합니다.",

    inputSchema: {
      type: "object",
      properties: {}
    },

    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },

    execute: async () => {

      try {

        const raw =
          await request(
            CONFIG.appointmentsApi
          );

        const normalized =
          Array.isArray(raw)
            ? raw.map(
                normalizeAppointment
              )
            : normalizeAppointment(raw);

        return JSON.stringify(
          normalized,
          null,
          2
        );

      } catch (error) {

        return JSON.stringify({
          error: error.message
        });

      }

    }

  });


  console.log(
    "[Hospital WebMCP API] Tools registered"
  );

})();
```

병원별 차이는 별도 설정 파일만 두면 됩니다.

```javascript
// hospital-webmcp-config.js

window.HOSPITAL_WEBMCP_CONFIG = {

  hospitalApi:
    "/hospital/api/info",

  doctorsApi:
    "/hospital/api/doctors",

  appointmentsApi:
    "/member/api/reservations"

};
```

HTML:

```html
<script src="/js/hospital-webmcp-config.js"></script>

<script
  type="module"
  src="/js/hospital-webmcp-api.js">
</script>
```

---

# 두 방식의 중요한 차이

| | DOM형 | API형 |
|---|---|---|
| 기존 사이트 수정 | 거의 없음 | 백엔드 연동 필요 |
| 설치 난이도 | 낮음 | 중간 |
| 안정성 | 보통 | **높음** |
| 디자인 변경 영향 | 큼 | **거의 없음** |
| 다른 페이지 정보 조회 | 제한적 | **가능** |
| 예약정보 처리 | 제한적 | **적합** |
| 여러 병원 공통화 | 보통 | **매우 좋음** |
| 실제 서비스 권장 | △ | **◎** |

그래서 사업적으로는 아예 **2단계 상품**으로 생각할 수도 있습니다.

```text
Hospital WebMCP

Level 1
DOM Adapter
────────────────
웹사이트만 있으면 적용
기존 시스템 수정 최소
PoC / 진단 / 체험

          ↓

Level 2
API Adapter
────────────────
HIS / 홈페이지 Backend 연동
병원정보
의료진정보
예약정보
실시간 제공
```

그리고 저는 한 가지를 더 추가할 것을 권합니다.

## 세 번째 파일: 공통 Schema

DOM 버전과 API 버전에 아래 객체 구조를 똑같이 사용하게 만드는 겁니다.

```javascript
// hospital-webmcp-schema.js

export const HospitalSchema = {

  hospitalId: null,
  name: null,
  address: null,
  phone: null,
  departments: [],
  hours: null,
  parking: null

};


export const DoctorSchema = {

  doctorId: null,
  name: null,
  department: null,
  specialties: [],
  career: [],
  schedule: null

};


export const AppointmentSchema = {

  appointmentId: null,
  doctorId: null,
  doctorName: null,
  department: null,
  datetime: null,
  status: null,
  location: null

};
```

그러면 전체 제품 구조가 굉장히 깔끔해집니다.

```text
              Hospital WebMCP Standard
                       │
             hospital-schema.js
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼

hospital-webmcp-dom.js       hospital-webmcp-api.js
        │                             │
      HTML                          Backend
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼

              동일한 WebMCP Tools

              hospital_get_info
              doctor_get_info
              appointment_get_current
```

이 구조의 장점은 **AI 에이전트가 데이터 원천이 DOM인지 API인지 알 필요조차 없다는 것**입니다.

또 하나 중요한 보안점이 있습니다. 예약 정보처럼 사용자 데이터를 반환하는 read-only tool도 민감할 수 있으므로, read-only라고 해서 공개 tool로 취급하면 안 됩니다. WebMCP 공식 보안 가이드도 읽기 전용 도구가 사용자 정보를 노출할 수 있으므로 신뢰한 origin에만 노출해야 한다고 명시합니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/secure-tools))

그래서 실제 병원 적용에서는 **`hospital_get_info`, `doctor_get_info`는 Public Layer**, **`appointment_get_current`는 Authentication Layer**로 분리하는 것을 권합니다. 이 다음 단계에서 `hospital-webmcp-schema.js + DOM형 + API형 + 테스트용 demo.html`까지 묶으면, 다른 병원 사이트에 복사해서 바로 시험해볼 수 있는 **Hospital WebMCP Starter Kit v0.1** 형태가 됩니다.

---

# you asked

message time: 2026-08-10 19:14:21

현재는 크롬만 된다며, 크롬도 어떤 버전에서 되는지 알려주고, 만약 위 기능을 좀더 확장하기 위한 크롬 익스텐션으로 만들어 제공하는 방법도 있다면 알려줘.

---

# chatgpt response

네. 다만 2026년 8월 현재는 **“크롬이면 그냥 다 된다”가 아니라 실험 단계**라고 보는 게 정확합니다.

Chrome 공식 문서 기준으로 WebMCP **Origin Trial은 Chrome 149부터 시작**했습니다. Chrome 149의 개발자도구에는 WebMCP 디버깅 패널도 들어갔고, 실험 시에는 `chrome://flags`에서 `#enable-webmcp-testing` 및 관련 DevTools 지원 플래그를 켜는 방식도 안내되고 있습니다. ([Chrome for Developers](https://developer.chrome.com/blog/ai-webmcp-origin-trial?utm_source=chatgpt.com))

그리고 Chrome 150부터는 앞서 이야기한 `navigator.modelContext`가 deprecated되고, **`document.modelContext` 사용이 기준**입니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

따라서 지금 개발 타깃은 이렇게 잡는 게 좋습니다.

| 환경 | 권장 |
|---|---|
| Chrome 148 이하 | WebMCP 정식 타깃으로 잡지 않음 |
| **Chrome 149** | Origin Trial / 실험 가능 |
| **Chrome 150+** | `document.modelContext` 기준 개발 |
| Chrome Canary/Dev | 개발·실험에 가장 적합 |
| Edge/Firefox/Safari | 현재 WebMCP 자체를 전제로 하지 말 것 |

그리고 말씀하신 **Chrome Extension 방식은 충분히 가능하고, 오히려 지금 단계에서는 상당히 좋은 제품 전략**입니다.

## 제가 생각하는 가장 좋은 구조

웹사이트에 직접 WebMCP를 설치하는 버전과 크롬 익스텐션 버전을 별개로 보는 게 아니라 이렇게 가져가면 됩니다.

```text
                    Hospital WebMCP Platform

                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼

        사이트 설치형                 Chrome Extension
        WebMCP SDK                       │
                │                         │
                │                  페이지 자동 분석
                │                         │
                └────────────┬────────────┘
                             │

                     Hospital Schema

                       Hospital
                       Doctor
                     Appointment

                             │
                             ▼

                   공통 WebMCP Tools

                   hospital_get_info
                   doctor_get_info
                appointment_get_current
```

둘 다 결과적으로 같은 Hospital schema를 사용하게 하는 겁니다.

---

# 크롬 익스텐션으로 만들면 무엇이 좋아지나

가장 큰 장점은 **병원 홈페이지를 수정하지 않아도 된다**는 것입니다.

확장 프로그램은 content script를 이용해 사용자가 보고 있는 웹페이지의 DOM을 읽을 수 있습니다. Chrome 공식 문서도 content script가 페이지 DOM을 읽고 수정하며 extension과 메시지를 주고받을 수 있다고 설명합니다. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts?utm_source=chatgpt.com))

예를 들어 환자가 병원 사이트에 접속합니다.

```text
서울OO병원

https://hospital.co.kr/my/reservation
```

병원은 WebMCP를 전혀 설치하지 않았습니다.

그런데 사용자가 우리가 만든:

> **Hospital Agent Extension**

을 설치해 놓았다면,

```text
병원 웹페이지
     ↓
Chrome Extension
     ↓
DOM 분석
     ↓
Hospital / Doctor / Appointment 추출
     ↓
Canonical Schema 변환
     ↓
AI Agent
```

으로 만들 수 있습니다.

이게 꽤 중요합니다.

---

# 예를 들면 Extension이 자동으로 이런 것을 찾습니다

페이지에:

```html
<div class="reservation">
    <span class="doctor">김철수 교수</span>
    <span class="department">정형외과</span>
    <span class="date">2026.08.13 14:30</span>
</div>
```

가 있다면 Extension이:

```json
{
  "appointmentId": null,
  "doctorName": "김철수",
  "department": "정형외과",
  "datetime": "2026-08-13T14:30:00+09:00",
  "status": "confirmed"
}
```

로 바꿉니다.

그리고 다른 의사 페이지에 가면:

```json
{
  "doctorId": "D103",
  "name": "김철수",
  "department": "정형외과",
  "specialties": [
    "척추",
    "디스크",
    "척추관협착증"
  ]
}
```

을 추출합니다.

즉 웹사이트 자체를 **가상 WebMCP 사이트처럼 만드는 것**입니다.

---

# Extension은 4개 레이어로 만들면 좋습니다

```text
Chrome Extension
│
├── ① Detector
│
│   병원 사이트인지 판별
│
├── ② Extractor
│
│   Hospital
│   Doctor
│   Appointment
│   DOM 추출
│
├── ③ Normalizer
│
│   병원마다 다른 HTML
│         ↓
│   공통 Hospital Schema
│
└── ④ Agent / WebMCP Bridge
    │
    AI에게 Tool 제공
    │
    hospital_get_info
    doctor_get_info
    appointment_get_current
```

이 구조가 좋습니다.

---

# Manifest V3 기반 기본 구조

요즘 Chrome Extension은 Manifest V3 기준으로 잡으면 됩니다. Chrome의 `chrome.scripting` API를 이용하면 현재 탭에 JavaScript를 주입할 수 있고, `activeTab`을 사용하면 사용자가 명시적으로 확장 프로그램을 실행했을 때만 해당 페이지 접근권한을 얻도록 만들 수도 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/scripting?utm_source=chatgpt.com))

예를 들어:

```json
{
  "manifest_version": 3,

  "name": "Hospital WebMCP Agent",
  "version": "0.1.0",

  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "sidePanel"
  ],

  "background": {
    "service_worker": "background.js"
  },

  "action": {
    "default_title": "Hospital Agent"
  },

  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

---

# 클릭하면 현재 병원 사이트를 분석

`background.js`:

```javascript
chrome.action.onClicked.addListener(async (tab) => {

  if (!tab.id) return;

  await chrome.scripting.executeScript({

    target: {
      tabId: tab.id
    },

    files: [
      "hospital-detector.js",
      "hospital-extractor.js"
    ]

  });

});
```

Chrome 공식 `chrome.scripting` API가 바로 이런 런타임 JavaScript 주입 용도로 제공됩니다. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/scripting?utm_source=chatgpt.com))

---

# 그리고 Side Panel을 붙이는 게 상당히 좋습니다

Extension의 UI를 작은 popup으로 만들기보다는 저는 **Chrome Side Panel**을 추천합니다.

Chrome Side Panel API는 브라우징 중에도 지속적으로 패널 UI를 보여줄 수 있고, 탭별로 다르게 동작하게 만들 수도 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/sidePanel?utm_source=chatgpt.com))

사용자가 병원 홈페이지를 보고 있을 때:

```text
┌─────────────────────────────────────┬─────────────────┐
│                                     │ Hospital Agent  │
│                                     │                 │
│       병원 홈페이지                   │ 서울OO병원       │
│                                     │                 │
│                                     │ 정형외과         │
│                                     │ 김철수 교수      │
│                                     │                 │
│                                     │ 내 예약          │
│                                     │ 8/13 14:30      │
│                                     │                 │
│                                     │ [AI에게 질문]    │
│                                     │                 │
│                                     │ "언제 출발해야   │
│                                     │  할까요?"        │
│                                     │                 │
└─────────────────────────────────────┴─────────────────┘
```

이런 UX가 가능합니다.

---

# 여기서 LLM까지 붙이면 훨씬 재미있어집니다

Extension이:

```text
현재 페이지 DOM
      ↓
정보 추출
      ↓
Hospital Schema
      ↓
LLM
```

으로 가는 겁니다.

예를 들어 사용자가:

> 내일 병원 예약 어떻게 돼 있어?

라고 하면 Extension이:

```text
appointment_get_current
```

데이터를 가져와서:

> 8월 11일 오후 2시 30분 김철수 교수 정형외과 예약입니다.

라고 알려줍니다.

그리고:

> 이 의사 전문분야가 뭐야?

라고 하면 현재 페이지 또는 다른 데이터에서:

```text
doctor_get_info
```

를 가져옵니다.

---

# 여기서 더 확장할 수도 있습니다

처음 세 개는:

```text
hospital_get_info
doctor_get_info
appointment_get_current
```

인데 Extension이면 사이트 자체를 수정하지 않아도 기능을 더 붙이기 쉽습니다.

예를 들면:

```text
hospital_get_info

doctor_get_info
doctor_search
doctor_compare

appointment_get_current
appointment_extract_all

page_understand

hospital_search_in_page

navigate_to_doctor
navigate_to_reservation
```

까지 가능합니다.

주의할 점은 **“읽기”와 “행동”을 분리해야 한다**는 것입니다.

---

# 1단계 Extension

전부 Read-only:

```text
✓ 병원정보 읽기
✓ 의사정보 읽기
✓ 예약정보 읽기
✓ 진료시간 읽기
✓ 현재 페이지 분석
```

위험도가 낮습니다.

---

# 2단계 Extension

Navigation:

```text
✓ 의사 페이지 이동
✓ 예약페이지 이동
✓ 검사결과 페이지 이동
✓ 병원 내 검색
```

---

# 3단계 Extension

Action:

```text
△ 예약 신청
△ 예약 변경
△ 예약 취소
△ 개인정보 제출
```

여기부터는 반드시 사용자 확인을 끼워야 합니다.

WebMCP 공식 보안 문서에서도 브라우저 에이전트, 특히 extension 기반 에이전트가 사용자의 **인증된 브라우저 세션 안에서 동작할 수 있다는 점**을 중요한 보안 요소로 보고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/agents/security?utm_source=chatgpt.com))

병원이라면 더 보수적으로 설계해야 합니다.

---

# Extension이 WebMCP 자체를 사이트에 주입할 수도 있나?

기술적으로는 가능합니다.

Chrome Extension은 content script뿐 아니라 `chrome.scripting.executeScript()`를 이용해 **페이지의 MAIN world에 JavaScript를 실행**할 수도 있습니다. Chrome은 MAIN world injection을 지원하고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/whats-new?utm_source=chatgpt.com))

개념적으로:

```text
Hospital Website

원래:
document.modelContext
    └─ tools 없음


Extension 설치 후:

document.modelContext
    ├─ hospital_get_info
    ├─ doctor_get_info
    └─ appointment_get_current
```

처럼 만드는 구조를 실험할 수 있습니다.

다만 이것은 단순 content script보다 조심해야 합니다. MAIN world에서 실행한 코드는 사이트 자체 JavaScript와 같은 실행환경을 공유하므로, 페이지 코드가 영향을 주거나 받을 수 있습니다. Chrome 공식 문서도 MAIN world 사용 시 이 위험을 명시합니다. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts?utm_source=chatgpt.com))

그래서 제품 구조에서는:

```text
사이트 자체 WebMCP
       >
Extension이 주입한 WebMCP
       >
DOM scraping만 하는 Extension
```

순으로 신뢰도를 구분하는 것이 좋습니다.

---

# 저는 오히려 두 가지 Extension 모드를 만들겠습니다

### Standard Mode

```text
사이트에 WebMCP가 있음
       ↓
Extension이 WebMCP tool 발견
       ↓
그 tool 사용
```

가장 정확합니다.

그리고 WebMCP가 없다면:

### Compatibility Mode

```text
사이트에 WebMCP 없음
       ↓
Extension DOM Analyzer
       ↓
Hospital Schema 자동 추출
       ↓
가상 Tool 생성
```

으로 fallback합니다.

전체적으로는:

```text
             Hospital Agent Extension
                       │
                       ▼
              현재 사이트 확인
                       │
              WebMCP 존재?
                 /           \
               YES            NO
                │              │
                ▼              ▼
          Native WebMCP     DOM Analyzer
                │              │
                │         AI Extractor
                │              │
                └───────┬──────┘
                        ▼

                 Hospital Schema

           Hospital / Doctor / Appointment
                        │
                        ▼
                    AI Agent
```

이 구조가 상당히 강합니다.

---

## 그리고 이게 AEO 사업과도 연결됩니다

Extension을 단순히 환자용 프로그램으로만 만들 필요가 없습니다.

**B2B WebMCP 진단 도구**로 먼저 만드는 것이 더 쉬울 수도 있습니다.

예를 들어 병원 마케팅 담당자가 아무 병원 홈페이지를 방문하고 Extension 버튼을 누르면:

```text
Hospital Agent Readiness

Hospital 정보
██████████ 92%

Doctor 정보
████████░░ 81%

Appointment
████░░░░░░ 38%

Native WebMCP
░░░░░░░░░░ 0%

Structured Data
██████░░░░ 64%


추천 WebMCP Tools

✓ hospital_get_info
✓ doctor_search
✓ doctor_get_info
✓ appointment_get_current
△ appointment_create
```

처럼 보여주는 겁니다.

그리고:

> **“WebMCP가 적용되면 AI는 이 병원을 이렇게 사용할 수 있습니다.”**

라고 바로 시뮬레이션시켜 줄 수 있습니다.

즉 지금 구상 중인 **SEO/AEO/GEO Before/After 시뮬레이터의 Chrome Extension판**으로 발전시키는 것도 가능합니다.

제가 제품 순서를 잡는다면 **① Chrome 149+/150+용 개발자 Extension → ② 아무 병원 사이트를 Hospital/Doctor/Appointment로 자동 분류하는 DOM Extractor → ③ Native WebMCP 감지 → ④ WebMCP가 없을 경우 가상 Tool 생성 → ⑤ Side Panel에서 AI 시뮬레이션 → ⑥ 이후 병원 사이트에 직접 설치하는 JS SDK 제공** 순서가 가장 현실적입니다. Native WebMCP와 비지원 사이트의 compatibility layer를 동시에 다뤄볼 수 있기 때문입니다. ([Chrome for Developers](https://developer.chrome.com/docs/devtools/application/webmcp?utm_source=chatgpt.com))

---

# you asked

message time: 2026-08-10 20:20:51

시뮬레이터로 확장은 필요없고, 익스텐션은 webMCP를 이해하고 병원 정보, 의사 정보, 예약 관리를 손쉽게 응성이나 자동화하는 것을 목표로 하는 거야. 병원 정보 나 의사 정보는 카톡이나 텔레그램 메시지로 바로 받아볼 수도 있는 기능이야.

---

# chatgpt response

그 방향이면 익스텐션의 역할을 **“WebMCP 진단기”가 아니라 “병원용 개인 AI 에이전트 허브”**로 잡는 게 맞습니다. WebMCP는 병원 사이트와 익스텐션 사이의 표준 인터페이스이고, 익스텐션은 그 정보를 읽어 예약 관리·알림·카톡/텔레그램 전달까지 묶는 실행 계층이 됩니다.

이해했습니다. 그러면 제품 목적은 **“WebMCP를 이용해 병원 웹사이트를 AI가 직접 다루게 하고, 그 결과를 사용자가 원하는 채널로 전달·자동화하는 Chrome Extension”**입니다. 시뮬레이터 기능은 빼는 게 맞습니다.

WebMCP는 웹사이트가 AI 에이전트에 구조화된 tool을 제공하는 제안 표준이고, 현재 Chrome은 이를 통해 단순 DOM 클릭보다 안정적으로 사이트 기능을 실행하게 하는 방향을 추진하고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?hl=zh-tw&utm_source=chatgpt.com))

제가 보면 제품 구조는 아래처럼 잡는 게 가장 깔끔합니다.

```text
                   Hospital AI Extension
                           │
                    현재 Chrome Tab
                           │
                           ▼
                 ┌──── WebMCP Client ────┐
                 │                       │
              병원 사이트가 제공하는 Tools
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
   Hospital    Doctor   Appointment
       │         │          │
       └─────────┼──────────┘
                 ▼
            Extension Agent
                 │
     ┌───────────┼────────────┐
     ▼           ▼            ▼
   질문/응답     자동화       외부 전달
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                  카카오톡       Telegram
```

## 익스텐션의 핵심은 WebMCP '등록'이 아니라 WebMCP '소비'

앞에서는 Extension이 WebMCP를 없는 사이트에 만들어 주는 방향을 설명했는데, 지금 목표라면 우선순위가 달라집니다.

병원 웹사이트가 다음 tool을 제공한다고 합시다.

```text
hospital_get_info
hospital_get_hours
hospital_get_directions

doctor_search
doctor_get_info
doctor_get_schedule

appointment_get_current
appointment_get_available_slots
appointment_create
appointment_change
appointment_cancel
```

WebMCP의 tool은 이름, 설명, JSON schema를 가진 구조화된 인터페이스이므로 에이전트가 어떤 기능인지 파악하고 호출할 수 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/agents?utm_source=chatgpt.com))

익스텐션은 이 Tool들을 읽어 사용자에게 **통합 AI 인터페이스**를 제공하는 겁니다.

예를 들어 Side Panel에서 사용자가:

> 박정민 교수님 이번 주 진료 언제 있어?

라고 입력합니다.

Extension Agent는 자연어를 해석해서:

```text
doctor_search({
    name: "박정민"
})

          ↓

doctor_get_schedule({
    doctorId: "D182"
})
```

를 실행합니다.

사용자가:

> 목요일 오후 예약 가능한 거 있으면 예약해줘.

라고 하면:

```text
appointment_get_available_slots({
    doctorId: "D182",
    date: "2026-08-13",
    period: "afternoon"
})

        ↓

예약 가능시간 제시

14:00
14:30
16:10

        ↓

사용자 선택

        ↓

appointment_create(...)
```

가 되는 구조입니다.

이게 제품의 첫 번째 핵심 가치입니다.

---

# 두 번째가 카카오톡·텔레그램 전달

여기서 WebMCP 결과를 반드시 Chrome 안에서만 보여줄 필요가 없습니다.

예를 들어 사용자가 의사 페이지를 보고 있다가:

> 이 의사 정보 텔레그램으로 보내줘.

라고 합니다.

그러면:

```text
doctor_get_info
       ↓
WebMCP structured result
       ↓
Message Formatter
       ↓
Telegram Bot API
       ↓
사용자 Telegram
```

으로 보냅니다.

Telegram은 공식 Bot API가 HTTP 기반 인터페이스를 제공하고 `sendMessage`를 통해 채팅으로 메시지를 보낼 수 있기 때문에 이런 구조가 상당히 구현하기 쉽습니다. ([텔레그램 API](https://core.telegram.org/bots/api?utm_source=chatgpt.com))

예:

```text
[서울OO병원]

김정민 교수
정형외과

전문분야
• 척추질환
• 허리디스크
• 척추관협착증

진료
월 / 수 / 목

병원 위치
서울특별시 ...

전화
02-...
```

식으로 자동 포맷팅할 수 있습니다.

---

## 카카오톡도 가능하지만 Telegram보다 제약이 있습니다

카카오도 공식적으로 **카카오톡 메시지 API**를 제공하고 있고 현재 Developers 서비스에 메시지 전송 기능이 운영되고 있습니다. ([Kakao Developers](https://developers.kakao.com/?utm_source=chatgpt.com))

다만 Telegram Bot처럼:

> 아무 사용자에게 Bot이 자유롭게 메시지를 보내는 것

과는 상당히 다릅니다.

카카오톡 메시지 API는 카카오 로그인·사용자 동의·앱 권한 등의 체계 안에서 사용해야 하고 쿼터도 존재합니다. 현재 공식 쿼터 문서에는 카카오톡 메시지 API에 일일 제한뿐 아니라 발신자/수신자 및 발신자-수신자 조합별 제한이 있습니다. ([Kakao Developers](https://developers.kakao.com/docs/en/getting-started/quota?utm_source=chatgpt.com))

따라서 MVP는 저는:

```text
1순위 Telegram
2순위 Kakao
```

로 잡겠습니다.

---

# 메시지를 단순 공유로 끝내지 않는 것이 핵심입니다

예를 들어 사용자가:

> 이 의사 진료 일정 바뀌면 텔레그램으로 알려줘.

라고 할 수 있습니다.

그러면 Extension Agent가 intent를:

```text
WATCH

doctor = D182
target = doctor_get_schedule
condition = schedule changed
channel = telegram
```

으로 저장합니다.

다만 여기서 중요한 기술 문제가 하나 있습니다.

**Chrome Extension은 Chrome이 꺼져 있으면 일을 할 수 없습니다.**

따라서 제대로 된 자동화까지 하려면:

```text
Chrome Extension
       │
       │ 자동화 등록
       ▼

Hospital Agent Cloud
       │
       ├── Scheduler
       ├── User Account
       ├── Notification
       └── Messaging Gateway
              │
       ┌──────┴──────┐
       ▼             ▼
   Telegram        Kakao
```

같은 작은 서버가 필요합니다.

---

# 그런데 WebMCP에는 한 가지 근본적 차이가 있습니다

WebMCP는 기본적으로 **브라우저 안에 있는 사이트 기능을 에이전트에게 노출**하는 구조입니다. 웹페이지는 사실상 자신의 client-side 기능을 tool로 보여주게 됩니다. ([GitHub](https://github.com/webmachinelearning/webmcp?utm_source=chatgpt.com))

따라서 다음처럼 나눠야 합니다.

### 실시간 사용자 명령

Chrome이 켜져 있습니다.

```text
"내 예약 보여줘"

Extension
 ↓
WebMCP
 ↓
appointment_get_current()
 ↓
즉시 응답
```

→ **Extension만으로 가능**

반면:

```text
"예약시간 변경되면 내일이라도 알려줘"
```

→ Chrome이 닫힐 수도 있으므로 **Extension만으로는 불충분합니다.**

이 경우 병원이 서버 API/MCP 같은 별도 인터페이스를 제공하거나, 우리의 서버가 접근 가능한 시스템이 필요합니다.

이 구분을 제품 설계 처음부터 넣는 게 좋습니다.

---

# 그래서 Hospital Agent를 3가지 기능으로 나누겠습니다

### 1. ASK

현재 상태에 대해 물어보기.

```text
"내 예약 언제야?"

"이 병원 주차 가능해?"

"이 의사 전문분야가 뭐야?"

"토요일에도 진료해?"

"김OO 교수 진료 일정 알려줘."
```

여기는 WebMCP가 아주 잘 맞습니다.

---

### 2. DO

병원 사이트에서 일을 시키기.

```text
"내 예약 3시로 변경해줘."

"김OO 교수 다음 주 예약 찾아줘."

"정형외과 예약 페이지 열어줘."

"예약 취소해줘."
```

WebMCP의 Imperative API는 실제로 form 입력, navigation, state management 같은 동작을 구조화된 tool로 제공하는 것을 목표로 하고 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?utm_source=chatgpt.com))

---

### 3. SEND / AUTOMATE

결과를 외부로 전달.

```text
"카톡으로 보내줘."

"텔레그램으로 보내줘."

"엄마한테 이 병원 정보 보내줘."

"예약 내용을 내 Telegram에 보내줘."

"진료 전날 알려줘."
```

이 부분은 WebMCP가 아니라 **Extension 자체 기능**입니다.

즉:

```text
WebMCP
=
병원과 대화하는 표준

Chrome Extension
=
사용자와 병원 WebMCP를 연결하는 Agent

Telegram / Kakao
=
결과 Delivery Channel
```

이라고 보면 됩니다.

---

# 사용자 경험은 이런 식이면 좋습니다

Chrome Side Panel에 아주 단순하게:

```text
┌──────────────────────────────┐
│ Hospital Assistant           │
├──────────────────────────────┤
│                              │
│ 서울OO병원 연결됨 ●           │
│                              │
│ 사용 가능한 기능 8개          │
│                              │
│  병원 정보                   │
│  의료진 검색                 │
│  내 예약 확인                │
│  예약 변경                   │
│                              │
│ ─────────────────────────── │
│                              │
│ 무엇을 도와드릴까요?          │
│                              │
│ [ 내 예약 언제야?          ] │
│                              │
│                              │
│ 📲 Telegram                 │
│ 💬 KakaoTalk                │
└──────────────────────────────┘
```

그런데 실제로는 사용자가 Tool 이름을 볼 필요가 없습니다.

Extension이 WebMCP schema를 읽고 자동으로 기능을 파악합니다.

```text
발견:

hospital_get_info
doctor_search
doctor_get_info
appointment_get_current
appointment_change

        ↓

LLM이 해석

"이 사이트에서는
 병원정보 조회,
 의료진 검색,
 내 예약 확인,
 예약변경이 가능합니다."
```

이것이 상당히 중요한 UX입니다.

---

# 그래서 병원마다 Extension을 다시 만들 필요도 없습니다

병원 A:

```text
hospital.get_info
doctor.search
appointment.get
```

병원 B:

```text
get_hospital_information
find_physician
get_my_reservation
```

처럼 이름이 조금 달라도 WebMCP의 `description + inputSchema`를 LLM이 이해할 수 있습니다.

하지만 실제 상용화에서는 **공통 Hospital WebMCP Profile**을 제공하는 게 훨씬 낫습니다.

예:

```text
Hospital WebMCP Profile 1.0

Hospital
────────────────
hospital_get_info
hospital_get_hours
hospital_get_directions

Doctor
────────────────
doctor_search
doctor_get_info
doctor_get_schedule

Appointment
────────────────
appointment_get_current
appointment_get_available_slots
appointment_create
appointment_change
appointment_cancel
```

병원들이 이 규격에 맞게 WebMCP를 구현하면 Extension은 병원이 달라도 동일하게 작동합니다.

---

# 저는 여기서 Extension의 AI를 크게 만들 필요도 없다고 봅니다

LLM이 해야 할 일은 사실 매우 제한적입니다.

```text
사용자 자연어
        ↓
Intent 분석
        ↓
적절한 WebMCP Tool 선정
        ↓
arguments 생성
        ↓
Tool 실행
        ↓
결과 요약
```

예를 들어:

> 다음 주 화요일 오전에 척추 보는 의사 예약할 수 있어?

LLM:

```text
① doctor_search
{
  specialty: "척추"
}

② doctor_get_schedule
{
  date: "2026-08-18",
  period: "morning"
}

③ appointment_get_available_slots
{
 ...
}
```

정도입니다.

즉 거대한 의료 AI가 아니라 **Tool Router + Conversation Agent**면 됩니다.

의료적 판단 자체는 하지 않는다는 경계를 명확하게 두는 것도 좋습니다.

---

# 그리고 이 구조라면 메시지 기능은 별도의 Tool로 만들 수 있습니다

병원이 제공하는 WebMCP와 Extension 자체 Tool을 한 Agent에 동시에 넣습니다.

```text
Agent Tools

[Hospital WebMCP]

hospital_get_info
doctor_search
doctor_get_info
doctor_get_schedule
appointment_get_current
appointment_change


[Extension Tools]

telegram_send
kakao_send
copy_to_clipboard
save_favorite
create_reminder
```

그러면 사용자가:

> 김OO 교수의 진료 정보를 찾아서 텔레그램으로 보내줘.

라고 하면 Agent가:

```text
doctor_search
      ↓
doctor_get_info
      ↓
telegram_send
```

를 연결합니다.

이 방식이 가장 깔끔합니다.

---

# 더 발전하면 한 문장으로 여러 Tool을 묶습니다

예:

> 다음주 금요일 김교수 예약 가능한 시간 찾아서 가장 빠른 시간 예약하고 내 텔레그램에 알려줘.

Agent workflow:

```text
doctor_search
      ↓
doctor_get_schedule
      ↓
appointment_get_available_slots
      ↓
예약 후보 발견
      ↓
[사용자 확인]
      ↓
appointment_create
      ↓
appointment_get_current
      ↓
telegram_send
```

**WebMCP의 가치가 바로 여기서 커집니다.**

기존 Browser Agent는 매번:

```text
화면 보기
→ 버튼 찾기
→ 클릭
→ 화면 기다리기
→ 텍스트 읽기
→ 버튼 찾기
→ 입력
```

해야 합니다.

WebMCP가 있으면 사이트가 직접 구조화된 기능을 알려주므로 agent 실행을 더 신뢰성 있게 만드는 것이 목적입니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?hl=zh-tw&utm_source=chatgpt.com))

---

## 이 제품은 저는 이렇게 정의하겠습니다

> **Hospital Agent Extension**
>
> 병원 사이트가 제공하는 WebMCP 기능을 자동으로 이해하여 사용자가 자연어만으로 병원 정보·의료진 정보·예약을 조회하고 관리하며, 필요한 결과를 카카오톡·Telegram 등 원하는 채널로 전달할 수 있게 하는 Chrome 기반 AI Assistant.

그리고 MVP 범위는 너무 크게 잡지 않는 것이 좋습니다.

**v0.1은 `병원정보 조회 + 의사 조회 + 내 예약 조회 + Telegram 전송`까지**, v0.2에서 `예약 가능시간 조회 + 예약/변경/취소`, v0.3에서 `카카오 연동 + 알림/반복 자동화`를 넣는 순서가 가장 개발 리스크가 낮습니다.

특히 Telegram은 Bot API가 명확해서 **WebMCP → Extension → Telegram** 전체 파이프라인을 검증하는 첫 외부 채널로 적합합니다. 카카오톡은 그 다음에 사용자 인증과 메시지 정책을 맞춰 붙이는 편이 좋습니다. ([텔레그램 API](https://core.telegram.org/bots/api?utm_source=chatgpt.com))

---

# you asked

message time: 2026-08-10 20:23:14

아 추가로, 네이버 지도나 구글 지도 같은 지도에 병원 위치를 바로 연결할 수 있는 기능도 추가해야해. 이를 기반으로 MCP 범위를 버전별로 정리해줘.

---

# chatgpt response

좋습니다. 그러면 범위를 **병원 WebMCP + Chrome Extension이 하나의 개인 병원 어시스턴트처럼 동작**하도록 정리하면 됩니다. 지도 연결은 병원 정보의 부가 기능이 아니라 **핵심 액션**으로 넣는 편이 좋습니다. Google Maps는 URL만으로 검색·길찾기·지도 표시를 실행할 수 있고, 네이버 지도도 URL Scheme으로 장소 표시·검색·길찾기·내비게이션 연동을 지원합니다. ([Google for Developers](https://developers.google.com/maps/documentation/urls/get-started?utm_source=chatgpt.com))

제가 권하는 버전 구성은 다음과 같습니다.

| 버전 | 목표 | WebMCP / Extension 기능 |
|---|---|---|
| **v0.1** | 정보를 읽는다 | 병원 정보, 의사 정보, 내 예약 조회 |
| **v0.2** | 정보를 전달하고 찾아간다 | Telegram 전송, 카카오 공유, 네이버/Google 지도 연결 |
| **v0.3** | 예약을 관리한다 | 예약 가능시간 조회, 예약, 변경, 취소 |
| **v0.4** | 자연어로 여러 일을 묶는다 | LLM Tool Router, 복합 명령 실행, 사용자 확인 |
| **v1.0** | 개인 병원 AI Assistant | 여러 병원 지원, 알림·자동화, 선호 채널/지도/병원 저장 |

구체적으로는 이렇게 잡겠습니다.

## v0.1 — Hospital Information MCP

가장 먼저 **읽기 전용(Read-only)** 기능을 완성합니다.

```text
Hospital
├─ hospital_get_info
├─ hospital_get_hours
└─ hospital_get_contact

Doctor
├─ doctor_search
├─ doctor_get_info
└─ doctor_get_schedule

Appointment
└─ appointment_get_current
```

예를 들어:

> "이 병원 진료시간 알려줘."  
> "김OO 교수 전문분야가 뭐야?"  
> "내 예약 언제야?"

를 처리합니다.

반환되는 `Hospital`에는 처음부터 지도 연계를 위해 좌표까지 표준 필드로 넣겠습니다.

```json
{
  "hospitalId": "H001",
  "name": "서울OO병원",
  "address": "서울특별시 ...",
  "latitude": 37.12345,
  "longitude": 127.12345,
  "phone": "02-0000-0000",
  "hours": {},
  "parking": {}
}
```

즉 **주소만 저장하지 말고 `latitude / longitude`를 공통 스키마에 포함**시키는 것이 좋습니다.

---

# v0.2 — Share & Maps

여기서부터 Extension 자체 Tool을 붙입니다.

WebMCP가 병원 데이터를 가져오면 Extension이:

```text
Extension Tools

telegram_send
kakao_share

map_open
map_directions
map_navigation
```

을 제공합니다.

### 지도

예를 들어 사용자가:

> "이 병원 네이버 지도로 열어줘."

라고 하면:

```text
hospital_get_info()
        ↓
name
address
latitude
longitude
        ↓
naver_map_open()
```

입니다.

또는:

> "구글맵으로 길찾기 해줘."

라면:

```text
hospital_get_info()
        ↓
google_map_directions()
```

이 됩니다.

Google Maps URL은 별도의 지도 API를 화면에 임베딩하지 않고도 검색, 길찾기, 내비게이션 등의 동작을 실행할 수 있습니다. ([Google for Developers](https://developers.google.com/maps/documentation/urls/get-started?utm_source=chatgpt.com))

네이버 지도도 앱 URL Scheme을 통해 장소 표시·검색·길찾기·내비게이션을 호출할 수 있습니다. ([Ncloud Docs Guide](https://guide.ncloud-docs.com/docs/en/maps-url-scheme?utm_source=chatgpt.com))

따라서 이 기능은 구현 난이도도 상당히 낮습니다.

사용자가:

> "내일 예약된 병원 네이버 지도로 열어줘."

라고 하면 더 재미있습니다.

```text
appointment_get_current()
        ↓
hospitalId
        ↓
hospital_get_info()
        ↓
naver_map_open()
```

두 Tool을 연결합니다.

---

## 같은 버전에서 메시지 전송

예를 들어:

> "김OO 교수 정보 텔레그램으로 보내줘."

```text
doctor_search()
      ↓
doctor_get_info()
      ↓
telegram_send()
```

> "내 예약정보 카톡으로 보내줘."

```text
appointment_get_current()
      ↓
kakao_share()
```

Telegram Bot API는 프로그램에서 메시지를 보내는 인터페이스를 제공하기 때문에 자동 전송 채널로 사용하기 좋습니다.

카카오는 여기서 약간 구분해야 합니다.

**카카오톡 공유**와 **카카오톡 메시지 API**가 다릅니다. 카카오톡 Share는 사용자가 공유할 대화방을 직접 선택하는 방식이고, 메시지 API는 같은 서비스 사용자 관계와 권한 요건 등의 제한이 있습니다. ([Kakao Developers](https://developers.kakao.com/docs/en/kakaotalk-message/common?utm_source=chatgpt.com))

따라서 초기는:

```text
Telegram
→ 자동 전달

KakaoTalk Share
→ 사용자가 받을 대화방 선택
```

으로 시작하는 게 좋습니다.

---

# v0.3 — Appointment Action MCP

이때부터 실제 병원 업무를 수행합니다.

```text
Appointment

appointment_get_current

appointment_get_available_slots

appointment_create

appointment_change

appointment_cancel
```

예:

> "김OO 교수 다음주 금요일 오후에 예약 가능한 시간 찾아줘."

```text
doctor_search()
        ↓
doctor_get_schedule()
        ↓
appointment_get_available_slots()
```

결과:

```text
14:00
14:30
16:20
```

사용자가:

> "2시 반으로 해줘."

라고 하면:

```text
[사용자 확인]

"8월 21일 14:30
 김OO 교수 예약을 진행할까요?"

        ↓ YES

appointment_create()
```

가 됩니다.

여기서부터는 **읽기 tool과 쓰기 tool을 명확히 분리**해야 합니다. WebMCP는 사이트 기능을 structured tools로 에이전트에게 제공하는 것이 핵심이고, form 입력·navigation·state management 같은 실제 동작도 Imperative API로 노출할 수 있습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?utm_source=chatgpt.com))

---

# v0.4 — Natural Language Agent

여기에서 LLM이 진짜 의미를 갖습니다.

사용자가 Tool을 몰라도:

> "다음 주 수요일 오후에 허리디스크 보는 의사 중 가장 빠른 예약 찾아줘."

라고 이야기합니다.

Agent가 판단:

```text
① doctor_search
   specialty = 허리디스크

② doctor_get_schedule

③ appointment_get_available_slots
   date = next Wednesday
   period = afternoon

④ 결과 비교
```

그리고:

> "가장 빠른 예약으로 잡고 엄마한테 텔레그램으로 보내줘."

라고 하면:

```text
appointment_create
        ↓
appointment_get_current
        ↓
telegram_send
```

입니다.

다만 예약 생성 같은 irreversible action 직전에는 사용자 확인을 넣습니다.

---

# v1.0 — Personal Hospital Assistant

여기서부터 제품이라고 부를 만합니다.

사용자가 여러 병원을 이용해도 Extension 하나에서 관리합니다.

```text
              Hospital Assistant

 Hospital A ─┐
 Hospital B ─┼─ WebMCP
 Hospital C ─┘
                │
                ▼
        User Medical Scheduler
                │
      ┌─────────┼──────────┐
      ▼         ▼          ▼
   병원정보    의료진      예약
      │         │          │
      └─────────┼──────────┘
                ▼
             Actions
                │
    ┌───────────┼─────────────┐
    ▼           ▼             ▼
 Telegram     Kakao        Maps
                           │
                    ┌──────┴──────┐
                  NAVER        Google
```

예를 들어 Extension을 열면:

```text
이번 주 병원 일정

8/12 수 10:30
서울OO병원
김OO 교수 / 정형외과

[병원정보]
[의사정보]
[예약변경]

[네이버지도]
[Google Maps]

[Telegram 보내기]
[카카오톡 공유]
```

같은 UI가 됩니다.

---

## v1.0에서 추가할 자동화

여기부터는 사용자가 미리 지정합니다.

```text
예약 하루 전
→ Telegram 알림

예약 2시간 전
→ 병원 위치 + 지도 링크 전송

예약 변경 발생
→ 알림

예약 취소
→ 사용자 확인 후 처리

자주 가는 병원
→ 즐겨찾기

기본 지도
→ 네이버 지도

기본 메시지
→ Telegram
```

다만 여기서 중요한 점은 **브라우저가 닫힌 동안에도 실행되어야 하는 자동화**는 Extension만으로 해결하려 하지 않는 게 좋다는 것입니다.

```text
Extension
    +
작은 Backend
```

구조로 갑니다.

---

# 최종 Tool 구조는 이렇게 잡으면 됩니다

```text
Hospital WebMCP Profile 1.0
──────────────────────────

[HOSPITAL]

hospital_get_info
hospital_get_hours
hospital_get_contact


[DOCTOR]

doctor_search
doctor_get_info
doctor_get_schedule


[APPOINTMENT]

appointment_get_current
appointment_get_available_slots

appointment_create        🔐
appointment_change        🔐
appointment_cancel        🔐


Extension Tools
──────────────────────────

[MAP]

map_open
map_directions
map_navigation

provider:
naver
google


[MESSAGE]

telegram_send
kakao_share


[PERSONAL]

save_hospital
save_doctor
save_preference
create_reminder
```

여기서 저는 **지도 기능을 `hospital_get_directions` 같은 Hospital WebMCP Tool로 넣지 않을 것**을 권합니다.

병원 WebMCP는:

> **병원의 정확한 주소·좌표를 제공**

하고,

Extension이:

> **그 위치를 어떤 지도에서 열 것인지 결정**

하는 구조가 더 좋습니다.

그러면 똑같은 Hospital WebMCP에 대해 한국에서는:

```text
Naver Map
Kakao Map
Google Maps
```

을 지원하고, 해외에서는:

```text
Google Maps
Apple Maps
```

를 붙일 수도 있습니다.

즉 **Hospital/Doctor/Appointment는 데이터와 병원 Action**, **Map/Telegram/Kakao는 사용자 Extension Action**으로 계층을 분리하는 것이 앞으로 확장하기 가장 좋은 설계입니다. WebMCP 자체가 브라우저 프론트엔드에서 사이트와 에이전트를 연결하는 표준이라는 점과도 잘 맞습니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=ja&utm_source=chatgpt.com))

제품 개발 순서만 압축하면 **v0.1 정보조회 → v0.2 지도·메시지 → v0.3 예약관리 → v0.4 자연어 복합 실행 → v1.0 멀티병원·자동화**가 가장 적절합니다.

---

# you asked

message time: 2026-08-10 20:31:43

향후 병원 버전을 법률, 운동, 이커머스 등으로 확장도 가능할 것같은데 어떻게 생각해?

---

# chatgpt response

네. **병원은 좋은 첫 버티컬이고, 이후 법률·운동·이커머스로 확장하는 구조가 오히려 WebMCP의 장점을 더 잘 살립니다.** 핵심은 처음부터 `Hospital Extension`으로만 만들지 않고, 내부 아키텍처를 **범용 WebMCP Agent + 산업별 Profile**로 만드는 것입니다.

개념적으로는 이렇게요.

```text
                Universal WebMCP Agent
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   Healthcare           Legal           Fitness
    Profile             Profile          Profile
       │                 │                 │
 Hospital/Doctor      Firm/Lawyer      Gym/Trainer
 Appointment          Consultation     Reservation
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                 Common Actions
                         │
        ┌────────────────┼───────────────┐
        ▼                ▼               ▼
       Maps          Messaging        Calendar
    Naver/Google   Kakao/Telegram     Reminder
```

가장 중요한 건 **산업마다 완전히 새 프로그램을 만들지 않는 것**입니다.

병원에서 만든 구조를 보면 사실 꽤 보편적입니다.

| 병원 | 법률 | 운동/PT | 이커머스 |
|---|---|---|---|
| Hospital | Law Firm | Gym / Studio | Store |
| Doctor | Lawyer | Trainer | Product |
| Appointment | Consultation | Session/Booking | Order |
| 진료 가능시간 | 상담 가능시간 | 수업 가능시간 | 재고/배송 |
| 예약 | 상담신청 | 수업예약 | 주문 |
| 위치 | 사무실 위치 | 센터 위치 | 매장 위치 |

즉 공통 패턴은 대략 **① 사업자/장소 ② 사람 또는 상품 ③ 거래/예약** 세 가지입니다.

## 1. 법률 버전

병원 버전과 특히 유사합니다.

```text
Legal WebMCP Profile

Firm
├─ firm_get_info
├─ firm_get_hours
└─ firm_get_location

Lawyer
├─ lawyer_search
├─ lawyer_get_info
├─ lawyer_get_specialties
└─ lawyer_get_schedule

Consultation
├─ consultation_get_current
├─ consultation_get_available_slots
├─ consultation_create
├─ consultation_change
└─ consultation_cancel
```

사용자는:

> "이 로펌에서 이혼 전문 변호사 찾아줘."

> "김OO 변호사 상담 가능한 시간 알려줘."

> "사무실 네이버 지도에서 열어줘."

> "상담 일정 카톡으로 보내줘."

라고 하면 됩니다.

병원에서 `Doctor → Lawyer`, `Appointment → Consultation` 정도만 바뀌므로 **상당 부분 재사용**할 수 있습니다.

---

## 2. 운동/PT/필라테스 버전

이것도 구조가 거의 같습니다.

```text
Fitness WebMCP Profile

Facility
├─ facility_get_info
├─ facility_get_location
└─ facility_get_hours

Trainer
├─ trainer_search
├─ trainer_get_info
├─ trainer_get_specialties
└─ trainer_get_schedule

Session
├─ session_get_current
├─ session_get_available_slots
├─ session_book
├─ session_change
└─ session_cancel
```

사용자 입장에서는:

> "허리 재활 잘 보는 트레이너 누구야?"

> "이번 주 토요일 오전 가능한 PT 찾아줘."

> "예약하고 위치 텔레그램으로 보내줘."

같은 명령이 됩니다.

여기서 병원과 달라지는 것은 산업 Profile의 ontology 정도입니다.

```text
Doctor.specialties
→ 질환/진료분야

Trainer.specialties
→ 재활/다이어트/근력/체형교정
```

Agent 자체는 거의 바뀌지 않습니다.

---

# 3. 이커머스는 조금 다른데 더 큰 시장이 됩니다

여기부터 예약 중심에서 **Transaction 중심**으로 변합니다.

```text
Commerce WebMCP Profile

Store
├─ store_get_info
├─ store_get_location
└─ store_get_policy

Product
├─ product_search
├─ product_get_info
├─ product_get_price
├─ product_get_stock
└─ product_compare

Cart
├─ cart_get
├─ cart_add
├─ cart_remove
└─ cart_update

Order
├─ order_create
├─ order_get_current
├─ order_track
├─ order_cancel
└─ order_return
```

예를 들어:

> "이 신발 270 사이즈 재고 있어?"

```text
product_get_stock()
```

> "검정색 270 장바구니에 넣어줘."

```text
cart_add()
```

> "배송상태 텔레그램으로 보내줘."

```text
order_get_current()
       ↓
telegram_send()
```

> "오프라인 재고 있는 가장 가까운 매장 네이버 지도에서 열어줘."

```text
product_get_stock()
       ↓
store_search()
       ↓
map_open(provider="naver")
```

이렇게 됩니다.

---

# 그래서 산업별 Tool과 공통 Tool을 분리해야 합니다

제가 지금 단계에서 가장 중요하게 보는 설계입니다.

### 산업 Profile

```text
Hospital
Doctor
Appointment

Firm
Lawyer
Consultation

Facility
Trainer
Session

Store
Product
Order
```

이건 사이트가 WebMCP로 제공해야 하는 **Domain Tools**입니다.

반면 아래는 모든 산업에서 같습니다.

```text
Universal Extension Tools

Messaging
────────────
telegram_send
kakao_share

Maps
────────────
map_open
map_directions
map_navigation

Personal
────────────
save_favorite
create_reminder

Navigation
────────────
open_page
copy_link

Agent
────────────
summarize
compare
execute_workflow
```

이걸 Extension Core에 한 번만 구현합니다.

---

# 그러면 Extension 자체도 하나면 됩니다

처음에는 제품 이름이 예를 들어:

**Hospital Agent**

일 수 있지만 내부적으로는 처음부터:

```text
WebMCP Agent Core
│
├─ Agent Router
├─ Tool Discovery
├─ Permission
├─ Confirmation
├─ Messaging
├─ Maps
├─ Reminder
│
└─ Profiles
      ├─ healthcare.json
      ├─ legal.json
      ├─ fitness.json
      └─ commerce.json
```

로 만들면 됩니다.

새 산업이 추가될 때 Extension 코드를 거의 건드리지 않고 `Profile`을 추가하는 방식입니다.

예를 들어:

```json
{
  "profile": "legal",

  "entities": [
    "firm",
    "lawyer",
    "consultation"
  ],

  "capabilities": {
    "searchProfessional": "lawyer_search",
    "getProfessional": "lawyer_get_info",
    "getAvailability": "consultation_get_available_slots",
    "createBooking": "consultation_create"
  }
}
```

같은 식입니다.

---

# 더 나아가면 산업별 이름조차 Agent Core에서는 추상화할 수 있습니다

예를 들어 공통 개념을:

```text
Provider
Professional
Offering
Booking
Location
Transaction
```

으로 잡습니다.

그러면:

```text
Healthcare

Provider       = Hospital
Professional   = Doctor
Booking        = Appointment
```

```text
Legal

Provider       = Firm
Professional   = Lawyer
Booking        = Consultation
```

```text
Fitness

Provider       = Gym
Professional   = Trainer
Booking        = Session
```

처럼 대응할 수 있습니다.

이 추상화가 굉장히 중요합니다.

왜냐하면 Extension Agent 내부에서는:

> "전문가를 찾고 → 가능시간을 알아보고 → 예약한다."

라는 **하나의 Workflow**밖에 없기 때문입니다.

```text
search_professional
        ↓
get_professional_info
        ↓
get_availability
        ↓
create_booking
```

산업만 바뀝니다.

---

# 이커머스에서는 또 하나의 공통 Workflow가 생깁니다

```text
Search
  ↓
Compare
  ↓
Select
  ↓
Transact
  ↓
Track
```

그래서 장기적으로는 대략 두 종류의 핵심 패턴이 생길 것 같습니다.

### Service Agent

병원 / 법률 / PT / 미용 / 교육 / 상담 / 자동차 정비 등

```text
찾기
→ 전문가 확인
→ 시간 확인
→ 예약
→ 방문
→ 알림
```

### Commerce Agent

쇼핑몰 / 배달 / 티켓 / 렌탈 등

```text
찾기
→ 비교
→ 재고 확인
→ 구매
→ 배송
→ 교환/반품
```

이 두 패턴만 잘 만들어도 적용 산업이 굉장히 넓습니다.

---

## 그래서 사업적으로는 병원 자체가 최종 상품이라기보다 'Reference Vertical'에 가깝습니다

병원은 첫 산업으로 상당히 좋습니다.

이유는 병원 하나에서 이미:

```text
Public Information
+
Professional Information
+
Location
+
Authentication
+
Personal Reservation
+
Transaction
+
Messaging
```

을 모두 시험할 수 있기 때문입니다.

병원 버전이 제대로 작동하면 법률·PT 같은 예약형 산업은 상당한 부분을 그대로 재사용할 수 있습니다.

그리고 이후 Commerce Profile을 만들면 제품 범위가 크게 넓어집니다.

장기 구조를 한 문장으로 정의하면:

> **웹사이트가 WebMCP로 제공하는 기능을 이해하고, 사용자가 어떤 산업의 사이트에 있든 자연어로 조회·예약·구매·이동·전달을 실행할 수 있게 하는 범용 브라우저 에이전트.**

이쪽이 단순 **“병원용 Chrome Extension”**보다 훨씬 큰 제품 정의입니다.

다만 실제 개발 순서는 넓히지 않는 편이 좋습니다. **Hospital → Legal/Fitness → Commerce** 순서가 적절해 보입니다. Hospital에서 `Provider–Professional–Booking` 표준을 완성하고, Legal/Fitness에서 그 표준이 정말 재사용되는지 검증한 다음, 구조가 다른 Commerce를 붙이는 방식입니다.

---

# you asked

message time: 2026-08-10 20:34:26

가장 걱정은 기존의 홈페이지에 어떻게 손쉽게 webMCP 기능을 제공하는 가 하는 방법이야. google web search 등록을 js 한줄로 하듯이 js와 간당한 설명에 대한 parameters를 입력해서 손쉽게 만들어주는 것이지. 등록된 정보는 js 를 통해 정보가 실행되고 해당 js 실행시 모니터링 정보 일부가 회사 서버로 전달되는 구조면 좋겠어.

---

# chatgpt response

그 방향이 핵심입니다. **“WebMCP를 개발자가 직접 구현하게 하지 않고, 관리자 화면에서 몇 개의 필드만 정의하면 CDN의 JS 한 줄이 WebMCP Tool을 자동 등록”**하도록 만들면 도입 장벽이 크게 낮아집니다. 모니터링도 같은 SDK에서 처리하되, 환자·예약 같은 민감 데이터는 절대로 로그 서버로 보내지 않는 구조로 분리해야 합니다.

네. **그 구조가 WebMCP 보급 사업의 핵심 제품이 될 수 있습니다.** 병원 담당자가 WebMCP 코드를 직접 작성하게 하면 확산이 어렵고, 말씀하신 것처럼 **Google Analytics나 검색 관련 스크립트를 심듯이 `<script>` 한 줄만 넣고 나머지는 관리페이지에서 설정**하게 해야 합니다.

WebMCP의 Imperative API는 JS에서 `document.modelContext.registerTool()`로 tool을 동적으로 등록할 수 있으므로, 중앙 서버에서 설정을 받아 여러 Tool을 자동 생성하는 구조가 가능합니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?authuser=14&hl=en&utm_source=chatgpt.com))

제가 만든다면 설치 경험을 이렇게 만듭니다.

```html
<script
  src="https://cdn.example.com/webmcp.js"
  data-site="hospital_8K2F91"
  defer>
</script>
```

**이게 고객이 홈페이지에 넣어야 하는 전부입니다.**

### 1. 고객은 웹 관리페이지에서만 설정

예를 들어 병원 담당자가 우리 SaaS에 로그인합니다.

```text
WebMCP 관리

사이트
────────────────────────
병원명 : 아인병원
도메인 : ain-hospital.co.kr

산업 Profile
● Hospital
○ Legal
○ Fitness
○ Commerce


제공할 정보
────────────────────────

☑ 병원 정보
☑ 의료진 정보
☑ 의료진 진료일정
☑ 내 예약 조회
□ 예약 가능시간
□ 예약 생성
□ 예약 변경
□ 예약 취소
```

그리고 각각 어디서 정보를 가져오는지만 입력합니다.

예를 들어 병원정보:

```text
Tool
hospital_get_info

설명
병원의 기본정보, 주소, 대표전화,
진료시간, 주차정보를 제공합니다.

정보 출처
● 페이지에서 읽기
○ API

페이지 정보

병원명
.hospital-name

주소
.hospital-address

전화
.hospital-phone

진료시간
.opening-hours
```

의사정보는:

```text
doctor_get_info

의사 ID
[data-doctor-id]

이름
.doctor-name

진료과
.department

전문분야
.specialties

진료시간
.doctor-schedule
```

정도로 입력합니다.

**JavaScript는 고객이 작성하지 않습니다.**

---

# 그리고 중앙 서버에는 설정값만 저장합니다

예를 들어:

```json
{
  "siteId": "hospital_8K2F91",

  "profile": "hospital",

  "tools": [

    {
      "name": "hospital_get_info",
      "description": "병원의 기본 정보를 제공합니다.",

      "source": {
        "type": "dom",

        "mapping": {
          "name": ".hospital-name",
          "address": ".hospital-address",
          "phone": ".hospital-phone",
          "hours": ".opening-hours"
        }
      }
    },

    {
      "name": "doctor_get_info",
      "description": "현재 의료진 정보를 제공합니다.",

      "source": {
        "type": "dom",

        "mapping": {
          "doctorId": "[data-doctor-id]",
          "name": ".doctor-name",
          "department": ".department",
          "specialties": ".specialties"
        }
      }
    }

  ]
}
```

그러면 브라우저에서는:

```text
webmcp.js 실행
      ↓

https://api.example.com/config/hospital_8K2F91
      ↓
설정 다운로드
      ↓
Tool Generator
      ↓
document.modelContext.registerTool(...)
      ↓

hospital_get_info
doctor_get_info

자동 등록
```

됩니다.

이 방식은 WebMCP가 페이지에서 JS로 tool을 등록하는 현재 설계와 잘 맞습니다. ([GitHub](https://github.com/webmachinelearning/webmcp?utm_source=chatgpt.com))

---

# API가 있는 병원은 더 쉬워집니다

관리화면에서:

```text
정보 출처

○ 페이지에서 읽기
● API
```

를 선택합니다.

그리고:

```text
URL

/api/doctors/{doctorId}


Response Mapping

doctorId     → id
name         → doctor_name
department   → department_name
specialties  → specialties
```

만 지정합니다.

그러면 똑같은 JS가:

```text
doctor_get_info
        ↓
/api/doctors/123
        ↓
Response
        ↓
Hospital Standard Schema
```

를 자동 처리합니다.

즉 SDK에는 처음부터 몇 가지 **Adapter**만 만들어두면 됩니다.

```text
WebMCP JS SDK

Source Adapters
────────────────────────

DOM
API
JSON-LD
HTML Form
JavaScript Function
Static Config

향후:
GraphQL
REST
WebSocket
```

---

# 더 중요한 건 'Tool Builder'를 제공하는 것입니다

병원 직원이 이런 식으로 만들게 합니다.

```text
새 기능 만들기

① 기능 이름

[ 의료진 검색             ]


② AI에게 기능 설명

[ 진료과나 전문분야로 의료진을
  검색하는 기능입니다.           ]


③ AI가 받을 정보

전문분야     text
진료과       text
의사명       text


④ 사이트에서 무엇을 실행할까요?

● API 호출
○ HTML에서 정보 읽기
○ Form 실행
○ 페이지 이동


⑤ API

GET /api/doctors/search


                     [저장]
```

저장을 누르면 서버에서 자동으로:

```javascript
document.modelContext.registerTool({
  name: "doctor_search",

  description:
    "진료과, 전문분야 또는 이름으로 의료진을 검색합니다.",

  inputSchema: {
    type: "object",
    properties: {
      specialty: {
        type: "string"
      },
      department: {
        type: "string"
      },
      name: {
        type: "string"
      }
    }
  },

  execute: ...
});
```

에 해당하는 설정을 생성합니다.

Chrome 공식 문서에서도 WebMCP tool은 이름·설명·입력 schema·실행 함수 형태로 정의됩니다. 따라서 **관리화면의 입력 폼을 WebMCP schema generator로 만드는 것**이 가능합니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api?authuser=14&hl=en&utm_source=chatgpt.com))

---

# 그러면 공통 `webmcp.js`가 사실상 실행엔진이 됩니다

구조는 이렇습니다.

```text
                   WebMCP SaaS
                       │
             ┌─────────┴─────────┐
             │                   │
        Admin Console       Config Server
             │                   │
      Tool 설정 입력         JSON Profile
                                 │
                                 │
────────────────────────────────────────────
              고객 홈페이지
────────────────────────────────────────────

<script src="webmcp.js"
        data-site="8K2F91">

                 │
                 ▼
             WebMCP SDK
                 │
       Config Server 호출
                 │
                 ▼
             Tool Builder
                 │
     ┌───────────┼──────────┐
     ▼           ▼          ▼
   DOM          API        Form
 Adapter      Adapter      Adapter
     │           │          │
     └───────────┼──────────┘
                 │
                 ▼
 document.modelContext.registerTool()
                 │
                 ▼
              AI Agent
```

**이 구조라면 고객사별 JS를 만들 필요가 없습니다.**

모든 고객이 같은:

```text
webmcp.js
```

를 사용합니다.

---

# 여기서 모니터링을 같이 넣는 것도 가능합니다

그리고 말씀하신 사업모델에서 이게 굉장히 중요한 부분이라고 봅니다.

우리가 `execute()`를 생성하기 때문에 Tool 호출 전후를 wrapper로 감쌀 수 있습니다.

개념적으로:

```javascript
async function monitoredExecute(tool, args) {

  const startedAt = performance.now();

  sendEvent({
    type: "tool_start",
    tool: tool.name
  });

  try {

    const result = await tool.execute(args);

    sendEvent({
      type: "tool_success",
      tool: tool.name,
      duration:
        performance.now() - startedAt
    });

    return result;

  } catch (error) {

    sendEvent({
      type: "tool_error",
      tool: tool.name
    });

    throw error;

  }

}
```

그러면 회사 서버에서 알 수 있습니다.

```text
WebMCP Analytics

오늘

Tool Discovery       2,381
Tool Invocation        913

hospital_get_info      322
doctor_search          291
doctor_get_info        182
appointment_get         94
map_open                24

성공률               97.2%
평균 실행시간          188ms

오류                   26
```

이런 데이터를 만들 수 있습니다.

---

# 이게 'WebMCP Analytics' 제품이 됩니다

Google Analytics처럼:

```text
Page View
Session
Conversion
```

을 보는 게 아니라,

```text
Agent Discovery
Tool Invocation
Tool Success
Tool Error
Action Conversion
```

을 보는 겁니다.

예를 들어 병원에게:

```text
이번 달 AI Agent Interaction

의료진 검색         2,184회
병원 위치 조회        731회
예약 정보 조회        412회
예약 가능시간 조회    183회
예약 생성              61회
```

를 보여줄 수 있습니다.

이건 향후 상당히 가치 있는 데이터가 될 수 있습니다.

---

# 단, 모니터링 데이터는 처음부터 아주 강하게 분리해야 합니다

특히 병원에서는:

```text
사용자가 무엇을 호출했는가
```

와

```text
그 호출에 어떤 개인정보가 들어갔는가
```

를 완전히 분리해야 합니다.

예를 들어 이것은 서버에 보내도 됩니다.

```json
{
  "siteId": "hospital_8K2F91",
  "tool": "appointment_get_current",
  "status": "success",
  "duration": 142,
  "timestamp": "2026-08-10T20:32:13+09:00"
}
```

하지만 기본값으로 이런 걸 보내면 안 됩니다.

```json
{
  "patientName": "홍길동",
  "doctor": "김OO",
  "department": "정신건강의학과",
  "appointment": "..."
}
```

즉 **arguments와 results는 Analytics 서버로 전송하지 않는 것**을 기본 설계로 두는 게 좋습니다.

---

# Analytics Schema도 별도로 만들면 됩니다

```text
Allowed by default

✓ siteId
✓ toolName
✓ toolVersion

✓ discover
✓ invoke
✓ success
✓ error

✓ executionTime
✓ timestamp

✓ pageType
✓ SDK version

────────────────────

Not collected by default

✕ Patient ID
✕ 이름
✕ 전화번호

✕ 예약 상세정보
✕ 진료 정보

✕ Tool arguments
✕ Tool response

✕ 입력 자연어
```

이렇게 해놓으면 훨씬 안전합니다.

Chrome의 WebMCP 보안 지침도 도구가 사용자 데이터에 접근하거나 상태를 변경할 수 있다는 점을 전제로 보안 경계를 명확히 할 것을 요구합니다. ([Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/secure-tools?authuser=0000&hl=en&utm_source=chatgpt.com))

---

# 서버 전송도 JS SDK에서 자동 처리합니다

예:

```text
AI
 ↓
doctor_get_info()

 ↓

WebMCP SDK

 ├─ 실제 데이터
 │       ↓
 │     AI에게 반환
 │
 └─ Analytics Event
         ↓
   회사 Analytics Server
```

즉 **데이터 경로 자체를 분리**합니다.

```text
                    WebMCP SDK

             ┌──────────┴───────────┐

        Business Data            Telemetry
              │                      │
              ▼                      ▼

       Browser / Agent          Our Server

      Doctor information       tool=doctor_get_info
      Appointment              success=true
      Patient information      duration=183ms

           ↑                        ↑
         실제 데이터              Metadata만
```

이게 매우 중요합니다.

---

# `sendBeacon()` 방식도 잘 맞습니다

모니터링처럼 응답을 기다릴 필요가 없는 데이터는 브라우저의 `navigator.sendBeacon()`이나 `fetch(..., {keepalive:true})` 같은 방식으로 비동기 전달할 수 있습니다.

그러면 WebMCP 실행 성능에 미치는 영향도 거의 없게 만들 수 있습니다.

---

# 그리고 Tool 설정을 중앙에서 바꿀 수 있다는 것도 큰 장점입니다

병원에:

```html
<script
 src="https://cdn.company.com/webmcp.js"
 data-site="H928221">
</script>
```

하나만 설치되어 있으면,

병원 웹사이트 개발자는 다시 코드를 건드리지 않아도 됩니다.

우리 관리페이지에서:

```text
doctor_search

설명 변경

"의사 검색"
        ↓

"의사 이름, 진료과, 질환 및 전문분야를
 이용하여 적합한 의료진을 검색합니다."
```

라고 수정하면:

```text
Config Server

        ↓

webmcp.js

        ↓

새 Tool Description
```

으로 바로 반영할 수 있습니다.

---

# 이것은 산업 확장에도 굉장히 유리합니다

같은 SDK:

```html
<script
 src="https://cdn.company.com/webmcp.js"
 data-site="xxxxx">
</script>
```

인데 서버에서 내려주는 Profile만 다릅니다.

```text
Hospital

hospital_get_info
doctor_search
appointment_get
```

또는:

```text
Legal

firm_get_info
lawyer_search
consultation_get
```

또는:

```text
Fitness

facility_get_info
trainer_search
session_get
```

또는:

```text
Commerce

store_get_info
product_search
cart_add
order_get
```

입니다.

그래서 제품을 처음부터 **`hospital-webmcp.js`로 만들기보다 범용 `webmcp.js` + Hospital Profile**로 만드는 것을 권합니다.

---

# 설치 방식도 3단계로 만들 수 있습니다

**가장 쉬운 Basic**은:

```html
<script
 src="https://cdn.company.com/webmcp.js"
 data-site="H928221">
</script>
```

관리페이지에서 모든 설정을 합니다.

**조금 더 자유로운 Advanced**는:

```html
<script>
window.WebMCPConfig = {
  siteId: "H928221",
  profile: "hospital"
};
</script>

<script src="https://cdn.company.com/webmcp.js"></script>
```

그리고 개발자용 **Custom**에서는:

```javascript
WebMCP.registerSource(
  "doctor",
  async function(params) {
     return myHospitalAPI(params);
  }
);
```

처럼 기존 시스템의 함수를 연결하게 합니다.

그러면 **비개발자 → 프론트엔드 개발자 → 시스템 개발자** 모두 커버할 수 있습니다.

---

## 결과적으로 저는 제품을 4개 구성요소로 정의하겠습니다

```text
            WebMCP Easy Deploy Platform

① One-line SDK
──────────────────────────
webmcp.js


② Web Console
──────────────────────────
Tool Builder
Parameter Builder
DOM/API Mapper
Tool Description


③ Industry Profiles
──────────────────────────
Hospital
Legal
Fitness
Commerce


④ WebMCP Analytics
──────────────────────────
Discovery
Invocation
Success
Error
Latency
Action conversion
```

그리고 고객 경험은 딱:

> **① 회원가입 → ② 산업 선택 → ③ 홈페이지 정보/API 매핑 → ④ 생성된 JS 한 줄 삽입 → 끝**

이어야 합니다.

이렇게 되면 우리가 앞에서 이야기했던 Chrome Extension보다도 사실 **이 JS SDK가 플랫폼의 핵심 자산**이 됩니다. Extension은 WebMCP를 활용하는 하나의 Agent Client가 되고, `webmcp.js + Config Server + Industry Profiles`가 수많은 기존 웹사이트를 agent-ready하게 바꾸는 인프라가 됩니다.

특히 **“한 줄 설치 + 중앙 Tool Builder + 익명화된 Tool Analytics”** 세 가지를 처음 MVP부터 같이 설계하는 것을 권합니다. 이 중 Analytics를 나중에 추가하면 고객사별 설정과 개인정보 경계가 이미 굳어진 뒤라 구조 변경이 더 어려워질 수 있습니다.

---
Powered by [AI Exporter](https://saveai.net)