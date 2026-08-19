# webmcp/ — WebMCP 멀티테넌트 프록시 (프론트 + 백엔드)

`popup_agent_html.md` 설계안을 구현한 **서버(프록시) 기반 WebMCP 시스템**입니다.
여러 도메인(yonza.co.kr, saengsaenghospital.com 등)이 공용 위젯을 쓰고,
Gemini API 키는 **DB에 저장**되어 백엔드가 도메인별로 읽어 호출합니다.

```
webmcp/
├── front/    # 공용 웹 위젯 + 프록시 호출 라이브러리
└── backend/  # FastAPI 멀티테넌트 Gemini 프록시 + DB 스키마
```

---

## 1. 프론트엔드 (`webmcp/front/`)

여러 도메인이 공용으로 사용하는 **AI 비서 웹 위젯**과, Gemini 키를 직접 들고 있지 않고
백엔드 프록시(`/api/chat`)를 호출하는 라이브러리입니다.

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

### 파일 역할

| 파일 | 역할 |
|------|------|
| `webmcp.js` | `window.WebMCP.callGeminiViaProxy(prompt)` — 프록시로 Gemini 호출. 키 미보관 |
| `widget.js` | 위젯 DOM 자동 마운트. 마크다운 렌더링, 퀵 질문 pill, 연결 상태 배지, 동작 방식 아코디언 |
| `widget.css` | 위젯 스타일. 모든 선택자가 `#webmcp-widget`으로 스코프 |
| `yonja-config.js` | `window.WebMCPConfig`(service/consultant/diagnosis 툴) + `window.YONJA_SYSTEM_PROMPT` |
| `hospital-config.js` | `window.WebMCPConfig`(hospital/doctor/appointment 툴) + `window.HOSPITAL_SYSTEM_PROMPT` |
| `index.html` | yonja 데모. WebMCP 정보/클라이언트·서버/WebMCP.config/DB 스키마/사용법 아코디언 |
| `hospital.html` | 생생병원 데모. 동일한 아코디언 구조 |

### 위젯 동작 원리

```
사용자 위젯 ──POST /api/chat──▶ nginx(8081) ──▶ FastAPI(8001) ──▶ Gemini
                              (Origin 헤더로 도메인 판별, DB에서 키 조회)
```

- `widget.js`는 `window.YONJA_SYSTEM_PROMPT || window.HOSPITAL_SYSTEM_PROMPT`를
  자동 선택해 프록시 요청에 포함합니다.
- `webmcp.js`는 `window.WebMCPConfig.proxyEndpoint`(기본 `/api/chat`)로 호출합니다.

### 페이지에 붙이는 방법

```html
<!-- ① 사이트별 config (webmcp.js 보다 먼저) -->
<script src="yonja-config.js"></script>   <!-- 또는 hospital-config.js -->
<!-- ② 공용 라이브러리 -->
<script src="webmcp.js"></script>
<!-- ③ 위젯 -->
<link rel="stylesheet" href="widget.css" />
<script src="widget.js"></script>
```

---

## 2. 백엔드 (`webmcp/backend/`)

FastAPI 기반 **멀티테넌트 Gemini 프록시**입니다. Gemini 키는 DB(`webmcp.tenants`)에
저장되어, 요청의 `Origin` 헤더로 도메인을 판별해 도메인별 키/한도를 적용합니다.

```
webmcp/backend/
├── app.py                    # FastAPI 프록시 (멀티테넌트 + Rate Limit + 로깅)
├── requirements.txt          # 의존성 (fastapi, uvicorn, pymysql, httpx 등)
├── init.sql                  # DB 초기화/이식 스크립트 (tenants + request_logs)
├── .env / .env.example       # DB 접속 정보 (DB_HOST=192.168.31.136)
├── run.sh                    # 로컬 실행 스크립트
├── webmcp_standalone.conf    # 8081 포트 전용 standalone nginx 설정
├── webmcp_nginx.conf         # conf.d 추가용 nginx 서버블록 (참고)
└── webmcp-backend.service    # systemd 유닛 (백엔드 안정 실행)
```

### API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/health` | 헬스체크 (`{"status":"ok"}`) |
| `POST` | `/api/chat` | Gemini 프록시 (Origin으로 도메인 판별) |
| `GET` | `/api/logs` | 차단된 요청 로그 조회 (개발용) |

### `/api/chat` 처리 흐름 (설계안 4-1-2)

1. **401** — 비정상/부실 헤더 요청 (curl 등) → `is_likely_real_browser()` 실패
2. **403** — 미등록 도메인 → `tenants`에 `origin` 없음
3. **429** — Rate Limit 초과 → `rate_limit` 값 초과
4. **200** — 정상 → DB 키로 Gemini 호출

모든 요청은 `request_logs` 테이블에 기록됩니다.

> 📌 **허용 도메인은 DB(`tenants`)가 단일 진실 공급원입니다.**
> `app.py`에는 origin 화이트리스트가 없습니다. CORS는 `*`(쿠키 미사용이라 안전)로 열려 있고,
> 실제 도메인 판별은 `fetch_tenant()`(DB 조회)가 담당합니다.
> 따라서 **새 고객사 추가 시 코드 수정/재시작 없이 DB에 `tenants` 한 줄만 INSERT** 하면 됩니다.

### DB 스키마 (`init.sql`)

**테이블 1: `tenants`** — 도메인별 Gemini 키/한도
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT UNSIGNED PK | 자동 증가 |
| `origin` | VARCHAR(255) UNIQUE | 도메인 (예: https://yonza.co.kr) |
| `site_ns` | VARCHAR(64) | WebMCPConfig.siteNs |
| `gemini_key` | TEXT | Gemini API 키 (DB에만 보관) |
| `model_name` | VARCHAR(128) | Gemini 모델 |
| `rate_limit` | INT UNSIGNED | 분당 도메인 호출 한도 |
| `tier` | VARCHAR(32) | dev / prod |
| `enabled` | TINYINT(1) | 활성 여부 |

**테이블 2: `request_logs`** — 요청 로깅/비정상 접속 감지
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGINT UNSIGNED PK | 자동 증가 |
| `ts` | DATETIME(3) | 요청 시각 |
| `origin` | VARCHAR(255) | Origin 헤더 |
| `referer` | TEXT | Referer 헤더 |
| `user_agent` | TEXT | User-Agent |
| `sec_ch_ua` | TEXT | Client Hints |
| `ip` | VARCHAR(64) | 요청 IP |
| `path` | VARCHAR(255) | 요청 경로 |
| `body_len` | INT UNSIGNED | 본문 길이 |
| `verdict` | VARCHAR(32) | ok / blocked_401 / 403 / 429 |
| `reason` | VARCHAR(255) | 차단 사유 |

### DB 이식 방법

```bash
# DB 생성 (없으면)
mysql -h <DB_HOST> -u root -p -e "CREATE DATABASE webmcp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 스키마/테이블 생성
mysql -h <DB_HOST> -u <DB_USER> -p webmcp < webmcp/backend/init.sql
# 테넌트(도메인별 키) 등록
mysql -h <DB_HOST> -u <DB_USER> -p webmcp -e "INSERT INTO tenants (origin, site_ns, gemini_key, model_name, rate_limit, tier) VALUES ('https://example.com', 'site', 'YOUR_KEY', 'gemini-3.5-flash-lite', 20, 'prod');"
```

### 백엔드 실행 (systemd)

```bash
sudo cp webmcp/backend/webmcp-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now webmcp-backend
```

### nginx (8081 standalone)

기존 nginx(80) 설정은 건드리지 않고, **별도 standalone nginx**를 8081 포트로 띄웁니다.

```bash
sudo cp webmcp/backend/webmcp_standalone.conf /etc/nginx/webmcp_standalone.conf
sudo nginx -c /etc/nginx/webmcp_standalone.conf
```

---

## 3. 배포된 테넌트 (DB `tenants`)

| origin | site_ns | tier | rate_limit |
|--------|---------|------|------------|
| `http://localhost:8000` | yonja | dev | 100 |
| `http://localhost:3000` | yonja | dev | 100 |
| `https://yonza.co.kr` | yonja | prod | 20 |
| `http://192.168.31.136:8081` | yonja | dev | 100 |
| `http://114.205.189.190:8081` | hospital | prod | 20 |
| `https://www.saengsaenghospital.com` | hospital | prod | 20 |

---

## 4. 접속 URL

| 페이지 | URL |
|--------|-----|
| yonja 데모 | `http://192.168.31.136:8081/` |
| 생생병원 데모 | `http://192.168.31.136:8081/hospital.html` |
| 생생병원 데모 (공인 IP) | `http://114.205.189.190:8081/hospital.html` |
| 백엔드 헬스 | `http://192.168.31.136:8081/health` |
