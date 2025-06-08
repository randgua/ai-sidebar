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
                    responseHeaders: [
                        { header: "x-frame-options", operation: "remove" },
                        { header: "content-security-policy", operation: "remove" }
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