# WebMCP 공통 라이브러리 사용 방법
# WebMCP Common Library Usage Guide

---

## 한글 버전 (Korean)

### 1. 개요

`webmcp.js`는 웹사이트가 AI 에이전트에게 기능을 구조화된 **tool(함수)** 형태로 노출하는 공통 라이브러리입니다.
사이트 전체에서 **한 번만 로드**하면 되며, 각 페이지가 가진 데이터/기능만 `ITEMS`에 정의하면 됩니다.

- **구조:** 공통 라이브러리(한 번 로드) + 페이지별 어댑터(데이터 정의)
- **API:** `navigator.modelContext.registerTool()` (WebMCP Imperative API)
- **지원:** WebMCP API가 없는 브라우저에서는 조용히 스킵됩니다.

> ⚠️ WebMCP는 아직 **제안(proposed) 표준**입니다. 최신 Chrome에서 실험적으로 동작합니다.

---

### 2. 설치 (사이트 전체에 로드)

모든 페이지의 `<head>`에 아래 스크립트 태그를 추가하세요.

```html
<script type="module" src="/webmcp.js"></script>
```

- `src` 경로는 서버에 배포한 실제 경로로 바꾸세요. (예: `/assets/js/webmcp.js`)
- 반드시 **모든 페이지**에 넣어야 어떤 페이지를 보든 동일한 tool이 노출됩니다.

---

### 3. 설정

파일 상단의 설정 영역만 수정하면 됩니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `SITE_NS` | `'hospital'` | 사이트 식별자. tool 이름의 namespace. |
| `SITE_LANG` | `'ko'` | tool 설명에 사용할 언어. |
| `DEBUG` | `true` | 디버그 로그 출력 여부. 운영 배포 시 `false`로. |

예시:
```javascript
const SITE_NS = 'yonja';     // 브랜드/도메인으로 변경
const SITE_LANG = 'ko';
const DEBUG = true;
```

---

### 4. name(namespace) 정의

tool 이름은 `{SITE_NS}.{group}.{name}` 형태로 만들어집니다.

`NAMES` 객체에 그룹별 이름 목록과 설명을 추가하세요.

```javascript
const NAMES = {
  hospital:   { names: ['get_info'],     description: '병원 기본정보 조회' },
  doctor:     { names: ['get_info'],     description: '의사 정보 조회'     },
  appointment:{ names: ['get_current'],  description: '예약 정보 조회'     },
};
```

- 위 예시는 `hospital.hospital.get_info`, `hospital.doctor.get_info`,
  `hospital.appointment.get_current` 3개 tool을 만듭니다.

---

### 5. item 정의 (확장 포인트)

`ITEMS` 배열에 항목을 추가하면 각각 하나의 tool이 됩니다. 이것이 **새 기능을 추가하는 주된 방법**입니다.

#### item 구조

| 필드 | 필수 | 설명 |
|---|---|---|
| `group` | ✔ | 어느 name 그룹에 속하는지 |
| `name` | ✔ | tool의 마지막 이름 |
| `title` | | 사람이 읽을 수 있는 제목 |
| `description` | | AI가 이해할 tool 설명 |
| `inputSchema` | | (선택) 입력 파라미터 JSON Schema |
| `getData` | | 함수면 **동적 실행**, 객체면 **정적 반환** |

#### 예시 1 — 정적 데이터 (객체)

```javascript
{
  group: 'hospital',
  name: 'get_info',
  title: '병원 정보',
  description: '병원의 기본 정보를 조회합니다.',
  getData: {
    name: '연애의자격 병원',
    address: '서울시 강남구 ...',
    phone: '02-1234-5678',
  },
}
```

#### 예시 2 — 동적 데이터 (함수, 인자 수신)

```javascript
{
  group: 'appointment',
  name: 'get_current',
  title: '현재 예약 정보',
  description: '로그인한 사용자의 예약 상태를 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: '사용자 ID' },
    },
    required: ['userId'],
  },
  getData: async function (args) {
    const userId = (args && args.userId) || 'guest';
    return { userId: userId, status: '예약됨' };
  },
}
```

> 💡 `getData`가 함수이면 AI 에이전트가 넘긴 인자(`args`)를 받아 처리할 수 있고,
> DOM을 조회하는 등 동적 로직을 넣을 수 있습니다.

---

### 6. 도메인별 확장 예시

`ITEMS`만 교체하면 병원 외 도메인에도 그대로 사용할 수 있습니다.

| 도메인 | tool 예시 |
|---|---|
| 법률 | `law.find_lawyer`, `law.find_case`, `law.request_consultation` |
| 금융 | `bank.find_product`, `bank.compare_product`, `bank.calculate_rate` |
| 쇼핑몰 | `shop.search_product`, `shop.check_stock`, `shop.add_to_cart` |
| 프랜차이즈 | `franchise.find_store`, `franchise.get_menu`, `franchise.check_hours` |

---

### 7. 동적 확장 API (`window.WebMCP`)

콘솔이나 페이지 스크립트에서 런타임에 tool을 추가할 수 있습니다.

```javascript
// 새 item을 즉시 등록 (동적 추가)
WebMCP.registerItem({
  group: 'parking',
  name: 'get_info',
  title: '주차 안내',
  description: '병원 주차 가능 여부를 안내합니다.',
  getData: { available: true, fee: '2시간 무료' },
});

// 등록된 item 개수 확인
console.log(WebMCP.getItemCount());

// name(namespace) 목록 확인
console.log(WebMCP.getNames());
```

---

### 8. 디버깅

`DEBUG = true`일 때 콘솔에 `[WebMCP]` 로그가 출력됩니다.

- `tool 등록 완료: hospital.doctor.get_info` — 각 tool이 성공적으로 등록됨
- `총 3개의 tool을 등록했습니다.` — 등록된 총 개수
- `이 브라우저는 WebMCP를 지원하지 않습니다.` — API 미지원 환경

> Chrome 개발자 도구에서 `navigator.modelContext`가 정의되어 있는지 확인하면
> 현재 브라우저의 WebMCP 지원 여부를 알 수 있습니다.

---

## English Version

### 1. Overview

`webmcp.js` is a common library that lets a website expose its features to AI agents as **structured tools (functions)**.
Load it **once site-wide**, and each page only needs to define the data/features it has in `ITEMS`.

- **Structure:** Common library (loaded once) + per-page adapter (data definitions)
- **API:** `navigator.modelContext.registerTool()` (WebMCP Imperative API)
- **Compatibility:** Skipped silently in browsers without the WebMCP API.

> ⚠️ WebMCP is still a **proposed standard**. It works experimentally in recent Chrome.

---

### 2. Installation (Load site-wide)

Add the script tag to the `<head>` of every page:

```html
<script type="module" src="/webmcp.js"></script>
```

- Change `src` to the actual deployed path. (e.g. `/assets/js/webmcp.js`)
- Add it to **all pages** so the same tools are exposed regardless of the current page.

---

### 3. Configuration

Only edit the config block at the top of the file.

| Variable | Default | Description |
|---|---|---|
| `SITE_NS` | `'hospital'` | Site identifier. Namespace of tool names. |
| `SITE_LANG` | `'ko'` | Language used in tool descriptions. |
| `DEBUG` | `true` | Toggle debug logs. Set to `false` in production. |

Example:
```javascript
const SITE_NS = 'yonja';     // change to your brand/domain
const SITE_LANG = 'ko';
const DEBUG = true;
```

---

### 4. Define names (namespaces)

Tool names are built as `{SITE_NS}.{group}.{name}`.

Add per-group name lists and descriptions in the `NAMES` object:

```javascript
const NAMES = {
  hospital:   { names: ['get_info'],     description: 'Hospital basic info'   },
  doctor:     { names: ['get_info'],     description: 'Doctor info'           },
  appointment:{ names: ['get_current'],  description: 'Current appointment'   },
};
```

- The example above creates 3 tools: `hospital.hospital.get_info`,
  `hospital.doctor.get_info`, and `hospital.appointment.get_current`.

---

### 5. Define items (the extension point)

Adding an entry to the `ITEMS` array creates one tool. **This is the main way to add new features.**

#### Item structure

| Field | Required | Description |
|---|---|---|
| `group` | ✔ | Which name group it belongs to |
| `name` | ✔ | Final name of the tool |
| `title` | | Human-readable title |
| `description` | | Tool description for the AI |
| `inputSchema` | | (Optional) JSON Schema for input params |
| `getData` | | Function → **dynamic execution**, object → **static return** |

#### Example 1 — Static data (object)

```javascript
{
  group: 'hospital',
  name: 'get_info',
  title: 'Hospital info',
  description: 'Returns basic hospital information.',
  getData: {
    name: 'Yonja Hospital',
    address: '123 Teheran-ro, Seoul',
    phone: '02-1234-5678',
  },
}
```

#### Example 2 — Dynamic data (function with args)

```javascript
{
  group: 'appointment',
  name: 'get_current',
  title: 'Current appointment',
  description: 'Returns the logged-in user\'s appointment status.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'User ID' },
    },
    required: ['userId'],
  },
  getData: async function (args) {
    const userId = (args && args.userId) || 'guest';
    return { userId: userId, status: 'booked' };
  },
}
```

> 💡 When `getData` is a function, it receives the arguments (`args`) passed by the
> AI agent, and you can run dynamic logic such as reading the DOM.

---

### 6. Domain-specific examples

By swapping only `ITEMS`, the same library works for non-hospital domains.

| Domain | Example tools |
|---|---|
| Legal | `law.find_lawyer`, `law.find_case`, `law.request_consultation` |
| Finance | `bank.find_product`, `bank.compare_product`, `bank.calculate_rate` |
| E-commerce | `shop.search_product`, `shop.check_stock`, `shop.add_to_cart` |
| Franchise | `franchise.find_store`, `franchise.get_menu`, `franchise.check_hours` |

---

### 7. Dynamic extension API (`window.WebMCP`)

You can add tools at runtime from the console or page scripts.

```javascript
// Register a new item immediately (dynamic)
WebMCP.registerItem({
  group: 'parking',
  name: 'get_info',
  title: 'Parking info',
  description: 'Returns hospital parking availability.',
  getData: { available: true, fee: 'Free for 2 hours' },
});

// Get the current item count
console.log(WebMCP.getItemCount());

// List names (namespaces)
console.log(WebMCP.getNames());
```

---

### 8. Debugging

With `DEBUG = true`, `[WebMCP]` logs appear in the console.

- `tool 등록 완료: hospital.doctor.get_info` — each tool registered successfully
- `총 3개의 tool을 등록했습니다.` — total number registered
- `이 브라우저는 WebMCP를 지원하지 않습니다.` — API not supported

> In Chrome DevTools, check whether `navigator.modelContext` is defined to
> determine WebMCP support in the current browser.
