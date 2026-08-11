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
  return await sendMessageToTab(tab.id, { type: 'WEBMCP_INVOKE', tool, args });
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

function renderServiceInfo(serviceData) {
  const box = $('#serviceInfoCard');
  if (!serviceData || !serviceData.services || serviceData.services.length === 0) {
    box.innerHTML = '<div class="info-empty">서비스 정보를 불러오지 못했습니다.</div>';
    return;
  }

  box.innerHTML = '';

  if (serviceData.about) {
    box.innerHTML += `<div class="info-note" style="margin-bottom: 6px;">${serviceData.about}</div>`;
  }

  box.innerHTML += serviceData.services
    .map(
      (service) => `
        <div class="info-item">
          <div class="info-title">${service.name || '서비스'}</div>
          <div class="info-meta">${service.price || '가격 미정'}</div>
        </div>
      `
    )
    .join('');

  if (serviceData.consultation) {
    box.innerHTML += `<div class="info-note">${serviceData.consultation}</div>`;
  }
}

function renderConsultantInfo(consultantData) {
  const box = $('#consultantInfoCard');
  const items = Array.isArray(consultantData)
    ? consultantData
    : consultantData && consultantData.consultants
      ? consultantData.consultants
      : [];

  if (!items.length) {
    box.innerHTML = '<div class="info-empty">상담사 정보를 불러오지 못했습니다.</div>';
    return;
  }

  box.innerHTML = items
    .map(
      (item) => `
        <div class="info-item">
          <div class="info-title">${item.name || '상담사'}</div>
          <div class="info-meta">${item.specialty || '전문분야 미상'}</div>
          <div class="info-micro">${item.experience || '경력 미상'} · ${item.id ? `ID ${item.id}` : '정보'}</div>
        </div>
      `
    )
    .join('');
}

function renderInfoCards(info) {
  if (!info) {
    $('#serviceInfoCard').innerHTML = '<div class="info-empty">서비스 정보 없음</div>';
    $('#consultantInfoCard').innerHTML = '<div class="info-empty">상담사 정보 없음</div>';
    return;
  }
  renderServiceInfo(info.service || null);
  renderConsultantInfo(info.consultant || null);
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
    const reason = 'WebMCP 미노출';
    $('#toolsList').innerHTML =
      `<div class="row"><span class="label">${reason}</span></div>`;
  }

  const infoRes = await queryPageInfo().catch((e) => ({ ok: false, reason: e.message }));
  if (infoRes && infoRes.ok && infoRes.service) {
    renderInfoCards(infoRes);
  } else {
    renderInfoCards(null);
  }
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

  try {
    const plan = keywordPlan(q);
    if (plan.tool) {
      const res = await invokeTool(plan.tool, plan.args);
      showResult(res);
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
