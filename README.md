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

- `webmcp.js`: WebMCP 로직 및 모델 컨텍스트 처리
- `yonja.html`: 연애의 자격 페이지 예시
- `diagnosis.html`: 진단 페이지 예시
- `webmcp-extension/`: Chrome 확장 프로그램
  - `manifest.json`
  - `popup.html`
  - `popup.js`
  - `content.js`
  - `background.js`
  - `gemini-key.js` — Gemini API 키 (⚠️ 절대 커밋 금지, `.gitignore`에 등록됨)
  - `build_extension.py`
  - `bump_version.py`

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
웹서버 루트 (예: /var/www/html 또는 호스팅 public_html)
├── html/
│   ├── yonja.html      # 연애의자격 메인 페이지 (WebMCPConfig 포함)
│   ├── diagnosis.html  # 진단 페이지
│   ├── webmcp.js       # WebMCP 공통 라이브러리 (HTML과 같은 폴더 필수)
│   └── webmcp.md       # WebMCP 문서 (선택)
```

> 📌 `yonja.html`과 `webmcp.js`는 **반드시 같은 폴더(`html/`)에** 있어야 합니다. HTML이 `./webmcp.js`(상대경로)로 참조하기 때문입니다.

#### ② 접속 URL

배포 후 접속 주소는 다음과 같습니다.

| 페이지 | URL |
|--------|-----|
| 메인 페이지 | `https://yonza.co.kr/html/yonja.html` |
| 진단 페이지 | `https://yonza.co.kr/html/diagnosis.html` |

> 💡 만약 루트(`https://yonza.co.kr/`)에서 바로 열리게 하려면, `html/` 폴더 안의 `yonja.html`을 웹서버 루트로 옮기거나, 서버에서 루트 요청을 `html/yonja.html`로 리다이렉트하면 됩니다.

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

운영 서버에 올려야 하는 파일은 **`yonja.html`과 `webmcp.js`** 두 개입니다. `webmcp.js`는 WebMCP 도구를 등록하는 공통 라이브러리로, HTML이 이 파일을 참조합니다.

#### 1) 업로드할 파일 구성

```
웹서버 루트 (예: /var/www/html 또는 호스팅 public_html)
├── yonja.html      # 연애의자격 메인 페이지 (WebMCPConfig 포함)
└── webmcp.js       # WebMCP 공통 라이브러리 (반드시 같은 폴더에)
```

> ⚠️ `webmcp.js`는 `yonja.html`과 **같은 디렉터리**에 있어야 합니다. `yonja.html`이 `./webmcp.js`(상대경로)로 참조하기 때문입니다.

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

  <!-- WebMCPConfig가 정의된 뒤, 마지막에 webmcp.js를 로드 -->
  <script type="module" src="./webmcp.js"></script>
</body>
```

> 📌 **순서가 중요합니다.** `WebMCPConfig` → `webmcp.js` 순서로 로드해야 합니다. `webmcp.js`는 페이지가 준비되면 `navigator.modelContext.registerTool`로 `yonja.service.get_info` 같은 도구를 자동 등록합니다.

#### 3) 운영 서버에 올리는 방법 (예시)

**FTP/호스팅 파일 매니저 사용 시**
- `yonja.html`과 `webmcp.js`를 웹 루트에 업로드
- 브라우저에서 `https://도메인/yonja.html` 접속 확인

**Nginx 서버 예시**
```bash
# 서버에 파일 복사
scp yonja.html webmcp.js user@server:/var/www/html/

# 접속 확인
curl -I https://도메인/yonja.html
```

**GitHub Pages / Netlify / Vercel 사용 시**
- 저장소 루트에 `yonja.html`, `webmcp.js`를 두고 배포
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

- [ ] `yonja.html`과 `webmcp.js`가 같은 폴더에 있는가?
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
