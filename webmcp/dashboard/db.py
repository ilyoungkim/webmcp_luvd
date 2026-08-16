# ============================================================================
# webmcp/dashboard/db.py — DB 접속 및 쿼리 헬퍼
# ============================================================================
# backend/app.py 와 동일한 DB 접속 정보를 사용합니다.
# .env 파일에서 DB_HOST / DB_USER / DB_PASSWORD / DB_NAME 을 읽습니다.
# ============================================================================
import os

import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "192.168.31.136")
DB_USER = os.getenv("DB_USER", "fortune")
DB_PASSWORD = os.getenv("DB_PASSWORD", "user!1234@abcd")
DB_NAME = os.getenv("DB_NAME", "webmcp")


def get_conn():
    """DB 커넥션을 반환합니다. (DictCursor, autocommit)"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def query(sql, params=None):
    """SELECT 쿼리를 실행하고 결과 리스트를 반환합니다."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()


def query_one(sql, params=None):
    """SELECT 쿼리를 실행하고 단일 행을 반환합니다. (없으면 None)"""
    rows = query(sql, params)
    return rows[0] if rows else None
