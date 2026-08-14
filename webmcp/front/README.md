# webmcp/front/ — 공용 프론트엔드 (웹 위젯 + 프록시 연동)

여러 도메인(yonza.co.kr, saengsaenghospital.com 등)이 공용으로 사용하는 위젯과,
Gemini 키를 직접 들고 있지 않고 백엔드 프록시를 호출하는 `webmcp.js`를 포함합니다.

```
webmcp/front/
├── webmcp.js           # 공용 라이브러리 — 프록시 /api/chat 호출 (키 미보관)
├── widget.js           # AI 비서 위젯 로직 (마크다운, 퀵질문, 상태배지, 아코디언)
├── widget.css          # 위젯 스타일 (.wmcp- 접두어 → 페이지 충돌 방지)
├── yonja-config.js     # yonja.html 기준 WebMCPConfig + 시스템 프롬프트
├── hospital-config.js  # hospital.html 기준 WebMCPConfig + 시스템 프롬프트
├── index.html          # yonja 데모 페이지
└── hospital.html       # 생생병원 데모 페이지
```

## 파일 역할

| 파일 | 역할 |
|------|------|
| `webmcp.js` | `window.WebMCP.callGeminiViaProxy(prompt)` — 프록시로 Gemini 호출. 키 미보관 |
| `widget.js` | 위젯 DOM 자동 마운트. 마크다운 렌더링, 퀵 질문 pill, 연결 상태 배지, 동작 방식 아코디언 |
| `widget.css` | 위젯 스타일. 모든 선택자가 `#webmcp-widget`으로 스코프 |
| `yonja-config.js` | `window.WebMCPConfig`(service/consultant/diagnosis 툴) + `window.YONJA_SYSTEM_PROMPT` |
| `hospital-config.js` | `window.WebMCPConfig`(hospital/doctor/appointment 툴) + `window.HOSPITAL_SYSTEM_PROMPT` |
| `index.html` | yonja 데모. WebMCP 정보/클라이언트·서버/WebMCP.config/DB 스키마/사용법 아코디언 |
| `hospital.html` | 생생병원 데모. 동일한 아코디언 구조 |

## 위젯 동작 원리

```
사용자 위젯 ──POST /api/chat──▶ nginx(8081) ──▶ FastAPI(8001) ──▶ Gemini
                              (Origin 헤더로 도메인 판별, DB에서 키 조회)
```

- `widget.js`는 `window.YONJA_SYSTEM_PROMPT || window.HOSPITAL_SYSTEM_PROMPT`를
  자동 선택해 프록시 요청에 포함합니다.
- `webmcp.js`는 `window.WebMCPConfig.proxyEndpoint`(기본 `/api/chat`)로 호출합니다.

## 페이지에 붙이는 방법

```html
<!-- ① 사이트별 config (webmcp.js 보다 먼저) -->
<script src="yonja-config.js"></script>   <!-- 또는 hospital-config.js -->
<!-- ② 공용 라이브러리 -->
<script src="webmcp.js"></script>
<!-- ③ 위젯 -->
<link rel="stylesheet" href="widget.css" />
<script src="widget.js"></script>
```
