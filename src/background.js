// Import default data for installation.
importScripts('shared/defaults.js');

// Open the side panel when the extension's action icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error));

// Listener for messages from other parts of the extension.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openSidePanel") {
        // Open the side panel in the window where the message came from.
        if (sender.tab) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
        sendResponse({ status: "Side panel opening" });
    }
    return true; // Keep the message channel open for the response.
});

// Listener for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === "open-standalone-page") {
        chrome.tabs.create({ url: 'standalone.html' });
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    // On first install, populate storage with default URLs and Prompts.
    if (details.reason === 'install') {
        chrome.storage.local.set({
            managedUrls: defaultUrls,
            prompts: defaultPrompts,
            displayLanguage: 'English' // Set a default language as well.
        }, () => {
            console.log('Default URLs and prompts have been set on installation.');
        });
    }

    // Add rules to modify response headers, allowing more sites to be embedded in iframes.
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [{
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        // { header: 'Sec-Fetch-Site', operation: 'remove' },
                        // { header: 'Sec-Fetch-Mode', operation: 'remove' },
                        { header: 'Sec-Fetch-Dest', operation: 'remove' },
                        // { header: 'Sec-Fetch-User', operation: 'remove' }
                      ],
                    responseHeaders: [
                        // Remove headers that prevent the page from being embedded in an iframe.
                        { header: "x-frame-options", operation: "remove" },
                        { header: "content-security-policy", operation: "remove" },
                        // Remove headers that prevent embedding.
                        // { header: "frame-options", operation: "remove" },
                        // { header: "frame-ancestors", operation: "remove" },
                        // { header: "X-Content-Type-Options", operation: "remove"},
                        // Set Access-Control-Allow-Origin to allow cross-origin requests,
                        // which can sometimes help with iframe embedding issues.
                        // { header: "access-control-allow-origin", operation: "set", value: "*" }
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