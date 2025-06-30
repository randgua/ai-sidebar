document.addEventListener('DOMContentLoaded', function () {
    // 1. Collect all DOM elements needed by the shared logic.
    const elements = {
        iframeContainer: document.getElementById('iframe-container'),
        refreshIcon: document.getElementById('refresh-icon'),
        settingsContainer: document.getElementById('settings-container'),
        copyMarkdownButton: document.getElementById('copy-markdown-button'),
        promptInput: document.getElementById('prompt-input'),
        promptContainer: document.getElementById('prompt-container'),
        togglePromptButton: document.getElementById('toggle-prompt-button'),
        sendPromptButton: document.getElementById('send-prompt-button'),
        clearPromptButton: document.getElementById('clear-prompt-button')
    };

    // 2. Initialize the shared UI logic.
    initializeSharedUI(elements);

    // 3. Handle logic unique to the side panel.
    const fullPageChatIcon = document.getElementById('full-page-chat-icon');
    if (fullPageChatIcon) {
        fullPageChatIcon.addEventListener('click', function() {
            chrome.tabs.create({ url: 'standalone.html' });
            window.close();
        });
    }
});