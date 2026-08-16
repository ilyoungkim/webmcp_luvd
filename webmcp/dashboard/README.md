# ============================================================================
# webmcp/dashboard/README.md — WebMCP 백엔드 DB 대시보드
# ============================================================================
# Streamlit 기반으로 DB(webmcp)에 저장된 정보를 시각화하는 대시보드입니다.
# ============================================================================

## 개요

WebMCP 백엔드(`webmcp/backend/app.py`)가 DB에 저장하는 정보를 확인하는 대시보드입니다.

- **`tenants`** : 멀티테넌트(도메인별 Gemini 키/한도) 설정
- **`request_logs`** : 요청 로깅 (비정상 접속 감지/분석)

## 디렉토리 구조

```
webmcp/dashboard/
├── app.py              # Streamlit 대시보드 메인
├── db.py               # DB 접속 및 쿼리 헬퍼
├── requirements.txt    # Python 의존성
├── run.sh              # 실행 스크립트
├── .env.example        # DB 접속 설정 예시
└── README.md           # 이 문서
```

## 설치 및 실행

### 1. 의존성 설치

```bash
cd webmcp/dashboard
pip install -r requirements.txt
```

### 2. DB 접속 설정

`.env.example`을 복사해 `.env`를 만들고 실제 DB 접속 정보로 수정합니다.

```bash
cp .env.example .env
# .env 파일을 열어 DB_HOST / DB_USER / DB_PASSWORD / DB_NAME 수정
```

> 💡 `webmcp/backend/app.py`와 동일한 DB 접속 정보를 사용합니다.

### 3. 실행

```bash
# 방법 1: 실행 스크립트 사용 (기본 포트 8501)
./run.sh

# 방법 2: 포트 지정
./run.sh 8502

# 방법 3: 직접 실행
streamlit run app.py
```

브라우저에서 `http://localhost:8501` 접속합니다.

## 대시보드 탭 구성

| 탭 | 내용 |
|----|------|
| **📈 요청 분석** | 시간대별 요청 수, verdict 분포, 도메인별/IP별 요청 수 |
| **🏢 테넌트 설정** | 테넌트(도메인별 Gemini 키/한도) 목록, 테넌트별 요청 현황 |
| **🚫 차단 로그** | 차단된 요청(401/403/429) 목록, 차단 사유 분포 |
| **📋 전체 로그** | 최근 요청 로그 전체 |

## 보안 참고

- Gemini API 키는 대시보드에서 **마스킹**되어 표시됩니다.
- 대시보드는 내부 관리용이므로, 외부에 노출하지 마세요. (필요 시 인증 추가 권장)
