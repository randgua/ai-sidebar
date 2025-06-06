// Allows users to open the side panel by clicking the extension's action toolbar icon.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error));

chrome.runtime.onInstalled.addListener(function () {
    // These rules modify response headers to allow iframing of sites
    // that might otherwise block it using X-Frame-Options or Content-Security-Policy.
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1], // Remove existing rule with ID 1 to avoid conflicts.
        addRules: [{
                id: 1, // Unique ID for the rule.
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    responseHeaders: [
                        // Remove headers that prevent embedding.
                        { header: "x-frame-options", operation: "remove" },
                        { header: "content-security-policy", operation: "remove" },
                        { header: "frame-options", operation: "remove" } // Some sites might use this less common header.
                    ]
                },
                condition: {
                    // Apply to main documents and subframes.
                    resourceTypes: [
                        "main_frame",
                        "sub_frame"
                    ]
                    // This rule applies to all URLs due to "<all_urls>" in host_permissions in manifest.json.
                }
            }]
    }).then(() => {
        console.log("DeclarativeNetRequest rules for iframe embedding updated successfully.");
    }).catch((error) => {
        console.error("Error updating DeclarativeNetRequest rules:", error);
    });
});

// Unified listener for runtime messages (e.g., from sidepanel.js or other extension parts).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateShortcut') {
    // '_execute_action' should match a command name defined in manifest.json.
    // This command typically refers to the browser action click.
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
    return true; // Indicates that the response will be sent asynchronously.
  } else if (request.action === 'getShortcut') {
    chrome.commands.getAll((commands) => {
      if (chrome.runtime.lastError) {
        sendResponse({ shortcut: '', error: chrome.runtime.lastError.message });
        return;
      }
      const command = commands.find(cmd => cmd.name === '_execute_action');
      // Return the current shortcut or an empty string if not found.
      sendResponse({ shortcut: command ? command.shortcut : '' });
    });
    return true; // Indicates that the response will be sent asynchronously.
  }
  // If the action is not handled by this listener,
  // returning false or undefined allows other listeners (if any) to handle it.
  // For this extension, we expect all messages to be handled here.
  return false;
});