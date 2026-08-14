// ============================================================================
// popup.js — 연애의 자격 AI 비서 · 웹 위젯(인라인 팝업) 로직
// ============================================================================
// [WebMCP 개발 가능성 테스트 버전] — 서버(프록시) 제외.
//
// 이 버전은 "팝업 기능만으로 WebMCP가 동작하는지"를 검증합니다.
//
//   ✅ 검증 포인트
//   1. WebMCP API(navigator.modelContext) 존재 여부
//   2. window.WebMCPConfig → webmcp.js(registerTool)로 툴 등록
//   3. 내장 AI(window.LanguageModel)가 등록된 툴을 자동 호출하는지
//
//   ▶ AI 동작 원리 (서버 불필요)
//     - 내장 AI 세션을 만들 때 LanguageModel.create({ tools }) 로
//       등록된 WebMCP 툴을 전달하면, 모델이 필요할 때 툴을 자동 호출합니다.
//     - 툴 목록은 navigator.modelContext.tools() 로 열거합니다.
//       (일부 Chrome은 tools() 미지원 → window.WebMCPConfig에서 직접 파생)
//
//   ⚠️ 전제 (test.html 상단 주석 참고)
//     - Chrome 최신 + chrome://flags 에서 Web Model Context Enabled
//     - 내장 AI(window.LanguageModel) 사용 가능 (Origin Trial/HTTPS/localhost)
// ============================================================================

(function () {
  'use strict';

  // ── 상태 ──────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const ROOT_ID = 'webmcp-widget';

  // 사용자 직접 입력 키 저장 키(localStorage) — 서버 없는 테스트 폴백(선택)
  const LS_KEY = 'webmcp.gemini.apiKey';

  // ── 1. 위젯 DOM 마운트 ────────────────────────────────────────
  /** 위젯 HTML을 #webmcp-widget 안에 삽입합니다. (popup.html 스캐폴드 재사용) */
  function mountWidget() {
    // 이미 마운트되어 있으면 스킵
    if ($('#' + ROOT_ID) && $('#' + ROOT_ID + ' #webmcpPanel')) {
      // popup.html이 직접 로드된 경우 launcher 제거(패널 상시 표시)
      hideLauncher();
      return;
    }

    // 마운트 컨테이너가 없으면 생성
    let root = $('#' + ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }

    // 패널/런처 구조 삽입 (인라인으로 위젯만 생성)
    root.innerHTML = widgetTemplate();
  }

  function widgetTemplate() {
    return (
      '<button id="webmcpLauncher" class="wmcp-launcher" type="button" aria-label="AI 비서 열기" title="연애의 자격 AI 비서">💬</button>' +
      '<div id="webmcpPanel" class="wmcp-panel" hidden>' +
      '  <header class="wmcp-header">' +
      '    <h1>💘 연애의 자격 AI 비서</h1>' +
      '    <span class="wmcp-status" id="webmcpStatus">연결 확인 중...</span>' +
      '    <span class="wmcp-status" id="webmcpAiStatus" style="display:none">AI 확인 중...</span>' +
      '    <button id="webmcpClose" class="wmcp-close" type="button" title="닫기">✕</button>' +
      '  </header>' +
      '  <div id="webmcpChat" class="wmcp-chat" aria-live="polite"></div>' +
      '  <div class="wmcp-inputbar">' +
      '    <div id="webmcpPills" class="wmcp-pills"></div>' +
      '    <div class="wmcp-inputrow">' +
      '      <textarea id="webmcpInput" placeholder="메시지를 입력하세요..." rows="1"></textarea>' +
      '      <button id="webmcpAsk" class="wmcp-ask" type="button" title="보내기">➤</button>' +
      '    </div>' +
      '    <div class="wmcp-loader" id="webmcpLoader">💬 답변 생성 중...</div>' +
      '  </div>' +
      '  <details class="wmcp-accordion">' +
      '    <summary>⚙️ 동작 방식</summary>' +
      '    <div class="wmcp-acc-body">' +
      '      <b>1순위</b> 내장 AI(<code>window.LanguageModel</code>) + WebMCP 툴 (서버 불필요)' +
      '      <br /><b>2순위</b> 직접 키 입력 → <code>localStorage</code> (선택 폴백)' +
      '      <br /><br /><label>직접 Gemini API 키 입력(선택, 자기 책임):' +
      '        <input id="webmcpApiKey" type="password" placeholder="API 키" autocomplete="off" />' +
      '      </label>' +
      '      <button id="webmcpSaveKey" class="wmcp-mini" type="button">저장</button>' +
      '      <button id="webmcpClearKey" class="wmcp-mini" type="button">삭제</button>' +
      '    </div>' +
      '  </details>' +
      '  <details class="wmcp-accordion" id="webmcpTestAcc">' +
      '    <summary>🧪 WebMCP 테스트</summary>' +
      '    <div class="wmcp-acc-body">' +
      '      <button id="webmcpTestMctx" class="wmcp-mini" type="button">① modelContext 확인</button>' +
      '      <button id="webmcpTestTools" class="wmcp-mini" type="button">② 등록된 툴 열거</button>' +
      '      <button id="webmcpTestExec" class="wmcp-mini" type="button">③ 툴 직접 호출</button>' +
      '      <button id="webmcpTestAI" class="wmcp-mini" type="button">④ 내장 AI 툴 호출</button>' +
      '      <pre id="webmcpTestOut" class="wmcp-test-out"></pre>' +
      '    </div>' +
      '  </details>' +
      '</div>'
    );
  }

  /** popup.html이 직접 로드된 경우에는 런처 없이 패널을 바로 노출합니다. */
  function hideLauncher() {
    const launcher = $('#webmcpLauncher');
    if (launcher) launcher.style.display = 'none';
    const panel = $('#webmcpPanel');
    if (panel) panel.hidden = false;
  }

  // ── 2. WebMCP 툴 접근 (설계안 2-2: 같은 origin → 직접 접근) ──
  /** 페이지에 등록된 WebMCP 툴 목록을 반환합니다. */
  function queryWebMCP() {
    const cfg = window.WebMCPConfig;
    if (!cfg || !Array.isArray(cfg.items)) {
      return { ok: false, tools: [], modelContext: !!getModelContext() };
    }
    const ns = cfg.siteNs || 'site';
    const toolNames = cfg.items
      .filter((item) => item)
      .map((item) => ({ name: [ns, item.group, item.name].join('.') }));
    return { ok: true, tools: toolNames, modelContext: !!getModelContext() };
  }

  /** 페이지 service/consultant 정보를 읽어옵니다. */
  async function queryPageInfo() {
    const cfg = window.WebMCPConfig;
    if (!cfg || !Array.isArray(cfg.items)) {
      return { ok: false, reason: 'WebMCPConfig 없음' };
    }
    const serviceItem = cfg.items.find(
      (item) => item && item.group === 'service' && item.name === 'get_info'
    );
    const consultantItem = cfg.items.find(
      (item) => item && item.group === 'consultant' && item.name === 'get_info'
    );
    const resolve = (item) => {
      if (!item) return null;
      try {
        return typeof item.getData === 'function' ? item.getData() : item.getData || null;
      } catch (e) {
        return null;
      }
    };
    const service = resolve(serviceItem);
    const consultantData = resolve(consultantItem);
    return {
      ok: true,
      service,
      consultant:
        consultantData && consultantData.consultants
          ? consultantData.consultants
          : consultantData,
    };
  }

  /** modelContext 객체(내장 AI 툴 등록)를 반환합니다. */
  function getModelContext() {
    return (
      (typeof document !== 'undefined' && document.modelContext) ||
      (typeof navigator !== 'undefined' && navigator.modelContext) ||
      (typeof window !== 'undefined' && window.modelContext) ||
      null
    );
  }

  // ── 2-2. WebMCP 툴 열거/실행 (서버 없이 팝업만으로) ───────────
  /**
   * 등록된 WebMCP 툴 목록을 열거합니다.
   * - 최우선: navigator.modelContext.tools() (표준 API)
   * - 미지원: window.WebMCPConfig.items 로부터 파생 (폴백)
   */
  async function listTools() {
    const ctx = getModelContext();

    // 1) 표준 tools() API가 있으면 그 결과 사용
    if (ctx && typeof ctx.tools === 'function') {
      try {
        const tools = await ctx.tools();
        if (Array.isArray(tools)) {
          return tools.map((t) => (typeof t === 'string' ? { name: t } : t));
        }
      } catch (e) {
        // tools() 호출 실패 → 폴백
      }
    }

    // 2) 폴백: WebMCPConfig.items 에서 파생
    const cfg = window.WebMCPConfig;
    if (cfg && Array.isArray(cfg.items)) {
      const ns = cfg.siteNs || 'site';
      return cfg.items
        .filter((item) => item)
        .map((item) => ({
          name: [ns, item.group, item.name].join('.'),
          description: item.description || item.title || '',
          inputSchema: item.inputSchema || null,
        }));
    }
    return [];
  }

  /**
   * 페이지 WebMCP 툴을 직접 실행합니다.
   * - window.WebMCPConfig.items 에서 getData()를 호출해 결과 반환
   * - 내장 AI가 tools로 넘긴 툴을 자동 호출할 때도 동일한 경로를 사용합니다.
   */
  async function executeTool(toolName, args) {
    const cfg = window.WebMCPConfig;
    if (!cfg || !Array.isArray(cfg.items)) {
      return { error: true, message: 'WebMCPConfig 없음' };
    }
    const ns = cfg.siteNs || 'site';
    const item = cfg.items.find(
      (it) => it && [ns, it.group, it.name].join('.') === toolName
    );
    if (!item) {
      return { error: true, message: '툴을 찾지 못했습니다: ' + toolName };
    }
    try {
      const result =
        typeof item.getData === 'function'
          ? await item.getData(args || {})
          : item.getData || {};
      return { ok: true, result };
    } catch (e) {
      return { error: true, message: e.message || String(e) };
    }
  }

  // ── 3. 마크다운 렌더링 (확장 코드와 동일) ─────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markdownToHtml(md) {
    let html = escapeHtml(md);
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
      return '<pre class="md-code">' + code.trim() + '</pre>';
    });
    html = html.replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
  }

  // ── 4. 채팅 렌더링 ────────────────────────────────────────────
  function addChatMessage(text, { role = 'bot', isError = false } = {}) {
    const chat = $('#webmcpChat');
    if (!chat) return null;
    const wrap = document.createElement('div');
    wrap.className = 'wmcp-msg ' + (role === 'user' ? 'user' : 'bot') + (isError ? ' error' : '');

    const bubble = document.createElement('div');
    bubble.className = 'wmcp-bubble';
    const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);

    if (role === 'user' || isError) {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = markdownToHtml(content);
    }
    wrap.appendChild(bubble);

    const time = document.createElement('div');
    time.className = 'wmcp-time';
    time.textContent = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    wrap.appendChild(time);

    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return bubble;
  }

  /** 채팅 내 링크 클릭 → 새 탭(window.open)으로 열기 (설계안 2-5) */
  function initChatLinkHandling() {
    const chat = $('#webmcpChat');
    if (!chat) return;
    chat.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      e.preventDefault();
      const url = anchor.getAttribute('href');
      if (url && /^https?:\/\//i.test(url)) {
        window.open(url, '_blank', 'noopener');
      }
    });
  }

  function addWelcomeMessage() {
    const chat = $('#webmcpChat');
    if (!chat) return;
    chat.innerHTML = '';
    addChatMessage(
      '안녕하세요! 💘 연애의 자격 AI 비서입니다.\n서비스 가격, 상담사 정보, 재회 진단 등 궁금한 점을 물어보세요.'
    );
  }

  function setLoading(on) {
    const loader = $('#webmcpLoader');
    const ask = $('#webmcpAsk');
    if (loader) loader.classList.toggle('show', on);
    if (ask) ask.disabled = on;
  }

  // ── 5. AI 감지 & 호출 (설계안 2-3, 2-4) ───────────────────────
  const LANGUAGE_MODEL_OPTIONS = {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    outputLanguage: 'en',
  };

  async function detectBuiltinLanguageModel() {
    const LM = window.LanguageModel;
    if (!LM) {
      return { available: 'unavailable', reason: 'window.LanguageModel 없음' };
    }
    try {
      const availability = await LM.availability(LANGUAGE_MODEL_OPTIONS);
      return {
        available: availability,
        reason:
          availability === 'available'
            ? '내장 AI 사용 가능'
            : availability === 'downloadable'
              ? '내장 AI 다운로드 가능'
              : '기기 사양 부족',
      };
    } catch (e) {
      return { available: 'error', reason: e.message || String(e) };
    }
  }

  /**
   * Gemini API 키를 반환합니다. 우선순위:
   *   1) 사용자가 위젯 "⚙️ 동작 방식"에서 직접 입력한 키 (localStorage)
   *   2) gemini-key.js 에 정의된 전역 상수 GEMINI_API_KEY
   */
  function getApiKey() {
    // 1) 사용자 직접 입력 키 (localStorage)
    const local = getLocalApiKey();
    if (local) return local;

    // 2) gemini-key.js 의 전역 상수 (서버 없이 키 사용 폴백)
    if (typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.trim()) {
      return GEMINI_API_KEY.trim();
    }
    return '';
  }

  /** Gemini API 키가 설정되어 있는지 확인합니다. */
  function hasGeminiKey() {
    return getApiKey().length > 0;
  }

  /** 사용자 직접 입력 키 (localStorage) */
  function getLocalApiKey() {
    try {
      return (localStorage.getItem(LS_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }
  function setLocalApiKey(v) {
    try {
      localStorage.setItem(LS_KEY, v.trim());
    } catch (e) {}
  }
  function clearLocalApiKey() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {}
  }

  /** AI 사용 가능 여부 요약 (헤더 표시용) */
  async function detectBuiltinAI() {
    const lm = await detectBuiltinLanguageModel().catch(() => ({ available: 'error' }));
    if (lm.available === 'available') {
      return { available: 'readily', reason: '내장 AI(window.LanguageModel) 사용 가능' };
    }
    if (lm.available === 'downloadable') {
      return { available: 'after-download', reason: '내장 AI 다운로드 가능' };
    }
    if (hasGeminiKey()) {
      return { available: 'readily', reason: 'Gemini API 사용 가능' };
    }
    return { available: 'no', reason: '사용 가능한 AI 없음' };
  }

  function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message || '시간 초과')), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }

  // ── 시스템 프롬프트 ───────────────────────────────────────────
  /**
   * 내장 AI(window.LanguageModel)용 간결한 시스템 프롬프트.
   * 내장 모델은 컨텍스트 한도가 작아서 긴 지식 베이스를 넣으면
   * "The input is too large" 오류가 발생합니다.
   * 상세 정보는 등록된 WebMCP 툴 호출로 얻으므로, 여기선 안내만 합니다.
   */
  function builtinSystemPrompt() {
    return (
      '당신은 연애의자격(yonja) 웹사이트의 AI 비서입니다. 한국어로 간결하고 친절하게 답변하세요. ' +
      '사용자가 서비스/가격/상담사/진단 관련 질문을 하면, 등록된 WebMCP 툴을 호출해 정보를 확인한 뒤 답하세요. ' +
      '절대 내부 API 이름(yonja.service.get_info, yonja.consultant.get_info, yonja.diagnosis.submit)을 노출하지 마세요.'
    );
  }

  /**
   * Gemini API(직접 키 입력)용 시스템 프롬프트 — 상세 지식 베이스.
   * 클라우드 모델은 컨텍스트가 충분하므로 전체 정보를 담습니다.
   */
  function systemPrompt() {
    return (
      '당신은 연애의자격(yonja) 웹사이트의 AI 비서입니다. ' +
      '사용자의 질문에 친절하고 정확하게 답변하세요. ' +
      '서비스/상담사/진단 관련 질문에는 제공된 정보를 바탕으로 답하고, ' +
      '필요하면 다음 기능을 안내하세요: 서비스 소개, 서비스 가격 조회, 상담사 정보 조회, 재회 가능성 진단 제출. ' +
      '항상 한국어로 자연스럽게 답변하세요. ' +
      '⚠️ 절대 내부 API 이름(yonja.service.get_info, yonja.consultant.get_info, yonja.diagnosis.submit 등)을 사용자에게 노출하지 마세요. 기능명만 자연스럽게 안내하세요.\n\n' +
      '=== 연애의자격 서비스 소개 ===\n' +
      '연애의자격은 재회·연애 상담 전문 서비스입니다. 재회 심리 전문가 상담과 AI 데이터 분석으로 재회 전략을 제공하며, 상대 애착유형 분석·골든타이밍 전략·소구점 파악까지 근거 기반 1:1 맞춤 재회 상담을 제공합니다. 자세한 서비스 소개는 [서비스 소개 페이지](https://yonza.co.kr/introduction) 링크를 안내하세요.\n' +
      '사용자가 서비스 소개를 물어보면 위 설명과 서비스 소개 링크를 안내하세요. 서비스 소개 안내 시에는 가격 정보를 포함하지 마세요.\n\n' +
      '=== 연애의자격 유튜브 채널 ===\n' +
      '연애의자격은 재회 전문 유튜브 채널을 운영하며, 이별 후 재회 전략과 심리 분석을 다루는 무료 재회특강 영상을 제공합니다.\n' +
      '대표 재회특강 영상:\n' +
      '- [후폭풍 설계 재회 전략](https://yonza.co.kr/youtube-channel/1)\n' +
      '- [신뢰 깨진 경우 재회](https://yonza.co.kr/youtube-channel/2)\n' +
      '- [최적의 연락 타이밍](https://yonza.co.kr/youtube-channel/3)\n' +
      '- [100% 재회하는 3단계](https://yonza.co.kr/youtube-channel/4)\n' +
      '- [가장 위험한 조언 3가지](https://yonza.co.kr/youtube-channel/5)\n' +
      '사용자가 유튜브 채널이나 재회특강 영상을 물어보면 위 채널 링크와 대표 영상들을 안내하세요.\n\n' +
      '=== 연애의자격 서비스 가격표 (쇼핑몰 yonza.shop 판매가 기준) ===\n' +
      '- 급상담: 100,000원 (원가 120,000원, 17% 할인) - 당일예약으로 솔루션을 듣는 1회 긴급 전화 상담\n' +
      '- 재회 기본상담(기본상담패키지): 350,000원 (원가 420,000원, 17% 할인) - 전화상담 + 마음다잡기 피드백 5회\n' +
      '- 재회 세미플랜: 970,000원 (원가 1,100,000원, 12% 할인) - 전화상담 + 마음다잡기 피드백 20회\n' +
      '- 플랜 골드: 3,000,000원 (원가 4,000,000원) - 헤어진 연인을 다시 만나고 싶을 때의 프리미엄 상담\n' +
      '- 싱글플랜: 1,500,000원 (원가 2,320,000원) - 좋은 상대를 찾고 행복하기 위한 상담\n' +
      '사용자가 서비스 가격을 명시적으로 물어볼 때만 위 가격표를 정확히 알려주세요. 가격은 상담 종류(급상담 · 기본상담패키지 · 단회상담 · 후속상담 · 심화교육)와 담당 상담사, 프로그램에 따라 다르며, 자세한 내용은 상품 페이지(https://yonza.shop/page/index?tpl=main%2Fproductlist.html)를 안내하세요. 서비스 소개·전반 안내에서는 가격을 나열하지 마세요.\n\n' +
      '=== 연애의자격 상담사 목록 ===\n' +
      '- [이승진](https://yonza.co.kr/counseling-introduction/3) (CLV 상담팀 총괄 팀장 · 대표상담사, ID 3): 해결불가급·고위험군·고난이도 특수 사례 전문, 자살예방·알콜중독·바람, 심리상담사 1급\n' +
      '- [허아윤](https://yonza.co.kr/counseling-introduction/5) (CLV 상담팀 팀장 · 대표상담사, ID 5): 쉽고 정확한 분석과 빠른 목표지향 상담, 파혼·이혼·헤붙 전문, 심리상담사 1급\n' +
      '- [권요셉](https://yonza.co.kr/counseling-introduction/7) (연애의자격 플랜상담사, ID 7): 교류분석·인문융합 기반 플랜상담, 인문융합치료학 박사 · 인하대 초빙교수, 불안한 사랑·이혼갈등·인문융합치료 전문\n' +
      '- [장재원](https://yonza.co.kr/counseling-introduction/4) (연애의자격 플랜상담사, ID 4): 16년 전문성의 박사 출신 상담사, 이성관계·연애심리상담·부부치료 전문, 아주대 상담심리학 박사 수료\n' +
      '- [송기훈](https://yonza.co.kr/counseling-introduction/2) (연애의자격 플랜상담사, ID 2): 내담자의 발전·성장을 도모하는 상담, 바람·환승·불안케어 전문, 청소년상담사 3급 · 임상심리사 2급\n' +
      '- [최희주](https://yonza.co.kr/counseling-introduction/6) (연애의자격 플랜상담사, ID 6): 다정한 단호함으로 상담하는 재회 전문 상담사, 헤붙·불안·연애미숙 전문, 청소년상담사 3급 · 임상심리사 2급\n' +
      '사용자가 상담사 정보를 물어보면 반드시 위 상담사 목록을 정확히 알려주세요.\n\n' +
      '=== 재회 가능성 진단지 제출 방법 ===\n' +
      '연애의자격은 무료 연애 및 재회 진단으로 아픈 사연의 가능성을 찾아드리는 무료 진단지를 제공합니다.\n' +
      '진단지 제출 방법:\n' +
      '1. 진단지 작성 링크(https://form.yonja.co.kr/?introounselor=448)로 이동합니다.\n' +
      '2. 이름, 성별, 이별 기간, 이별 사유, 재회 목적 등 상황을 입력합니다.\n' +
      '3. 제출 후 담당 상담사가 재회 가능성과 대응 방향을 안내합니다.\n' +
      '개인정보는 비공개로 안전하게 보호됩니다. 사용자가 재회 가능성 진단을 원하거나 진단지 제출 방법을 물어보면 위 링크와 제출 방법, 그리고 "무료 연애 및 재회 진단으로 아픈 사연의 가능성을 찾아드리겠습니다"라는 취지의 안내를 함께 전달하세요.\n\n' +
      '⚠️ 답변 마지막에 "[서비스 소개 보기](...)", "상담사 정보 조회", "재회 가능성 진단 제출" 같은 기능 목록이나 안내 문구를 추가하지 마세요. 사용자가 요청한 내용에 대해서만 간결하게 답변하세요.'
    );
  }

  // ── Gemini 호출: 서버 없이 gemini-key.js / 사용자 키 폴백 ─────
  /** Gemini API 직접 호출 (gemini-key.js 또는 사용자 입력 키) */
  async function askGemini(question) {
    const key = getApiKey();
    if (!key) throw new Error('Gemini API 키가 설정되지 않았습니다.');

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' +
      encodeURIComponent(key);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt() + '\n\n사용자 질문: ' + question }],
          },
        ],
        generationConfig: { temperature: 0.2, topK: 3 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error('Gemini API 오류 (' + res.status + '): ' + errText);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('');
    if (!text) throw new Error('Gemini 응답이 비어 있습니다.');
    return text;
  }

  /**
   * 내장 AI(window.LanguageModel)로 답변합니다.
   *
   * [WebMCP 툴 연동]
   * - WebMCP 툴은 navigator.modelContext.registerTool() 로 등록하면
   *   내장 AI 세션에 "자동으로" 노출됩니다. 따라서 LanguageModel.create()에
   *   tools 배열을 직접 넘길 필요가 없고, 넘기면 오히려 세션이 깨집니다.
   * - 이 함수는 tools 옵션 없이 세션을 생성합니다. (modelContext 툴은 자동 연동)
   */
  async function askBuiltinLanguageModel(question) {
    const LM = window.LanguageModel;
    const availability = await LM.availability(LANGUAGE_MODEL_OPTIONS);
    if (availability === 'unavailable') {
      throw new Error('이 기기는 사양이 부족하여 내장 AI를 실행할 수 없습니다.');
    }

    const TIMEOUT_MS = 20000;
    let session;
    try {
      session = await withTimeout(
        LM.create({
          ...LANGUAGE_MODEL_OPTIONS,
          initialPrompts: [{ role: 'system', content: builtinSystemPrompt() }],
          systemPrompt: builtinSystemPrompt(),
          temperature: 0.2,
          topK: 3,
          // tools 옵션은 넘기지 않음 → modelContext 등록 툴이 자동 연동됨
        }),
        TIMEOUT_MS,
        '내장 AI 모델 다운로드/생성 시간 초과'
      );
    } catch (e) {
      throw new Error('내장 AI 세션 생성 실패: ' + (e.message || e));
    }

    try {
      const stream = session.promptStreaming(question);
      let full = '';
      for await (const chunk of stream) {
        full = chunk;
      }
      return full;
    } finally {
      session.destroy();
    }
  }

  function builtinAIGuide() {
    return (
      '⚠️ 사용 가능한 AI가 없어 답변을 받을 수 없습니다.\n\n' +
      '[방법 A] Gemini API 키 사용 (권장, 모든 Chrome에서 동작)\n' +
      '  gemini-key.js 파일에 GEMINI_API_KEY 값을 넣어 주세요.\n' +
      '  (키는 aistudio.google.com에서 무료 발급)\n\n' +
      '[방법 B] 직접 API 키 입력\n' +
      '  위 "⚙️ 동작 방식" 의 키 입력란에 aistudio.google.com에서 발급한 키를 넣으세요.\n\n' +
      '[방법 C] 내장 AI(window.LanguageModel) 활성화\n' +
      '  최신 Chrome + "Web Model Context" 플래그 Enabled + HTTPS/localhost.'
    );
  }

  // ── 6. 질문 처리 ──────────────────────────────────────────────
  async function handleAsk() {
    const input = $('#webmcpInput');
    const q = input.value.trim();
    if (!q) {
      addChatMessage('메시지를 입력해주세요.', { role: 'bot', isError: true });
      return;
    }

    addChatMessage(q, { role: 'user' });
    input.value = '';

    setLoading(true);

    try {
      // 1) Gemini API 키 우선 (gemini-key.js 또는 사용자 입력 키)
      //    온디바이스 모델이 없는 환경(Chromium 등)에서는 내장 AI가 echo만 하므로
      //    키가 있으면 Gemini를 먼저 호출하는 것이 안정적입니다.
      if (hasGeminiKey()) {
        try {
          const answer = await askGemini(q);
          addChatMessage(answer);
          return;
        } catch (e) {
          console.warn('[WebMCP] Gemini 키 호출 실패:', e.message);
        }
      }

      // 2) 내장 AI(window.LanguageModel) (WebMCP 툴 연동)
      const lm = await detectBuiltinLanguageModel();
      if (lm.available === 'available' || lm.available === 'downloadable') {
        try {
          const answer = await askBuiltinLanguageModel(q);
          addChatMessage(answer);
          return;
        } catch (e) {
          console.warn('[WebMCP] 내장 AI 실패:', e.message);
        }
      }

      // 3) 둘 다 없으면 안내
      addChatMessage(builtinAIGuide(), { role: 'bot', isError: true });
    } catch (e) {
      addChatMessage('오류: ' + (e.message || e), { role: 'bot', isError: true });
    } finally {
      setLoading(false);
    }
  }

  // ── 7. 초기화 / 이벤트 바인딩 ─────────────────────────────────
  function refresh() {
    const status = $('#webmcpStatus');
    const res = queryWebMCP();
    if (res && res.ok) {
      status.textContent = '✅ 연결됨';
      status.style.background = 'rgba(22,163,74,0.3)';
    } else {
      status.textContent = '⚠️ 연결 안 됨';
      status.style.background = 'rgba(220,38,38,0.3)';
    }

    const aiBadge = $('#webmcpAiStatus');
    if (aiBadge) {
      detectBuiltinAI().then((aiState) => {
        aiBadge.style.display = 'inline-block';
        if (aiState.available === 'readily') {
          aiBadge.textContent = '🧠 AI 활성';
          aiBadge.style.background = 'rgba(22,163,74,0.3)';
        } else if (aiState.available === 'after-download') {
          aiBadge.textContent = '⬇️ 내장 AI 다운로드 가능';
          aiBadge.style.background = 'rgba(245,158,11,0.3)';
        } else {
          aiBadge.textContent = '🚫 사용 가능한 AI 없음';
          aiBadge.style.background = 'rgba(220,38,38,0.3)';
        }
      });
    }
  }

  function initPills() {
    const pillsWrap = $('#webmcpPills');
    if (!pillsWrap) return;
    const pills = [
      '서비스 소개',
      '서비스 가격',
      '상담사',
      '유튜브 채널',
      '진단 제출',
    ];
    const questions = {
      '서비스 소개': '서비스 소개를 알려줘',
      '서비스 가격': '서비스 가격 알려줘',
      '상담사': '상담사 정보 알려줘',
      '유튜브 채널': '유튜브 채널 알려줘',
      '진단 제출': '진단지 제출하는 방법을 알려줘',
    };
    pills.forEach((label) => {
      const b = document.createElement('button');
      b.className = 'wmcp-pill';
      b.type = 'button';
      b.textContent = label;
      b.dataset.question = questions[label];
      b.addEventListener('click', () => {
        const input = $('#webmcpInput');
        if (input) {
          input.value = b.dataset.question;
          handleAsk();
        }
      });
      pillsWrap.appendChild(b);
    });
  }

  function initPanelToggle() {
    const launcher = $('#webmcpLauncher');
    const panel = $('#webmcpPanel');
    const close = $('#webmcpClose');
    if (launcher && panel) {
      launcher.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) {
          const input = $('#webmcpInput');
          if (input) input.focus();
        }
      });
    }
    if (close && panel) {
      close.addEventListener('click', () => {
        panel.hidden = true;
      });
    }
  }

  function initKeyControls() {
    const input = $('#webmcpApiKey');
    const saveBtn = $('#webmcpSaveKey');
    const clearBtn = $('#webmcpClearKey');
    if (!input || !saveBtn || !clearBtn) return;
    input.value = getLocalApiKey();
    saveBtn.addEventListener('click', () => {
      setLocalApiKey(input.value);
      addChatMessage('API 키가 저장되었습니다.', { role: 'bot', isError: false });
    });
    clearBtn.addEventListener('click', () => {
      clearLocalApiKey();
      input.value = '';
      addChatMessage('API 키가 삭제되었습니다.', { role: 'bot', isError: false });
    });
  }

  function bindEvents() {
    const input = $('#webmcpInput');
    const ask = $('#webmcpAsk');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleAsk();
        }
      });
    }
    if (ask) ask.addEventListener('click', handleAsk);

    initTestPanel();
  }

  // ── 7-2. WebMCP 개발 가능성 테스트 패널 ──────────────────────
  function testOut(text) {
    const out = $('#webmcpTestOut');
    if (!out) return;
    out.textContent =
      typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  }

  function initTestPanel() {
    const btnMctx = $('#webmcpTestMctx');
    const btnTools = $('#webmcpTestTools');
    const btnExec = $('#webmcpTestExec');
    const btnAI = $('#webmcpTestAI');
    if (!btnMctx || !btnTools || !btnExec || !btnAI) return;

    // ① modelContext 지원 여부
    btnMctx.addEventListener('click', async () => {
      const ctx = getModelContext();
      const info = {
        'navigator.modelContext': typeof navigator !== 'undefined' && !!navigator.modelContext,
        'document.modelContext': typeof document !== 'undefined' && !!document.modelContext,
        'window.modelContext': typeof window !== 'undefined' && !!window.modelContext,
        modelContext: !!ctx,
        keys: ctx ? Object.keys(ctx) : [],
        LanguageModel: typeof window !== 'undefined' && !!window.LanguageModel,
        WebMCPConfig: typeof window !== 'undefined' && !!window.WebMCPConfig,
      };
      testOut(info);
    });

    // ② 등록된 툴 열거
    btnTools.addEventListener('click', async () => {
      const tools = await listTools();
      testOut({ count: tools.length, tools });
    });

    // ③ 툴 직접 호출 (service.get_info)
    btnExec.addEventListener('click', async () => {
      const res = await executeTool('yonja.service.get_info', {});
      testOut(res);
    });

    // ④ 내장 AI가 툴을 자동 호출하는지 확인
    btnAI.addEventListener('click', async () => {
      const lm = await detectBuiltinLanguageModel().catch(() => ({ available: 'error' }));
      if (lm.available !== 'available' && lm.available !== 'downloadable') {
        testOut({ ok: false, reason: '내장 AI 사용 불가: ' + lm.available + ' — ' + (lm.reason || '') });
        return;
      }
      testOut({ ok: true, phase: '내장 AI 세션 생성 + 툴 호출 시도 중...' });
      try {
        // 시스템 프롬프트에 서비스 정보 조회를 요구해 툴 호출을 유도
        const prompt =
          '사용자가 "서비스 가격을 알려줘"라고 물었습니다. ' +
          '등록된 WebMCP 툴(yonja.service.get_info)을 호출해 서비스 가격 정보를 확인하고 요약해서 답하세요.';
        const answer = await askBuiltinLanguageModel(prompt);
        testOut({ ok: true, answer });
        addChatMessage('[테스트 ④] 내장 AI 툴 호출 결과:\n' + answer);
      } catch (e) {
        testOut({ ok: false, error: e.message || String(e) });
      }
    });
  }

  // ── 8. 시작 ───────────────────────────────────────────────────
  function start() {
    mountWidget();
    initPanelToggle();
    initPills();
    bindEvents();
    initChatLinkHandling();
    initKeyControls();
    addWelcomeMessage();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
