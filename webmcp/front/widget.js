// ============================================================================
// widget.js — AI 비서 웹 위젯 (백엔드 프록시 연동)
// ============================================================================
// Chrome 확장 팝업(webmcp-extension/popup.js)과 동일한 UI/UX를 제공합니다.
//   - 마크다운 렌더링 (봇 답변)
//   - 퀵 질문 pill 버튼
//   - 상태 배지 (연결/AI)
//   - 동작 방식 아코디언
// Gemini 키는 직접 들고 있지 않고 백엔드 프록시(webmcp.js)를 호출합니다.
// ============================================================================
(function () {
  'use strict';

  var ROOT_ID = 'webmcp-widget';

  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = widgetTemplate();
    document.body.appendChild(root);
    init();
  }

  function widgetTemplate() {
    return (
      '<button id="webmcpLauncher" class="wmcp-launcher" type="button" aria-label="AI 비서 열기">💬</button>' +
      '<div id="webmcpPanel" class="wmcp-panel" hidden>' +
      '  <header class="wmcp-header">' +
      '    <h1>💘 연애의 자격 AI 비서</h1>' +
      '    <span class="wmcp-status" id="wmcpStatus">연결 확인 중...</span>' +
      '    <button id="wmcpClose" class="wmcp-close" type="button" title="닫기">✕</button>' +
      '  </header>' +
      '  <div id="wmcpChat" class="wmcp-chat" aria-live="polite"></div>' +
      '  <div class="wmcp-inputbar">' +
      '    <div id="wmcpPills" class="wmcp-pills"></div>' +
      '    <div class="wmcp-inputrow">' +
      '      <textarea id="wmcpInput" placeholder="메시지를 입력하세요..." rows="1"></textarea>' +
      '      <button id="wmcpAsk" class="wmcp-ask" type="button" title="보내기">➤</button>' +
      '    </div>' +
      '    <div class="wmcp-loader" id="wmcpLoader">💬 답변 생성 중...</div>' +
      '  </div>' +
      '  <details class="wmcp-accordion">' +
      '    <summary>⚙️ 동작 방식</summary>' +
      '    <div class="wmcp-acc-body">' +
      '      <b>1순위</b> 백엔드 프록시 Gemini (키는 서버/DB에서만 보관)' +
      '      <br /><b>2순위</b> Chrome 내장 AI(<code>window.LanguageModel</code>)' +
      '      <br /><br />Gemini 키는 <code>gemini-key.js</code>가 아닌 <b>DB</b>에 저장되어' +
      '      <br />백엔드가 도메인별로 읽어 호출합니다.' +
      '    </div>' +
      '  </details>' +
      '</div>'
    );
  }

  function $(sel) { return document.querySelector(sel); }

  // ── 마크다운 → HTML (확장 popup.js 와 동일) ──────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markdownToHtml(md) {
    var html = escapeHtml(md);
    html = html.replace(/```([\s\S]*?)```/g, function (_, code) {
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

  function addMsg(text, role, isError) {
    var chat = $('#wmcpChat');
    if (!chat) return;
    var wrap = document.createElement('div');
    wrap.className = 'wmcp-msg ' + (role || 'bot') + (isError ? ' error' : '');
    var bubble = document.createElement('div');
    bubble.className = 'wmcp-bubble';
    var content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    if (role === 'user' || isError) {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = markdownToHtml(content);
    }
    wrap.appendChild(bubble);
    var time = document.createElement('div');
    time.className = 'wmcp-time';
    time.textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    wrap.appendChild(time);
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
  }

  function setLoading(on) {
    var loader = $('#wmcpLoader');
    var ask = $('#wmcpAsk');
    if (loader) loader.classList.toggle('show', on);
    if (ask) ask.disabled = on;
  }

  function welcome() {
    var chat = $('#wmcpChat');
    if (!chat) return;
    chat.innerHTML = '';
    addMsg('안녕하세요! 💘 연애의 자격 AI 비서입니다.\n서비스 가격, 상담사 정보, 재회 진단 등 궁금한 점을 물어보세요.', 'bot');
  }

  // ── 퀵 질문 pill (확장 popup.html 과 동일) ──────────────────
  var PILLS = [
    { label: '서비스 소개', question: '서비스 소개를 알려줘' },
    { label: '서비스 가격', question: '서비스 가격 알려줘' },
    { label: '상담사', question: '상담사 정보 알려줘' },
    { label: '유튜브 채널', question: '유튜브 채널 알려줘' },
    { label: '진단 제출', question: '진단지 제출하는 방법을 알려줘' },
  ];

  function initPills() {
    var wrap = $('#wmcpPills');
    if (!wrap) return;
    PILLS.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'wmcp-pill';
      b.type = 'button';
      b.textContent = p.label;
      b.addEventListener('click', function () {
        var input = $('#wmcpInput');
        if (input) { input.value = p.question; handleAsk(); }
      });
      wrap.appendChild(b);
    });
  }

  async function handleAsk() {
    var input = $('#wmcpInput');
    var q = (input.value || '').trim();
    if (!q) return;
    addMsg(q, 'user');
    input.value = '';
    setLoading(true);
    try {
      if (typeof window.WebMCP === 'undefined' || typeof window.WebMCP.callGeminiViaProxy !== 'function') {
        throw new Error('webmcp.js(프록시)가 로드되지 않았습니다.');
      }
      // 사이트별 시스템 프롬프트 (yonja 또는 hospital) 자동 선택
      var systemPrompt = (window.YONJA_SYSTEM_PROMPT || window.HOSPITAL_SYSTEM_PROMPT || '') + '\n\n';
      var answer = await window.WebMCP.callGeminiViaProxy(systemPrompt + '사용자 질문: ' + q);
      addMsg(answer, 'bot');
    } catch (e) {
      addMsg('오류: ' + (e.message || e), 'bot', true);
    } finally {
      setLoading(false);
    }
  }

  // ── 채팅 내 링크 새 탭으로 열기 ──────────────────────────────
  function initChatLinks() {
    var chat = $('#wmcpChat');
    if (!chat) return;
    chat.addEventListener('click', function (e) {
      var anchor = e.target.closest('a');
      if (!anchor) return;
      e.preventDefault();
      var url = anchor.getAttribute('href');
      if (url && /^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
    });
  }

  // ── 연결 상태 확인 (헤더 배지) ───────────────────────────────
  function setStatus(text, ok) {
    var status = $('#wmcpStatus');
    if (!status) return;
    status.textContent = text;
    status.style.background = ok ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)';
  }

  async function refresh() {
    var status = $('#wmcpStatus');
    if (!status) return;
    status.textContent = '연결 확인 중...';
    status.style.background = 'rgba(255,255,255,0.2)';

    // 1) 프록시 라이브러리 로드 여부
    if (typeof window.WebMCP === 'undefined' || typeof window.WebMCP.callGeminiViaProxy !== 'function') {
      setStatus('⚠️ 프록시 미로드', false);
      return;
    }

    // 2) 백엔드 헬스체크 (프록시가 실제 응답하는지)
    try {
      var proxy = window.WebMCP.proxyEndpoint || '/api/chat';
      // /health 로 백엔드 상태 확인 (nginx가 /health → 8001 프록시)
      var healthUrl = proxy.replace(/\/api\/chat$/, '/health');
      var res = await fetch(healthUrl, { method: 'GET' });
      if (res.ok) {
        setStatus('✅ 연결됨', true);
      } else {
        setStatus('⚠️ 연결 안 됨', false);
      }
    } catch (e) {
      setStatus('⚠️ 연결 안 됨', false);
    }
  }

  function init() {
    var launcher = $('#webmcpLauncher');
    var panel = $('#webmcpPanel');
    var close = $('#wmcpClose');
    if (launcher && panel) {
      launcher.addEventListener('click', function () {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) { welcome(); $('#wmcpInput').focus(); }
      });
    }
    if (close && panel) {
      close.addEventListener('click', function () { panel.hidden = true; });
    }
    var input = $('#wmcpInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
      });
    }
    var ask = $('#wmcpAsk');
    if (ask) ask.addEventListener('click', handleAsk);
    initPills();
    initChatLinks();
    refresh(); // 연결 상태 배지 갱신
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
