// This script runs inside each iframe to receive prompts and interact with the page.

/**
 * Routes the prompt to a site-specific handler based on the current website's hostname.
 * @param {string} prompt The text to be injected.
 */
function handlePromptInjection(prompt) {
    const hostname = window.location.hostname;

    // A router to map hostnames to their specific handler functions.
    const siteHandlers = {
        'chatgpt.com': handleChatGPT,
        'aistudio.google.com': handleAiStudio
    };

    // Find a handler that matches the end of the hostname for broader compatibility.
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
    // Use a specific selector for the textarea.
    const inputArea = document.querySelector('textarea[aria-label="Start typing a prompt"]');
    
    if (!inputArea) {
        console.warn('AI-Sidebar: AI Studio input area not found. The selector might be outdated.');
        return;
    }

    // For <textarea> elements, set the .value property.
    inputArea.value = prompt;
    // Dispatch an 'input' event to ensure the website's framework recognizes the change.
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    // AI Studio requires Ctrl+Enter or Cmd+Enter to submit.
    // We simulate this by dispatching a 'keydown' event for the 'Enter' key
    // with the 'ctrlKey' flag set to true for cross-platform compatibility.
    const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        ctrlKey: true 
    });
    inputArea.dispatchEvent(enterEvent);
}

/**
 * Generic handler for other websites using a heuristic-based approach.
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
        // Find a send button using common attributes.
        let sendButton = document.querySelector('button[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="Submit"]');
        
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