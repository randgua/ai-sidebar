document.addEventListener('DOMContentLoaded', function () {
    // 1. Collect all DOM elements needed by the shared logic.
    const elements = {
        iframeContainer: document.getElementById('iframe-container'),
        refreshIcon: document.getElementById('refresh-icon'),
        settingsContainer: document.getElementById('settings-container'),
        settingsPopup: document.getElementById('settings-popup'),
        urlListManagementDiv: document.getElementById('url-list-management'),
        newUrlInput: document.getElementById('new-url-input'),
        addUrlButton: document.getElementById('add-url-button'),
        clearSelectionButton: document.getElementById('clear-selection-button'),
        invertSelectionButton: document.getElementById('invert-selection-button'),
        selectAllButton: document.getElementById('select-all-button'),
        copyMarkdownButton: document.getElementById('copy-markdown-button'),
        promptInput: document.getElementById('prompt-input'),
        promptContainer: document.getElementById('prompt-container'),
        togglePromptButton: document.getElementById('toggle-prompt-button'),
        sendPromptButton: document.getElementById('send-prompt-button'),
        clearPromptButton: document.getElementById('clear-prompt-button')
    };

    // 2. Initialize the shared UI logic.
    initializeSharedUI(elements);

    // 3. Handle logic unique to the standalone page.
    const backToPanelButton = document.getElementById('back-to-panel-button');
    if (backToPanelButton) {
        backToPanelButton.addEventListener('click', () => {
            // This message asks the background script to open the side panel.
            chrome.runtime.sendMessage({ action: "openSidePanel" }, () => {
                // Once the message is sent, close the standalone page.
                window.close();
            });
        });
    }

    const collapseButton = document.getElementById('collapse-sidebar-button');
    const leftSidebar = document.getElementById('left-sidebar');
    if (collapseButton && leftSidebar) {
        collapseButton.addEventListener('click', () => {
            leftSidebar.classList.toggle('collapsed');
        });
    }
});