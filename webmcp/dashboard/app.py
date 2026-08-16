# ============================================================================
# webmcp/dashboard/app.py — WebMCP 백엔드 DB 대시보드 (Streamlit)
# ============================================================================
# DB(webmcp)에 저장된 정보를 시각화합니다.
#   - tenants  : 멀티테넌트(도메인별 Gemini 키/한도) 설정
#   - request_logs : 요청 로깅 (비정상 접속 감지/분석)
#
# 실행 방법:
#   cd webmcp/dashboard
#   streamlit run app.py
# ============================================================================
import pandas as pd
import plotly.express as px
import streamlit as st

import db

st.set_page_config(
    page_title="WebMCP 대시보드",
    page_icon="📊",
    layout="wide",
)

# ── 사이드바: DB 접속 상태 ─────────────────────────────────────
st.sidebar.title("📊 WebMCP 대시보드")
st.sidebar.caption("DB(webmcp)에 저장된 정보를 확인합니다.")


@st.cache_data(ttl=30)
def load_tenants():
    return db.query("SELECT * FROM tenants ORDER BY id")


@st.cache_data(ttl=30)
def load_logs(limit=5000):
    return db.query(
        "SELECT * FROM request_logs ORDER BY ts DESC LIMIT %s", (limit,)
    )


@st.cache_data(ttl=30)
def load_summary():
    return db.query_one(
        """
        SELECT
            COUNT(*) AS total,
            SUM(verdict = 'ok') AS ok_count,
            SUM(verdict != 'ok') AS blocked_count,
            COUNT(DISTINCT origin) AS origin_count,
            COUNT(DISTINCT ip) AS ip_count,
            MIN(ts) AS first_ts,
            MAX(ts) AS last_ts
        FROM request_logs
        """
    )


# ── DB 연결 확인 ───────────────────────────────────────────────
try:
    summary = load_summary()
    db_ok = True
except Exception as e:
    summary = None
    db_ok = False
    db_error = str(e)

if not db_ok:
    st.error("DB 연결에 실패했습니다.")
    st.code(db_error, language="text")
    st.info(
        "`webmcp/dashboard/.env` 파일에 DB 접속 정보가 올바른지 확인하세요. "
        "없다면 `.env.example`을 복사해 만드세요."
    )
    st.stop()

# ── 상단 KPI 카드 ──────────────────────────────────────────────
st.title("📊 WebMCP 백엔드 DB 대시보드")

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("총 요청", f"{summary['total']:,}")
c2.metric("정상 요청", f"{summary['ok_count'] or 0:,}")
c3.metric("차단 요청", f"{summary['blocked_count'] or 0:,}")
c4.metric("도메인(테넌트)", f"{summary['origin_count'] or 0:,}")
c5.metric("고유 IP", f"{summary['ip_count'] or 0:,}")

st.caption(
    f"기간: {summary['first_ts']} ~ {summary['last_ts']} "
    f"(최근 30초 캐시, 새로고침 시 갱신)"
)

# ── 탭 구성 ────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs(
    ["📈 요청 분석", "🏢 테넌트 설정", "🚫 차단 로그", "📋 전체 로그"]
)

# ══════════════════════════════════════════════════════════════
# TAB 1: 요청 분석
# ══════════════════════════════════════════════════════════════
with tab1:
    logs = load_logs()
    if not logs:
        st.info("아직 요청 로그가 없습니다.")
    else:
        df = pd.DataFrame(logs)

        # 시간대별 요청 수 (분 단위)
        df["ts"] = pd.to_datetime(df["ts"])
        df["minute"] = df["ts"].dt.floor("min")
        hourly = (
            df.groupby("minute")
            .size()
            .reset_index(name="count")
            .sort_values("minute")
        )

        st.subheader("시간대별 요청 수")
        fig = px.line(
            hourly,
            x="minute",
            y="count",
            markers=True,
            title="요청 추이 (분 단위)",
        )
        st.plotly_chart(fig, width='stretch')

        # verdict 별 분포
        st.subheader("요청 상태(verdict) 분포")
        verdict_counts = df["verdict"].fillna("ok").value_counts().reset_index()
        verdict_counts.columns = ["verdict", "count"]
        fig2 = px.pie(
            verdict_counts,
            names="verdict",
            values="count",
            title="verdict 분포",
        )
        st.plotly_chart(fig2, width='stretch')

        # 도메인별 요청 수
        st.subheader("도메인(origin)별 요청 수")
        origin_counts = (
            df["origin"].fillna("(없음)").value_counts().reset_index()
        )
        origin_counts.columns = ["origin", "count"]
        fig3 = px.bar(
            origin_counts,
            x="origin",
            y="count",
            title="도메인별 요청 수",
        )
        st.plotly_chart(fig3, width='stretch')

        # IP별 요청 수 (상위 20)
        st.subheader("IP별 요청 수 (상위 20)")
        ip_counts = (
            df["ip"].fillna("(없음)").value_counts().head(20).reset_index()
        )
        ip_counts.columns = ["ip", "count"]
        fig4 = px.bar(
            ip_counts,
            x="ip",
            y="count",
            orientation="h",
            title="IP별 요청 수",
        )
        st.plotly_chart(fig4, width='stretch')

# ══════════════════════════════════════════════════════════════
# TAB 2: 테넌트 설정
# ══════════════════════════════════════════════════════════════
with tab2:
    tenants = load_tenants()
    if not tenants:
        st.info("등록된 테넌트가 없습니다.")
    else:
        st.subheader("테넌트(도메인별) 설정")
        st.caption(
            "도메인을 선택해 하나의 화면에서 **사용 여부(활성/비활성) · 분당 호출 한도 · 등급(tier) · Gemini 모델**을 "
            "모두 설정할 수 있습니다."
        )

        # ── 설정할 테넌트 선택 ─────────────────────────────────
        tenant_options = {
            f"{t['origin']} (id:{t['id']})": t for t in tenants
        }
        selected_label = st.selectbox(
            "설정할 테넌트 선택",
            options=list(tenant_options.keys()),
            key="tenant_select",
        )
        sel = tenant_options[selected_label]

        st.markdown(
            "🟢 활성" if sel["enabled"] else "🔴 비활성",
            help="현재 상태",
        )

        # ── 통합 설정 폼 (사용 여부 + 한도 + 등급 + 모델) ───────
        with st.form(key=f"tenant_form_{sel['id']}"):
            col_a, col_b = st.columns([1, 4])
            with col_a:
                new_enabled = st.toggle(
                    "도메인 사용",
                    value=bool(sel["enabled"]),
                    help="비활성 시 해당 도메인 요청이 403 차단됩니다.",
                    key=f"enabled_{sel['id']}",
                )
            with col_b:
                st.markdown(f"**{sel['origin']}**  \n`site_ns: {sel['site_ns']}`")

            col_c, col_d, col_e = st.columns(3)
            with col_c:
                new_rate = st.number_input(
                    "분당 호출 한도 (rate_limit)",
                    min_value=1,
                    max_value=10000,
                    value=int(sel["rate_limit"]),
                    step=1,
                    key=f"rate_{sel['id']}",
                )
            with col_d:
                new_tier = st.selectbox(
                    "등급 (tier)",
                    options=["dev", "prod", "test", "beta"],
                    index=["dev", "prod", "test", "beta"].index(sel["tier"])
                    if sel["tier"] in ["dev", "prod", "test", "beta"]
                    else 0,
                    key=f"tier_{sel['id']}",
                )
            with col_e:
                new_model = st.text_input(
                    "Gemini 모델 (model_name)",
                    value=sel["model_name"],
                    key=f"model_{sel['id']}",
                )

            submitted = st.form_submit_button("💾 설정 저장", type="primary")

        # ── 저장 처리 (변경된 항목만 DB 반영) ───────────────────
        if submitted:
            updated = False

            if new_enabled != bool(sel["enabled"]):
                db.set_tenant_enabled(sel["id"], new_enabled)
                updated = True

            if int(new_rate) != int(sel["rate_limit"]):
                db.set_tenant_rate_limit(sel["id"], int(new_rate))
                updated = True

            if new_tier != sel["tier"]:
                db.set_tenant_tier(sel["id"], new_tier)
                updated = True

            if (new_model or "").strip() != sel["model_name"]:
                db.set_tenant_model(sel["id"], new_model.strip())
                updated = True

            if updated:
                st.toast(f"{sel['origin']} 설정이 저장되었습니다.")
                load_tenants.clear()  # 캐시 무효화
                st.rerun()
            else:
                st.info("변경된 설정이 없습니다.")

        st.divider()

        # ── 테넌트 목록 테이블 (키 마스킹) ──────────────────────
        st.subheader("전체 테넌트 목록")
        tdf = pd.DataFrame(tenants)
        if "gemini_key" in tdf.columns:
            tdf["gemini_key"] = tdf["gemini_key"].apply(
                lambda k: (k[:6] + "…" + k[-4:]) if isinstance(k, str) and len(k) > 12 else "***"
            )
        st.dataframe(tdf, width='stretch')

        st.subheader("테넌트별 요청 현황")
        logs2 = load_logs()
        if logs2:
            df2 = pd.DataFrame(logs2)
            df2["origin"] = df2["origin"].fillna("(없음)")
            per_tenant = (
                df2.groupby("origin")
                .agg(
                    total=("id", "count"),
                    ok=("verdict", lambda s: (s == "ok").sum()),
                    blocked=("verdict", lambda s: (s != "ok").sum()),
                )
                .reset_index()
            )
            st.dataframe(per_tenant, width='stretch')

# ══════════════════════════════════════════════════════════════
# TAB 3: 차단 로그
# ══════════════════════════════════════════════════════════════
with tab3:
    blocked = db.query(
        "SELECT * FROM request_logs WHERE verdict != 'ok' ORDER BY ts DESC LIMIT 500"
    )
    if not blocked:
        st.info("차단된 요청이 없습니다. 🎉")
    else:
        bdf = pd.DataFrame(blocked)
        st.subheader("차단된 요청 (최근 500건)")
        st.dataframe(bdf, width='stretch')

        st.subheader("차단 사유(reason) 분포")
        reason_counts = (
            bdf["reason"].fillna("(없음)").value_counts().reset_index()
        )
        reason_counts.columns = ["reason", "count"]
        fig5 = px.bar(
            reason_counts,
            x="reason",
            y="count",
            title="차단 사유 분포",
        )
        st.plotly_chart(fig5, width='stretch')

# ══════════════════════════════════════════════════════════════
# TAB 4: 전체 로그
# ══════════════════════════════════════════════════════════════
with tab4:
    all_logs = load_logs(limit=1000)
    if not all_logs:
        st.info("로그가 없습니다.")
    else:
        adf = pd.DataFrame(all_logs)
        st.subheader("전체 요청 로그 (최근 1000건)")
        st.dataframe(adf, width='stretch')

st.sidebar.markdown("---")
st.sidebar.caption("WebMCP 백엔드 DB 대시보드 · Streamlit")
