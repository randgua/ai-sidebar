// Enable side panel opening via extension icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error));

chrome.runtime.onInstalled.addListener(function () {
    // Configure response header modification rules for iframe embedding
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [{
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        { header: "x-frame-options", operation: "remove" },
                        { header: "content-security-policy", operation: "remove" },
                        { header: "frame-options", operation: "remove" }
                    ]
                },
                condition: {
                    resourceTypes: [
                        "main_frame",
                        "sub_frame"
                    ]
                }
            }]
    }).then(() => {
        console.log("DeclarativeNetRequest rules for iframe embedding updated successfully.");
    }).catch((error) => {
        console.error("Error updating DeclarativeNetRequest rules:", error);
    });
});

// Handle runtime messages from extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateShortcut') {
    chrome.commands.update({
      name: '_execute_action',
      shortcut: request.shortcut
    }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  } else if (request.action === 'getShortcut') {
    chrome.commands.getAll((commands) => {
      if (chrome.runtime.lastError) {
        sendResponse({ shortcut: '', error: chrome.runtime.lastError.message });
        return;
      }
      const command = commands.find(cmd => cmd.name === '_execute_action');
      sendResponse({ shortcut: command ? command.shortcut : '' });
    });
    return true;
  }
  return false;
});