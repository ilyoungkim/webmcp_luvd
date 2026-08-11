// ─────────────────────────────────────────────────────────────
// content.js — 페이지에 주입되어 WebMCP API와 통신합니다.
// 확장 프로그램(popup/background)의 요청을 받아:
//   1) 등록된 WebMCP 툴 목록 조회
//   2) 특정 툴 호출
// 을 수행하고 결과를 돌려줍니다.
// ─────────────────────────────────────────────────────────────

/** 페이지에서 WebMCP modelContext를 가져옵니다. */
function getModelContext() {
  if (typeof document !== 'undefined' && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext;
  }
  if (typeof window !== 'undefined' && window.modelContext) {
    return window.modelContext;
  }
  return null;
}

/**
 * modelContext에서 등록된 툴 목록을 조회합니다.
 * WebMCP 스펙에 따라 tools() 또는 listTools()가 있을 수 있습니다.
 */
function listRegisteredTools() {
  const mc = getModelContext();
  if (!mc) return [];

  if (typeof mc.tools === 'function') {
    const tools = mc.tools();
    if (Array.isArray(tools)) return tools;
  }
  if (typeof mc.listTools === 'function') {
    const tools = mc.listTools();
    if (Array.isArray(tools)) return tools;
  }
  // 객체/Map 형태일 수 있음
  if (mc.tools && typeof mc.tools === 'object') {
    return Object.keys(mc.tools).map((k) => {
      const t = mc.tools[k];
      return typeof t === 'string' ? { name: t } : t;
    });
  }
  return [];
}

/**
 * WebMCP 툴을 호출합니다.
 * execute / invoke / call 등 다양한 시그니처를 지원합니다.
 */
async function invokeWebMCPTool(tool, args) {
  const mc = getModelContext();
  if (!mc) {
    return { error: true, message: 'modelContext를 찾을 수 없습니다.' };
  }

  const callTargets = [
    () => (typeof mc.execute === 'function' ? mc.execute(tool, args) : undefined),
    () => (typeof mc.invoke === 'function' ? mc.invoke(tool, args) : undefined),
    () =>
      typeof mc.executeTool === 'function'
        ? mc.executeTool({ name: tool, input: args })
        : undefined,
    () =>
      typeof mc.call === 'function'
        ? mc.call({ name: tool, arguments: args })
        : undefined,
  ];

  for (const target of callTargets) {
    try {
      const result = target();
      if (result !== undefined) {
        return await Promise.resolve(result);
      }
    } catch (e) {
      return { error: true, message: e.message || String(e) };
    }
  }

  // 직접 툴 객체 접근: mc.tools['yonja.x.y'].execute(args)
  if (mc.tools && typeof mc.tools === 'object') {
    const t = mc.tools[tool];
    if (t) {
      if (typeof t.execute === 'function') {
        return await Promise.resolve(t.execute(args || {}));
      }
      if (typeof t === 'function') {
        return await Promise.resolve(t(args || {}));
      }
      return t;
    }
  }

  return { error: true, message: '툴 호출 방법을 찾지 못했습니다: ' + tool };
}

/** 등록된 툴의 이름만 추출합니다. */
function extractToolNames(tools) {
  return tools.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
}

/** 메시지 리스너 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === 'WEBMCP_QUERY') {
      const tools = listRegisteredTools();
      sendResponse({
        ok: true,
        tools: tools.map((t) =>
          typeof t === 'string' ? { name: t } : t
        ),
        toolNames: extractToolNames(tools),
      });
    } else if (msg.type === 'WEBMCP_INVOKE') {
      const result = await invokeWebMCPTool(msg.tool, msg.args || {});
      sendResponse(result);
    } else {
      sendResponse({ error: true, message: '알 수 없는 메시지 타입' });
    }
  })();
  return true; // 비동기 응답 유지
});
