# 연애의 자격 AI 비서

WebMCP 기반으로 연애의 자격 서비스의 핵심 정보를 빠르게 확인하고, Chrome 내장 AI와 연동해 상담·진단·서비스 안내를 한 번에 도와주는 확장 프로그램입니다.

## 프로젝트 개요

이 프로젝트는 연애의 자격 웹사이트에서 노출되는 WebMCP 도구를 활용해, 사용자가 필요한 정보를 더 빠르게 찾고 실행할 수 있도록 돕는 확장 프로그램입니다.

- 서비스 정보 조회
- 상담사 정보 조회
- 진단 제출
- Chrome 내장 AI 연동
- 내부 AI 미지원 시 키워드 기반 fallback

## 주요 기능

### 1. WebMCP 도구 연결
- `yonja.service.get_info`
- `yonja.consultant.get_info`
- `yonja.diagnosis.submit`

### 2. Chrome 내장 AI 우선 활용
- `window.ai.languageModel` 사용 시 자연어 질문을 이해하고 적절한 도구를 자동 호출
- 지원되지 않는 환경에서는 키워드 기반으로 직접 툴 호출

### 3. 알파 테스트 환경 대응
- 실험적 기능이므로 Chrome 플래그 활성화가 필요할 수 있음
- 내장 AI가 없더라도 기능이 계속 동작하도록 fallback 로직 유지

## 구조

- `webmcp.js`: WebMCP 로직 및 모델 컨텍스트 처리
- `yonja.html`: 연애의 자격 페이지 예시
- `webmcp-extension/`: Chrome 확장 프로그램
  - `manifest.json`
  - `popup.html`
  - `popup.js`
  - `content.js`
  - `background.js`
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
   ```

3. Chrome 확장 프로그램 로드
   - Chrome 주소창에 `chrome://extensions` 입력
   - 개발자 모드 활성화
   - 압축해제된 확장 프로그램 로드
   - `webmcp-extension/` 폴더 선택

## Chrome 내장 AI 활성화

다음 플래그를 활성화하면 내장 AI를 더 쉽게 사용할 수 있습니다.

- `chrome://flags/#prompt-api-for-gemini-nano` → `Enabled`
- `chrome://flags/#optimization-guide-on-device-model` → `Enabled BypassPerfRequirement`

## 버전 정보

- 현재 버전: `0.1.1-alpha.003`
- 빌드 규칙: 매 빌드마다 빌드 번호가 +1 증가

## 상태

- 현재 상태: 알파 테스트
- WebMCP: 실험적 기능 기반
- 내장 AI: 선택적 사용
- fallback: 키워드 기반 툴 호출

## 관련 저장소

- GitHub: https://github.com/ilyoungkim/webMCP-yonza

## 라이선스

본 프로젝트는 학습, 실험, 프로토타입 개발 목적을 위해 구성되었습니다.
