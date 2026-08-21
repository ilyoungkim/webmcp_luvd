# webmcp_openrouter/ — WebMCP 멀티테넌트 LLM 프록시 (멀티 프로바이더)

`webmcp/`를 기반으로 **멀티 프로바이더(LLM 어댑터)** 를 지원하도록 확장한 버전입니다.
Gemini뿐 아니라 **OpenRouter, OpenAI, Anthropic** 등 다양한 LLM을 DB 설정만으로 전환할 수 있습니다.

```
webmcp_openrouter/
├── front/      # 공용 웹 위젯 + 프록시 호출 라이브러리
├── backend/    # FastAPI 멀티테넌트 LLM 프록시 + DB 스키마
└── dashboard/  # Streamlit 대시보드 (admin + user)
```

---

## 핵심 개념: LLM 어댑터 (멀티 프로바이더)

백엔드가 **프로바이더별 요청/응답 형식을 공통 `{"text": "..."}` 로 정규화**합니다.
프론트(`webmcp.js`)는 프로바이더를 몰라도 `data.text`만 읽으면 됩니다.

```
프론트 ──POST /api/chat──▶ 백엔드 ──▶ call_llm(tenant, prompt)
                                    ├─ provider=gemini     → call_gemini()
                                    ├─ provider=openrouter → call_openrouter()
                                    └─ provider=openai/... → (확장 가능)
```

- **DB(`tenants.provider`)가 단일 진실 공급원** — 새 고객사/새 모델 추가 시 코드 수정·재시작 없이 DB 한 줄만 변경.
- **응답 정규화** — 모든 프로바이더 응답을 `{"text": "...", "provider": "...", "raw": {...}}` 로 통일.

---

## 1. 프론트엔드 (`webmcp_openrouter/front/`)

`webmcp/front/`와 동일한 구조입니다. 차이점은 `webmcp.js`가
**공통 응답(`data.text`)을 파싱**한다는 점입니다.

```
webmcp_openrouter/front/
├── webmcp.js           # 공용 라이브러리 — 프록시 /api/chat 호출 (data.text 파싱)
├── widget.js           # AI 비서 위젯 로직
├── widget.css          # 위젯 스타일
├── yonja-config.js     # yonja.html 기준 WebMCPConfig + 시스템 프롬프트
├── hospital-config.js  # hospital.html 기준 WebMCPConfig + 시스템 프롬프트
├── index.html          # yonja 데모 페이지
└── hospital.html       # 생생병원 데모 페이지
```

### `webmcp.js` 응답 파싱 (공통 형식)

```javascript
var data = await res.json();
var text = (data && typeof data.text === 'string') ? data.text : '';
```

> 기존 `webmcp/`는 Gemini 전용(`candidates[0].content.parts`) 파싱이었지만,
> 이 버전은 백엔드가 정규화한 `data.text`를 읽으므로 **프로바이더와 무관**합니다.

---

## 2. 백엔드 (`webmcp_openrouter/backend/`)

FastAPI 기반 **멀티테넌트 LLM 프록시**입니다. 키는 DB(`webmcp.tenants`)에 저장되고,
`Origin` 헤더로 도메인을 판별해 도메인별 키/한도/프로바이더를 적용합니다.

```
webmcp_openrouter/backend/
├── app.py                    # FastAPI 프록시 (멀티 프로바이더 + Rate Limit + 로깅)
├── requirements.txt          # 의존성 (fastapi, uvicorn, pymysql, httpx 등)
├── init.sql                  # DB 초기화/이식 스크립트 (tenants + request_logs)
├── .env / .env.example       # DB 접속 정보 + 프로바이더 엔드포인트
├── run.sh                    # 로컬 실행 스크립트
├── webmcp_standalone.conf    # 8081 포트 전용 standalone nginx 설정
├── webmcp_nginx.conf         # conf.d 추가용 nginx 서버블록 (참고)
└── webmcp-backend.service    # systemd 유닛 (백엔드 안정 실행)
```

### API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/health` | 헬스체크 (`{"status":"ok"}`) |
| `POST` | `/api/chat` | LLM 프록시 (Origin으로 도메인 판별, provider 분기) |
| `GET` | `/api/logs` | 차단된 요청 로그 조회 (개발용) |

### `/api/chat` 처리 흐름

1. **401** — 비정상/부실 헤더 요청 (curl 등) → `is_likely_real_browser()` 실패
2. **403** — 미등록 도메인 → `tenants`에 `origin` 없음
3. **429** — Rate Limit 초과 → `rate_limit` 값 초과
4. **200** — 정상 → `provider`에 따라 LLM 호출 → `{"text": "..."}` 정규화 반환

### 프로바이더별 호출

| provider | 엔드포인트 | 요청 형식 | 응답 파싱 |
|----------|-----------|-----------|-----------|
| `gemini` | `{GEMINI_BASE}/models/{model}:generateContent?key={key}` | `contents/parts` | `candidates[0].content.parts[].text` |
| `openrouter` | `{OPENROUTER_BASE}/chat/completions` | `messages` (OpenAI 호환) | `choices[0].message.content` |
| `openai` / `anthropic` | (확장 가능) | — | — |

> `call_llm()`에서 `tenant['provider']`로 분기합니다. 새 프로바이더는 `call_xxx()` 함수와
> `call_llm()` 분기만 추가하면 됩니다.

### DB 스키마 (`init.sql`)

**테이블 1: `tenants`** — 도메인별 LLM 키/한도/프로바이더

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT UNSIGNED PK | 자동 증가 |
| `origin` | VARCHAR(255) UNIQUE | 도메인 (예: https://yonza.co.kr) |
| `site_ns` | VARCHAR(64) | WebMCPConfig.siteNs |
| `gemini_key` | TEXT | LLM API 키 (Gemini/OpenRouter 등, DB에만 보관) |
| `password` | VARCHAR(255) | 개인 대시보드 로그인 비밀번호 (선택) |
| `provider` | VARCHAR(32) | `gemini` / `openrouter` / `openai` / `anthropic` |
| `model_name` | VARCHAR(128) | LLM 모델 (예: `gemini-3.5-flash-lite`, `openai/gpt-4o`) |
| `rate_limit` | INT UNSIGNED | 분당 도메인 호출 한도 |
| `tier` | VARCHAR(32) | dev / prod |
| `enabled` | TINYINT(1) | 활성 여부 |

**테이블 2: `request_logs`** — 요청 로깅/비정상 접속 감지 (기존과 동일)

### DB 이식 방법

```bash
# DB 생성 (없으면)
mysql -h <DB_HOST> -u root -p -e "CREATE DATABASE webmcp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 스키마/테이블 생성
mysql -h <DB_HOST> -u <DB_USER> -p webmcp < webmcp_openrouter/backend/init.sql
```

### 새 고객사 등록 (예: OpenRouter)

```sql
-- OpenRouter 모델 사용 예시
INSERT INTO tenants (origin, site_ns, gemini_key, provider, model_name, rate_limit, tier)
VALUES ('https://example.com', 'site', 'sk-or-v1-...', 'openrouter', 'openai/gpt-4o', 20, 'prod');

-- Gemini 모델 사용 예시 (기본)
INSERT INTO tenants (origin, site_ns, gemini_key, provider, model_name, rate_limit, tier)
VALUES ('https://example.com', 'site', 'AIza...', 'gemini', 'gemini-3.5-flash-lite', 20, 'prod');
```

### 기존 DB 마이그레이션 (provider 컬럼 추가)

```sql
ALTER TABLE tenants ADD COLUMN provider VARCHAR(32) NOT NULL DEFAULT 'gemini' AFTER password;
```

---

## 3. 대시보드 (`webmcp_openrouter/dashboard/`)

Streamlit 기반 대시보드 2종입니다.

```
webmcp_openrouter/dashboard/
├── app.py      # 관리자(admin) 대시보드 — 전체 테넌트/로그/설정
├── site.py     # 개인(user) 대시보드 — 도메인별 로그인 후 자기 정보만
├── db.py       # DB 접속/쿼리 헬퍼
├── .env.example
└── requirements.txt
```

### 관리자 대시보드 (`app.py`)

- 요청 분석 / 차단 로그 / 전체 로그 / **테넌트 설정** 탭
- 테넌트 설정에서 **프로바이더(gemini/openrouter/openai/anthropic) 선택** 가능
- 프로바이더에 따라 모델 목록이 동적으로 변경됨 (예: openrouter → `openai/gpt-4o` 등)

```bash
cd webmcp_openrouter/dashboard
streamlit run app.py
```

### 개인 대시보드 (`site.py`)

- `origin` + `password` 로 로그인 → 해당 테넌트 정보/로그만 표시
- 테넌트 정보 카드에 **프로바이더** 표시 추가

```bash
cd webmcp_openrouter/dashboard
streamlit run site.py
```

---

## 4. 실행 방법

### 백엔드 (systemd)

```bash
sudo cp webmcp_openrouter/backend/webmcp-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now webmcp-backend
```

### nginx (8081 standalone)

```bash
sudo cp webmcp_openrouter/backend/webmcp_standalone.conf /etc/nginx/webmcp_standalone.conf
sudo nginx -c /etc/nginx/webmcp_standalone.conf
```

---

## 5. `webmcp/` 와의 차이점 요약

| 항목 | `webmcp/` (기존) | `webmcp_openrouter/` (이 버전) |
|------|------------------|-------------------------------|
| 지원 프로바이더 | Gemini 전용 | Gemini + OpenRouter + 확장 가능 |
| 응답 파싱 | 프론트에서 Gemini 형식 | 백엔드에서 `{"text": "..."}` 정규화 |
| DB 스키마 | `model_name` + `gemini_key` | + `provider` 컬럼 |
| 프론트 | Gemini 응답 파싱 | `data.text` 공통 파싱 |
| 대시보드 | Gemini 모델만 선택 | 프로바이더별 모델 동적 선택 |

---

## 6. 포트 분리 (8081 vs 8082)

기존 `webmcp`와 완전히 분리되어 운영됩니다.

| 항목 | `webmcp` (기존) | `webmcp_openrouter` (이 버전) |
|------|-----------------|-------------------------------|
| nginx 포트 | 8081 | 8082 |
| 백엔드 포트 | 8001 | 8002 |
| 웹 루트 | `/usr/share/nginx/webmcp` | `/usr/share/nginx/webmcp_openrouter` |
| systemd 서비스 | `webmcp-backend` | `webmcp-openrouter-backend` |
| nginx 설정 | `webmcp_standalone.conf` | `webmcp_openrouter_standalone.conf` |
| DB 테넌트 | id 6 (`http://114.205.189.190:8081`) | id 7 (`http://114.205.189.190:8082`) |

---

## 7. 외부 사이트 배포 시 지켜야 할 사항 ⚠️

외부 고객사 사이트(별도 서버/도메인)에 위젯을 붙일 때, 아래 사항을 반드시 준수해야
합니다. (내부 데모와 달리 **브라우저 보안 정책(Mixed Content)과 요청 검증**이 적용됩니다.)

### 7-1. HTTPS 사이트에서는 HTTP 백엔드 호출 불가 (Mixed Content)

브라우저는 HTTPS 페이지에서 `http://...` 리소스를 차단합니다.

| 페이지 프로토콜 | 백엔드 호출 주소 |
|-----------------|------------------|
| `http://` (내부 데모) | `http://114.205.189.190:8082` |
| `https://` (실서비스) | `https://webmcp.duckdns.org` |

### 7-2. ⚠️ 서버 프록시 시 헤더 전달 필수 (안 지키면 401/403)

백엔드는 요청 헤더로 테넌트를 판별하고 비정상 요청을 차단합니다.
고객사 서버가 프록시할 때 **원본 브라우저 헤더를 그대로 전달**해야 합니다.

| 헤더 | 없으면 | 설명 |
|------|--------|------|
| `Origin` | **403 "등록되지 않은 도메인"** | DB `tenants`에서 테넌트 판별 |
| `User-Agent` | **401 "비정상적인 요청"** | `Mozilla/5.0` + 브라우저명 필요 |

> ⚠️ Node.js(Next.js) `fetch` 기본 UA는 브라우저가 아니므로, 서버 프록시 시
> **브라우저 UA를 그대로 넘겨야** 401을 피할 수 있습니다.

자세한 Next.js Route Handler 예시는 [`webmcp/README.md`](../webmcp/README.md)의
"5. 외부 사이트 배포 시 지켜야 할 사항"을 참고하세요.

---

## 8. 마크다운 렌더링 개선 (`webmcp-widget.js`)

`markdownToHtml()` 함수가 다음을 지원하도록 개선되었습니다.

| 기능 | 설명 |
|------|------|
| **자동 링크(autolink)** | 일반 URL(`https://...`)을 자동으로 `<a>` 링크로 변환 |
| **리스트 들여쓰기** | 연속된 `<li>` 블록을 `<ul>`로 감싸 들여쓰기 적용 |
| **마크다운 표** | `\| ... \|` 표를 `<table>`로 변환 (헤더 `<th>`, 본문 `<td>`) |
| **오류 아코디언** | 오류 메시지를 `<details>`로 감춰 "클릭하여 상세보기" 형태로 표시 |

### 시스템 프롬프트 링크 규칙

`hospital-config.js`의 시스템 프롬프트에서 URL을 **마크다운 링크 문법 `[텍스트](URL)`** 으로
작성하도록 변경했습니다. AI가 URL 주소를 그대로 노출하지 않고 "온라인 예약", "카카오톡 상담" 등
텍스트에 링크를 걸어 출력합니다.

---

## 9. 변경 이력

### 2026-08-20

- **멀티 프로바이더(LLM 어댑터) 구현** — `call_llm()`에서 `provider`로 분기, `call_gemini()`/`call_openrouter()` 지원
- **DB `provider` 컬럼 추가** — `tenants` 테이블에 `provider` 컬럼 (기본 `gemini`)
- **응답 정규화** — 모든 프로바이더 응답을 `{"text": "..."}` 로 통일, 프론트는 `data.text`만 파싱
- **8082 포트 분리** — `webmcp`(8081)와 `webmcp_openrouter`(8082) 완전 분리 운영
- **마크다운 자동 링크** — 일반 URL을 링크로 변환
- **마크다운 리스트 들여쓰기** — `<li>`를 `<ul>`로 감싸 들여쓰기 적용
- **마크다운 표 지원** — `| ... |` 표를 `<table>`로 변환
- **오류 아코디언** — 오류 메시지를 접이식으로 표시
- **시스템 프롬프트 링크 규칙** — URL을 `[텍스트](URL)` 마크다운 문법으로 변경
- **OpenRouter 모델 테스트** — `inclusionai/ling-3.0-flash`, `openrouter/fusion`, `mistralai/mistral-nemo`, `upstage/solar-pro4`, `qwen/qwen3.7-flash`, `microsoft/phi-4`, `deepseek/deepseek-v4-flash-latest`, `amazon/nova-micro-v1`, `openai/gpt-oss-120b` 등 테스트 (DB `model_name` 변경으로 전환)

---

## 9. OpenRouter 모델 테스트 기록

DB `tenants.model_name` 변경만으로 모델을 전환하며 테스트했습니다. (id 7 테넌트, 8082 포트)

| 모델 | 제공업체 | 추론(reasoning) | 비용(1K 토큰) | 테스트 결과 |
|------|----------|-----------------|---------------|-------------|
| `inclusionai/ling-3.0-flash` | Novita | ✅ 지원 | $0.00245 | ⚠️ 상류(shared pool) rate limit(429) 발생 — 키 한도 증액 후 해소 |
| `openrouter/fusion` | OpenRouter (자동 라우팅) | — | — | 자동 라우팅 모델. 여러 제공업체 중 최적 모델 자동 선택 |
| `mistralai/mistral-nemo` | Mistral | ❌ 미지원 | $0.000175 | 일반 채팅 모델. `reasoning` 파라미터 제거 필요 |
| `upstage/solar-pro4` | Upstage | ❌ 미지원 | $0.000319 | 일반 채팅 모델 |
| `qwen/qwen3.7-flash` | Alibaba | ❌ 미지원 | $0.00343 | ⚠️ 상류 rate limit(429, insufficient_quota) 발생 |
| `microsoft/phi-4` | Microsoft | ❌ 미지원 | $0.00093 | 일반 채팅 모델 |
| `deepseek/deepseek-v4-flash-latest` | DeepSeek | ❌ 미지원 | — | 일반 채팅 모델 |
| `amazon/nova-micro-v1` | Amazon | ❌ 미지원 | $0.00036 | 일반 채팅 모델 |
| `openai/gpt-oss-120b` | OpenAI | ❌ 미지원 | $0.00748 | 일반 채팅 모델 |

### 모델별 비용 비교 (1K 토큰 기준, OpenRouter 사용량 비중)

| 모델 | 비용(1K 토큰) | 사용량 비중 |
|------|---------------|-------------|
| Claude Opus 5 (참고) | $0.111 | 88.0% |
| gpt-oss-120b | $0.00748 | 5.9% |
| Qwen3.7 Flash | $0.00343 | 2.7% |
| Ling-3.0-flash | $0.00245 | 1.9% |
| Phi 4 | $0.00093 | 0.7% |
| Nova Micro 1.0 | $0.00036 | 0.3% |
| Solar Pro 4 | $0.000319 | 0.3% |
| Mistral Nemo | $0.000175 | 0.1% |

> 💡 **비용 참고** — 위 비용은 OpenRouter 사용량 기준이며, 모델마다 가격 차이가 큽니다.
> 가장 저렴한 `Mistral Nemo`($0.000175)부터 가장 비싼 `Claude Opus 5`($0.111)까지
> 약 600배 차이가 납니다. 서비스 예산에 맞는 모델을 선택하세요.

### 테스트 시 참고 사항

1. **모델 전환 방법** — 코드 수정 없이 DB만 변경하면 됩니다.
   ```sql
   UPDATE tenants SET model_name='<모델ID>' WHERE id=7;
   sudo systemctl restart webmcp-openrouter-backend
   ```

2. **추론(reasoning) 모델 주의** — `inclusionai/ling-3.0-flash` 같은 추론 모델은
   `"reasoning": {"enabled": True}` 파라미터가 필요하지만, 일반 모델에 이 파라미터를
   보내면 오류가 날 수 있습니다. 현재 `call_openrouter()`는 `reasoning` 파라미터를
   생략한 상태(일반 모델 호환)입니다.

3. **상류 rate limit(429)** — OpenRouter가 공유 풀(shared pool)로 제공하는 모델은
   상류 제공업체의 일시적 제한으로 429가 발생할 수 있습니다. 해결 방법:
   - 잠시 후 재시도
   - OpenRouter 설정에서 자체 제공업체 키 추가(BYOK) → 한도 누적
   - 다른 모델로 전환

4. **모델별 특징** — 모델마다 추론 지원 여부, 응답 품질, 속도, 비용이 다릅니다.
   서비스 성격에 맞는 모델을 선택하세요. (예: 빠른 응답 → flash 계열, 고품질 → pro 계열)

