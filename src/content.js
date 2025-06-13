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
 * Site-specific handler for chatgpt.com.
 * This implementation handles the contenteditable div used as an input field.
 * @param {string} prompt The text to be injected.
 */
function handleChatGPT(prompt) {
    const inputArea = document.querySelector('#prompt-textarea');
    if (!inputArea) {
        console.warn('AI-Sidebar: ChatGPT input area not found. The selector might be outdated.');
        return;
    }

    // For a contenteditable div, setting innerText is the correct way to change its content.
    inputArea.innerText = prompt;

    // Dispatch an 'input' event to notify the React framework that the input has changed.
    const inputEvent = new Event('input', { bubbles: true, composed: true });
    inputArea.dispatchEvent(inputEvent);

    // A short delay allows the page to process the input and enable the send button.
    setTimeout(() => {
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (sendButton && !sendButton.disabled) {
            sendButton.click();
        } else {
            console.warn('AI-Sidebar: Send button not found or was disabled. The selector might be outdated.');
        }
    }, 200);
}


/**
 * Site-specific handler for aistudio.google.com
 * @param {string} prompt The text to be injected.
 */
function handleAiStudio(prompt) {
    const inputArea = document.querySelector('textarea[aria-label="Start typing a prompt"]');
    
    if (!inputArea) {
        console.warn('AI-Sidebar: AI Studio input area not found. The selector might be outdated.');
        return;
    }

    inputArea.value = prompt;
    // Dispatch an 'input' event to ensure the website's framework recognizes the change.
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    // AI Studio requires Ctrl+Enter or Cmd+Enter. Detect the OS to send the correct key combination.
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        ctrlKey: !isMac, // Use CtrlKey if not on a Mac.
        metaKey: isMac   // Use MetaKey (Command key) if on a Mac.
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