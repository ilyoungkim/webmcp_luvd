// ─────────────────────────────────────────────────────────────
// popup.js — 연애의 자격 AI 비서 팝업 로직
// WebMCP 툴을 content script를 통해 조회/호출하고,
// 페이지 데이터와 키워드 기반 방식으로 결과를 표시합니다.
// ─────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

/** 현재 활성 탭의 WebMCP 상태를 조회합니다. */
async function sendMessageToTab(tabId, message) {
  return await new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          reason: chrome.runtime.lastError.message || 'content script unavailable',
        });
        return;
      }
      resolve(resp || { ok: false, reason: '빈 응답' });
    });
  });
}

async function queryWebMCP() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return { ok: false, reason: '탭이 없습니다.' };
  }
  const isSupported = /^https?:/.test(tab.url || '');
  if (!isSupported) {
    return { ok: false, reason: '지원하지 않는 페이지입니다.' };
  }

  // WebMCP 툴은 페이지 main world에 등록됩니다. modelContext에는 툴 목록 조회 API가
  // 없으므로, 페이지의 WebMCPConfig.items 로부터 툴 목록을 구성합니다.
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
        const cfg = window.WebMCPConfig;
        const items = cfg && Array.isArray(cfg.items) ? cfg.items : [];
        const ns = (cfg && cfg.siteNs) || 'site';
        const toolNames = items
          .map((item) => {
            if (!item) return null;
            const name = [ns, item.group, item.name].join('.');
            return { name };
          })
          .filter(Boolean);

        // modelContext 존재 여부만 참조 (툴 목록은 스펙상 열거 불가)
        const ctx =
          (typeof document !== 'undefined' && document.modelContext) ||
          (typeof navigator !== 'undefined' && navigator.modelContext) ||
          (typeof window !== 'undefined' && window.modelContext) ||
          null;

        return { ok: true, tools: toolNames, modelContext: !!ctx };
      },
    });

    const value = results && results[0] ? results[0].result : null;
    return value || { ok: false, tools: [], modelContext: false };
  } catch (e) {
    return { ok: false, tools: [], reason: e.message || String(e) };
  }
}

/** 활성 탭에서 WebMCP 툴을 직접 호출합니다. */
async function invokeTool(tool, args) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return { error: true, message: '탭 없음' };

  // content script는 isolated world라서 페이지의 window.WebMCPConfig에 접근할 수 없습니다.
  // chrome.scripting.executeScript(world: 'MAIN')로 페이지 main world에서 해당 툴의
  // getData(args)를 직접 호출해, modelContext가 없어도 동작하도록 합니다.
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (toolName, toolArgs) => {
        const cfg = window.WebMCPConfig;
        const items = cfg && Array.isArray(cfg.items) ? cfg.items : [];
        const ns = (cfg && cfg.siteNs) || 'site';
        const item = items.find((it) =>
          it && [ns, it.group, it.name].join('.') === toolName
        );
        if (!item) {
          return { error: true, message: '툴을 찾지 못했습니다: ' + toolName };
        }
        if (typeof item.getData === 'function') {
          return item.getData(toolArgs || {});
        }
        return item.getData || {};
      },
      args: [tool, args],
    });

    const value = results && results[0] ? results[0].result : null;
    return value || { error: true, message: '툴 호출 결과 없음' };
  } catch (e) {
    return { error: true, message: e.message || String(e) };
  }
}


async function queryPageInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return { ok: false, reason: '탭이 없습니다.' };
  }
  const isSupported = /^https?:/.test(tab.url || '');
  if (!isSupported) {
    return { ok: false, reason: '지원하지 않는 페이지입니다.' };
  }

  // content script는 isolated world라서 페이지의 window.WebMCPConfig에 접근할 수 없습니다.
  // chrome.scripting.executeScript(world: 'MAIN')로 페이지 main world에서 직접 읽어옵니다.
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
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
          if (typeof item.getData === 'function') {
            try {
              return item.getData();
            } catch (e) {
              return null;
            }
          }
          return item.getData || null;
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
      },
    });

    const value = results && results[0] ? results[0].result : null;
    return value || { ok: false, reason: 'WebMCPConfig 읽기 실패' };
  } catch (e) {
    return { ok: false, reason: e.message || String(e) };
  }
}

/** 간단한 마크다운을 HTML로 변환합니다. (보안상 이스케이프 후 변환) */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 마크다운 텍스트를 채팅에서 보기 좋은 HTML로 변환합니다. */
function markdownToHtml(md) {
  let html = escapeHtml(md);

  // 코드 블록 ``` ... ``` (가장 먼저 처리)
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return '<pre class="md-code">' + code.trim() + '</pre>';
  });

  // 인라인 코드 `...`
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');

  // 헤더 (## ~ ####)
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');

  // 굵게 / 기울임
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 링크 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 불릿 목록 - • 또는 - 
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  // 번호 목록
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // 줄바꿈 처리
  html = html.replace(/\n{2,}/g, '</p><p>');   // 빈 줄 → 단락 구분
  html = html.replace(/\n/g, '<br>');          // 단일 줄바꿈

  return '<p>' + html + '</p>';
}

/** 채팅 메시지 버블을 추가합니다. */
function addChatMessage(text, { role = 'bot', isError = false } = {}) {
  const chat = $('#chat');
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (role === 'user' ? 'user' : 'bot') + (isError ? ' error' : '');

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);

  if (role === 'user' || isError) {
    // 사용자 메시지/오류는 평문으로 표시
    bubble.textContent = content;
  } else {
    // 봇 답변은 마크다운 → HTML 렌더링
    bubble.innerHTML = markdownToHtml(content);
  }
  wrap.appendChild(bubble);

  const time = document.createElement('div');
  time.className = 'time';
  time.textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  wrap.appendChild(time);

  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight; // 항상 최신 메시지로 스크롤
  return bubble;
}

/** 인사말/웰컴 메시지를 채팅에 표시합니다. */
function addWelcomeMessage() {
  const chat = $('#chat');
  chat.innerHTML = '';
  addChatMessage('안녕하세요! 💘 연애의 자격 AI 비서입니다.\n서비스 가격, 상담사 정보, 재회 진단 등 궁금한 점을 물어보세요.');
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
    $('#statusText').dataset.connected = 'true';
  } else {
    status.textContent = '⚠️ 연결 안 됨';
    status.style.background = 'rgba(220,38,38,0.3)';
  }

  // Gemini 상태를 헤더에 표시
  const aiState = await detectBuiltinAI().catch(() => ({ available: 'error' }));
  const aiBadge = $('#aiStatusText');
  if (aiBadge) {
    aiBadge.style.display = 'inline-block';
    if (aiState.available === 'readily') {
      aiBadge.textContent = '🧠 Gemini 활성';
      aiBadge.style.background = 'rgba(22,163,74,0.3)';
    } else if (aiState.available === 'after-download') {
      aiBadge.textContent = '⬇️ 내장 AI 다운로드 가능';
      aiBadge.style.background = 'rgba(245,158,11,0.3)';
    } else {
      aiBadge.textContent = '🚫 사용 가능한 AI 없음';
      aiBadge.style.background = 'rgba(220,38,38,0.3)';
    }
  }
}

/** Gemini API 키가 설정되어 있는지 확인합니다. */
function hasGeminiKey() {
  return typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.length > 0;
}

/** 최신 표준 내장 AI(window.LanguageModel) 지원 여부를 감지합니다. */
async function detectBuiltinLanguageModel() {
  const LM = window.LanguageModel;
  if (!LM) {
    return { available: 'unavailable', reason: 'window.LanguageModel 없음' };
  }
  try {
    const availability = await LM.availability();
    // 상태값: 'available' | 'downloadable' | 'unavailable'
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

/** Gemini API 상태를 감지합니다. */
async function detectBuiltinAI() {
  // 1) 내장 AI(window.LanguageModel)가 사용 가능하면 그것을 우선
  const lm = await detectBuiltinLanguageModel();
  if (lm.available === 'available') {
    return { available: 'readily', reason: '내장 AI(window.LanguageModel) 사용 가능' };
  }
  if (lm.available === 'downloadable') {
    return { available: 'after-download', reason: '내장 AI 다운로드 가능' };
  }

  // 2) 없으면 Gemini API 키 사용 가능 여부
  if (hasGeminiKey()) {
    return { available: 'readily', reason: 'Gemini API 사용 가능' };
  }

  return { available: 'no', reason: '내장 AI 없음 + API 키 없음' };
}

/** 내장 AI(window.LanguageModel)로 답변을 받습니다. */
async function askBuiltinLanguageModel(question) {
  const LM = window.LanguageModel;
  const availability = await LM.availability();
  if (availability === 'unavailable') {
    throw new Error('이 기기는 사양이 부족하여 내장 AI를 실행할 수 없습니다.');
  }

  const systemPrompt =
    '당신은 연애의자격(yonja) 웹사이트의 AI 비서입니다. ' +
    '사용자의 질문에 친절하고 정확하게 답변하세요. ' +
    '서비스/상담사/진단 관련 질문에는 제공된 정보를 바탕으로 답하고, ' +
    '필요하면 다음 기능을 안내하세요: 서비스 가격 조회, 상담사 정보 조회, 재회 가능성 진단 제출. ' +
    '항상 한국어로 자연스럽게 답변하세요.';

  const session = await LM.create({
    systemPrompt,
    outputLanguage: 'en', // 필수: 내장 LanguageModel은 출력 언어 지정 요구 (지원: de,en,es,fr,ja)
    temperature: 0.2, // 낮을수록 일관되고 정확한 답변
    topK: 3,
  });

  try {
    const stream = session.promptStreaming(question);
    let full = '';
    for await (const chunk of stream) {
      full = chunk; // 실시간으로 완성되는 답변을 누적
    }
    return full;
  } finally {
    session.destroy(); // 메모리 해제
  }
}

/** Gemini API에 질문을 보내 답변을 받습니다. */
async function askGemini(question) {
  if (!hasGeminiKey()) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  const systemPrompt =
    '당신은 연애의자격(yonja) 웹사이트의 AI 비서입니다. ' +
    '사용자의 질문에 친절하고 정확하게 답변하세요. ' +
    '서비스/상담사/진단 관련 질문에는 제공된 정보를 바탕으로 답하고, ' +
    '필요하면 다음 기능을 안내하세요: 서비스 가격 조회, 상담사 정보 조회, 재회 가능성 진단 제출.';

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' +
    encodeURIComponent(GEMINI_API_KEY);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt + '\n\n사용자 질문: ' + question }],
        },
      ],
      generationConfig: {
        temperature: 0.2, // 낮을수록 일관되고 정확한 답변
        topK: 3,
      },
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
  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다.');
  }
  return text;
}

/** 내장 AI와 API 키가 모두 없을 때 표시할 안내 문구를 만듭니다. */
function builtinAIGuide() {
  return (
    '⚠️ 사용 가능한 Gemini가 없어 진짜 AI 답변을 받을 수 없습니다.\n\n' +
    '[방법 A] Gemini API 키 사용 (권장, 모든 Chrome에서 동작)\n' +
    '  gemini-key.js 파일에 GEMINI_API_KEY 값을 넣어 주세요.\n' +
    '  (키는 aistudio.google.com에서 무료 발급)\n\n' +
    '[방법 B] 내장 AI(window.LanguageModel) 활성화\n' +
    '  Chrome 최신 버전(정식 표준 API 지원)이 필요하며,\n' +
    '  기기 사양에 따라 모델 다운로드가 필요할 수 있습니다.'
  );
}

/** 질문 처리: 내장 AI(window.LanguageModel) 우선 → Gemini API → 안내 */
async function handleAsk() {
  const q = $('#userQuestion').value.trim();
  if (!q) {
    addChatMessage('메시지를 입력해주세요.', { role: 'bot', isError: true });
    return;
  }

  // 사용자 메시지를 채팅에 추가하고 입력창 초기화
  addChatMessage(q, { role: 'user' });
  $('#userQuestion').value = '';

  setLoading(true);

  try {
    // 1) 내장 AI(window.LanguageModel)가 사용 가능하면 우선 사용
    const lm = await detectBuiltinLanguageModel();
    if (lm.available === 'available') {
      const answer = await askBuiltinLanguageModel(q);
      addChatMessage(answer);
      return;
    }

    // 2) 내장 AI가 없으면 Gemini API 키로 답변
    if (hasGeminiKey()) {
      const answer = await askGemini(q);
      addChatMessage(answer);
      return;
    }

    // 3) 둘 다 없으면 안내를 보여줍니다.
    addChatMessage(builtinAIGuide(), { role: 'bot', isError: true });
  } catch (e) {
    addChatMessage('오류: ' + (e.message || e), { role: 'bot', isError: true });
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
    const daysMatch = text.match(/(\d+)\s*일/);
    const monthsMatch = text.match(/(\d+)\s*개월/);
    const genderMatch = text.match(/남자|남성|남/);
    const gender = genderMatch ? 'male' : /여자|여성|여/.test(text) ? 'female' : '';
    return {
      tool: 'yonja.diagnosis.submit',
      args: {
        name: '',
        gender: gender,
        separated_days: daysMatch
          ? Number(daysMatch[1])
          : monthsMatch
            ? Number(monthsMatch[1]) * 30
            : null,
        separated_at: '',
        reason: text,
        goal: '',
        source: '',
      },
    };
  }
  return { tool: null, args: {} };
}

// 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
  addWelcomeMessage();
  refresh();
});

// Enter로 전송 (Shift+Enter는 줄바꿈)
$('#userQuestion').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAsk();
  }
});

$('#askBtn').addEventListener('click', handleAsk);
document.querySelectorAll('.pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    $('#userQuestion').value = pill.dataset.question;
    $('#userQuestion').focus();
    handleAsk();
  });
});
