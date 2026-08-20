# README-GENIS.md — 제니스코리아(Genis EV) WebMCP AI 비서 설정 문서

> ㈜제니스코리아(전기차 부품·솔루션 전문 기업) 웹사이트에 **WebMCP AI 비서 위젯**을 통합한 내용을 정리한 문서입니다.

---

## 1. 개요

| 항목 | 값 |
|------|-----|
| 고객사 | ㈜제니스코리아 (Genis Korea) |
| 웹사이트 | `http://genisev.com` |
| siteNs | `genisev` |
| AI 모델 | `gemini-3.5-flash-lite` |
| 프록시 엔드포인트 | `/api/chat` |
| 데모 URL | `http://192.168.31.136:8081/genisev.html` |
| 배포 서버 | `192.168.31.136` (tensun) |
| 웹 루트 | `/usr/share/nginx/webmcp/` |

---

## 2. 빠른 메뉴 (퀵 질문 pill)

AI 비서 하단에 표시되는 빠른 메뉴 4개입니다.

| 메뉴 | label | 질문(question) |
|------|-------|----------------|
| 제니스코리아 소개 | `제니스코리아 소개` | 제니스코리아 회사를 소개해줘 |
| Charging | `Charging` | 충전 솔루션(SECC, EVCC)에 대해 알려줘 |
| BMS | `BMS` | BMS(배터리 관리 시스템)에 대해 알려줘 |
| Contact | `Contact` | 계약 및 문의 방법을 알려줘 |

---

## 3. 주입된 지식 데이터 (getData)

### 3-1. 제니스코리아 소개 (intro)

- **회사명**: ㈜제니스코리아 (Genis Korea)
- **소개**: 전기차 부품 및 솔루션 전문 기업
- **실적 (Vision)**
  - DEPLOYED UNITS: 국내외 10,000개 이상의 GENIS Device/System 사용
  - SUCCESSFUL PROJECTS: 34개 프로젝트 수행
  - CUSTOMER: 50개 고객사 협력
- **고객군**
  1. 충전 사업자 & 충전기 제조사 — 국내 충전기 제조사에 2,000대 이상 PLC 모뎀(CSM) 제공, DIN70121/ISO15118 지원
  2. 전기차 OEM & Partners — 초소형·상용차에 PLC 통신 모뎀 제공
  3. BMS 고객사 — 전기스쿠터·전기버스·상용차 BMS
- **주소**
  - 본사: [13646] 경기도 성남시 수정구 위례광장로19 아이페리온 1103호
  - 공장: [54158] 전북 군산시 동장산 2길 6 자동차융합기술원 본관동 2207호
- **연락처**: `sales@genisev.com` | `+82-70-8836-8365`

### 3-2. Charging (충전 솔루션)

#### SECC (Supply Equipment Communication Controller)
- 제품명: **CSM** — 전기차와 PLC 통신으로 충전제어 메시지 송수신하는 통신 모뎀
- 주요 스펙:
  | 항목 | 값 |
  |------|-----|
  | Interface | CAN 2.0 B, 500KBps, Sampling Point 75% |
  | Communication | PLC: HomePlug Green PHY™ / Wi-Fi: ISO/IEC 15118-8 (Opt.) |
  | SECC Function | IEC61851, DIN70121, ISO/IEC 15118 AC/DC EIM, PnC |
  | Operating Voltage | 9V ~ 38V |
  | Operating Temperature | -20℃ ~ 85℃ |
  | OS | Linux 4.1.18 |
  | Dimensions | 88mm x 90mm x 29mm(H) |
- URL: `http://genisev.com/secc/`

#### EVCC (Electric Vehicle Communication Controller)
- 제품명: **CEM** — 전기차 충전기와 충전제어 메시지를 송수신하는 차량 PLC 통신 모뎀 (VCU, BMS, OBC와 통신)
- 주요 스펙:
  | 항목 | 값 |
  |------|-----|
  | Interface | CAN 2.0 B, 500KBps |
  | PLC Communication | HPGP (HomePlug Green PHY™), ISO/IEC 15118-3 |
  | EVCC Function | IEC 61851, DIN 70121, ISO15118 AC/DC Charging Control |
  | Operating Voltage | 9V ~ 38V |
  | Operating Temperature | -40℃ ~ 125℃ |
  | OS | RTOS |
  | Dimension | 160 x 120 x 40 |
  | IP | IPX5 (Aluminum 케이스) |
- URL: `http://genisev.com/evcc/`

### 3-3. BMS (Battery Management System)

- **설명**: 기능별 모듈화로 유연한 개발 환경 & 확장성 제공
- **아키텍처**: 지게차·전기버스·전기스쿠터·초소형 전기차·ESS용 배터리 시스템을 위한 혁신적인 하드웨어 제공. 소프트웨어 10년 이상 개발 경험 반영.
- URL: `http://genisev.com/battery-management-system/`

### 3-4. Contact (계약/문의)

- 본사: [13646] 경기도 성남시 수정구 위례광장로19 아이페리온 1103호
- 공장: [54158] 전북 군산시 동장산 2길 6 자동차융합기술원 본관동 2207호
- Sales: `sales@genisev.com`
- Phone: `+82-70-8836-8365`
- 문의 URL: `http://genisev.com/contact/`

---

## 4. 시스템 프롬프트 (GENISEV_SYSTEM_PROMPT)

`webmcp-widget.js`가 질문 앞에 자동으로 붙이는 시스템 프롬프트입니다.

```
당신은 ㈜제니스코리아(Genis Korea)의 AI 비서입니다.
제니스코리아는 전기차 부품 및 솔루션 전문 기업입니다.
주요 사업 분야: BMS, EVCC, SECC, EVSE, DIN70121, ISO15118, V2G, CCS, CCTS.
회사 실적: 국내외 10,000개 이상의 GENIS Device/System 사용, 34개 프로젝트 수행, 50개 고객사 협력.
충전 솔루션: SECC(CSM, 충전기 통신 모뎀)와 EVCC(CEM, 차량 통신 모뎀)를 제공하며 DIN70121/ISO15118 국제표준을 지원합니다.
BMS: 지게차, 전기버스, 전기스쿠터, 초소형 전기차, ESS용 배터리 관리 시스템을 제공합니다.
본사: 경기도 성남시 수정구 위례광장로19 아이페리온 1103호.
공장: 전북 군산시 동장산 2길 6 자동차융합기술원 본관동 2207호.
문의: sales@genisev.com | Tel: +82-70-8836-8365.
답변은 한국어로, 친절하고 간결하게 작성하세요.
```

---

## 5. 위젯 테마 (붉은색 + 옅은 하늘색)

제미니(제니스) 브랜드 컬러 조합입니다.

| CSS 변수 | 값 | 설명 |
|----------|-----|------|
| `--wmcp-primary` | `#c62828` | 메인 브랜드 색 (제미니 레드) |
| `--wmcp-primary2` | `#e53935` | 그라디언트 보조 색 (밝은 레드) |
| `--wmcp-bg` | `#e3f2fd` | 패널 바탕색 (옅은 하늘색) |
| `--wmcp-surface` | `#ffffff` | 말풍선/입력바 배경 |
| `--wmcp-pill-bg` | `#ffebee` | 픽스 칩 배경 (옅은 레드) |

---

## 6. 테넌트 등록 (DB `webmcp.tenants`)

| id | origin | site_ns | model_name | rate_limit | tier |
|----|--------|---------|------------|------------|------|
| 4 | `http://192.168.31.136:8081` | genisev | gemini-3.5-flash-lite | 100 | dev |
| 9 | `http://genisev.com` | genisev | gemini-3.5-flash-lite | 20 | prod |
| 10 | `https://genisev.com` | genisev | gemini-3.5-flash-lite | 20 | prod |
| 11 | `http://www.genisev.com` | genisev | gemini-3.5-flash-lite | 20 | prod |
| 12 | `https://www.genisev.com` | genisev | gemini-3.5-flash-lite | 20 | prod |

> Gemini 키는 기존 hospital 테넌트와 동일한 키(`AQ.Ab8RN6K87...`)를 재사용했습니다.

---

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| `webmcp/front/genisev.html` | 데모 페이지 (AI비서 메뉴 + 위젯 스크립트 포함) |
| `webmcp/front/genisev-config.js` | WebMCPConfig + 시스템 프롬프트 + 지식 데이터 |
| `webmcp/front/webmcp-tools.js` | 표준 WebMCP 도구 등록 (document.modelContext.registerTool) |
| `webmcp/front/webmcp-widget.js` | 공용 위젯 로직 (genisev 사이트 지원 추가됨) |
| `webmcp/front/webmcp.js` | 공용 프록시 호출 라이브러리 |
| `webmcp/front/widget.js` | 공용 위젯 로더 |
| `webmcp/front/widget.css` | 위젯 스타일 |
| `deploy_genisev.sh` | 배포 자동화 스크립트 |

---

## 8. 배포 방법

```bash
# 로컬 → 서버(192.168.31.136)로 배포
./deploy_genisev.sh
```

동작:
1. `webmcp/front/` 의 genisev 관련 파일 6개를 서버 `/tmp`로 `scp`
2. `ssh -t`로 TTY 할당 후 `sudo cp` 실행 → 비밀번호 대화식 입력
3. 완료 후 `http://192.168.31.136:8081/genisev.html` 접속

> 💡 **주의**: `sudo cp`는 root 권한이 필요하므로, `deploy_genisev.sh`(ssh -t 사용)를 통해 실행해야 비밀번호를 정상 입력할 수 있습니다.

---

## 9. genisev.html 수정 내역

원본 웹사이트 다운로드 HTML에 아래 항목을 추가했습니다.

1. `<head>` 에 위젯 스타일 추가:
   ```html
   <link rel="stylesheet" href="widget.css?v=1" />
   ```
2. `<head>` 에 표준 WebMCP 도구 등록 스크립트를 **맨 앞**에 추가 (기존 스크립트와 독립 실행):
   ```html
   <script src="genisev-config.js?v=2"></script>
   <script src="webmcp-tools.js?v=2"></script>
   ```
3. 데스크톱/모바일 헤더의 `ENGLISH` 메뉴 옆에 `AI비서` 메뉴 추가
4. `</body>` 앞에 위젯 UI 스크립트 추가:
   ```html
   <script src="webmcp.js?v=3"></script>
   <script src="widget.js?v=3"></script>
   ```
5. `openWebmcpWidget()` 함수 정의 (AI비서 메뉴 클릭 시 위젯 패널 열기)

> ⚠️ 표준 WebMCP 도구 등록(`genisev-config.js` + `webmcp-tools.js`)은
> WordPress의 무거운 스크립트들이 로드되기 **전에** 실행되어야 하므로
> `<head>` 최상단에 배치합니다. (본문 끝에 두면 중간 스크립트 오류로 실행이 중단될 수 있음)

---

## 10. 트러블슈팅 기록

| 증상 | 원인 | 해결 |
|------|------|------|
| AI비서 패널이 화면 전체로 깨짐 | `genisev.html`에 `widget.css` 링크 누락 | `<head>`에 `<link rel="stylesheet" href="widget.css">` 추가 |
| 403 "등록되지 않은 도메인" | `http://192.168.31.136:8081` 미등록 | DB tenants에 origin 등록 |
| 빠른 메뉴가 "제미니 소개"로 표시 | config의 label 오타 | `제미니 소개` → `제니스코리아 소개` 수정 |
| 빠른 메뉴가 "contract"로 표시 | config의 key 오타 | `contract` → `contact` 수정 (group·label 모두) |
| 정보 표가 페이지 상단에 노출됨 | 개발용 디버그 정보를 하드코딩 추가 | 정보 표 제거 (고객사 페이지에는 개발 정보 노출 금지) |
| 검사기에서 genisev 도구만 안 보임 | WordPress 스크립트 로딩 순서 | `webmcp-tools.js`를 `<head>` 맨 앞으로 이동해 독립 실행 |

> 📌 **표준 WebMCP 도구 등록 vs 하드코딩 표 구분 (중요)**
> - `yonja.html`/`hospital.html`은 **데모 페이지**라서 "등록된 WebMCP 툴" 표가 HTML에 하드코딩되어 노출됨
> - `genisev.html`은 **실제 고객사 페이지**이므로 개발 정보(SiteNs·키·모델)는 노출하면 안 됨
> - 실제 도구 등록은 `webmcp-tools.js`가 `document.modelContext.registerTool()`로 수행 (표와 무관)
> - 검사기 확장 프로그램 인식 여부는 하드코딩 표가 아니라 **실제 registerTool 성공 여부**에 달림
