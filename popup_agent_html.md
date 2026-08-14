# 팝업 → 일반 팝업(웹 위젯) 전환 설계안

Chrome 확장 프로그램(`webmcp-extension/`)으로 되어 있는 AI 비서를 **일반 웹페이지 위젯(인라인 팝업)** 으로 전환하고,
여러 도메인에서 공용 `webmcp.js`를 쓰며, 도메인별로 키를 구분하고, 개발 환경을 분리하는 **통합 설계안**입니다.

---

## 1. 목표

- Chrome 확장 전용 코드를 웹 위젯으로 전환
- 여러 도메인(`yonza.co.kr`, `ssangssang.co.kr` 등)이 **공용 `webmcp.js`** 사용
- **도메인별로 서로 다른 키/설정/요금제** 적용
- 운영(`yonza.co.kr`)과 개발(`dev.yonza.co.kr`) 환경 분리
- Gemini API 키는 **서버에서만 보관**, 브라우저 노출 방지

---

## 2. 전환 시 주의사항 (Chrome 확장 → 웹 위젯)

### ⚠️ 2-1. Chrome 전용 API 제거
`popup.js`가 사용하는 아래 API는 일반 웹 페이지에 **존재하지 않습니다.** 위젯으로 전환 시 반드시 교체해야 합니다.

| 위치 | 기존 코드 | 문제 | 교체 |
|------|-----------|------|------|
| `popup.js` | `chrome.windows.getCurrent()` | 없음 | `window` 직접 사용 |
| `popup.js` | `chrome.tabs.query()` | 없음 | 페이지가 곧 대상 |
| `popup.js` | `chrome.tabs.sendMessage()` | 없음 | 직접 함수 호출 |
| `popup.js` | `chrome.scripting.executeScript()` | 없음 | `window.WebMCPConfig` 직접 접근 |
| `popup.js` | `chrome.tabs.create({url})` | 없음 | `window.open()` |
| `popup.js` | `chrome.storage.local` | 없음 | `localStorage` |
| `background.js` | `chrome.action/windows/runtime` | 없음 | 위젯에선 `background` 불필요 |

**결과**: `getTargetTab()`, `sendMessageToTab()`, `queryWebMCP()`, `invokeTool()`, `queryPageInfo()` 등
**탭 탐색·스크립트 주입 기반 함수 전부를 삭제/재작성**해야 합니다.

### ✅ 2-2. 오히려 단순해지는 부분
현재 확장은 content script가 isolated world라서 `window.WebMCPConfig`에 접근하지 못해
`chrome.scripting.executeScript({ world: 'MAIN' })`로 우회합니다.

```
// popup.js — 이렇게 번거로운 우회
const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id }, world: 'MAIN', func: () => { ... window.WebMCPConfig ... }
});
```

**웹 위젯은 페이지와 같은 origin에서 실행되므로** `window.WebMCPConfig`와 `navigator.modelContext`를
**그냥 직접 접근**할 수 있습니다. 이 우회 코드는 제거 가능하며 `content.js`도 불필요해집니다.

### ⚠️ 2-3. 내장 AI(`window.LanguageModel`) — Origin Trial 의존
- **확장**: 팝업이 확장 신뢰 컨텍스트라서 Origin Trial 없이 접근 가능
- **웹 위젯**: 페이지 도메인(`yonza.co.kr`)에 **Prompt API Origin Trial 토큰**이 있어야만 `window.LanguageModel` 노출

> ⚠️ 토큰은 등록된 도메인에서만 동작. **`localhost`에서는 비활성화** → 위젯을 로컬에서 테스트하면 내장 AI가 `unavailable`.

### ⚠️ 2-4. Gemini API 키 노출 (보안)
키를 웹 위젯에 넣으면 **서버/HTML에 노출**되어 누구나 열람·도용 가능.
- (권장) 키를 **서버 프록시**로 이전
- 또는 사용자가 위젯 설정에 직접 키 입력 → `localStorage` 저장 (자기 책임)

### ⚠️ 2-5. 기타
| 항목 | 내용 |
|------|------|
| 링크 클릭 | `chrome.tabs.create` → `window.open` |
| CSP | 페이지의 Content-Security-Policy가 인라인 스크립트/스타일을 막을 수 있음 |
| Gemini API CORS | 브라우저 직접 호출 시 `Access-Control-Allow-Origin` 허용 확인 |

---

## 3. 키 보안: 암호화보다 서버 프록시

### 3-1. 왜 "암호화"는 무의미한가
클라이언트에서 복호화 키와 로직이 같은 곳에 있으면 **그건 암호화가 아니라 난독화**입니다.
위젯이 Gemini를 호출하려면 결국 평문 키를 요청에 실어 보내야 하고, **그 순간 DevTools 네트워크 탭에서 노출**됩니다.

| 시나리오 | 문제 |
|---------|------|
| 키를 `localStorage`에 AES 암호화 저장 | 복호화 키·함수도 같은 브라우저 → 추출 가능 |
| 난독화(base64 등) | 쉽게 역산 |
| 서버가 암호화 키 내려줌 | 복호화 키는 여전히 클라이언트에 존재 |

> 핵심: **암호화는 "저장" 보호에는 의미가 있고, "사용자가 직접 접근 가능한 비밀값" 보호에는 무의미.**

### 3-2. 권장: 별도 RESTful 서비스(프록시)
```
사용자 위젯 ──POST /api/chat──▶ 내 서버(프록시) ──키 사용──▶ Gemini API
                              (키는 서버에만 존재)
```
- 키가 절대 브라우저로 나가지 않음
- 사용자별 쿼터/인증/요금 제어 가능
- 단점: 서버 구축·운영 필요

### 3-3. 참고: 암호화 대신 실효성 있는 대책
| 방법 | 효과 |
|------|------|
| **서버 프록시** | ✅ 가장 안전, 권장 |
| **API 키 제한(레퍼러/IP)** | ✅ 키가 털려도 못 쓰게 함 (실전 대책) |
| **사용자 직접 입력** | ✅ 서버 부담 없음 |
| 난독화 | ⚠️ 지연 효과만 |

---

## 4. 멀티도메인 & 키 구분 (공용 webmcp.js)

여러 사이트가 공용 `webmcp.js`를 쓰고, **`Origin` 헤더로 테넌트(도메인)를 구분**해 도메인별 키를 적용합니다.

### 4-1. 서버측 (멀티테넌트 프록시) — 개요

> 실제 구현은 **4-1-2**(비정상 접속 감지 + 전체 흐름)를 참조하세요. 여기서는 개념만 설명합니다.

```js
// 도메인별 설정 (코드 대신 DB/설정파일로 관리하면 사이트 추가가 쉬움)
const SITE_CONFIG = {
  'https://yonza.co.kr':      { key: 'KEY_PROD_YONJA',  rate: 100, tier: 'premium' },
  'https://ssangssang.co.kr': { key: 'KEY_PROD_SSANG',  rate: 30,  tier: 'basic'   },
  'https://dev.yonza.co.kr':  { key: 'KEY_DEV',         rate: 20,  tier: 'dev'     },
  'http://localhost:8000':    { key: 'KEY_DEV',         rate: 10,  tier: 'dev'     },
};

// 개념 흐름 (실제 코드는 4-1-2 참조)
// ① Origin 으로 도메인 판별 → ② SITE_CONFIG 에서 키/한도 조회
// ③ Rate Limit 검증 → ④ Gemini API 호출 (키는 서버에만)
```

#### 4-1-0. 공통 유틸: `rateLimitCheck()` / `callGemini()` 스텁

아래 함수들은 4-1-2의 실제 라우트 핸들러에서 사용됩니다. 프로덕션에서는 Redis 기반 카운터, 실제 Gemini REST 호출로 교체하세요.

```js
// ── 도메인별 속도 제한 검증 (커스텀 카운터) ──────────────────
// ※ express-rate-limit(4-1-0 하단)와 별개로, SITE_CONFIG.rate 값을
//    도메인 단위로 적용하기 위한 보조 함수입니다.
const domainCounters = new Map(); // key: origin, value: { count, resetAt }

function rateLimitCheck(origin, maxPerMinute) {
  const now = Date.now();
  let entry = domainCounters.get(origin);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    domainCounters.set(origin, entry);
  }
  entry.count++;
  return entry.count <= maxPerMinute;
}

// ── Gemini API 호출 (서버에서 키 사용) ─────────────────────────
async function callGemini(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }
  return res.json();
}
```

#### 4-1-0. 속도 제한 (Rate Limit)

**목적**: IP당 요청 횟수를 제한해 **비용 폭주·무한 호출·DDoS성 남용**을 차단합니다. 도메인(`Origin`) 판별만으로는 `curl` 위조를 막을 수 없으므로, **반드시 속도 제한과 조합**해야 합니다.

**기본 구현** (`express-rate-limit`)
```js
const rateLimit = require('express-rate-limit');

// 전체 엔드포인트에 공통 1차 속도 제한
app.use('/api/chat', rateLimit({
  windowMs: 60_000,   // 1분
  max: 20,            // IP당 20회
  standardHeaders: true,   // RateLimit-* 응답 헤더
  legacyHeaders: false,
}));
```

**도메인별로 다른 한도 적용** (`SITE_CONFIG.rate` 연동)
`SITE_CONFIG`에 `rate` 값을 이미 두었으므로, 요청의 `Origin`에 따라 각기 다른 한도를 적용할 수 있습니다.

```js
// ※ rateLimit 은 위에서 이미 require 했으므로 재선언 불필요

// origin 기준 한도 제한 (요청마다 cfg.rate 를 동적으로 사용)
const domainRateLimiter = rateLimit({
  windowMs: 60_000,
  keyGenerator: (req) => req.headers.origin || req.ip, // 도메인/IP 단위로 키 지정
  handler: (req, res) => {
    // ※ logRequest 는 4-1-1(db.js)에서 정의됩니다. 실제 코드에서는
    //    db.js 를 먼저 require 한 뒤에 이 미들웨어를 설정하세요.
    logRequest(req, 'blocked_429', 'rate_limit');
    res.status(429).json({ error: '호출 한도 초과' });
  },
});

app.post('/api/chat',
  domainRateLimiter,
  (req, res) => { /* 실제 로직 (4-1-2 참조) */ }
);
```

> ⚠️ **설계 트레이드오프**
> - `express-rate-limit`의 `max`는 **정적 값**이 기본입니다. 도메인별로 다른 `max`를 쓰려면 `keyGenerator`로 키를 나누거나, 각 도메인별 별도 미들웨어 인스턴스를 두거나, 4-1-2의 `rateLimitCheck()`처럼 **커스텀 카운터**(예: IP·도메인별 Redis/DB 카운트)를 직접 구현해야 합니다.
> - 단순하게는 아래처럼 **전역 한도 + 도메인별 추가 검증**을 병행하는 것이 가장 현실적입니다.

**단순 병행 방식 (권장)**
```js
// ① 전역: IP당 1분 20회 하드 캡
app.use('/api/chat', rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ② 도메인별: SITE_CONFIG.rate 를 커스텀 함수로 검증 (4-1-2 의 rateLimitCheck)
if (!rateLimitCheck(origin, cfg.rate)) {
  logRequest(req, 'blocked_429', 'rate_limit_domain');
  return res.status(429).json({ error: '호출 한도 초과' });
}
```

**Rate Limit 적용 지점 요약**

| 미들웨어/함수 | 단위 | 한도 | 상태코드 |
|--------------|------|------|----------|
| 전역 `express-rate-limit` | IP | 20/분 (하드 캡) | 429 |
| `rateLimitCheck(origin, cfg.rate)` | 도메인 | `SITE_CONFIG`의 `rate` 값 | 429 |
| (선택) IP별 블랙리스트 | IP | 반복 차단 시 영구/장기 차단 | 401/403 |

> ⚠️ **주의사항**
> - 속도 제한은 메모리 기본 저장이라 **서버 재시작 시 카운트가 초기화**됩니다. 다중 인스턴스/로드밸런서 환경이라면 Redis 기반 `store`를 사용하세요.
> - `keyGenerator`를 `Origin`으로 쓰면 **같은 도메인의 모든 사용자가 하나로 묶여** 한 사용자가 한도를 소진하면 같은 도메인 전체가 429 될 수 있습니다. 실제 운영에서는 **IP 기준 전역 제한 + 도메인 기준 상한**을 분리해 적용하는 것을 권장합니다.

#### 4-1-1. 비정상 접속 감지: SQLite에 header 정보 저장

**목적**: 누가(도메인/IP/UA) 언제 어떤 헤더로 접근했는지를 SQLite에 남겨, **`curl` 스크립트 접속이나 위조된 요청**을 사후 분석·차단하기 위함입니다.

**SQLite 테이블 구성** (`request_logs.db`)
```sql
CREATE TABLE IF NOT EXISTS request_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT    NOT NULL,                -- 요청 시각 (ISO 8601)
  origin     TEXT,                            -- Origin 헤더
  referer    TEXT,                            -- Referer 헤더
  user_agent TEXT,                            -- User-Agent
  sec_ch_ua  TEXT,                            -- 브라우저 Client Hints (UA-CH)
  ip         TEXT,                            -- 요청 IP (프록시 뒤 X-Forwarded-For)
  path       TEXT,                            -- 요청 경로
  body_len   INTEGER,                         -- 요청 본문 길이
  verdict    TEXT,                            -- 'ok' | 'blocked_401' | 'blocked_403' | 'blocked_429'
  reason     TEXT                             -- 차단 사유 (예: 'missing_ua', 'missing_origin' 등)
);
CREATE INDEX IF NOT EXISTS idx_logs_ts ON request_logs(ts);
CREATE INDEX IF NOT EXISTS idx_logs_ip ON request_logs(ip);
```

**로깅 유틸** (`db.js`)
```js
const sqlite3 = require('better-sqlite3');
const db = new sqlite3('request_logs.db');

db.exec(`CREATE TABLE IF NOT EXISTS request_logs (...) /* 위 스키마 */`);

// ※ logRequest 에서 req.body 를 읽으려면 Express 에서 express.json() 미들웨어가
//    먼저 적용되어 있어야 합니다. (app.use(express.json()) 를 라우트보다 위에 선언)
function logRequest(req, verdict, reason) {
  db.prepare(
    `INSERT INTO request_logs (ts, origin, referer, user_agent, sec_ch_ua, ip, path, body_len, verdict, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    req.headers.origin || null,
    req.headers.referer || null,
    req.headers['user-agent'] || null,
    req.headers['sec-ch-ua'] || null,
    (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
    req.path,
    req.headers['content-length'] ? Number(req.headers['content-length']) : (req.body ? JSON.stringify(req.body).length : 0),
    verdict,
    reason
  );
}
```

> ⚠️ **`better-sqlite3` 주의사항**
> - `better-sqlite3`는 **C++ 네이티브 애드온**이므로 `node-gyp` 빌드 환경이 필요합니다.
> - **Windows**에서는 `windows-build-tools`(`npm install --global windows-build-tools`) 또는 Visual Studio Build Tools 설치가 필요할 수 있습니다.
> - 네이티브 빌드가 부담스럽다면 순수 JS 대안인 `sql.js`(WebAssembly 기반)로 교체할 수 있습니다. API는 거의 동일합니다.

#### 4-1-2. 비정상 접속 감지: 401 오류 처리

`curl` / Postman / 스크립트로 온 요청은 일반 브라우저와 달리 헤더가 **부실**합니다. 아래 규칙으로 의심 요청을 **401** 처리하고 로그에 남깁니다.

```js
const ALLOWED = SITE_CONFIG; // 위에서 정의한 도메인별 설정

// ⚠️ Sec-CH-UA(Client Hints) 검증: 기본값 = 사용 안 함(false)
// - Chrome 계열은 자동으로 붙지만, 일부 브라우저/개인정보 보호 모드에서는 없을 수 있음
// - true 로 켜면 정상 사용자도 401 될 수 있으므로, 반드시 모니터링 후 신중히 활성화
const REQUIRE_CLIENT_HINTS = false; // ← 기본 비활성화. 필요 시만 true 로 변경

/** 브라우저에서 온 정상 요청인지 판별 (헤더 부실 → 비정상) */
function isLikelyRealBrowser(req) {
  const ua   = req.headers['user-agent'] || '';
  const chua = req.headers['sec-ch-ua']  || '';
  const origin = req.headers.origin;
  const referer = req.headers.referer || '';

  // ① User-Agent 가 브라우저 형태인가?  (curl/python 등은 여기서 걸림)
  const looksLikeBrowser =
    /Mozilla\/5\.0/.test(ua) &&
    /Chrome|Firefox|Safari|Edg/.test(ua);

  // ② Origin 이 허용 목록에 있는가?  (curl 은 보통 Origin 을 안 보냄)
  const hasValidOrigin = !!origin && !!ALLOWED[origin];

  // ③ Referer 가 Origin 과 일치하는가?  (curl 은 보통 Referer 도 안 보냄)
  //    Origin 이 있으면 Referer 도 같은 출처에서 시작해야 함 (빈 문자열이면 통과)
  const refererOk = !origin || referer === '' || referer.startsWith(origin);

  // ④ 브라우저 Client Hints(UA-CH) 가 있는가?
  //    기본값: REQUIRE_CLIENT_HINTS=false → 이 조건은 판별에 포함하지 않음
  //    (정상 사용자 차단 방지). 필요 시 true 로 전환해 강화.
  const hasClientHints = REQUIRE_CLIENT_HINTS ? chua.length > 0 : true;

  return looksLikeBrowser && hasValidOrigin && refererOk && hasClientHints;
}

app.post('/api/chat', async (req, res) => {
  const origin = req.headers.origin;

  // ── ① 헤더 부실 / curl 유사 요청 → 401 ──────────────────────
  if (!isLikelyRealBrowser(req)) {
    logRequest(req, 'blocked_401', 'header_missing_or_sparse');
    return res.status(401).json({ error: '비정상적인 요청입니다.' });
  }

  // ── ② 허용 도메인이 아닌 경우 → 403 ─────────────────────────
  const cfg = SITE_CONFIG[origin];
  if (!cfg) {
    logRequest(req, 'blocked_403', 'unknown_origin');
    return res.status(403).json({ error: '등록되지 않은 도메인' });
  }

  // ── ③ Rate Limit → 429 ──────────────────────────────────────
  if (!rateLimitCheck(origin, cfg.rate)) {
    logRequest(req, 'blocked_429', 'rate_limit');
    return res.status(429).json({ error: '호출 한도 초과' });
  }

  // ── ④ 정상 요청 → 키 사용 ───────────────────────────────────
  logRequest(req, 'ok', null);
  const result = await callGemini(cfg.key, req.body.prompt);
  res.json(result);
});
```

**401 판별 규칙 요약**

| 체크 항목 | 비정상(→401) 조건 | 정상 조건 |
|-----------|-------------------|-----------|
| `User-Agent` | `Mozilla/5.0` 없거나 브라우저명 없음 (`curl`, `python-requests` 등) | `Mozilla/5.0` + `Chrome/Firefox/...` |
| `Origin` | 없거나 허용 목록에 없음 (`curl`은 대부분 생략) | 허용 목록에 존재 |
| `Sec-CH-UA` (Client Hints) | **기본 사용 안 함** — 켜면(`REQUIRE_CLIENT_HINTS=true`) 없음(스크립트/curl 특성) → 401 | **기본 사용 안 함** — 항상 통과 |
| `Referer` | 정상 브라우저와 불일치 | 도메인과 일치 |

> ⚠️ **주의사항**
> - `Sec-CH-UA` 검증은 **기본적으로 비활성화**(`REQUIRE_CLIENT_HINTS = false`)되어 있어, 브라우저 유형·개인정보 보호 모드와 무관하게 정상 사용자를 차단하지 않습니다. **필요할 때만 `true`로 전환**하고, 그 전에 모니터링으로 401 오탐이 없는지 반드시 확인하세요.
> - `Sec-CH-UA`는 Chrome 계열에서 자동으로 붙지만, **일부 브라우저/개인정보 보호 모드에서는 없을 수 있음** → 기본 비활성화로 두는 것이 안전합니다.
> - 401은 "비정상 요청 거부"이고, 403은 "미등록 도메인 거부"로 **상태코드를 구분**해 로그 분석을 쉽게 합니다.
> - `curl -H "User-Agent: Mozilla/5.0"` 등으로 **헤더를 위조하면 우회될 수 있음** → 완벽 차단이 아니라 **탐지·로깅·속도제한과 조합**해 사용하세요.

#### 4-1-3. 로그 조회 (비정상 접속 분석)

```sql
-- 최근 차단된 요청 확인
SELECT ts, ip, origin, user_agent, verdict, reason
FROM request_logs
WHERE verdict != 'ok'
ORDER BY ts DESC
LIMIT 50;

-- IP별 차단 횟수 집계 (특정 IP가 반복 시도하는지)
SELECT ip, COUNT(*) AS blocked
FROM request_logs
WHERE verdict != 'ok'
GROUP BY ip
ORDER BY blocked DESC
LIMIT 20;

-- 특정 IP의 전체 이력
SELECT ts, origin, user_agent, path, verdict, reason
FROM request_logs
WHERE ip = '1.2.3.4'
ORDER BY ts DESC;
```

### 4-2. 공용 `webmcp.js` (클라이언트측)
`webmcp.js`는 키를 직접 들고 있지 않고 **프록시 서버에 질문만 보냅니다.**
```js
// webmcp.js (공용) — Gemini 직접 호출 대신 프록시 호출
async function callGeminiViaProxy(prompt) {
  const res = await fetch('https://프록시서버.com/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    // Origin 헤더는 브라우저가 자동 첨부 → 서버가 도메인 판별
  });
  if (!res.ok) throw new Error('프록시 오류: ' + res.status);
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```
- `gemini-key.js` **삭제 가능** (키가 클라이언트에 없음)
- 각 사이트는 `WebMCPConfig`만 정의하고 `webmcp.js` 로드 → 동일 동작

### ⚠️ 4-3. 주의사항 (멀티테넌트 함정)
| 주의 | 내용 |
|------|------|
| `Origin`은 위조 가능 | `curl -H "Origin: https://yonza.co.kr"`로 위장 가능 → **Rate Limit 필수** |
| `localhost` 403 | `SITE_CONFIG`에 개발용 도메인 추가 필요 |
| 키를 브라우저에 내려주지 말 것 | "도메인별로 키 제공" ≠ "키를 내려줌". **키는 서버에서만 호출** |

---

## 5. 개발 환경 분리 (`dev.yonza.co.kr`)

### 5-1. 왜 서브도메인인가
README의 **Origin Trial 토큰이 도메인에서만 동작**하기 때문입니다.

| 비교 | `localhost:8000` | `dev.yonza.co.kr` |
|------|------------------|-------------------|
| WebMCP Origin Trial | ❌ 비활성화 | ✅ (서브도메인 일치) |
| Prompt API 토큰 | ❌ | ✅ |
| 내장 AI(`window.LanguageModel`) | ❌ | ✅ |
| 확장 `host_permissions` | ⚠️ 별도 | ✅ 이미 `yonza.co.kr/*` 포함 |

### 5-2. 구성 순서
1. **hosts 파일에 서브도메인 등록**
   ```
   # C:\Windows\System32\drivers\etc\hosts
   127.0.0.1  dev.yonza.co.kr
   ```
2. **로컬 HTTPS 구성** (Origin Trial/내장 AI는 HTTPS 요구)
   ```bash
   mkcert -install
   mkcert dev.yonza.co.kr
   ```
3. **Origin Trial 토큰 서브도메인 일치 확인**
   - 등록 시 "subdomain matching" 체크되어 있어야 `dev.*`에서 동작
   - 배포 전 dev에서 WebMCP 등록 로그 확인
4. **확장 `manifest.json`에 dev 도메인 추가**
   ```json
   "host_permissions": ["https://dev.yonza.co.kr/*", ...],
   "content_scripts": [{ "matches": ["https://dev.yonza.co.kr/*", ...], ... }]
   ```
   > `https://yonza.co.kr/*`는 서브도메인을 포함하지 않는 경우가 있어 **명시적 등록 필요**
5. **프록시 `SITE_CONFIG`에 dev 항목 추가** (별도 키/쿼터, 운영 데이터 분리)

### ⚠️ 5-3. 주의사항
| 항목 | 내용 |
|------|------|
| 토큰 서브도메인 일치 | 필수 확인, 미체크 시 `dev.*`에서 무효 |
| 로컬 HTTPS | `http://dev.yonza.co.kr:8000`은 HTTP라 내장 AI/WebMCP 비활성화 가능 |
| CORS | dev에서 프록시 호출 시 서버 `Origin` 화이트리스트에 `dev.yonza.co.kr` 추가 |
| 운영과 분리 | dev 전용 키·설정 사용 |

---

## 6. 배포·운영 요약

| 구분 | 운영 | 개발 |
|------|------|------|
| 도메인 | `yonza.co.kr`, `ssangssang.co.kr` | `dev.yonza.co.kr` |
| 키 | 운영용(도메인별 구분) | dev 전용 저비용 키 |
| `webmcp.js` | 공용 (동일) | 공용 (동일) |
| 프록시 `SITE_CONFIG` | 운영 항목 | dev 항목 별도 |
| SSL | 필수 (HTTPS) | 로컬 `mkcert` |

### 체크리스트
- [ ] 공용 `webmcp.js`는 키를 안 들고 프록시 호출만 하는가
- [ ] 프록시에 도메인별 `SITE_CONFIG`(키·쿼터·Rate Limit) 존재
- [ ] `gemini-key.js` 클라이언트에서 제거
- [ ] 토큰 서브도메인 일치 → `dev.yonza.co.kr`에서 WebMCP/내장 AI 동작
- [ ] `manifest.json`에 `dev.yonza.co.kr` 포함
- [ ] 프록시 `Origin` 화이트리스트에 dev·운영 전 도메인 포함
- [ ] Rate Limit 적용 (비용 폭주 방지)

---

## 7. 결론

| 관점 | 설계 |
|------|------|
| 확장 → 위젯 | Chrome 전용 API 제거, `window.WebMCPConfig` 직접 접근 |
| 키 보안 | 프록시 서버에서만 보관·호출 (암호화는 무의미) |
| 멀티도메인 | 공용 `webmcp.js` + 서버 `SITE_CONFIG`로 도메인별 구분 |
| 개발환경 | `dev.yonza.co.kr` 서브도메인 + 로컬 HTTPS(`mkcert`) |
| 보호장치 | Origin 판별 + Rate Limit (필수 세트) |
