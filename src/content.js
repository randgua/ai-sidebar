// This script runs inside each iframe to receive prompts and interact with the page.

/**
 * Waits for an element to appear in the DOM.
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

// Hostname to prompt injection handler mapping.
const siteHandlers = {
    'aistudio.google.com': handleAiStudio,
    'gemini.google.com': handleGemini,
    'chatgpt.com': handleChatGPT,
    'claude.ai': handleClaude,
    'grok.com': handleGeneric,
    'perplexity.ai': handlePerplexity,
    'chat.deepseek.com': handleDeepSeek,
    'chat.qwen.ai': handleQwen,
};

// Hostname to output extraction handler mapping.
const siteOutputHandlers = {
    'aistudio.google.com': getAIStudioOutput,
    'gemini.google.com': getGeminiOutput,
    'chatgpt.com': getChatGPTOutput,
    'claude.ai': getClaudeOutput,
    'grok.com': getGrokOutput,
    'perplexity.ai': getPerplexityOutput,
    'chat.deepseek.com': getDeepSeekOutput,
    'chat.qwen.ai': getQwenOutput,
};

/**
 * Routes the prompt to a site-specific handler.
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
    const sendButton = await waitForElement('button[aria-label="Run"]:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        console.warn('AI-Sidebar: AI Studio send button not found or was disabled.');
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
 * Site-specific handler for chatgpt.com.
 * @param {string} prompt The text to be injected.
 */
async function handleChatGPT(prompt) {
    // Note: ChatGPT selectors are known to change frequently.
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
 * Site-specific handler for perplexity.ai.
 * @param {string} prompt The text to be injected.
 */
async function handlePerplexity(prompt) {
    const inputArea = await waitForElement('textarea[placeholder*="Ask anything"]');
    if (!inputArea) {
        console.warn('AI-Sidebar: Could not find the input area on perplexity.ai.');
        return;
    }
    inputArea.value = prompt;
    inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    const sendButton = await waitForElement('button[data-testid="submit-button"]:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        console.warn('AI-Sidebar: Perplexity send button not found or was disabled.');
    }
}

/**
 * Site-specific handler for chat.deepseek.com.
 * @param {string} prompt The text to be injected.
 */
async function handleDeepSeek(prompt) {
    const inputArea = await waitForElement('textarea#chat-input');
    if (!inputArea) {
        console.warn('AI-Sidebar: Could not find the input area on chat.deepseek.com.');
        return;
    }
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(inputArea, prompt);
    inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        which: 13,
        keyCode: 13,
        bubbles: true,
        cancelable: true
    });
    inputArea.dispatchEvent(enterEvent);
}

/**
 * Site-specific handler for chat.qwen.ai.
 * @param {string} prompt The text to be injected.
 */
async function handleQwen(prompt) {
    const inputArea = await waitForElement('textarea[placeholder*="How can I help you"]');
    if (!inputArea) {
        console.warn('AI-Sidebar: Could not find the input area on chat.qwen.ai.');
        return;
    }
    inputArea.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(inputArea, prompt);
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
    const sendButton = await waitForElement('button#send-message-button:not([disabled])');
    if (sendButton) {
        sendButton.click();
    } else {
        console.warn('AI-Sidebar: Qwen send button not found or was disabled.');
    }
}

/**
 * Generic handler for other websites.
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
    const allTurns = document.querySelectorAll('ms-chat-turn');
    const modelTurns = Array.from(allTurns).filter(turn => turn.querySelector('[data-turn-role="Model"]'));

    if (modelTurns.length > 0) {
        const lastModelTurn = modelTurns[modelTurns.length - 1];
        const contentContainer = lastModelTurn.querySelector('.turn-content');
        if (contentContainer) {
            return contentContainer.innerText;
        }
    }
    return '';
}

/**
 * Extracts the last response from Gemini.
 * @returns {Promise<string>} The text of the last response.
 */
async function getGeminiOutput() {
    const responses = document.querySelectorAll('model-response');
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        const content = lastResponse.querySelector('.markdown');
        if (content) {
            return content.innerText;
        }
        return lastResponse.innerText;
    }
    return '';
}

/**
 * Extracts the last assistant message from ChatGPT.
 * @returns {Promise<string>} The text of the last message.
 */
async function getChatGPTOutput() {
    // Note: ChatGPT selectors are known to change frequently.
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
 * Extracts the text from the last message group from Claude, which may include the user's prompt.
 * @returns {Promise<string>} The text of the last message group.
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
 * Extracts the last response from Grok.
 * @returns {Promise<string>} The text of the last response.
 */
async function getGrokOutput() {
    const responses = document.querySelectorAll('div.response-content-markdown');
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse) {
            return lastResponse.innerText;
        }
    }
    return '';
}

/**
 * Extracts the last response from Perplexity.ai.
 * @returns {Promise<string>} The text of the last response.
 */
async function getPerplexityOutput() {
    const responses = document.querySelectorAll('div[id^="markdown-content-"]');
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse) {
            return lastResponse.innerText;
        }
    }
    return '';
}

/**
 * Extracts the last response from DeepSeek.
 * @returns {Promise<string>} The text of the last response.
 */
async function getDeepSeekOutput() {
    const contentBlocks = document.querySelectorAll('div.ds-markdown');
    if (contentBlocks.length > 0) {
        const lastBlock = contentBlocks[contentBlocks.length - 1];
        if (lastBlock) {
            return lastBlock.innerText;
        }
    }
    return '';
}

/**
 * Extracts the last response from Qwen.
 * @returns {Promise<string>} The text of the last response.
 */
async function getQwenOutput() {
    const responses = document.querySelectorAll('div.markdown-content-container');
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse) {
            return lastResponse.innerText;
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