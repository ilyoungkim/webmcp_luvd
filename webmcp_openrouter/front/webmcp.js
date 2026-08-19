// ============================================================================
// webmcp.js — 공용 WebMCP 라이브러리 (프록시 연동 버전)
// ============================================================================
// popup_agent_html.md 설계안 4-2:
//   - Gemini API 키를 직접 들고 있지 않음 (gemini-key.js 미사용)
//   - 모든 Gemini 질문은 백엔드 프록시(POST /api/chat)로 전송
//   - Origin 헤더는 브라우저가 자동 첨부 → 서버가 도메인(테넌트) 판별
// ============================================================================
(function () {
  'use strict';

  // 백엔드 프록시 엔드포인트 (배포 환경에 맞게 설정)
  var PROXY_ENDPOINT = window.WebMCPConfig && window.WebMCPConfig.proxyEndpoint
    ? window.WebMCPConfig.proxyEndpoint
    : '/api/chat';

  async function callGeminiViaProxy(prompt) {
    var res = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt }),
    });
    if (!res.ok) {
      var errText = '';
      try { errText = await res.text(); } catch (_) {}
      throw new Error('프록시 오류 (' + res.status + '): ' + errText);
    }
    var data = await res.json();
    // 백엔드가 모든 프로바이더(Gemini/OpenRouter 등) 응답을 {"text": "..."} 로 정규화합니다.
    var text = (data && typeof data.text === 'string') ? data.text : '';
    if (!text) throw new Error('프록시 응답이 비어 있습니다.');
    return text;
  }

  window.WebMCP = Object.assign(window.WebMCP || {}, {
    callGeminiViaProxy: callGeminiViaProxy,
    proxyEndpoint: PROXY_ENDPOINT,
  });
})();
