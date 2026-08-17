# 연애의 자격 AI 비서

WebMCP 기반으로 연애의 자격 서비스의 핵심 정보를 빠르게 확인하고, Gemini AI와 연동해 상담·진단·서비스 안내를 한 번에 도와주는 확장 프로그램입니다.

## 프로젝트 개요

이 프로젝트는 연애의 자격 웹사이트에서 노출되는 WebMCP 도구를 활용해, 사용자가 필요한 정보를 더 빠르게 찾고 실행할 수 있도록 돕는 확장 프로그램입니다.

- 서비스 정보 조회
- 상담사 정보 조회
- 진단 제출
- Gemini AI 연동 (내장 Gemini Nano / Gemini API 이중 지원)
- AI 미지원 시 안내 표시

## 주요 기능

### 1. WebMCP 도구 연결
- `yonja.service.get_info`
- `yonja.consultant.get_info`
- `yonja.diagnosis.submit`

### 2. Gemini AI 우선 활용 (이중 구조)
질문하기는 아래 순서로 진짜 AI 답변을 받습니다.

| 순위 | 방식 | 조건 |
|------|------|------|
| 1순위 | **내장 AI** (`window.LanguageModel`) | 최신 Chrome Dev/Canary + 내장 모델 설치 |
| 2순위 | **Gemini API** (REST 호출) | `gemini-key.js`에 API 키 저장 |
| 안내 | 둘 다 없을 때 | 활성화 방법 표시 |

- 내장 AI는 `temperature`/`topK` sampling 파라미터를 사용 (Prompt API Sampling Parameters 토큰 필요)
- Gemini API는 `gemini-2.0-flash` 모델을 REST 호출

## Origin Trial 토큰

WebMCP 및 내장 AI 실험 기능을 활성화하기 위해 아래 토큰을 등록했습니다.

### WebMCP 토큰
- **오리진**: `https://yonza.co.kr:443` (서브도메인 일치, 서드파티)
- **유효 기간**: Chrome 156까지, **2026-11-17** 만료
- **적용 위치**: `yonja.html`, `diagnosis.html`의 `<head>`에 `<meta http-equiv="origin-trial">`

### Prompt API Sampling Parameters 토큰
- **오리진**: `https://yonza.co.kr:443` (서브도메인 일치)
- **유효 기간**: Chrome 153까지, **2026-10-06** 만료
- **용도**: 내장 Gemini Nano의 `temperature`/`topK` sampling 파라미터 활성화

> ⚠️ 토큰은 등록된 도메인(`yonza.co.kr`)에서만 유효합니다. `localhost`에서는 비활성화됩니다.

## 구조

- `js/webmcp.js`: **WebMCP 표준 라이브러리** — `navigator.modelContext.registerTool()`로 AI 에이전트가 호출 가능한 tool 등록. `window.WebMCPConfig`로 설정 주입, `WebMCP.registerItem()` 동적 확장 지원
- `html/yonja.html`: 연애의 자격 페이지 예시
- `html/diagnosis.html`: 진단 페이지 예시
- `webmcp/front/`: AI 비서 웹 위젯 (프록시 연동)
  - `webmcp.js` — 프록시 통신 라이브러리
  - `widget.js` — 위젯 로더 (webmcp-widget.js 동적 로드)
  - `webmcp-widget.js` — 공통 위젯 UI 라이브러리
  - `widget.css` — 위젯 스타일 (CSS 변수 기반 테마 + 모바일 반응형)
  - `hospital-config.js` — 생생병원 사이트 설정
  - `yonja-config.js` — 연애의자격 사이트 설정
  - `hospital.html` — 생생병원 데모 페이지 (viewport meta 포함)
  - `index.html` — 위젯 인덱스 페이지 (viewport meta 포함)
- `webmcp/backend/`: WebMCP 백엔드 프록시 (FastAPI + MariaDB)
  - `app.py` — 멀티테넌트 Gemini 프록시
  - `init.sql` — DB 스키마 (tenants, request_logs)
  - `webmcp_standalone.conf` — nginx(8081) 설정
  - `webmcp-backend.service` — systemd 서비스
- `webmcp/dashboard/`: WebMCP 백엔드 DB 대시보드 (Streamlit)
  - `app.py` — 대시보드 메인 (요청 분석, 테넌트 설정, 차단 로그)
  - `db.py` — DB 접속 및 쿼리 헬퍼
  - `run.sh` — 실행 스크립트
  - `requirements.txt` — 의존성
  - `.env.example` — DB 접속 설정 예시
- `webmcp-extension/`: Chrome 확장 프로그램
  - `manifest.json`
  - `popup.html`
  - `popup.js`
  - `content.js`
  - `background.js`
  - `gemini-key.js` — Gemini API 키 (⚠️ 절대 커밋 금지, `.gitignore`에 등록됨)
  - `build_extension.py`
  - `bump_version.py`

### JS 파일 구조 검토 (2026-08-15)

프로젝트에는 **3개 영역**에 걸쳐 총 **9개**의 JS 파일이 있습니다.

#### ① `webmcp/front/` — 웹 위젯 (사이트에 붙이는 프론트엔드)

| 파일 | 크기 | 역할 |
|------|------|------|
| `webmcp.js` | 41줄 | **통신 계층** — Gemini 키를 직접 들고 있지 않고, 모든 질문을 백엔드 프록시(`POST /api/chat`)로 전송. `window.WebMCP.callGeminiViaProxy()` 노출 |
| `widget.js` | 57줄 | **로더(래퍼)** — `webmcp-widget.js`를 동적으로 로드. `WebMCPWidgetLoaded` 플래그로 중복 로드 방지 |
| `webmcp-widget.js` | 315줄 | **UI 계층** — 위젯 전체 로직(마크다운 렌더링, 픽스 pill, 상태 배지, 아코디언, 테마 CSS 변수 주입) |
| `hospital-config.js` | 499줄 | **생생병원 설정** — `WebMCPConfig`(theme, names, items) + `HOSPITAL_SYSTEM_PROMPT` |
| `yonja-config.js` | 152줄 | **연애의자격 설정** — `WebMCPConfig` + `YONJA_SYSTEM_PROMPT` |

> **3계층 구조**: `webmcp.js`(통신) + `widget.js`(로더) + `webmcp-widget.js`(UI) → 사이트마다 `webmcp.js` + `widget.js`만 붙이면 재사용 가능

#### ② `js/` — WebMCP 표준 라이브러리

| 파일 | 크기 | 역할 |
|------|------|------|
| `webmcp.js` | 462줄 | **WebMCP(Web Model Context Protocol) 표준 라이브러리** — `navigator.modelContext.registerTool()`로 AI 에이전트가 호출 가능한 tool 등록. `window.WebMCPConfig`로 설정 주입, `WebMCP.registerItem()` 동적 확장 지원 |

> ⚠️ `js/webmcp.js`와 `webmcp/front/webmcp.js`는 **이름은 같지만 완전히 다른 역할**입니다. 전자는 WebMCP 표준 tool 등록, 후자는 백엔드 프록시 통신.

#### ③ `webmcp-extension/` — Chrome 확장 프로그램

| 파일 | 크기 | 역할 |
|------|------|------|
| `background.js` | 79줄 | **서비스 워커** — 탭 배지 갱신, 별도 팝업 창 관리 |
| `content.js` | 163줄 | **콘텐츠 스크립트** — 페이지의 WebMCP tool 조회/호출, 페이지 정보 스냅샷 |
| `popup.js` | 725줄 | **팝업 UI 로직** — 채팅, 내장 AI(`window.LanguageModel`) 우선 → Gemini API → 키워드 폴백 라우팅 |
| `gemini-key.js` | 6줄 | **API 키 보관** — `GEMINI_API_KEY` 상수 (⚠️ 공개 저장소 커밋 금지) |

#### 🔍 주요 관찰 사항

1. **시스템 프롬프트 중복**: `yonja-config.js`의 `YONJA_SYSTEM_PROMPT`와 `popup.js`의 `askBuiltinLanguageModel`/`askGemini` 내부에 **동일한 지식 베이스가 3번 중복**되어 있습니다. (유지보수 시 동기화 필요)
2. **`popup.js`의 `keywordPlan()`** 함수가 정의되어 있으나 실제 `handleAsk()`에서는 **호출되지 않음** — 미사용 코드로 보입니다.
3. **`gemini-key.js`에 실제 키가 하드코딩**되어 있어 보안상 주의가 필요합니다.
4. **`js/webmcp.js`의 기본값**은 `hospital` 도메인 예시지만, 실제 데이터는 `hospital-config.js`/`yonja-config.js`에서 주입됩니다.

## 설치 방법

1. 로컬 서버 실행
   ```bash
   cd /Users/ilyoungkim/Projects/webMCP_luvd
   python3 -m http.server 8000
   ```

2. 브라우저에서 페이지 접속
   ```text
   http://localhost:8000/yonja.html
   http://localhost:8000/diagnosis.html
   ```

3. Chrome 확장 프로그램 로드
   - Chrome 주소창에 `chrome://extensions` 입력
   - 개발자 모드 활성화
   - 압축해제된 확장 프로그램 로드
   - `webmcp-extension/` 폴더 선택

## 🚀 실제 운영 배포 가이드

실제 운영(프로덕션)에 배포하려면 **웹사이트 파일 업로드**와 **Chrome 확장 프로그램 배포** 두 가지가 필요합니다. 아래에서 파일별로 자세히 설명합니다.

### 0. 실제 서버 `https://yonza.co.kr` 배포 (핵심 요약)

이 프로젝트는 실제 운영 도메인 **`https://yonza.co.kr`** 을 기준으로 설계되었습니다. 아래는 그 도메인에 배포할 때의 핵심 사항입니다.

#### ① 배포할 파일 (html 폴더 기준)

```
Nginx 웹 루트 (예: /usr/share/nginx/html 또는 /var/www/html)
├── html/
│   ├── yonja.html      # 연애의자격 메인 페이지 (WebMCPConfig 포함)
│   └── diagnosis.html  # 진단 페이지
└── js/
    └── webmcp.js       # WebMCP 공통 라이브러리 (절대 경로로 참조)
```

> 📌 `webmcp.js`는 **`https://yonza.co.kr/js/webmcp.js`** 에 위치합니다. HTML은 절대 경로(`https://yonza.co.kr/js/webmcp.js`)로 참조하므로, `html/` 폴더와 `js/` 폴더가 서로 다른 위치에 있어도 됩니다.

#### ② 접속 URL

배포 후 접속 주소는 다음과 같습니다.

| 페이지 | URL |
|--------|-----|
| 메인 페이지 | `https://yonza.co.kr/html/yonja.html` |
| 진단 페이지 | `https://yonza.co.kr/html/diagnosis.html` |

> 💡 만약 루트(`https://yonza.co.kr/`)에서 바로 열리게 하려면, `html/` 폴더 안의 `yonja.html`을 Nginx 웹 루트로 옮기거나, Nginx 설정에서 루트 요청을 `html/yonja.html`로 리다이렉트하면 됩니다.

#### ③ Origin Trial 토큰 (실제 도메인에서만 동작)

`yonja.html`의 `<head>`에 등록된 Origin Trial 토큰은 **`https://yonza.co.kr` 도메인에서만 유효**합니다.

- `localhost`에서는 토큰이 비활성화되어 WebMCP 실험 기능이 동작하지 않습니다.
- 실제 도메인에 배포해야 WebMCP 도구가 정상 등록됩니다.
- 토큰 만료일: WebMCP **2026-11-17**, Prompt API **2026-10-06** (만료 전 갱신 필요)

#### ④ 확장 프로그램과의 연결

확장 프로그램(`webmcp-extension/`)의 `manifest.json`에 이미 `https://yonza.co.kr/*` 호스트 권한이 등록되어 있습니다.

```json
"host_permissions": [
  "http://localhost:8000/*",
  "https://yonja.co.kr/*",
  "https://yonza.co.kr/*",
  ...
]
```

따라서 `https://yonza.co.kr/html/yonja.html`을 열면 확장 프로그램이 WebMCP 도구를 감지해 "✅ 연결됨" 상태로 표시됩니다.

#### ⑤ 배포 후 확인 절차

1. 브라우저에서 `https://yonza.co.kr/html/yonja.html` 접속
2. 확장 프로그램 아이콘 클릭 → **"✅ 연결됨"** 확인
3. "서비스 소개", "상담사", "진단 제출" 등 질문 → 정상 응답 확인
4. Chrome DevTools 콘솔에서 WebMCP 도구 등록 로그 확인

> ⚠️ **주의**: `https://yonza.co.kr`에 배포하기 전에 반드시 **HTTPS(SSL 인증서)** 가 적용되어 있어야 합니다. WebMCP Origin Trial과 확장 프로그램 모두 HTTPS를 요구합니다.

### A. 웹사이트(HTML) 배포 — `yonja.html` 예제 기준

운영 서버에 올려야 하는 파일은 **`yonja.html`(html 폴더)과 `webmcp.js`(js 폴더)** 입니다. `webmcp.js`는 WebMCP 도구를 등록하는 공통 라이브러리로, HTML이 절대 경로로 이 파일을 참조합니다.

#### 1) 업로드할 파일 구성

```
Nginx 웹 루트 (예: /usr/share/nginx/html 또는 /var/www/html)
├── html/
│   └── yonja.html      # 연애의자격 메인 페이지 (WebMCPConfig 포함)
└── js/
    └── webmcp.js       # WebMCP 공통 라이브러리 (절대 경로로 참조)
```

> ⚠️ `webmcp.js`는 **`https://yonza.co.kr/js/webmcp.js`** 에 위치합니다. `yonja.html`은 절대 경로(`https://yonza.co.kr/js/webmcp.js`)로 참조하므로, `html/` 폴더와 `js/` 폴더가 분리되어 있어도 정상 동작합니다.

#### 2) `yonja.html`에서 WebMCP를 참조하는 방법

`yonja.html`은 아래 **3가지 요소**로 WebMCP를 활성화합니다. 운영 페이지에도 이 구조를 그대로 유지해야 합니다.

**① `<head>`에 Origin Trial 토큰 등록 (실험 기능 활성화)**

```html
<head>
  <!-- WebMCP 실험 기능 활성화용 Origin Trial 토큰 -->
  <meta
    http-equiv="origin-trial"
    content="여기에_WebMCP_Origin_Trial_토큰_입력"
  />
  <!-- 내장 AI sampling 파라미터용 토큰 (선택) -->
  <meta
    http-equiv="origin-trial"
    content="여기에_Prompt_API_토큰_입력"
  />
</head>
```

> ⚠️ 토큰은 **등록된 도메인**(예: `https://yonza.co.kr`)에서만 유효합니다. `localhost`에서는 동작하지 않습니다.

**② `<head>`에 `WebMCPConfig` 정의 (반드시 `webmcp.js`보다 먼저)**

```html
<head>
  <script>
    window.WebMCPConfig = {
      siteNs: 'yonja',          // 사이트 네임스페이스 (도구 이름 앞에 붙음)
      lang: 'ko',
      debug: true,
      names: {
        service:    { names: ['get_info'], description: '재회·연애 상담 서비스 정보 조회' },
        consultant: { names: ['get_info'], description: '상담사 정보 조회' },
        diagnosis:  { names: ['submit'],   description: '재회 가능성 진단 제출' },
      },
      items: [
        {
          group: 'service',
          name: 'get_info',
          title: '서비스 정보',
          description: '연애의자격에서 제공하는 재회·연애 상담 서비스 정보를 조회합니다.',
          getData: { /* 서비스 정보 데이터 */ },
        },
        // ... consultant, diagnosis 항목 추가
      ],
    };
  </script>
</head>
```

**③ `</body>` 직전에 `webmcp.js` 로드 (module 방식)**

```html
<body>
  <!-- ... 페이지 내용 ... -->

  <!-- WebMCPConfig가 정의된 뒤, 마지막에 webmcp.js를 절대 경로로 로드 -->
  <script type="module" src="https://yonza.co.kr/js/webmcp.js"></script>
</body>
```

> 📌 **순서가 중요합니다.** `WebMCPConfig` → `webmcp.js` 순서로 로드해야 합니다. `webmcp.js`는 페이지가 준비되면 `navigator.modelContext.registerTool`로 `yonja.service.get_info` 같은 도구를 자동 등록합니다.

#### 3) 운영 서버에 올리는 방법 (예시)

**FTP/호스팅 파일 매니저 사용 시**
- `yonja.html`을 `html/` 폴더에, `webmcp.js`를 `js/` 폴더에 업로드
- 브라우저에서 `https://도메인/yonja.html` 접속 확인

**Nginx 서버 예시**
```bash
# 서버에 파일 복사 (Nginx 웹 루트로)
scp html/yonja.html user@server:/usr/share/nginx/html/
scp js/webmcp.js user@server:/usr/share/nginx/js/

# 접속 확인
curl -I https://도메인/yonja.html
```

**GitHub Pages / Netlify / Vercel 사용 시**
- 저장소의 `html/` 폴더와 `js/` 폴더를 그대로 배포
- 정적 호스팅이므로 별도 서버 설정 불필요

### B. Chrome 확장 프로그램 배포

확장 프로그램은 `webmcp-extension/` 폴더를 zip으로 묶어 배포합니다.

#### 1) 빌드 (zip 생성)

```bash
cd webmcp-extension
python3 build_extension.py
```

`builds/` 폴더에 `yonja-ai-assistant-webmcp-v{버전}.zip`이 생성됩니다.

#### 2) 배포 방법 선택

**① Chrome 웹스토어 (공개 배포)**
1. [Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole) 접속
2. "새 항목" → 위에서 만든 zip 업로드
3. 스토어 등록 정보(설명, 스크린샷, 아이콘) 작성
4. 심사 후 공개

**② 사내/테스트 배포 (비공개)**
1. `chrome://extensions` → 개발자 모드
2. "압축해제된 확장 프로그램 로드" → `webmcp-extension/` 폴더 선택
3. 또는 zip을 풀어서 로드

> ⚠️ 확장 프로그램 배포 시 **`gemini-key.js`는 포함하지 마세요.** API 키가 노출됩니다. 배포본에는 키가 없는 상태로 두고, 사용자가 직접 키를 입력하도록 안내하세요.

#### 3) Chrome 웹스토어 배포 상세 가이드 (초보자용)

아래 단계를 순서대로 따라 하시면 됩니다. 처음이라도 10~15분이면 완료할 수 있습니다.

##### ① 개발자 계정 등록 (최초 1회, $5)

1. [Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole) 접속
2. Google 계정으로 로그인
3. **"개발자 등록"** 버튼 클릭
4. **$5 등록비**를 결제합니다. (최초 1회만 내면 됩니다. 이후 갱신 없음)
5. 등록 완료 후 대시보드가 열립니다.

> 💡 **팁**: 등록비는 신용카드/체크카드로 결제됩니다. 회사 계정이면 법인카드로 결제하세요.

##### ② 확장 프로그램 zip 준비

이미 `build_extension.py`로 만든 zip을 사용합니다.

```bash
# 빌드 실행 (버전 자동 증가 + zip 생성)
cd webmcp-extension
python3 build_extension.py

# 생성된 zip 확인
ls -la ../builds/
# → yonja-ai-assistant-webmcp-v0.2.0.1.zip  ← 이 파일을 업로드
```

> ⚠️ **중요**: 업로드 전에 zip 안에 `gemini-key.js`가 **없는지** 반드시 확인하세요.
> ```bash
> unzip -l ../builds/yonja-ai-assistant-webmcp-v0.2.0.1.zip | grep gemini
> # 아무 결과도 없어야 합니다. (gemini-key.js가 없어야 정상)
> ```

##### ③ 새 항목 만들기 (zip 업로드)

1. 대시보드에서 **"새 항목"** 버튼 클릭
2. **"파일 선택"** → 위에서 만든 `yonja-ai-assistant-webmcp-v0.2.0.1.zip` 선택
3. **"업로드"** 클릭
4. 업로드가 완료되면 **"계속"** 클릭

##### ④ 스토어 등록 정보 작성

업로드 후 아래 정보를 입력합니다.

| 항목 | 입력 예시 |
|------|-----------|
| **이름** | 연애의 자격 AI 비서 |
| **요약 (짧은 설명)** | 연애의 자격 WebMCP 기반 AI 비서. 서비스·상담사·진단 정보를 빠르게 확인합니다. |
| **설명 (긴 설명)** | 연애의 자격 AI 비서는 WebMCP를 통해 서비스 정보, 상담사 정보, 재회 진단을 빠르게 조회하고, Chrome 내장 AI 또는 Gemini API로 자연어 질문에 답변합니다. |
| **카테고리** | 생산성 (Productivity) |
| **언어** | 한국어 (ko) |

##### ⑤ 스토어 이미지 업로드

Chrome 웹스토어는 아래 이미지를 요구합니다. **반드시 정확한 크기**로 준비하세요.

| 이미지 | 크기 | 용도 |
|--------|------|------|
| **아이콘 128×128** | 128×128 px | 스토어 목록 아이콘 |
| **스크린샷** | 1280×800 px 또는 640×400 px | 확장 프로그램 미리보기 (최소 1장, 최대 5장) |
| **소형 프로모션 타일** | 440×280 px | 스토어 검색 결과 표시 |
| **마키타일 (선택)** | 1400×560 px | 스토어 메인 배너 |

> 💡 **이미지 준비 팁**: 
> - 스크린샷은 확장 프로그램을 실제로 실행한 화면을 캡처하세요.
> - 아이콘은 `webmcp-extension/icons/icon128.png`를 사용하면 됩니다.
> - 이미지 크기가 다르면 업로드가 거부되므로, [이미지 리사이즈 도구](https://www.iloveimg.com/ko/resize-image) 등을 이용해 정확히 맞추세요.

##### ⑥ 배포 범위 선택

- **공개 (Public)**: 모든 사용자가 스토어에서 검색·설치 가능
- **비공개 (Unlisted)**: 링크가 있는 사람만 설치 가능 (테스트용)
- **개인 (Private)**: 지정한 Google 계정만 설치 가능

> 💡 처음 배포라면 **"비공개(Unlisted)"** 로 먼저 올려 테스트한 뒤, 문제없으면 **"공개(Public)"** 로 전환하는 것을 권장합니다.

##### ⑦ 심사 제출

1. 모든 정보 입력 완료 후 **"심사 요청"** (또는 "게시") 버튼 클릭
2. Chrome 웹스토어 심사가 진행됩니다. (보통 **수시간 ~ 수일** 소요)
3. 심사 통과 시 스토어에 공개됩니다.

> ⚠️ **심사 거절 시**: 이메일로 거절 사유가 옵니다. 대부분 아래 이유입니다.
> - `gemini-key.js`가 포함된 경우 → zip에서 제거 후 재업로드
> - 이미지 크기 오류 → 정확한 크기로 교체
> - 설명에 허위 정보 → 설명 수정

##### ⑧ 업데이트 배포 (버전 올리기)

새 버전을 배포할 때는 **버전을 반드시 올려야** 합니다.

```bash
# 버전 자동 증가 + 새 zip 생성
cd webmcp-extension
python3 build_extension.py
```

1. 대시보드에서 기존 항목 선택
2. **"새 버전 업로드"** → 새 zip 선택
3. 설명/이미지 수정 후 **"심사 요청"**

> ⚠️ **버전 규칙**: Chrome 웹스토어는 **이전보다 높은 버전만** 허용합니다. `build_extension.py`가 자동으로 버전을 올려주므로 그대로 사용하면 됩니다.

### C. 배포 전 체크리스트

- [ ] `webmcp.js`가 `https://yonza.co.kr/js/webmcp.js`에 있는가?
- [ ] `WebMCPConfig`가 `webmcp.js`보다 먼저 로드되는가?
- [ ] Origin Trial 토큰이 운영 도메인에 맞게 등록되어 있는가?
- [ ] `gemini-key.js`가 배포 zip에 포함되지 않았는가?
- [ ] `build_extension.py`로 빌드한 zip이 정상 생성되었는가?
- [ ] 운영 도메인에서 `https://도메인/yonja.html` 접속이 되는가?

## Gemini API 키 설정 (2순위 방식)

Gemini API 키를 사용하면 모든 Chrome에서 진짜 AI 답변을 받을 수 있습니다.

1. `aistudio.google.com` 접속 → Google 로그인
2. "Get API key" → "Create API key"
3. 발급된 키를 `webmcp-extension/gemini-key.js`의 `GEMINI_API_KEY`에 입력
4. 확장 프로그램 다시 로드

> ⚠️ **보안**: `gemini-key.js`는 API 키가 평문으로 저장됩니다. 절대 공개 저장소에 커밋하지 마세요. `.gitignore`에 이미 추가되어 있습니다.

## 🧩 AI 비서 웹 위젯 (WebMCP 프록시 연동)

Chrome 확장 프로그램 없이도 **웹사이트에 AI 비서 위젯을 바로 붙일 수 있는** 방식입니다. 백엔드 프록시가 Gemini 키를 안전하게 보관하므로, 프론트엔드에 키가 노출되지 않습니다.

### 1. 파일 구성 (webmcp/front/)

| 파일 | 역할 | 설명 |
|------|------|------|
| `webmcp.js` | **통신 계층** | Gemini 질문을 백엔드 프록시(`POST /api/chat`)로 전송. `window.WebMCP.callGeminiViaProxy()` 노출 |
| `widget.js` | **로더** | `webmcp-widget.js`를 동적으로 로드하는 얇은 래퍼 (약 1KB) |
| `webmcp-widget.js` | **UI 계층** | 위젯 전체 로직(마크다운 렌더링, 픽스, 상태 배지, 아코디언) |
| `widget.css` | **스타일** | 위젯 스타일. 모든 색상은 CSS 변수(`--wmcp-*`)로 정의 |
| `hospital-config.js` | **사이트 설정** | `WebMCPConfig` + 시스템 프롬프트 (생생병원) |
| `yonja-config.js` | **사이트 설정** | `WebMCPConfig` + 시스템 프롬프트 (연애의자격) |
| `hospital.html` | **데모 페이지** | 위젯 적용 예시 |

> 💡 **3계층 구조**: `webmcp.js`(통신) + `widget.js`(로더) + `webmcp-widget.js`(UI)가 분리되어 있어, 사이트마다 `webmcp.js` + `widget.js`만 붙이면 동일한 AI 비서 위젯을 재사용할 수 있습니다.

### 2. 위젯 적용 방법 (HTML 3줄)

`</body>` 직전에 아래 3개 스크립트를 순서대로 로드하면 됩니다.

```html
<!-- ① 사이트 설정 (WebMCPConfig + 시스템 프롬프트) — 반드시 먼저 -->
<script src="hospital-config.js"></script>
<!-- ② 프록시 통신 라이브러리 -->
<script src="webmcp.js"></script>
<!-- ③ 위젯 로더 (webmcp-widget.js 자동 로드) -->
<script src="widget.js"></script>
```

> ⚠️ **순서가 중요합니다.** `WebMCPConfig`(config) → `webmcp.js` → `widget.js` 순서로 로드해야 합니다. `widget.js`는 `WebMCPConfig`를 읽어 위젯을 구성합니다.

### 3. `WebMCPConfig` 설정 항목 (사이트별)

각 사이트는 `WebMCPConfig` 객체로 위젯의 모든 기능을 설정합니다.

```js
window.WebMCPConfig = {
  siteNs: 'hospital',        // 사이트 네임스페이스 (도구 이름 앞에 붙음)
  lang: 'ko',                // 언어
  debug: true,               // 디버그 로그 출력 여부
  proxyEndpoint: '/api/chat', // 백엔드 프록시 엔드포인트

  // ── 고객 사이트별 색상표 (CSS 변수) ──────────────────────
  // 생략하면 기본 브랜드 색(보라/핑크) 사용. 일부 키만 넣으면 나머지는 기본값.
  theme: {
    primary:     '#0e7490',  // 메인 브랜드 색
    primary2:    '#06b6d4',  // 그라디언트 보조 색
    bg:          '#f0f9ff',  // 패널 바탕색
    surface:     '#ffffff',  // 봇 말풍선/입력바 배경
    text:        '#1f2937',  // 기본 텍스트
    textMuted:   '#6b7280',  // 보조 텍스트
    textFaint:   '#9ca3af',  // 약한 텍스트
    border:      '#e5e7eb',  // 테두리
    codeBg:      '#f3f4f6',  // 코드 블록 배경
    pillBg:      '#cffafe',  // 픽스 칩 배경
    errorBg:     '#fef2f2',  // 오류 말풍선 배경
    errorBorder: '#fca5a5',  // 오류 말풍선 테두리
    errorText:   '#b91c1c',  // 오류 말풍선 텍스트
  },

  // ── 픽스(추천 질문) 버튼 ────────────────────────────────
  // names 의 각 그룹이 위젯 하단의 pill 버튼으로 자동 생성됩니다.
  names: {
    hospital:    { names: ['get_info'], description: '병원 기본정보 조회', label: '병원 정보', question: '병원 정보를 알려줘' },
    doctor:      { names: ['get_info'], description: '의사 정보 조회',     label: '의사 정보', question: '의사 정보를 알려줘' },
    appointment: { names: ['get_current'], description: '진료 예약 안내',  label: '진료 예약', question: '진료 예약은 어떻게 하나요?' },
  },

  // ── WebMCP 도구 데이터 (백엔드가 조회하는 실제 데이터) ────
  items: [
    {
      group: 'hospital',
      name: 'get_info',
      title: '병원 정보',
      description: '병원의 기본 정보를 조회합니다.',
      getData: { name: '생생병원', address: '...', phone: '...' },
    },
    // ...
  ],
};
```

#### `names` 항목별 속성

| 속성 | 설명 | 기본값 |
|------|------|--------|
| `names` | WebMCP 도구 이름 배열 | — |
| `description` | 도구 설명 (AI가 도구 선택에 사용) | — |
| `label` | 픽스 버튼에 표시될 텍스트 | 그룹명 |
| `question` | 픽스 버튼 클릭 시 입력될 질문 | `{그룹} 정보를 알려줘` |

### 4. 위젯 기능 목록

| 기능 | 설명 | 설정 위치 |
|------|------|-----------|
| **플로팅 런처** | 우하단 💬 버튼. 클릭 시 패널 열기/닫기 | `widget.css` `.wmcp-launcher` |
| **헤더 제목** | 사이트별 AI 비서 이름 | `webmcp-widget.js` `siteConfig().title` |
| **상태 배지** | 연결 상태 표시 (✅ 연결됨 / ⚠️ 연결 안 됨) | 자동 (백엔드 `/health` 체크) |
| **픽스 버튼** | 추천 질문 칩. 클릭 시 자동 질문 | `WebMCPConfig.names` |
| **채팅** | 봇/사용자 말풍선, 마크다운 렌더링 | 자동 |
| **입력창** | 텍스트 입력 + 전송 버튼 (Enter 전송) | 자동 |
| **로더** | 답변 생성 중 표시 | 자동 |
| **동작 방식 아코디언** | 위젯 동작 원리 설명 | `webmcp-widget.js` `widgetTemplate()` |
| **색상 테마** | 고객 사이트별 색상표 | `WebMCPConfig.theme` |
| **모바일 반응형** | 화면이 꽉 차도록 위젯 크기 자동 조정 | `widget.css` `@media` |

#### 모바일 반응형 (화면 꽉 차게)

- **768px 이하** (스마트폰·태블릿): AI 비서 패널이 화면 전체(`100vw` × `100dvh`)를 채웁니다. `100dvh`를 사용해 모바일 브라우저 주소창 높이까지 정확히 차며, 테두리(모서리)도 없습니다.
- **769px 이상** (데스크톱): 기존 플로팅 패널(380×600) 유지.

> ⚠️ **중요**: 모바일에서 위젯이 화면을 꽉 채우려면 페이지 `<head>`에 **viewport meta 태그**가 필수입니다. 없으면 모바일 브라우저가 데스크톱 폭(약 980px)으로 렌더링해 위젯이 작게 보입니다.
>
> ```html
> <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
> ```
>
> 💡 위젯 CSS를 수정한 뒤 브라우저 캐시가 문제가 되면, `widget.css` 링크에 버전 쿼리스트링을 붙이세요. 예: `widget.css?v=2`

### 5. 색상 테마 변경 (고객 사이트별)

`WebMCPConfig.theme`에 원하는 색을 넣으면 위젯 전체 색이 즉시 변경됩니다. `webmcp-widget.js`의 `applyTheme()`이 CSS 변수(`--wmcp-*`)로 주입합니다.

```js
// 예: 파란색 계열로 변경
window.WebMCPConfig = {
  theme: {
    primary:  '#1d4ed8',   // 파란색
    primary2: '#3b82f6',
    bg:       '#eff6ff',
    pillBg:   '#dbeafe',
  },
  // ... 나머지 설정
};
```

> 💡 `theme`을 생략하면 기본 브랜드 색(보라/핑크)이 사용됩니다. 일부 키만 넣으면 나머지는 기본값으로 자동 보완됩니다.

### 6. 시스템 프롬프트 (AI 지식 주입)

사이트별 지식을 AI에 주입하려면 전역 변수로 시스템 프롬프트를 정의합니다. `webmcp-widget.js`가 자동으로 감지해 질문 앞에 붙입니다.

```js
// hospital-config.js 에서
window.HOSPITAL_SYSTEM_PROMPT = '당신은 생생병원의 AI 비서입니다. ...';
// 또는
window.YONJA_SYSTEM_PROMPT = '당신은 연애의 자격의 AI 비서입니다. ...';
```

> `webmcp-widget.js`는 `window.YONJA_SYSTEM_PROMPT` 또는 `window.HOSPITAL_SYSTEM_PROMPT`를 자동으로 선택해 사용합니다.

### 7. 백엔드 프록시 (Gemini 키 보안)

위젯은 Gemini 키를 직접 들고 있지 않습니다. 모든 질문은 백엔드 프록시(`POST /api/chat`)로 전송되고, 서버가 `Origin` 헤더로 도메인(테넌트)을 판별해 DB에서 키를 조회합니다.

- **프록시 엔드포인트**: `WebMCPConfig.proxyEndpoint` (기본 `/api/chat`)
- **키 저장**: DB `webmcp.tenants` 테이블 (도메인별)
- **헬스체크**: `/health` 엔드포인트로 연결 상태 확인

### 8. 배포 (원격 서버)

```bash
# 로컬 → 원격 서버로 파일 복사
scp webmcp/front/widget.css webmcp/front/webmcp-widget.js \
    webmcp/front/hospital-config.js user@server:/tmp/

# 서버에서 웹 루트로 이동
ssh user@server 'sudo cp /tmp/widget.css /tmp/webmcp-widget.js \
    /tmp/hospital-config.js /usr/share/nginx/webmcp/'
```

> 💡 브라우저 캐시 때문에 변경사항이 안 보이면, HTML의 `<script src="...?v=N">`의 `v` 값을 올려 새로고침하세요.

## 📊 WebMCP 백엔드 DB 대시보드 (Streamlit)

백엔드(`webmcp/backend/app.py`)가 DB에 저장하는 정보를 시각화하는 Streamlit 대시보드입니다.

- **`tenants`** : 멀티테넌트(도메인별 Gemini 키/한도) 설정
- **`request_logs`** : 요청 로깅 (비정상 접속 감지/분석)

### 실행 방법

```bash
cd webmcp/dashboard

# 1) 의존성 설치
pip install -r requirements.txt

# 2) DB 접속 설정 (.env.example 복사 후 수정)
cp .env.example .env

# 3) 실행 (기본 포트 8501)
./run.sh
# 또는
streamlit run app.py
```

브라우저에서 `http://localhost:8501` 접속합니다.

### 대시보드 탭

| 탭 | 내용 |
|----|------|
| **📈 요청 분석** | 시간대별 요청 수, verdict 분포, 도메인별/IP별 요청 수 |
| **🏢 테넌트 설정** | 테넌트(도메인별 Gemini 키/한도) 목록, 테넌트별 요청 현황 |
| **🚫 차단 로그** | 차단된 요청(401/403/429) 목록, 차단 사유 분포 |
| **📋 전체 로그** | 최근 요청 로그 전체 |

> ⚠️ Gemini API 키는 대시보드에서 **마스킹**되어 표시됩니다. 대시보드는 내부 관리용이므로 외부에 노출하지 마세요.

## Chrome 내장 AI 활성화 (1순위 방식)

다음 플래그를 활성화하면 내장 Gemini Nano를 사용할 수 있습니다.

- `chrome://flags/#prompt-api-for-gemini-nano` → `Enabled`
- `chrome://flags/#optimization-guide-on-device-model` → `Enabled BypassPerfRequirement`

> ⚠️ 내장 AI는 **Chrome Dev/Canary 채널**에서만 지원됩니다. 일반 Chrome(Stable)에서는 플래그를 켜도 동작하지 않습니다.

## 알려진 이슈

### Gemini API 크레딧 (429 오류)
- `429 RESOURCE_EXHAUSTED (prepayment credits depleted)` 에러 발생 시, AI Studio 프로젝트의 크레딧/결제가 소진된 상태입니다.
- 지출 한도 설정만으로는 해결되지 않으며, **새 프로젝트 + 새 API 키 발급** 또는 크레딧 충전이 필요합니다.
- 참고: `gemini-2.0-flash` / `gemini-2.5-flash`는 새 사용자에게 미제공되어 404가 날 수 있습니다.

## Git 커밋 & 푸시 방법

이 저장소(`webmcp_luvd`)의 변경사항을 GitHub에 반영하는 표준 절차입니다.

### 기본 명령어 (커밋 + 푸시)

```bash
# 작업 디렉토리로 이동
cd /Users/ilyoungkim/Projects/webMCP_luvd

# 1) 변경 상태 확인
git status

# 2) 변경 내용 요약 확인
git diff --stat

# 3) 모든 변경사항 스테이징
git add -A

# 4) 커밋 (변경 내용 요약을 작성)
git commit -m "변경 내용 요약"

# 5) 원격 저장소(GitHub)에 푸시
git push origin master
```

### 🚨 푸시가 실패할 때 (자격 증명 오류)

VS Code의 터미널 샌드박스 환경에서는 **macOS 키체인(GitHub 자격 증명)에 접근하지 못해** 푸시가 실패할 수 있습니다.

```
Missing or invalid credentials.
```

이 경우 아래 방법으로 해결하세요.

**방법 1 — VS Code 터미널에서 직접 실행 (권장)**

가장 확실한 방법입니다. VS Code 터미널에서 직접 아래 명령어를 입력하세요. (키체인 접근이 허용된 일반 터미널이라 정상 동작합니다)

```bash
git push origin master
```

**방법 2 — Git 자격 증명 캐시 설정**

푸시 시마다 인증 요구를 피하려면 자격 증명 헬퍼를 설정합니다.

```bash
# macOS 키체인에 자격 증명 저장 (최초 1회 설정)
git config --global credential.helper osxkeychain
```

### Git 저장소 정보

- **원격 저장소**: `https://github.com/ilyoungkim/webmcp_luvd.git`
- **기본 브랜치**: `master`
- **원격 확인 명령어**: `git remote -v`

> 💡 커밋은 로컬에만 저장되고, **`git push`를 해야 GitHub에 반영**됩니다. 커밋 후 반드시 푸시 여부를 확인하세요.

## 최근 변경 사항

### v0.2.0 — 모바일 반응형 개선 + 대시보드 UX 개선

**🖥️ AI 비서 웹 위젯 — 모바일 반응형 (화면 꽉 차게)**
- `widget.css`: 모바일(768px 이하)에서 위젯 패널이 화면 전체(`100vw` × `100dvh`)를 차지하도록 개선. `100dvh`로 모바일 주소창 높이까지 정확히 채움. 데스크톱(769px 이상)은 기존 플로팅 패널(380×600) 유지.
- `hospital.html` / `index.html`: `<head>`에 **viewport meta 태그** 추가 — 이 태그가 없으면 모바일이 데스크톱 폭(약 980px) 기준으로 렌더링되어 위젯이 작게 보였음.
- `hospital.html` / `index.html`: `widget.css` 링크에 버전 쿼리스트링(`?v=2`) 추가 — 배포 후 브라우저 캐시로 새 CSS가 안 보이는 문제 해결.

**📊 Streamlit 대시보드 — 설정 저장 확인 UX 개선**
- `app.py` (테넌트 설정 탭): 설정 저장 후 `st.session_state["save_msg"]`에 메시지를 저장해 **rerun 후에도 저장 성공/실패 메시지가 유지**되도록 개선. (기존 `st.toast`/`st.info`는 rerun 직후 사라짐)

## 버전 정보

- Chrome manifest 버전: `0.1.1.3`
- 내부 알파 빌드 문서: `0.1.1-alpha.003`
- 빌드 규칙: 매 빌드마다 Chrome 숫자 버전의 마지막 숫자가 +1 증가

## 상태

- 현재 상태: 알파 테스트
- WebMCP: 실험적 기능 기반 (Origin Trial 토큰 등록 완료)
- Gemini AI: 내장 Nano / API 이중 지원
- Origin Trial 만료: WebMCP 2026-11-17, Prompt API 2026-10-06

## 관련 저장소

- GitHub: https://github.com/ilyoungkim/webmcp_luvd

## 라이선스

**본 프로젝트의 소스 코드는 저작권자의 허가 없이 상업적 목적으로 사용할 수 없으며, 소스 코드의 변경·수정·재배포를 허용하지 않습니다.**

- ✅ 개인 학습 및 비상업적 참고 용도로만 사용할 수 있습니다.
- ✅ 원본 소스 코드의 저작권 표시를 유지해야 합니다.
- ❌ 상업적 이용을 금지합니다.
- ❌ 소스 코드의 변경·수정을 금지합니다.
- ❌ 무단 배포·재배포를 금지합니다.

자세한 내용은 `LICENSE` 파일을 참고하세요.
