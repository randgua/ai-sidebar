// This script runs inside each iframe to receive prompts and interact with the page.

/**
 * Waits for an element to appear in the DOM using MutationObserver for reliability.
 * @param {string} selector The CSS selector for the element.
 * @param {number} timeout The maximum time to wait in milliseconds.
 * @returns {Promise<Element|null>} A promise that resolves with the element or null if not found.
 */
function waitForElement(selector, timeout = 8000) {
    return new Promise(resolve => {
        const initialElement = document.querySelector(selector);
        if (initialElement) {
            return resolve(initialElement);
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                clearTimeout(timer);
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled']
        });

        const timer = setTimeout(() => {
            observer.disconnect();
            if (siteHandlers[window.location.hostname]) {
                console.warn(`AI-Sidebar: Element with selector "${selector}" timed out after ${timeout}ms.`);
            }
            resolve(null);
        }, timeout);
    });
}

// A router to map hostnames to their specific prompt injection handlers.
const siteHandlers = {
    'aistudio.google.com': handleAiStudio,
    'chat.qwen.ai': handleQwen,
    'chatgpt.com': handleChatGPT,
    'claude.ai': handleClaude,
    'gemini.google.com': handleGemini
};

// A router to map hostnames to their specific output extraction handlers.
const siteOutputHandlers = {
    'aistudio.google.com': getAIStudioOutput,
    'chatgpt.com': getChatGPTOutput,
    'gemini.google.com': getGeminiOutput,
    'claude.ai': getClaudeOutput,
};

/**
 * Routes the prompt to a site-specific handler based on the current website's hostname.
 * @param {string} prompt The text to be injected.
 */
async function handlePromptInjection(prompt) {
    const hostname = window.location.hostname;
    const handler = siteHandlers[hostname] || handleGeneric;
    await handler(prompt);
}

/**
 * Site-specific handler for aistudio.google.com.
 * @param {string} prompt The text to be injected.
 */
async function handleAiStudio(prompt) {
    const selector = 'textarea[aria-label="Type something or tab to choose an example prompt"], textarea[aria-label="Start typing a prompt"]';
    const inputArea = await waitForElement(selector);
    
    if (!inputArea) {
        console.warn('AI-Sidebar: Could not find the input area on aistudio.google.com.');
        return;
    }

    inputArea.value = prompt;
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    const clientHints = await navigator.userAgentData.getHighEntropyValues(['platform']);
    const isMac = clientHints.platform === 'macOS';

    const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
        ctrlKey: !isMac,
        metaKey: isMac
    });
    inputArea.dispatchEvent(enterEvent);
}

/**
 * Site-specific handler for chat.qwen.ai (Tongyi Qianwen).
 * @param {string} prompt The text to be injected.
 */
async function handleQwen(prompt) {
    const inputArea = await waitForElement('textarea[placeholder*="How can I help you"]');
    if (!inputArea) return;

    inputArea.focus();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(inputArea, prompt);
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    // Allow a brief moment for the framework to process the input event.
    setTimeout(() => {
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        inputArea.dispatchEvent(enterEvent);
    }, 100);
}

/**
 * Site-specific handler for chatgpt.com.
 * @param {string} prompt The text to be injected.
 */
async function handleChatGPT(prompt) {
    const selector = '#prompt-textarea, div.ProseMirror[role="textbox"]';
    const inputArea = await waitForElement(selector);

    if (!inputArea) {
        console.warn('AI-Sidebar: Could not find the input area on chatgpt.com.');
        return;
    }

    if (inputArea.isContentEditable) {
        inputArea.textContent = prompt;
    } else {
        inputArea.value = prompt;
    }
    
    inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    const sendButton = await waitForElement('button[data-testid="send-button"]:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        console.warn('AI-Sidebar: Send button not found or was disabled on chatgpt.com.');
    }
}

/**
 * Site-specific handler for claude.ai.
 * @param {string} prompt The text to be injected.
 */
async function handleClaude(prompt) {
    const inputArea = await waitForElement('div[contenteditable="true"][aria-label="Send a message"]');
    if (!inputArea) return;

    inputArea.innerText = prompt;
    inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    const sendButton = await waitForElement('button[aria-label="Send Message"]:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        console.warn('AI-Sidebar: Claude send button not found or was disabled.');
    }
}

/**
 * Site-specific handler for gemini.google.com.
 * @param {string} prompt The text to be injected.
 */
async function handleGemini(prompt) {
    const inputArea = await waitForElement('div[role="textbox"][contenteditable="true"]');
    if (!inputArea) return;

    inputArea.textContent = prompt;
    inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    const sendButton = await waitForElement('button[aria-label="Send message"]:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        console.warn('AI-Sidebar: Gemini send button not found or was disabled.');
    }
}

/**
 * Generic handler for other websites using a heuristic-based approach.
 * @param {string} prompt The text to be injected.
 */
async function handleGeneric(prompt) {
    const inputArea = await waitForElement('textarea, [role="textbox"]');
    if (!inputArea) return;

    if (inputArea.isContentEditable) {
        inputArea.textContent = prompt;
    } else {
        inputArea.value = prompt;
    }
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));

    const sendButton = await waitForElement('button[data-testid*="send"]:not([disabled]), button[aria-label*="Send"]:not([disabled]), button[aria-label*="Submit"]:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        inputArea.dispatchEvent(enterEvent);
    }
}

/**
 * Extracts the last response from AI Studio.
 * @returns {Promise<string>} The text of the last response.
 */
async function getAIStudioOutput() {
    const responses = document.querySelectorAll('ms-text-chunk');
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse) {
            return lastResponse.innerText;
        }
    }
    return '';
}

/**
 * Extracts the last assistant message from ChatGPT.
 * @returns {Promise<string>} The text of the last message.
 */
async function getChatGPTOutput() {
    const assistantMessages = document.querySelectorAll('div[data-message-author-role="assistant"]');
    if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        const content = lastMessage.querySelector('.markdown');
        if (content) {
            return content.innerText;
        }
    }
    return '';
}

/**
 * Extracts the last response from Gemini.
 * @returns {Promise<string>} The text of the last response.
 */
async function getGeminiOutput() {
    const responses = document.querySelectorAll('.model-response');
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        return lastResponse.innerText;
    }
    return '';
}

/**
 * Extracts the last message from Claude.
 * @returns {Promise<string>} The text of the last message.
 */
async function getClaudeOutput() {
    const messageGroups = document.querySelectorAll('[data-testid^="message-"]');
    if (messageGroups.length > 0) {
        const lastGroup = messageGroups[messageGroups.length - 1];
        if (lastGroup) {
            return lastGroup.innerText;
        }
    }
    return '';
}

/**
 * Routes the output extraction to a site-specific handler.
 */
async function handleOutputExtraction() {
    const hostname = window.location.hostname;
    const handler = siteOutputHandlers[hostname];
    let lastOutput = '';
    if (handler) {
        try {
            lastOutput = await handler();
        } catch (e) {
            console.error('AI-Sidebar: Error extracting output:', e);
        }
    }

    // Send the extracted output back to the parent sidepanel.
    window.parent.postMessage({
        action: 'receiveLastOutput',
        output: lastOutput,
        source: hostname
    }, '*');
}

// Main listener for messages from the sidepanel.
window.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.action === 'injectPrompt') {
        const prompt = event.data.prompt;
        const executeInjection = () => handlePromptInjection(prompt);

        if (document.readyState === 'complete') {
            executeInjection();
        } else {
            window.addEventListener('load', executeInjection, { once: true });
        }
    }

    if (event.data.action === 'getLastOutput') {
        handleOutputExtraction();
    }
});