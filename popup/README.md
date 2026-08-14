# popup/ — 웹 위젯(인라인 팝업) AI 비서

Chrome 확장(`webmcp-extension/`) 전용 AI 비서를 **일반 웹페이지 위젯(인라인 팝업)** 으로 전환한 버전입니다.
이 디렉토리는 서버(프록시) 없이 **팝업 기능만으로 WebMCP가 실제 동작하는지** 검증하는 개발 가능성 테스트를 중심으로 구성되어 있습니다.

---

## 1. 한눈에 보기

| 항목 | Chrome 확장 (`webmcp-extension/`) | 웹 위젯 (`popup/`) |
|------|----------------------------------|---------------------|
| 실행 방식 | 브라우저 툴바 아이콘 → 팝업/별도 창 | 페이지 안에 삽입된 플로팅 버튼(💬) |
| 배포 | 확장 프로그램 설치(Chrome Web Store 등) | `<script>` 태그 삽입만으로 즉시 동작 |
| 페이지 접근 | content script + `chrome.scripting` 우회 | 같은 origin → `window.WebMCPConfig` 직접 접근 |
| 탭/창 관리 | `chrome.tabs`, `chrome.windows`, `chrome.action` | 불필요 (페이지 자체가 대상) |
| 스토리지 | `chrome.storage.local` | `localStorage` |
| AI 모델 | 팝업(신뢰 컨텍스트)에서 내장 AI 접근 | `window.LanguageModel`(Origin Trial) |
| Gemini 키 | `gemini-key.js` (확장 내부) | `gemini-key.js` 전역 상수 / 사용자 입력 `localStorage` |
| background / content | 필수 (`background.js`, `content.js`) | ❌ 불필요 |

---

## 2. 파일 구성

```
popup/
├── test.html    # 🧪 WebMCP 개발 가능성 테스트 해리니스 (권장 시작점)
├── popup.html   # 위젯 마크업 (독립 실행용 스캐폴드)
├── popup.css    # 위젯 스타일 (.wmcp- 접두어 → 페이지 충돌 방지)
├── popup.js     # 위젯 로직 + WebMCP 툴 executor + 테스트 패널
└── README.md
```

### 각 파일의 역할

| 파일 | 역할 |
|------|------|
| `test.html` | `WebMCPConfig` → `webmcp.js` → `popup.js` 순서로 로드. 테스트 전용 페이지 |
| `popup.html` | 위젯을 독립 실행하기 위한 정적 마크업. `popup.js`가 자동 마운트 |
| `popup.css` | 위젯 UI. 모든 선택자가 `.wmcp-` 접두어 → 페이지 스타일과 충돌 방지 |
| `popup.js` | 위젯 로직. `#webmcp-widget` 자동 생성, WebMCP 툴 실행, 테스트 패널 포함 |

---

## 3. Chrome 확장 vs 웹 위젯 — 상세 차이점

### 3-1. 실행 구조 (핵심 차이)

**Chrome 확장**은 팝업이 페이지와 **격리된 컨텍스트**입니다.
- 팝업(`popup.js`)은 `chrome-extension://` origin에서 실행
- 페이지의 `window.WebMCPConfig`에 직접 접근 불가
- 그래서 `content.js`(isolated world) + `chrome.scripting.executeScript({ world: 'MAIN' })`로 **우회**해야 함
- 대상 탭을 `getTargetTab()`으로 찾고, `chrome.tabs.sendMessage`로 통신

**웹 위젯**은 페이지와 **같은 origin**에서 실행됩니다.
- `window.WebMCPConfig`, `navigator.modelContext`를 **그냥 직접 접근** 가능
- 탭 탐색·스크립트 주입·메시지 전달이 전부 불필요 → 훨씬 단순
- `background.js`, `content.js`가 필요 없음

```
Chrome 확장 (복잡한 우회)
  popup.js ──chrome.tabs.sendMessage──▶ content.js ──executeScript(world:MAIN)──▶ window.WebMCPConfig
  popup.js ──chrome.scripting.executeScript(world:MAIN)──▶ window.WebMCPConfig   (직접 우회)

웹 위젯 (직접 접근)
  popup.js ──▶ window.WebMCPConfig   (같은 origin이라 그냥 접근)
```

### 3-2. 제거된 Chrome 전용 API

| 확장 코드 | 위치 | 웹 위젯 대체 |
|-----------|------|--------------|
| `chrome.windows.getCurrent()` | `popup.js` | `window` 직접 사용 |
| `chrome.tabs.query()` | `popup.js` | 페이지가 곧 대상 |
| `chrome.tabs.sendMessage()` | `popup.js` | 직접 함수 호출 |
| `chrome.scripting.executeScript(world:'MAIN')` | `popup.js` | `window.WebMCPConfig` 직접 접근 |
| `chrome.tabs.create({url})` | `popup.js` | `window.open(url, '_blank', 'noopener')` |
| `chrome.storage.local` | `popup.js` | `localStorage` |
| `chrome.runtime.onInstalled` | `background.js` | 불필요 |
| `chrome.tabs.onActivated/onUpdated` + 배지 | `background.js` | 불필요 |
| `chrome.action` (툴바 아이콘/배지/창) | `background.js` | 💬 플로팅 버튼 |
| content script 통신 | `content.js` | 불필요 |

### 3-3. 함수 매핑 (popup.js)

| 확장 함수 | 웹 위젯 함수 | 비고 |
|-----------|--------------|------|
| `getTargetTab()` | ❌ 제거 | 탭 탐색 불필요 |
| `sendMessageToTab()` | ❌ 제거 | 메시지 전달 불필요 |
| `queryWebMCP()` | `queryWebMCP()` | Config 직접 읽음 |
| `invokeTool()` | `executeTool()` | `getData()` 직접 실행 (Promise 지원) |
| `queryPageInfo()` | `queryPageInfo()` | Config 직접 읽음 |
| `detectBuiltinAI()` | `detectBuiltinAI()` | 유지 |
| `askBuiltinLanguageModel()` | `askBuiltinLanguageModel()` | tools 배열 전달 **제거** → modelContext 자동 연동 |
| `askGemini()` | `askGemini()` | 키 소스가 `getApiKey()`로 확장 |
| `hasGeminiKey()` | `hasGeminiKey()` | `gemini-key.js` 상수 + 사용자 입력 모두 지원 |

---

## 4. 주요 기능

### 4-1. WebMCP 툴 통합

`popup.js`는 `window.WebMCPConfig.items`를 직접 읽어 툴을 열거·실행합니다.

- **`listTools()`**
  - 최우선: `navigator.modelContext.tools()` (표준 API)
  - 미지원 시: `window.WebMCPConfig.items`에서 툴 이름 파생 (폴백)
- **`executeTool(name, args)`**
  - `WebMCPConfig.items`에서 이름(`siteNs.group.name`) 매칭
  - `getData()`를 직접 실행 → 정적 객체 또는 Promise 결과 반환
  - `diagnosis.submit`처럼 async 함수도 지원

> **중요** — 내장 AI 세션(`LanguageModel.create`)에는 `tools` 배열을 넘기지 않습니다.
> WebMCP 툴은 `modelContext.registerTool()`로 등록하면 세션에 **자동으로** 노출되며,
> `create({ tools })`에 임의 형식 배열을 넘기면 오히려 세션이 깨질 수 있습니다. (이전에 `.`만 찍히는 버그 원인)

### 4-2. Gemini 키 처리 (`gemini-key.js` 지원)

`getApiKey()`는 아래 우선순위로 키를 반환합니다.

1. 사용자가 위젯 "⚙️ 동작 방식"에서 직접 입력한 키 → `localStorage` (`webmcp.gemini.apiKey`)
2. `gemini-key.js`에 정의된 전역 상수 `GEMINI_API_KEY`

`test.html`/`popup.html`은 `popup.js` **이전에** `gemini-key.js`를 로드합니다.
```html
<script src="../webmcp-extension/gemini-key.js"></script>
<script src="./popup.js"></script>
```

### 4-3. AI 호출 우선순위

1. **Gemini API 키** (`gemini-key.js` 또는 사용자 입력)
   - 온디바이스 모델이 없는 환경(Chromium 등)에서는 내장 AI가 echo만 하므로 키 호출이 안정적
2. **내장 AI** (`window.LanguageModel`)
   - `modelContext.registerTool`로 등록된 WebMCP 툴 자동 연동
3. **안내 메시지** (둘 다 없을 때)

### 4-4. WebMCP 테스트 패널

위젯 하단 "🧪 WebMCP 테스트" 아코디언에서 4가지 검증 수행:

| 버튼 | 검증 내용 |
|------|-----------|
| ① modelContext 확인 | WebMCP API 존재 여부 + `LanguageModel`/`WebMCPConfig` 유무 |
| ② 등록된 툴 열거 | `navigator.modelContext.tools()` (미지원 시 Config에서 파생) |
| ③ 툴 직접 호출 | `yonja.service.get_info` 실행 결과 확인 |
| ④ 내장 AI 툴 호출 | 내장 AI가 툴을 자동 호출하는지 (핵심 검증) |

결과는 테스트 패널 하단의 JSON `<pre>`에 표시됩니다.

---

## 5. 페이지에 붙이는 방법

```html
<!-- ① WebMCPConfig를 반드시 webmcp.js보다 먼저 정의 -->
<script>
  window.WebMCPConfig = { siteNs: 'yonja', lang: 'ko', items: [ ... ] };
</script>
<script src="/js/webmcp.js"></script>

<!-- ② (선택) Gemini 키 -->
<script src="/webmcp-extension/gemini-key.js"></script>

<!-- ③ 위젯 -->
<link rel="stylesheet" href="/popup/popup.css" />
<script src="/popup/popup.js"></script>
```

`popup.js`는 문서 끝에서 `#webmcp-widget` 컨테이너를 자동 생성하고 위젯 DOM을 마운트합니다.
마운트 위치를 지정하려면 미리 `<div id="webmcp-widget"></div>`를 두면 됩니다.

---

## 6. 개발 가능성 테스트 실행

### 1) Chrome 설정
- 최신 Chrome
- `chrome://flags` → **"Web Model Context"**(modelContext) **Enabled** → 재시작
- (내장 AI 테스트용) 내장 AI/LanguageModel 모델 다운로드 가능 환경

### 2) 로컬 서버
```bash
cd /Users/ilyoungkim/Projects/webMCP_luvd
python3 -m http.server 8000
```
브라우저 → `http://localhost:8000/popup/test.html`

### 3) 확인
- 우측 하단 💬 → 위젯 열기 → "🧪 WebMCP 테스트"에서 ①~④ 실행
- 또는 채팅에 질문 입력 → Gemini/내장 AI 응답 확인

---

## 7. 알려진 제약 & 주의사항

| 항목 | 내용 |
|------|------|
| 내장 AI 컨텍스트 한도 | 내장 모델은 입력이 큼 → **간결한 프롬프트**(`builtinSystemPrompt`) 사용. 긴 지식 베이스를 넣으면 `The input is too large` 오류 |
| 온디바이스 모델 부재 | 모델 없는 Chromium에서는 `window.LanguageModel`이 **입력을 그대로 echo** → Gemini 키 권장 |
| `navigator.modelContext` 없음 | 콘솔에 "WebMCP 지원 안 함" 경고. 플래그/HTTPS 필요 |
| `localhost` Origin Trial | 내장 AI 토큰이 localhost에서 비활성화 → `dev.yonza.co.kr` + `mkcert` HTTPS 권장 (설계안 5장) |
| Gemini 키 노출 | `gemini-key.js` 키가 브라우저에 노출됨 → **개발/테스트 전용**. 운영 시 서버 프록시로 이전 필요 |
| CSP | 페이지의 Content-Security-Policy가 인라인 스크립트/스타일을 막을 수 있음 (설계안 2-5) |
| Gemini CORS | 브라우저 직접 호출 시 `Access-Control-Allow-Origin` 허용 필요 |

---

## 8. 배포(운영 전환) 시 할 일

- [ ] 서버 프록시(`PROXY_ENDPOINT`) 도입 → 키를 브라우저에서 제거 (설계안 3장)
- [ ] 프록시 `Origin` 화이트리스트에 운영·개발 도메인 포함 (설계안 4-1)
- [ ] Rate Limit 적용 (비용 폭주 방지, 설계안 4-1-0)
- [ ] 페이지 CSP 확인 (인라인 스크립트/스타일 허용)
- [ ] `gemini-key.js`를 공개 저장소에 커밋하지 않도록 `.gitignore` 처리

---

## 9. 설계 문서 연결

본 위젯은 [`popup_agent_html.md`](../popup_agent_html.md) 설계안을 구현한 것입니다.
멀티도메인(`yonza.co.kr`, `ssangssang.co.kr`), 개발환경(`dev.yonza.co.kr`), 서버 프록시·Rate Limit 등
운영 설계는 해당 문서를 참고하세요.

