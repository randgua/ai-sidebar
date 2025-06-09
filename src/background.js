// Open the side panel when the extension's action icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error));

chrome.runtime.onInstalled.addListener(function () {
    // Add rules to modify response headers, allowing more sites to be embedded in iframes.
    // This removes x-frame-options and content-security-policy headers that prevent embedding.
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
                      ],
                    responseHeaders: [
                        // Remove headers that prevent embedding.
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