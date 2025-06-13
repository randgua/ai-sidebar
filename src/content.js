// This script runs inside each iframe to receive prompts and interact with the page.

/**
 * Routes the prompt to a site-specific handler based on the current website's hostname.
 * This allows for precise targeting of elements on different web apps.
 * @param {string} prompt The text to be injected.
 */
function handlePromptInjection(prompt) {
    const hostname = window.location.hostname;

    // A router to map hostnames to their specific handler functions.
    const siteHandlers = {
        'chatgpt.com': handleChatGPT,
        'aistudio.google.com': handleAiStudio
        // Add other specific handlers here, e.g., 'claude.ai': handleClaude
    };

    // Find a handler that matches the end of the hostname for broader compatibility (e.g., www.chatgpt.com).
    const handlerKey = Object.keys(siteHandlers).find(key => hostname.endsWith(key));
    const handler = handlerKey ? siteHandlers[handlerKey] : handleGeneric;

    handler(prompt);
}

/**
 * Site-specific handler for chatgpt.com
 * @param {string} prompt The text to be injected.
 */
function handleChatGPT(prompt) {
    const inputArea = document.querySelector('#prompt-textarea');
    if (!inputArea) {
        console.warn('AI-Sidebar: ChatGPT input area not found. The selector might be outdated.');
        return;
    }
    inputArea.value = prompt;
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.click();
        }
    }, 100);
}


/**
 * Site-specific handler for aistudio.google.com
 * @param {string} prompt The text to be injected.
 */
function handleAiStudio(prompt) {
    // AI Studio also uses a content-editable div.
    const inputArea = document.querySelector('div.input-area div[contenteditable="true"]');
    if (!inputArea) {
        console.warn('AI-Sidebar: AI Studio input area not found. The selector might be outdated.');
        return;
    }
    inputArea.textContent = prompt;
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
        const sendButton = document.querySelector('button[aria-label="Send message"]');
        if (sendButton) {
            sendButton.click();
        }
    }, 100);
}

/**
 * Generic handler for other websites using a heuristic-based approach.
 * This will be used for sites like DeepSeek or any other not specifically handled.
 * @param {string} prompt The text to be injected.
 */
function handleGeneric(prompt) {
    const inputArea = document.querySelector('textarea, [role="textbox"]');
    if (!inputArea) {
        console.warn('AI-Sidebar: Generic input area not found on this page.');
        return;
    }

    // Set value for both textarea and content-editable divs.
    if (inputArea.isContentEditable) {
        inputArea.textContent = prompt;
    } else {
        inputArea.value = prompt;
    }
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
        let sendButton = document.querySelector('button[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="Submit"], button > span.material-symbols-outlined:contains("send")');
        
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.click();
        } else {
            // Fallback to simulating an "Enter" key press if no button is found.
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
            inputArea.dispatchEvent(enterEvent);
        }
    }, 100);
}

// Main listener for messages from the sidepanel.
window.addEventListener('message', (event) => {
    // Basic security check: ensure the message is what we expect.
    if (event.data && event.data.action === 'injectPrompt') {
        handlePromptInjection(event.data.prompt);
    }
});