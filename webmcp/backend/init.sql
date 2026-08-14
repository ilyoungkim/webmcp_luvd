-- ============================================================================
-- webmcp/backend/init.sql — WebMCP DB 초기화/이식 스크립트
-- ============================================================================
-- 사용법:
--   mysql -h <DB_HOST> -u <DB_USER> -p < webmcp/backend/init.sql
--   (webmcp 데이터베이스가 이미 존재해야 합니다)
--
--   또는 DB 생성까지 포함하려면:
--   mysql -h <DB_HOST> -u root -p -e "CREATE DATABASE webmcp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--   mysql -h <DB_HOST> -u <DB_USER> -p webmcp < webmcp/backend/init.sql
--
-- 테이블:
--   tenants       : 멀티테넌트(도메인별 Gemini 키/한도) 설정
--   request_logs  : 요청 로깅 (비정상 접속 감지/분석)
-- ============================================================================

-- ── 1. 테넌트(도메인별 설정) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    origin        VARCHAR(255) NOT NULL UNIQUE,      -- 예: https://yonza.co.kr
    site_ns       VARCHAR(64)  NOT NULL DEFAULT 'site', -- WebMCPConfig.siteNs
    gemini_key    TEXT         NOT NULL,             -- Gemini API 키 (DB에만 보관)
    model_name    VARCHAR(128) NOT NULL DEFAULT 'gemini-2.0-flash',
    rate_limit    INT UNSIGNED NOT NULL DEFAULT 20,  -- 분당 도메인 호출 한도
    tier          VARCHAR(32)  NOT NULL DEFAULT 'dev',
    enabled       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. 요청 로그 (비정상 접속 감지) ────────────────────────────
CREATE TABLE IF NOT EXISTS request_logs (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ts          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    origin      VARCHAR(255) NULL,
    referer     TEXT         NULL,
    user_agent  TEXT         NULL,
    sec_ch_ua   TEXT         NULL,
    ip          VARCHAR(64)  NULL,
    path        VARCHAR(255) NULL,
    body_len    INT UNSIGNED NULL,
    verdict     VARCHAR(32)  NULL,    -- ok | blocked_401 | blocked_403 | blocked_429
    reason      VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. 인덱스 ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_logs_ts     ON request_logs(ts);
CREATE INDEX IF NOT EXISTS idx_logs_ip     ON request_logs(ip);
CREATE INDEX IF NOT EXISTS idx_logs_origin ON request_logs(origin);

-- ── 4. (선택) 개발용 테넌트 시드 데이터 ─────────────────────────
-- 실제 Gemini 키로 교체하세요. (운영 배포 시 주석 해제)
-- INSERT INTO tenants (origin, site_ns, gemini_key, model_name, rate_limit, tier) VALUES
--   ('http://localhost:8000',      'yonja', 'YOUR_GEMINI_KEY', 'gemini-3.5-flash-lite', 100, 'dev'),
--   ('http://localhost:3000',      'yonja', 'YOUR_GEMINI_KEY', 'gemini-3.5-flash-lite', 100, 'dev'),
--   ('https://yonza.co.kr',        'yonja', 'YOUR_GEMINI_KEY', 'gemini-3.5-flash-lite', 20,  'prod'),
--   ('http://192.168.31.136:8081', 'yonja', 'YOUR_GEMINI_KEY', 'gemini-3.5-flash-lite', 100, 'dev');
