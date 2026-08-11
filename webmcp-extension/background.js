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

// 주소창 앞 "확장" 버튼 클릭 시에도 배지 갱신
chrome.action.onClicked.addListener(updateBadge);

updateBadge();
