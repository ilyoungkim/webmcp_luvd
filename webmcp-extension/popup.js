// ─────────────────────────────────────────────────────────────
// popup.js — 연애의 자격 AI 비서 팝업 로직
// WebMCP 툴을 content script를 통해 조회/호출하고,
// Chrome 내장 AI(제미나이 나노)와 연동해 자연어 질문을 처리합니다.
// ─────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

/** 현재 활성 탭의 WebMCP 상태를 조회합니다. */
async function queryWebMCP() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return { ok: false, reason: '탭이 없습니다.' };
  }
  const isSupported = /^https?:/.test(tab.url || '');
  if (!isSupported) {
    return { ok: false, reason: '지원하지 않는 페이지입니다.' };
  }
  return await chrome.tabs.sendMessage(
    tab.id,
    { type: 'WEBMCP_QUERY' },
    (resp) => resp
  );
}

/** 활성 탭에서 WebMCP 툴을 직접 호출합니다. */
async function invokeTool(tool, args) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return { error: true, message: '탭 없음' };
  return await chrome.tabs.sendMessage(
    tab.id,
    { type: 'WEBMCP_INVOKE', tool, args },
    (resp) => resp
  );
}

/** Chrome 내장 AI(Session) 사용 가능 여부를 확인합니다. */
function getAiCapabilities() {
  const ai = window.ai;
  if (!ai) return { available: 'no' };
  if (ai.languageModel && typeof ai.languageModel.capabilities === 'function') {
    return ai.languageModel.capabilities();
  }
  return { available: 'unavailable' };
}

/** Chrome 내장 AI 세션을 생성합니다. */
async function createAiSession() {
  const ai = window.ai;
  if (!ai || !ai.languageModel) return null;
  const cap = ai.languageModel.capabilities();
  if (cap.available !== 'readily') return null;
  // 시스템 프롬프트: WebMCP 툴 목록을 알려주고 JSON으로 응답하게 함
  return await ai.languageModel.create({
    systemPrompt: [
      '당신은 연애의자격(yonja) 웹사이트의 AI 비서입니다.',
      '사용자의 질문을 분석하여 아래 WebMCP 툴 중 하나를 선택하고 호출 인자를 만들어야 합니다.',
      '툴 목록:',
      '- yonja.service.get_info: 서비스 종류/가격/구성 조회 (인자 없음)',
      '- yonja.consultant.get_info: 상담사 정보 조회 (인자: consultantId)',
      '- yonja.diagnosis.submit: 재회 가능성 진단 제출 (인자: problem, months)',
      '반드시 다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):',
      '{"tool": "툴이름", "args": {...}}',
      '적절한 툴이 없으면 {"tool": null, "args": {}} 로 응답하세요.',
    ].join('\n'),
  });
}

/** 내장 AI에 질문을 보내 툴 호출을 해석합니다. */
async function askAiToPlan(session, question) {
  const res = await session.prompt(question);
  // JSON 부분만 추출
  const m = res.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function renderTools(tools) {
  const box = $('#toolsList');
  if (!tools || tools.length === 0) {
    box.innerHTML =
      '<div class="row"><span class="label">등록된 툴 없음</span></div>';
    return;
  }
  box.innerHTML = tools
    .map(
      (t) =>
        `<div class="row"><span class="label">${t.name}</span></div>`
    )
    .join('');
}

function renderAiStatus() {
  const cap = getAiCapabilities();
  const el = $('#aiStatus');
  const map = {
    readily: { text: '✅ 사용 가능', color: '#16a34a' },
    afterDownload: { text: '🕓 다운로드 필요', color: '#d97706' },
    no: { text: '❌ 미지원', color: '#dc2626' },
    unavailable: { text: '❌ 미지원', color: '#dc2626' },
  };
  const s = map[cap.available] || { text: '확인 중', color: '#6b7280' };
  el.innerHTML = `<div class="row"><span class="label" style="color:${s.color}">${s.text}</span></div>`;

  const warningEl = $('#aiWarning');
  const unavailable = cap.available === 'no' || cap.available === 'unavailable';

  if (!unavailable) {
    warningEl.style.display = 'none';
    warningEl.innerHTML = '';
    return;
  }

  warningEl.style.display = 'block';
  warningEl.innerHTML = `
    <strong>경고:</strong> Chrome 내장 AI(Gemini Nano) 를 사용할 수 없습니다.
    <br>
    <strong>대안:</strong> 이 확장은 키워드 기반으로 WebMCP 툴을 직접 호출하므로 정상 동작합니다.
    <br>
    <strong>활성화 방법:</strong>
    <ol>
      <li>주소창에 <code>chrome://flags</code> 입력</li>
      <li><code>#prompt-api-for-gemini-nano</code> → <code>Enabled</code></li>
      <li><code>#optimization-guide-on-device-model</code> → <code>Enabled BypassPerfRequirement</code></li>
      <li>Chrome 재시작</li>
    </ol>
    <div style="margin-top:6px;">내장 AI가 없어도 질문을 입력하면 키워드로 서비스 정보, 상담사 정보, 진단 제출 툴을 직접 호출합니다.</div>
  `;
}

function showResult(data, isError) {
  const el = $('#result');
  el.textContent =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  el.classList.toggle('error', !!isError);
  el.classList.add('show');
}

function setLoading(on) {
  $('#loader').classList.toggle('show', on);
  $('#askBtn').disabled = on;
}

/** WebMCP 상태를 팝업에 반영합니다. */
async function refresh() {
  const status = $('#statusText');
  const res = await queryWebMCP().catch((e) => ({ ok: false, reason: e.message }));

  if (res && res.ok) {
    status.textContent = '✅ 연결됨';
    status.style.background = 'rgba(22,163,74,0.3)';
    renderTools(res.tools);
    $('#statusText').dataset.connected = 'true';
  } else {
    status.textContent = '⚠️ 연결 안 됨';
    status.style.background = 'rgba(220,38,38,0.3)';
    const reason = res?.reason || 'WebMCP 미노출';
    $('#toolsList').innerHTML =
      `<div class="row"><span class="label">${reason}</span></div>`;
  }
  renderAiStatus();
}

/** 질문 처리: 내장 AI 우선 → WebMCP 툴 호출 */
async function handleAsk() {
  const q = $('#userQuestion').value.trim();
  if (!q) {
    showResult('질문을 입력해주세요.', true);
    return;
  }
  setLoading(true);
  showResult('', false);
  $('#result').classList.remove('show');

  const preferAi = $('#preferAi').checked;

  try {
    // 1) Chrome 내장 AI로 툴 호출 계획을 생성
    if (preferAi) {
      const session = await createAiSession();
      if (session) {
        const plan = await askAiToPlan(session, q);
        if (plan && plan.tool) {
          const res = await invokeTool(plan.tool, plan.args || {});
          showResult(res);
          setLoading(false);
          session.destroy?.();
          return;
        }
      }
    }

    // 2) 내장 AI 없음/해석 실패 시 → 키워드 기반 간단 라우팅
    const plan = keywordPlan(q);
    if (plan.tool) {
      const res = await invokeTool(plan.tool, plan.args);
      const fallbackNote =
        'Chrome 내장 AI가 없어도 키워드 기반으로 WebMCP 툴을 직접 호출하므로 정상 동작합니다.';
      showResult(typeof res === 'string' ? `${fallbackNote}\n\n${res}` : { note: fallbackNote, result: res });
    } else {
      showResult('적절한 툴을 찾지 못했습니다. 질문을 다르게 입력해보세요.', true);
    }
  } catch (e) {
    showResult('오류: ' + (e.message || e), true);
  } finally {
    setLoading(false);
  }
}

/** 키워드 기반 폴백 라우팅 (내장 AI 없을 때) */
function keywordPlan(q) {
  const text = q;
  if (/가격|서비스|비용|종류|구성|단회|플랜|재회\s*상담/.test(text)) {
    return { tool: 'yonja.service.get_info', args: {} };
  }
  if (/상담사|원장|전문가|프로필|경력/.test(text)) {
    const idMatch = text.match(/(448|512)/);
    return {
      tool: 'yonja.consultant.get_info',
      args: { consultantId: idMatch ? idMatch[1] : '' },
    };
  }
  if (/진단|재회\s*가능|분석|헤어졌|이별|복잡/.test(text)) {
    const monthsMatch = text.match(/(\d+)\s*개월/);
    return {
      tool: 'yonja.diagnosis.submit',
      args: {
        problem: text,
        months: monthsMatch ? Number(monthsMatch[1]) : null,
      },
    };
  }
  return { tool: null, args: {} };
}

// 이벤트 바인딩
document.addEventListener('DOMContentLoaded', refresh);
$('#askBtn').addEventListener('click', handleAsk);
document.querySelectorAll('.pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    $('#userQuestion').value = pill.dataset.question;
  });
});
