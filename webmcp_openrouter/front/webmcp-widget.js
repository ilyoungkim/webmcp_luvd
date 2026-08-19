// ============================================================================
// webmcp-widget.js — 공통 AI 비서 웹 위젯 라이브러리
// ============================================================================
// 여러 도메인(yonja, hospital 등)이 공용으로 사용하는 위젯 로직.
// 사이트별 설정은 window.WebMCPConfig 에서 읽어옵니다.
//
//   - 마크다운 렌더링 (봇 답변)
//   - 퀵 질문 pill 버튼 (WebMCPConfig.names 기반)
//   - 상태 배지 (연결/AI)
//   - 동작 방식 아코디언
//   - 백엔드 프록시(webmcp.js) 호출
//
// 사용법:
//   <script src="webmcp.js"></script>          // 프록시 호출
//   <script src="webmcp-widget.js"></script>   // 공통 위젯
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
      '    <h1 id="wmcpTitle">💘 AI 비서</h1>' +
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

  // ── 사이트별 설정 (WebMCPConfig 기반) ────────────────────────
  function siteConfig() {
    var cfg = window.WebMCPConfig || {};
    var ns = cfg.siteNs || 'site';
    var names = cfg.names || {};
    // 사이트별 헤더 제목
    var titles = {
      yonja: '💘 연애의 자격 AI 비서',
      hospital: '🏥 생생병원 AI 비서',
    };
    return {
      title: titles[ns] || '💘 AI 비서',
      ns: ns,
      names: names,
      theme: cfg.theme || {},
    };
  }

  // ── 고객 사이트별 색상표(CSS 변수) 적용 ──────────────────────
  // WebMCPConfig.theme 에 정의된 색을 #webmcp-widget 의 CSS 변수로 주입.
  // theme 을 생략하거나 일부 키만 넣으면 나머지는 widget.css 기본값 사용.
  //   window.WebMCPConfig = {
  //     theme: {
  //       primary: '#85176d', primary2: '#e91b65', bg: '#f7f7fb',
  //       surface: '#ffffff', text: '#1f2937', textMuted: '#6b7280',
  //       textFaint: '#9ca3af', border: '#e5e7eb', codeBg: '#f3f4f6',
  //       pillBg: '#f3e8ff', errorBg: '#fef2f2', errorBorder: '#fca5a5',
  //       errorText: '#b91c1c',
  //     },
  //   };
  var THEME_MAP = {
    primary: '--wmcp-primary',
    primary2: '--wmcp-primary2',
    bg: '--wmcp-bg',
    surface: '--wmcp-surface',
    text: '--wmcp-text',
    textMuted: '--wmcp-text-muted',
    textFaint: '--wmcp-text-faint',
    border: '--wmcp-border',
    codeBg: '--wmcp-code-bg',
    pillBg: '--wmcp-pill-bg',
    errorBg: '--wmcp-error-bg',
    errorBorder: '--wmcp-error-border',
    errorText: '--wmcp-error-text',
  };
  function applyTheme() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var theme = siteConfig().theme;
    Object.keys(THEME_MAP).forEach(function (key) {
      if (theme[key]) root.style.setProperty(THEME_MAP[key], theme[key]);
    });
  }

  // ── WebMCPConfig.names 로 pill 생성 ─────────────────────────
  function initPills() {
    var wrap = $('#wmcpPills');
    if (!wrap) return;
    var cfg = siteConfig();
    var names = cfg.names;
    Object.keys(names).forEach(function (group) {
      var meta = names[group];
      var label = meta.label || group;
      var question = meta.question || (group + ' 정보를 알려줘');
      var b = document.createElement('button');
      b.className = 'wmcp-pill';
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', function () {
        var input = $('#wmcpInput');
        if (input) { input.value = question; handleAsk(); }
      });
      wrap.appendChild(b);
    });
  }

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
    // ── 자동 링크(autolink): 일반 URL(https://...) 을 링크로 변환 ──
    // 이미 마크다운 링크로 변환된 <a> 태그는 보호한 뒤, 나머지 URL만 링크화합니다.
    var protectedLinks = [];
    html = html.replace(/<a\s[^>]*>.*?<\/a>/g, function (m) {
      protectedLinks.push(m);
      return '\u0000' + (protectedLinks.length - 1) + '\u0000';
    });
    html = html.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );
    html = html.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return protectedLinks[+i];
    });
    // ── 마크다운 표(| ... |) → <table> 변환 ──
    // 구분선(|---|) 행은 헤더/본문 구분자로 사용하고, 첫 행은 <th> 로 처리합니다.
    html = html.replace(/(?:^\|.+\|\s*$\n?)+/gm, function (table) {
      var rows = table.trim().split('\n');
      var out = '<table class="md-table">';
      var isHeader = true;
      rows.forEach(function (row) {
        if (/^\|[\s:|-]+\|$/.test(row)) return; // 구분선 건너뛰기
        var cells = row.replace(/^\||\|$/g, '').split('|');
        var tag = isHeader ? 'th' : 'td';
        out += '<tr>' + cells.map(function (c) {
          return '<' + tag + '>' + c.trim() + '</' + tag + '>';
        }).join('') + '</tr>';
        isHeader = false;
      });
      out += '</table>';
      return out;
    });
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // ── 연속된 <li> 블록을 <ul>로 감싸고, <li> 사이의 줄바꿈만 제거 ──
    // (CSS 에 ul/ol/li 스타일이 정의되어 있어 들여쓰기가 적용됩니다)
    html = html.replace(/(?:<li>.*?<\/li>)(?:\n<li>.*?<\/li>)*/g, function (m) {
      return '<ul>' + m.replace(/\n/g, '') + '</ul>';
    });
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
    if (role === 'user') {
      bubble.textContent = content;
    } else if (isError) {
      // 오류는 아코디언(<details>)으로 감춰서 상세 내용을 접어둡니다.
      bubble.innerHTML =
        '<details class="wmcp-error-details">' +
        '<summary>⚠️ 오류가 발생했습니다 (클릭하여 상세보기)</summary>' +
        '<div class="wmcp-error-body">' + escapeHtml(content) + '</div>' +
        '</details>';
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
    var cfg = siteConfig();
    addMsg('안녕하세요! ' + cfg.title + '입니다.\n궁금한 점을 물어보세요.', 'bot');
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
    applyTheme(); // 고객 사이트별 색상표(CSS 변수) 적용
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
    // 사이트별 헤더 제목 설정
    var titleEl = $('#wmcpTitle');
    if (titleEl) titleEl.textContent = siteConfig().title;
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
