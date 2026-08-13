// ─────────────────────────────────────────────────────────────
// background.js — 서비스 워커
// Chrome 내장 AI(제미나이 나노) 접근과 탭 이벤트 관리를 담당합니다.
// (popup과 content script의 보조 역할)
// ─────────────────────────────────────────────────────────────

// 확장 설치/업데이트 시 기본 설정 저장
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    preferAi: true,
    siteNs: 'yonja',
  });
});

// 현재 탭에서 WebMCP가 노출되는지 여부를 툴바 배지로 표시
async function updateBadge() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'WEBMCP_QUERY' });
    if (res && res.ok && res.toolNames && res.toolNames.length > 0) {
      chrome.action.setBadgeText({ text: String(res.toolNames.length), tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#ff3d6e', tabId: tab.id });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }
  } catch {
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
  }
}

chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') updateBadge();
});

// 주소창 앞 "확장" 버튼 클릭 시 별도 창으로 AI 비서를 엽니다.
// 팝업은 화면/탭 전환 시 자동으로 닫히지만, 별도 창(window)은 유지됩니다.
const POPUP_WINDOW_URL = chrome.runtime.getURL('popup.html');
let popupWindowId = null;

async function openAssistantWindow() {
  // 이미 연 창이 있으면 앞으로 가져오기만 합니다.
  if (popupWindowId != null) {
    try {
      const win = await chrome.windows.get(popupWindowId);
      if (win) {
        chrome.windows.update(popupWindowId, { focused: true });
        return;
      }
    } catch {
      popupWindowId = null; // 창이 닫힌 경우 초기화
    }
  }

  const win = await chrome.windows.create({
    url: POPUP_WINDOW_URL,
    type: 'popup',
    width: 480,
    height: 720,
    focused: true,
  });
  popupWindowId = win.id;
}

chrome.action.onClicked.addListener(() => {
  updateBadge();
  openAssistantWindow();
});

// 연 창이 닫히면 ID를 초기화해 다음 클릭 시 새 창을 열 수 있게 합니다.
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

updateBadge();
