# 연애의 자격 AI 비서
Version: 2.1.0 (내부 알파 build 200)

연애의 자격 AI 비서는 WebMCP 기반으로 연애의 자격 서비스의 핵심 정보를 빠르게 확인하고, Chrome 내장 AI와 연동해 상담·진단·서비스 안내를 한 번에 도와주는 확장 프로그램입니다. Chrome 내장 AI가 지원될 경우 자연어 질문을 이해해 적절한 도구를 자동으로 호출하고, 지원되지 않는 환경에서는 키워드 기반 fallback으로 안정적으로 동작합니다.

> 현재 이 확장 프로그램은 **알파 테스트 단계**입니다. WebMCP는 Google Chrome/브라우저 환경에서 실험적 기능으로 제공되는 **베타 상태**의 기술로 동작할 수 있으며, 브라우저/플랫폼/버전별 지원 범위가 달라질 수 있습니다.

### 빌드 버전 규칙
- Chrome manifest 버전: `0.x.y.z` 형식만 허용 (예: `0.1.1.3`, `0.2.0.0`)
- 내부 문서용 알파 표기: `0.2.0-alpha.000`
- **메이저·마이너 업데이트**(기능 추가/구조 변경) 시 앞자리를 올립니다.
  - 예: `0.1` → `0.2` (별도 창 전환, UI/입력 개선)
- 매 빌드마다 마지막 숫자는 +1 증가
- 예: `0.2.0.0` → `0.2.0.1` → `0.2.0.2`

### Google 공식 입장 반영
- WebMCP / Prompt API / on-device model 계열 기능은 실험적 기능이며,
- 모든 환경에서 동일하게 지원되는 것은 아닙니다.
- 따라서 이 확장은 **내장 AI 미지원 시 키워드 기반으로 WebMCP 도구를 직접 호출**하는 방식으로 동작합니다.

## 연애의 자격 AI 비서

연애의 자격 서비스의 주요 정보를 빠르게 확인하고, Chrome 내장 AI(구글 제미나이 나노)를 활용해 상담 및 진단 관련 질문을 보다 편리하게 처리할 수 있습니다.

### Chrome Web Store용 문구

**짧은 설명**
연애의 자격 WebMCP 기반 AI 비서. 서비스 정보, 상담사 정보, 진단을 빠르게 확인하고 Chrome 내장 AI와 함께 사용할 수 있습니다.

**긴 설명**
연애의 자격 AI 비서는 WebMCP를 통해 연애의 자격 사이트의 핵심 정보를 빠르게 조회하고, Chrome 내장 AI(제미나이 나노)가 지원될 경우 자연어 질문을 기반으로 적절한 도구를 자동 호출합니다. 서비스 소개, 상담사 정보, 진단 제출과 같은 흐름을 한 번에 사용할 수 있어, 사용자가 웹페이지를 더 빠르게 이해하고 필요한 기능을 바로 실행할 수 있도록 돕습니다.

내장 AI가 지원되지 않는 환경에서는 키워드 기반 fallback 로직으로 WebMCP 도구를 직접 호출하므로, 기능이 안정적으로 유지됩니다. 알파 테스트 단계에서 운영되며, 브라우저의 실험 기능 지원 여부에 따라 동작 범위가 달라질 수 있습니다.

### 현재 상태
- 상태: 알파 테스트
- WebMCP: 베타/실험적 기능 기반
- 내장 AI: 선택적 사용, 미지원 시 자동 fallback
- 지원 방식: 인라인 플래그 활성화 + 키워드 기반 툴 호출
- UI 방식: **별도 창(window)** 기반 (화면 전환에도 유지)

### Google 공식 입장 반영
- 일부 Chrome/AI 기능은 실험 플래그를 통해 활성화해야 합니다.
- 지원 여부는 Chrome 버전, 운영체제, 기기 성능, 모델 다운로드 상태에 따라 달라집니다.
- 따라서 확장 프로그램은 **내장 AI가 없더라도 WebMCP 툴 자체를 직접 호출하는 fallback 로직**을 유지합니다.

## ✨ 기능

| 기능 | 설명 |
|---|---|
| 🪟 **별도 창 실행** | 툴바 아이콘 클릭 시 화면 전환에도 닫히지 않는 별도 창으로 열리며, ✕ 버튼으로만 닫힙니다. |
| 📡 **WebMCP 툴 조회** | 현재 페이지에서 WebMCP로 등록된 tool(`yonja.*`) 목록을 자동 감지해 표시합니다. |
| 💬 **자연어 질문 → 툴 호출** | Chrome 내장 AI(제미나이 나노)가 질문을 분석해 적절한 WebMCP 툴을 자동 호출합니다. |
| 🔁 **키워드 폴백 라우팅** | 내장 AI가 없으면 키워드 기반으로 `service`/`consultant`/`diagnosis` 툴을 직접 호출합니다. |
| 🏷️ **배지 표시** | 툴바 아이콘에 등록된 툴 개수를 표시합니다. |
| 🌐 **올바른 탭 감지** | 별도 창에서도 마지막으로 본 일반 웹 탭의 WebMCP 상태를 정확히 인식합니다. |
| ⌨️ **한국어 IME 안정성** | 한글 조합 중 Enter가 잘못 제출되지 않아 메시지가 분리되는 것을 방지합니다. |

등록된 툴:
- `yonja.service.get_info` — 서비스 정보(가격/구성) 조회
- `yonja.consultant.get_info` — 상담사 정보 조회
- `yonja.diagnosis.submit` — 재회 가능성 진단 제출

## 📦 파일 구조

```
webmcp-extension/
├── manifest.json       # 확장 설정 (MV3, 별도 창 + windows 권한)
├── background.js       # 서비스 워커 (배지 표시, 별도 창 생성/관리)
├── content.js          # 페이지의 WebMCP API와 통신
├── popup.html          # AI 비서 UI (닫기 버튼 포함)
├── popup.js            # AI 비서 로직 (내장 AI + Gemini + WebMCP)
├── gemini-key.js       # Gemini API 키 저장 (로컬 전용 · GitHub에는 없음) ※ 아래 "🔑 Gemini API 키 설정" 참고
├── HISTORY.md          # 변경 이력 (버전별 변경 사항)
└── icons/              # 아이콘 (16/48/128)
```

> 📌 `gemini-key.js`는 **`.gitignore`에 등록되어 GitHub에 커밋되지 않습니다.** 새로 클론한 환경에서는 [🔑 Gemini API 키 설정](#-gemini-api-키-설정-gemini-keyjs)을 참고해 직접 만들어 주세요.

## 🚀 설치 방법

1. **로컬 서버 실행** (WebMCP 툴이 노출된 페이지 필요)
   ```bash
   cd /Users/ilyoungkim/Projects/webMCP_luvd
   python3 -m http.server 8000
   ```
   브라우저에서 `http://localhost:8000/yonja.html` 접속.

2. **확장 프로그램 로드**
   - Chrome 주소창에 `chrome://extensions` 입력
   - 우측 상단 **개발자 모드** 켜기
   - **압축해제된 확장 프로그램을 로드합니다** 클릭
   - `webmcp-extension/` 폴더 선택

   > ⚠️ Chrome은 `_`로 시작하는 파일/폴더명(`__pycache__` 등)을 거부합니다.
   > Python 스크립트 실행 후 로드 오류가 나면 아래를 실행한 뒤 다시 로드하세요.
   > ```bash
   > python3 webmcp-extension/build_extension.py --clean-only
   > # 또는
   > rm -rf webmcp-extension/__pycache__
   > ```

3. **사용**
   - `yonja.html`이 열린 탭에서 툴바의 💘 아이콘 클릭
   - **별도 창**으로 AI 비서가 열립니다. 화면을 전환해도 닫히지 않습니다.
   - 질문 입력 후 **AI 분석 실행** 클릭
   - 닫을 때는 헤더 우측의 **✕ 닫기 버튼**을 클릭

## 🤖 Chrome 내장 AI 사용

이 확장은 **Chrome 내장 Gemini Nano**(`window.LanguageModel`)를 우선 사용합니다.

- **지원 확인**: Chrome 최신 버전 및 `chrome://flags`에서 내장 AI 활성화
  - `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**
  - `chrome://flags/#optimization-guide-on-device-model` → **Enabled BypassPerfRequirement** (로컬 모델 다운로드)
- 내장 AI가 **없으면 자동으로 키워드 기반 폴백**으로 동작합니다.
- 헤더의 상태 배지에서 내장 AI 활성 상태를 확인할 수 있습니다.

> ⚠️ 내장 AI API는 아직 실험적입니다. Chrome 버전에 따라 AI 상태가 "미지원"으로 나올 수 있으며, 그 경우에도 WebMCP 툴 직접 호출은 정상 동작합니다. Gemini API 키가 있으면 `gemini-key.js`의 `GEMINI_API_KEY`에 입력해 안정적으로 사용할 수 있습니다.

## 🔑 Gemini API 키 설정 (`gemini-key.js`)

이 확장은 **Gemini API 키를 공개 저장소(GitHub)에 올리지 않기 위해** `gemini-key.js` 파일을 별도로 분리해 두었습니다.

> ⚠️ **중요**: `gemini-key.js` 파일은 보안상 **GitHub에 커밋되지 않습니다.**
> - 해당 위치(`https://github.com/ilyoungkim/webmcp_luvd/tree/master/webmcp-extension`)에는 `gemini-key.js`가 **존재하지 않습니다**.
> - 이는 의도된 동작입니다. 키가 공개되면 악용될 수 있으므로 로컬에서만 관리해야 합니다.
> - 프로젝트 루트의 `.gitignore`에 `webmcp-extension/gemini-key.js`가 등록되어 있어 자동으로 제외됩니다.

### Gemini API 키를 만들고 사용하는 방법

#### 1. API 키 발급 (무료)
1. [Google AI Studio](https://aistudio.google.com/) 접속 → Google 계정 로그인
2. 화면 왼쪽 메뉴에서 **"Get API key"**(또는 설정 → API 키) 클릭
3. **"Create API key"** 클릭 → 무료 키가 생성됩니다.
4. 생성된 키를 복사합니다. (형식 예: `AIza...`)

#### 2. 로컬 파일에 키 입력
`webmcp-extension/gemini-key.js` 파일을 열고 `GEMINI_API_KEY` 값을 방금 발급받은 키로 교체합니다.

```js
// gemini-key.js
// ─────────────────────────────────────────────
// ⚠️ 이 파일은 절대 GitHub에 커밋하지 마세요!
//    .gitignore에 등록되어 로컬에서만 관리됩니다.
// ─────────────────────────────────────────────
const GEMINI_API_KEY = '여기에_발급받은_API_키를_입력';
```

> 📌 **이 파일은 GitHub에 없는 파일이므로**, 새로 클론(clone)한 환경에서는 직접 만들어 주어야 합니다. 위 예제 내용으로 `gemini-key.js`를 생성하면 됩니다.

#### 3. 확장 프로그램 다시 로드
1. `chrome://extensions` 이동
2. 확장 프로그램에서 **새로고침** 아이콘 클릭
3. AI 비서를 열면 **Gemini API 우선 사용**으로 동작합니다.

### 키 동작 우선순위
```
① Gemini API 키 있음 → Gemini API 사용 (가장 안정적, 모든 Chrome에서 동작)
② 없으면 Chrome 내장 AI (window.LanguageModel)
③ 그 외 키워드 기반 폴백 라우팅
```

## 🔧 동작 방식

```
[AI 비서 질문]  (별도 창)
   │
   ▼
① Gemini API 키 있으면 → askGemini
② 없으면 Chrome 내장 AI (window.LanguageModel)
③ 그 외 키워드 기반 폴백 라우팅
   │
   ▼
chrome.scripting.executeScript(MAIN world) → 페이지의 WebMCPConfig.getData 호출
   │
   ▼
결과 반환 → AI 비서 표시
```
