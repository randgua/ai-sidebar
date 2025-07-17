// Check if the runtime is available. If not, this content script is a "zombie"
// from a previous version of the extension that has been updated or disabled.
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {

    // Waits for an element to appear in the DOM.
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
                // Warn on timeout for any site to aid in debugging.
                console.warn(`AI-Sidebar: Element with selector "${selector}" timed out after ${timeout}ms.`);
                resolve(null);
            }, timeout);
        });
    }
    
    // Reports an interaction failure to the user-facing UI.
    function reportInteractionFailure(hostname, message) {
        console.warn(`AI-Sidebar interaction failed on ${hostname}: ${message}`);
        try {
            chrome.runtime.sendMessage({
                action: 'interactionFailed',
                details: {
                    host: hostname,
                    message: message
                }
            });
        } catch (e) {
            if (e.message.includes('Extension context invalidated')) {
                // This is expected when the extension is updated or reloaded. Safe to ignore.
            } else {
                console.warn("AI-Sidebar: An unexpected error occurred in reportInteractionFailure:", e);
            }
        }
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

    // Routes the prompt to a site-specific handler.
    async function handlePromptInjection(prompt) {
        const hostname = window.location.hostname;
        const handler = siteHandlers[hostname] || handleGeneric;
        await handler(prompt);
    }

    // Site-specific handler for aistudio.google.com.
    async function handleAiStudio(prompt) {
        const hostname = 'aistudio.google.com';
        const selector = 'textarea[aria-label="Type something or tab to choose an example prompt"], textarea[aria-label="Start typing a prompt"]';
        const inputArea = await waitForElement(selector);
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
            return;
        }
        inputArea.value = prompt;
        inputArea.dispatchEvent(new Event('input', { bubbles: true }));
        const sendButton = await waitForElement('button[aria-label="Run"]:not([disabled])');
        if (sendButton) {
            sendButton.click();
        } else {
            reportInteractionFailure(hostname, 'Could not find or click the send button.');
        }
    }

    // Site-specific handler for gemini.google.com.
    async function handleGemini(prompt) {
        const hostname = 'gemini.google.com';
        const inputArea = await waitForElement('div[role="textbox"][contenteditable="true"]');
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
            return;
        }
        inputArea.textContent = prompt;
        inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        const sendButton = await waitForElement('button[aria-label="Send message"]:not([disabled])');
        if (sendButton) {
            sendButton.click();
        } else {
            reportInteractionFailure(hostname, 'Could not find or click the send button.');
        }
    }

    // Site-specific handler for chatgpt.com.
    async function handleChatGPT(prompt) {
        const hostname = 'chatgpt.com';
        const selector = '#prompt-textarea, div.ProseMirror[role="textbox"]';
        const inputArea = await waitForElement(selector);
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
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
            reportInteractionFailure(hostname, 'Could not find or click the send button.');
        }
    }

    // Site-specific handler for claude.ai.
    async function handleClaude(prompt) {
        const hostname = 'claude.ai';
        const inputArea = await waitForElement('div[contenteditable="true"][aria-label="Send a message"]');
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
            return;
        }
        inputArea.innerText = prompt;
        inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        const sendButton = await waitForElement('button[aria-label="Send Message"]:not([disabled])');
        if (sendButton) {
            sendButton.click();
        } else {
            reportInteractionFailure(hostname, 'Could not find or click the send button.');
        }
    }

    // Site-specific handler for perplexity.ai.
    async function handlePerplexity(prompt) {
        const hostname = 'perplexity.ai';
        const inputArea = await waitForElement('textarea[placeholder*="Ask anything"]');
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
            return;
        }
        inputArea.value = prompt;
        inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        const sendButton = await waitForElement('button[data-testid="submit-button"]:not([disabled])');
        if (sendButton) {
            sendButton.click();
        } else {
            reportInteractionFailure(hostname, 'Could not find or click the send button.');
        }
    }

    // Site-specific handler for chat.deepseek.com.
    async function handleDeepSeek(prompt) {
        const hostname = 'chat.deepseek.com';
        const inputArea = await waitForElement('textarea#chat-input');
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
            return;
        }

        // This site uses a framework (like React) that requires interacting with the textarea's
        // native value setter to properly trigger state updates. A simple .value assignment is ignored.
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(inputArea, prompt);
        inputArea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

        // Use a more specific selector looking for a button that is a sibling of the input area.
        const sendButton = await waitForElement('textarea#chat-input ~ button', 100);
        if (sendButton) {
            sendButton.click();
        } else {
            // Fallback to Enter key press if no button is found.
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
    }

    // Site-specific handler for chat.qwen.ai.
    async function handleQwen(prompt) {
        const hostname = 'chat.qwen.ai';
        const inputArea = await waitForElement('textarea[placeholder*="How can I help you"]');
        if (!inputArea) {
            reportInteractionFailure(hostname, 'Could not find the input area.');
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
            reportInteractionFailure(hostname, 'Could not find or click the send button.');
        }
    }

    // Generic handler for other websites.
    async function handleGeneric(prompt) {
        const hostname = window.location.hostname;
        const inputArea = await waitForElement('textarea, [role="textbox"]');
        if (!inputArea) {
            // Avoid reporting errors on generic sites where selectors are just a guess.
            console.warn(`AI-Sidebar: Could not find a generic input area on ${hostname}.`);
            return;
        }
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
            // Fallback to Enter key press for generic sites. This may not always work.
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
            inputArea.dispatchEvent(enterEvent);
        }
    }

    // Extracts the last response from AI Studio.
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

    // Extracts the last response from Gemini.
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

    // Extracts the last assistant message from ChatGPT.
    async function getChatGPTOutput() {
        const assistantMessages = document.querySelectorAll('div[data-message-author-role="assistant"]');
        if (assistantMessages.length > 0) {
            const lastMessage = assistantMessages[assistantMessages.length - 1];
            // Use a more robust selector to find the content within the message.
            const content = lastMessage.querySelector('.markdown, .prose, [class*="result-streaming"]');
            if (content) {
                return content.innerText;
            }
        }
        return '';
    }

    // Extracts the text from the last message group from Claude.
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

    // Extracts the last response from Grok.
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

    // Extracts the last response from Perplexity.ai.
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

    // Extracts the last response from DeepSeek.
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

    // Extracts the last response from Qwen.
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

    // Routes the output extraction to a site-specific handler.
    async function handleOutputExtraction(uniqueId) {
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
            source: hostname,
            uniqueId: uniqueId
        }, '*');
    }

    // Toggles the "Grounding with Google Search" button on supported sites.
    async function handleGoogleSearchToggle() {
        const hostname = window.location.hostname;
        const selector = 'button[aria-label="Grounding with Google Search"]';
        const toggleButton = await waitForElement(selector);
        if (toggleButton) {
            toggleButton.click();
        } else {
            reportInteractionFailure(hostname, 'Could not find the Google Search toggle button.');
        }
    }

    // Clears the chat content on AI Studio, handling different layouts.
    async function handleClearAIStudio() {
        const hostname = 'aistudio.google.com';
    
        // Helper to find and click "Clear chat" from a menu, and close the menu if not found.
        const clearFromMenu = async () => {
            const menuPanel = await waitForElement('.mat-mdc-menu-panel');
            if (!menuPanel) return false;
    
            const clearMenuItem = Array.from(menuPanel.querySelectorAll('button[role="menuitem"]'))
                .find(item => item.textContent.trim().includes('Clear chat'));
    
            if (clearMenuItem) {
                clearMenuItem.click();
                return true;
            }
            
            // If "Clear chat" is not found (e.g., it's disabled), close the menu by simulating an Escape key press.
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            return false;
        };
    
        let actionInitiated = false;
    
        // Priority 1: Check for the narrow layout's "View more actions" button.
        const viewMoreButton = document.querySelector('button[aria-label="View more actions"]');
        if (viewMoreButton && viewMoreButton.offsetParent !== null) {
            viewMoreButton.click();
            if (await clearFromMenu()) {
                actionInitiated = true;
            }
        }
    
        // Priority 2: If no action was taken, check for the wide layout's direct "Clear chat" button.
        if (!actionInitiated) {
            const allClearButtons = document.querySelectorAll('button[aria-label="Clear chat"]');
            const visibleButton = Array.from(allClearButtons).find(btn => btn.offsetParent !== null);
            if (visibleButton) {
                visibleButton.click();
                actionInitiated = true;
            }
        }
    
        // Final step: Handle the confirmation dialog if any clear action was successful.
        if (actionInitiated) {
            const continueButton = await waitForElement('mat-dialog-container button[color="primary"]');
            if (continueButton) {
                continueButton.click();
            } else {
                reportInteractionFailure(hostname, 'Could not find "Continue" button in confirmation dialog.');
            }
        } else {
            reportInteractionFailure(hostname, 'Could not find any actionable "Clear chat" or "More" button.');
        }
    }

    // This logic runs inside iframes and listens for messages from the sidebar.
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
            handleOutputExtraction(event.data.uniqueId);
        }
        if (event.data.action === 'toggleGoogleSearch') {
            handleGoogleSearchToggle();
        }
        if (event.data.action === 'clearAIStudio') {
            handleClearAIStudio();
        }
    });

    // A utility to delay function execution.
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Checks for selected text and sends it to the side panel.
    function handleSelection() {
        // Avoid conflicts with text inputs.
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
            return;
        }
        const selectedText = window.getSelection().toString().trim();
        
        try {
            if (selectedText) {
                // Send the selected text to the side panel.
                chrome.runtime.sendMessage({ action: 'textSelected', text: selectedText });
            } else {
                // When text is deselected, send a message to clear the context.
                chrome.runtime.sendMessage({ action: 'textDeselected' });
            }
        } catch (e) {
            if (e.message.includes('Extension context invalidated')) {
                // This is expected when the extension is updated or reloaded. Safe to ignore.
            } else {
                console.error("AI-Sidebar: An unexpected error occurred in handleSelection:", e);
            }
        }
    }

    // Debounce the selection handler to avoid excessive firing.
    const debouncedHandleSelection = debounce(handleSelection, 250);

    // Listen for selection changes in the document.
    // This will only run in the top-level frame, not in the extension's iframes.
    if (window.self === window.top) {
        document.addEventListener('selectionchange', debouncedHandleSelection);
    }
}