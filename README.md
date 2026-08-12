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

- GitHub: https://github.com/ilyoungkim/webMCP-yonza

## 라이선스

본 프로젝트는 학습, 실험, 프로토타입 개발 목적을 위해 구성되었습니다.
