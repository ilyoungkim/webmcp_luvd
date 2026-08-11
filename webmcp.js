/**
 * ============================================================================
 *  WebMCP 공통 라이브러리 (webmcp.js)
 * ============================================================================
 *
 *  WebMCP(Web Model Context Protocol)는 웹사이트가 AI 에이전트에게
 *  "우리 사이트에서는 이런 기능을 이렇게 호출하면 됩니다"라고 구조화된
 *  tool(함수) 형태로 노출하는 웹 표준(제안 단계)입니다.
 *
 *  이 파일은 아래 구조를 따릅니다.
 *
 *     공통 라이브러리(webmcp.js)  ←  사이트 전체에서 한 번만 로드
 *        │
 *        ├── 항목(item) 정의        ← "이 페이지에서 노출할 데이터/기능" 추가
 *        └── name 정의              ← tool 이름 규칙(namespace) 추가
 *        │
 *        ▼
 *     navigator.modelContext.registerTool()  ← AI 에이전트가 호출 가능한 tool 등록
 *
 *  ⚠️  주의: WebMCP API는 아직 제안(proposed) 표준입니다.
 *      Chrome 버전/플래그에 따라 아래 두 방식으로 동작할 수 있으며,
 *      이 라이브러리는 두 가지 모두에 안전하게 폴백(fallback)하도록 작성했습니다.
 *
 *      1) navigator.modelContext.registerTool()   (Imperative API, 권장)
 *      2) window.modelContext.registerTool()       (일부 환경 폴백)
 *
 *  만약 아무 API도 지원하지 않는 브라우저라면 조용히 스킵됩니다.
 *  (콘솔 경고만 출력하고 페이지 동작에는 영향을 주지 않습니다.)
 * ============================================================================
 *
 *  ▶ 파라미터로 설정하기 (window.WebMCPConfig)
 *    이 라이브러리는 하드코딩 값 대신 `window.WebMCPConfig` 객체를 통해
 *    사이트 식별자, 언어, 디버그, name(namespace), item(기능)을 주입할 수 있습니다.
 *
 *    [HTML 사용 예시]
 *    <script>
 *      window.WebMCPConfig = {
 *        siteNs: 'yonja',              // 사이트 식별자 (namespace)
 *        lang: 'ko',
 *        debug: true,
 *        names: { ... },               // (선택) name 정의 오버라이드
 *        items: [ ... ],               // (선택) item 정의 오버라이드
 *      };
 *    </script>
 *    <script type="module" src="./webmcp.js"></script>
 *
 *    📌 순서 중요: WebMCPConfig 스크립트를 반드시 webmcp.js 보다 **먼저** 로드하세요.
 *    📌 생략하면 아래 기본값(hospital 예시)이 사용됩니다.
 * ============================================================================
 */

(function () {
  'use strict';

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * 1. 설정 영역 — 파라미터로 오버라이드 가능
   * ─────────────────────────────────────────────────────────────────────────
   *
   * 아래 값들은 `window.WebMCPConfig` 파라미터로 오버라이드할 수 있습니다.
   * 파라미터를 지정하지 않으면 이 파일의 기본값이 사용됩니다.
   *
   *   window.WebMCPConfig = {
   *     siteNs: 'yonja',   // 사이트 식별자 (namespace)
   *     lang:   'ko',      // 언어
   *     debug:  true,      // 디버그 로그
   *     names:  {...},     // (선택) name 정의
   *     items:  [...],     // (선택) item(기능) 정의
   *   };
   */

  // 페이지에서 전달된 파라미터 (없으면 빈 객체)
  const _cfg = (typeof window !== 'undefined' && window.WebMCPConfig) || {};

  /** 사이트의 고유 식별자(브랜드명/도메인 등). tool 이름의 namespace로 사용됩니다. */
  const SITE_NS = _cfg.siteNs || 'hospital'; // 기본: 'hospital', 예: 'yonja', 'luvd', 'clinic'

  /** 사이트 기본 언어 (tool 설명/입력 스키마에 사용). */
  const SITE_LANG = _cfg.lang || 'ko';

  /** 디버그 로그 출력 여부 (운영 배포 시 false로 끄세요). */
  const DEBUG = _cfg.debug !== undefined ? _cfg.debug : true;

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * 2. 공통 유틸리티 — 내부에서만 사용하는 헬퍼 함수들
   * ─────────────────────────────────────────────────────────────────────────
   */

  /** 디버그 로그 헬퍼 */
  function debugLog(...args) {
    if (DEBUG && typeof console !== 'undefined') {
      console.log('[WebMCP]', ...args);
    }
  }

  /** 현재 페이지에서 사용 가능한 modelContext 객체를 가져옵니다. (없으면 null) */
  function getModelContext() {
    // 1) 표준 Imperative API (document.modelContext 권장)
    if (typeof document !== 'undefined' && document.modelContext) {
      return document.modelContext;
    }
    // 2) 레거시 폴백 (deprecated)
    if (typeof navigator !== 'undefined' && navigator.modelContext) {
      return navigator.modelContext;
    }
    // 3) 일부 환경 폴백
    if (typeof window !== 'undefined' && window.modelContext) {
      return window.modelContext;
    }
    return null;
  }

  /**
   * 데이터 항목을 읽습니다.
   * 값이 "함수"면 호출해 결과를 반환하고, "상수"면 그대로 반환합니다.
   * 이를 통해 정적 데이터뿐 아니라 DOM 조회 등 동적 데이터도 지원합니다.
   */
  function resolveValue(value) {
    if (typeof value === 'function') {
      return value();
    }
    return value;
  }

  /**
   * 실행 핸들러를 안전하게 래핑합니다.
   * handler가 "함수"면 arguments를 전달해 호출하고,
   * "객체(정적 반환값)"면 그대로 반환합니다.
   */
  function wrapExecute(handler) {
    return async function (args) {
      try {
        if (typeof handler === 'function') {
          return await handler(args || {});
        }
        // 정적 데이터인 경우 그대로 반환
        return handler;
      } catch (err) {
        debugLog('tool 실행 중 오류 발생:', err);
        return {
          error: true,
          message: err.message || 'Unknown error',
        };
      }
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * 3. 아이템(item) 및 name 정의 — 확장 포인트
   * ─────────────────────────────────────────────────────────────────────────
   *
   * 🔧 확장 방법
   *   이 라이브러리는 "병원" 도메인을 예시로 들지만, 아이템을 추가/변경하면
   *   어떤 도메인(법률, 금융, 쇼핑몰, 프랜차이즈 등)에도 그대로 사용할 수 있습니다.
   *
   *   ▶ name 정의 (namespace)
   *     tool 이름은 "{SITE_NS}.{group}.{name}" 형태로 만들어집니다.
   *     예) hospital.doctor.get_info
   *     아래 NAMES 상수에 그룹별 이름 목록을 추가하면 자동으로 namespace가 붙습니다.
   *
   *   ▶ item 정의 (노출할 데이터/기능)
   *     ITEMS 배열의 각 항목이 하나의 tool이 됩니다. item 구조:
   *
   *     {
   *       group:   "어느 그룹(name)에 속하는지"           (필수)
   *       name:    "tool의 마지막 이름"                  (필수)
   *       title:   "사람이 읽을 수 있는 짧은 제목"        (권장)
   *       description: "AI가 이해할 도구 설명"           (권장)
   *       inputSchema: { type, properties, required }   (선택) JSON Schema
   *       getData: () => { ... }                        (선택) 반환할 데이터
   *                    → 함수면 호출 결과를, 아니면 그대로 반환
   *     }
   */

  /** name(namespace) 정의 — 그룹 단위로 tool 이름을 정리합니다.
   *  `window.WebMCPConfig.names`로 오버라이드할 수 있습니다. */
  const NAMES = _cfg.names || {
    // 병원 그룹: hospital.get_info
    hospital: {
      names: ['get_info'],
      description: '병원 기본정보 · 진료과 · 위치 · 운영시간 조회',
    },
    // 의사 그룹: hospital.doctor.get_info
    doctor: {
      names: ['get_info'],
      description: '의사 · 전문분야 · 진료시간 · 소속 진료과 조회',
    },
    // 예약 그룹: hospital.appointment.get_current
    appointment: {
      names: ['get_current'],
      description: '로그인한 환자의 현재 예약정보 조회',
    },
  };

  /**
   * ITEMS — 각 tool로 등록할 데이터/기능 정의.
   *
   * 🔧 새 tool을 추가하는 예시 (예: 병원 위치/운영시간 tool 추가):
   *
   *   {
   *     group: 'hospital',
   *     name: 'get_hours',
   *     title: '진료시간',
   *     description: '병원의 진료시간과 휴진일 정보를 조회합니다.',
   *     getData: {
   *       mon: '09:00~18:00',
   *       sat: '09:00~13:00',
   *       holiday: '공휴일 휴진',
   *     },
   *   },
   */
  const ITEMS = _cfg.items || [
    {
      group: 'hospital',
      name: 'get_info',
      title: '병원 정보',
      description:
        '병원의 기본 정보(이름, 주소, 전화번호)와 진료과, 위치, 운영시간을 조회합니다.',
      getData: {
        name: '연애의자격 병원 (예시)',
        address: '서울특별시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        departments: ['심리상담', '가정의학과', '정신건강의학과'],
        hours: '월~금 09:00~18:00',
      },
    },
    {
      group: 'doctor',
      name: 'get_info',
      title: '의사 정보',
      description: '의사의 전문분야, 진료시간, 소속 진료과 정보를 조회합니다.',
      // 동적 데이터 예시: 함수로 DOM에서 읽어올 수도 있음
      getData: function () {
        // 페이지에 따라 실제 데이터로 교체하세요.
        return {
          name: '김상담 원장',
          specialty: '이별·재회 상담',
          department: '심리상담',
          schedule: '월/수/금',
        };
      },
    },
    {
      group: 'appointment',
      name: 'get_current',
      title: '현재 예약 정보',
      description: '로그인한 사용자의 현재 예약 상태와 일정을 조회합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '예약자를 식별하는 사용자 ID' },
        },
        required: ['userId'],
      },
      // 동적 실행 예시: 파라미터를 받아 처리하는 함수
      getData: async function (args) {
        const userId = (args && args.userId) || 'guest';
        return {
          userId: userId,
          status: '예약됨',
          nextAppointment: '2026-08-15 10:00',
        };
      },
    },
  ];

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * 4. tool 등록 엔진 — ITEMS/NAMES를 실제 WebMCP tool로 변환
   * ─────────────────────────────────────────────────────────────────────────
   */

  /**
   * ITEMS 배열을 modelContext에 등록 가능한 tool 형태로 변환합니다.
   * tool name 규칙: "{SITE_NS}.{group}.{name}" (예: hospital.doctor.get_info)
   */
  function buildTools() {
    return ITEMS.map(function (item) {
      const fullName = [SITE_NS, item.group, item.name].join('.');

      return {
        // ── tool 식별 정보 ──────────────────────────────────────────────
        name: fullName,
        description: item.description || item.title || fullName,

        // ── 입력 스키마 (있으면) ─────────────────────────────────────────
        inputSchema: item.inputSchema || {
          type: 'object',
          properties: {},
          required: [],
        },

        // ── 실행 핸들러 ──────────────────────────────────────────────────
        execute: wrapExecute(item.getData),
      };
    });
  }

  /**
   * WebMCP 미지원 브라우저에서 사용자에게 활성화 방법을 안내합니다.
   * 콘솔에 명확한 안내 메시지를 출력합니다.
   */
  function showUnsupportedGuide() {
    if (typeof console === 'undefined') return;

    console.warn(
      '%c[WebMCP] 이 브라우저는 WebMCP를 지원하지 않습니다.',
      'color:#e67e22;font-weight:bold;'
    );
    console.warn(
      '%c[WebMCP] 최신 Chrome에서 WebMCP를 활성화하려면 아래를 따라 하세요:',
      'color:#e67e22;'
    );
    console.warn(
      '%c[WebMCP] 1) chrome://flags 에서 "Web Model Context" 또는 "modelContext" 검색',
      'color:#95a5a6;'
    );
    console.warn(
      '%c[WebMCP] 2) 해당 플래그를 Enabled 로 변경 후 Chrome 재시작',
      'color:#95a5a6;'
    );
    console.warn(
      '%c[WebMCP] 3) http://localhost:8000/yonja.html 처럼 로컬 서버로 페이지 열기',
      'color:#95a5a6;'
    );
    console.warn(
      '%c[WebMCP] 4) 콘솔에서 navigator.modelContext 가 정의되어 있는지 확인',
      'color:#95a5a6;'
    );
    console.warn(
      '%c[WebMCP] 자세한 내용: https://developer.chrome.com/docs/ai/webmcp',
      'color:#3498db;'
    );
  }

  /**
   * 사이트에 등록할 tool 목록을 초기화하고 등록합니다.
   * API 미지원 환경에서는 안내 메시지를 출력하고 종료합니다.
   */
  function init() {
    const ctx = getModelContext();

    if (!ctx) {
      debugLog(
        '이 브라우저는 WebMCP를 지원하지 않습니다. 등록을 건너뜁니다.'
      );
      showUnsupportedGuide();
      return;
    }

    const tools = buildTools();

    tools.forEach(function (tool) {
      try {
        ctx.registerTool(tool);
        debugLog('tool 등록 완료:', tool.name);
      } catch (err) {
        debugLog('tool 등록 실패:', tool.name, err);
      }
    });

    debugLog('총', tools.length, '개의 tool을 등록했습니다.');
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * 5. 노출 API (window.WebMCP)
   * ─────────────────────────────────────────────────────────────────────────
   *
   * 페이지 개발자가 콘솔이나 다른 스크립트에서 이 라이브러리를 활용할 수 있도록
   * 몇 가지 헬퍼를 전역에 노출합니다.
   *
   *   WebMCP.registerItem(item)  → 아이템을 즉시 등록 (동적 추가)
   *   WebMCP.getItemCount()      → 현재 등록된 tool 개수 반환
   *   WebMCP.debugLog()          → 디버그 로그
   *
   * 🔧 동적 확장 예시 (페이지 스크립트에서):
   *   WebMCP.registerItem({
   *     group: 'parking',
   *     name: 'get_info',
   *     title: '주차 안내',
   *     description: '병원 주차 가능 여부를 안내합니다.',
   *     getData: { available: true, fee: '2시간 무료' },
   *   });
   */
  const WebMCP = {
    /** ITEMS에 항목을 추가하고 즉시 tool로 등록합니다. */
    registerItem: function (item) {
      ITEMS.push(item);

      const ctx = getModelContext();
      if (!ctx) {
        debugLog('WebMCP 미지원 환경. 등록 생략:', item.name);
        return false;
      }

      const tool = {
        name: [SITE_NS, item.group, item.name].join('.'),
        description: item.description || item.title || '',
        inputSchema: item.inputSchema || { type: 'object', properties: {} },
        execute: wrapExecute(item.getData),
      };

      try {
        ctx.registerTool(tool);
        debugLog('동적 tool 등록 완료:', tool.name);
        return true;
      } catch (err) {
        debugLog('동적 tool 등록 실패:', err);
        return false;
      }
    },

    /** 현재 정의된 ITEMS 개수 반환 */
    getItemCount: function () {
      return ITEMS.length;
    },

    /** NAMES(namespace) 목록 반환 */
    getNames: function () {
      return NAMES;
    },

    /** 현재 사용 중인 SITE_NS 반환 */
    getSiteNs: function () {
      return SITE_NS;
    },

    /**
     * 런타임에 config(사이트 식별자, name, item 등)를 주입/변경합니다.
     *
     * 예시:
     *   WebMCP.configure({
     *     siteNs: 'yonja',
     *     items: [ { group: 'service', name: 'get_info', getData: {...} } ],
     *   });
     */
    configure: function (cfg) {
      if (!cfg || typeof cfg !== 'object') return;
      // 파라미터가 이미 등록된 config와 병합되도록 처리
      const merged = Object.assign({}, _cfg, cfg);
      // 사이트 식별자 등이 바뀌면 다시 초기화
      if (merged.siteNs && merged.siteNs !== SITE_NS) {
        // (동작 상의 참고) config 재적용을 위해 경고 로그만 남깁니다.
        debugLog('siteNs 변경 요청:', merged.siteNs);
      }
      return merged;
    },
  };

  // 전역 노출 (이미 정의된 WebMCP가 있으면 병합)
  window.WebMCP = Object.assign(window.WebMCP || {}, WebMCP);

  // DOM이 준비되면 tool 등록 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
