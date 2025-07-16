// A promise that resolves when the main UI elements are initialized.
// This is a crucial mechanism to prevent race conditions. For example, a message
// from a content script ('textSelected') might arrive before the DOM is fully
// parsed and the listeners are attached. By awaiting this promise, message
// handlers can ensure the UI is ready to be manipulated.
let uiReadyResolve;
const uiReadyPromise = new Promise(resolve => {
    uiReadyResolve = resolve;
});

/**
 * Main function to initialize all shared UI logic and event listeners.
 * @param {object} elements A dictionary of DOM elements required by the functions.
 */
function initializeSharedUI(elements) {
    const {
        iframeContainer, refreshIcon, settingsContainer,
        copyMarkdownButton, promptInput, promptContainer, togglePromptButton, sendPromptButton,
        clearPromptButton
    } = elements;

    const contextContainer = document.getElementById('context-container');
    const closeContextButton = document.getElementById('close-context-button');
    const googleSearchToggleIcon = document.getElementById('google-search-toggle-icon');
    const clearAIStudioIcon = document.getElementById('clear-aistudio-icon');

    initializeSlashCommands(elements);

    // Central logic for sending a prompt, adapting its behavior based on the current UI state.
    const executeSend = async () => {
        let promptText = promptInput.value.trim();
        const pinned = getPinnedPrompt();
        
        // 1. If a prompt is pinned, use the input as a variable for that prompt's template.
        if (pinned) {
            if (!promptText) return; // Don't send if there's no input.
            const { displayLanguage } = await chrome.storage.local.get({ displayLanguage: 'English' });
            const lang = displayLanguage || 'English';
            let promptContent = pinned.content.replace(/\${lang}/g, lang);
            
            const fullPrompt = promptContent.includes('${input}')
                ? promptContent.replace('${input}', promptText)
                : `${promptContent}\n\n"""\n${promptText}\n"""`;
            
            sendMessageToIframes(fullPrompt);
            // For pinned prompts, we don't clear the input to allow for multi-turn conversations.
            // Instead, we select the text for easy replacement.
            requestAnimationFrame(() => {
                promptInput.focus();
                promptInput.select();
            });
            return; // Stop further execution.
        }

        // 2. If no prompt is pinned, check if there's text selected from the webpage (context).
        const isContextVisible = contextContainer.style.display === 'flex';
        if (isContextVisible) {
            const contextText = contextContainer.querySelector('#context-content').textContent.trim();
            if (contextText) {
                // Prepend the page context to the user's prompt.
                const finalPrompt = `Based on the following text:\n\n------\n${contextText}\n------\n\n${promptText}`;
                sendMessageToIframes(finalPrompt);
            }
        } 
        // 3. If no context, just send the prompt text directly.
        else if (promptText) {
            sendMessageToIframes(promptText);
        }

        // 4. Clean up the UI after sending.
        if (promptText || isContextVisible) {
            promptInput.value = '';
            resetContextualUI();
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            requestAnimationFrame(() => promptInput.focus());
        }
    };

    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        await uiReadyPromise;
        
        if (message.action === 'textSelected' && message.text) {
            if (getPinnedPrompt()) {
                promptInput.value = message.text;
                autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
                promptInput.focus();
                sendResponse({status: "Text inserted into prompt."});
            } else {
                displayContextualUI(message.text);
                sendResponse({status: "Context displayed in sidebar"});
            }
        } else if (message.action === 'textDeselected') {
            if (contextContainer && contextContainer.style.display !== 'none') {
                resetContextualUI();
                sendResponse({status: "Context cleared in sidebar"});
            }
        } else if (message.action === 'interactionFailed') {
            const { host } = message.details;
            showGlobalConfirmationMessage(`Error with ${host}. The site may have updated.`, 5000);
            sendResponse({status: "Error reported to user."});
        }
        return true;
    });

    if (closeContextButton) {
        closeContextButton.addEventListener('click', resetContextualUI);
    }

    if (clearAIStudioIcon) {
        clearAIStudioIcon.addEventListener('click', () => {
            const aiStudioIframes = Object.values(iframeCache).filter(iframe => iframe.src.includes('aistudio.google.com'));
            
            if (aiStudioIframes.length > 0) {
                aiStudioIframes.forEach(iframe => {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ action: 'clearAIStudio' }, '*');
                    }
                });
                showGlobalConfirmationMessage(`Clearing ${aiStudioIframes.length} AI Studio panel(s)...`);
            } else {
                showGlobalConfirmationMessage('AI Studio panel not found.');
            }
        });
    }

    refreshIcon.addEventListener('click', () => {
        let refreshedCount = 0;
        iframeContainer.querySelectorAll('iframe').forEach(iframe => {
            iframe.src = iframe.src;
            refreshedCount++;
        });
        showGlobalConfirmationMessage(refreshedCount > 0 ? `Refreshed ${refreshedCount} panel(s).` : 'No active panels to refresh.');
    });

    settingsContainer.addEventListener('click', () => {
        chrome.tabs.create({ url: 'options.html?section=general' });
    });

    if (googleSearchToggleIcon) {
        googleSearchToggleIcon.addEventListener('click', () => {
            let toggledCount = 0;
            iframeContainer.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const hostname = new URL(iframe.src).hostname;
                    if (hostname.includes('gemini.google.com') || hostname.includes('aistudio.google.com')) {
                        iframe.contentWindow.postMessage({ action: 'toggleGoogleSearch' }, '*');
                        toggledCount++;
                    }
                } catch (e) {
                    // Silently ignore invalid URLs in iframe src
                }
            });
            showGlobalConfirmationMessage(toggledCount > 0 ? `Toggled Google Search in ${toggledCount} panel(s).` : 'No active panels support this feature.');
        });
    }

    let expectedResponses = 0;
    let copyFallbackTimeout = null;
    let collectedOutputs = new Map();

    const processCollectedOutputs = () => {
        if (!copyFallbackTimeout) return;
        clearTimeout(copyFallbackTimeout);
        copyFallbackTimeout = null;

        if (collectedOutputs.size > 0) {
            const prettyNames = {
                'aistudio.google.com': 'AI Studio', 'gemini.google.com': 'Gemini',
                'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude',
                'chat.deepseek.com': 'DeepSeek', 'chat.qwen.ai': 'Qwen',
            };
            const markdownString = Array.from(collectedOutputs.values()).map(item => {
                const title = prettyNames[item.source] || item.source;
                return `## ${title}\n\n${item.output}`;
            }).join('\n\n---\n\n');
            
            promptInput.value = promptInput.value.trim() === '' ? markdownString : `${promptInput.value}\n\n${markdownString}`;
            navigator.clipboard.writeText(markdownString);
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            promptInput.focus();
            showGlobalConfirmationMessage(`Appended and copied output from ${collectedOutputs.size} panel(s).`);
        } else {
            showGlobalConfirmationMessage('Could not find any output to copy.');
        }
    };

    window.addEventListener('message', (event) => {
        if (event.data?.action === 'receiveLastOutput' && event.data.output && event.data.uniqueId) {
            if (copyFallbackTimeout && !collectedOutputs.has(event.data.uniqueId)) {
                collectedOutputs.set(event.data.uniqueId, { source: event.data.source, output: event.data.output.trim() });
                if (collectedOutputs.size >= expectedResponses) {
                    processCollectedOutputs();
                }
            }
        }
    });

    copyMarkdownButton.addEventListener('click', () => {
        if (copyFallbackTimeout) clearTimeout(copyFallbackTimeout);
        collectedOutputs.clear();
        const activeIframes = iframeContainer.querySelectorAll('iframe');
        expectedResponses = activeIframes.length;

        if (expectedResponses === 0) {
            showGlobalConfirmationMessage('No active panels to copy from.');
            return;
        }

        activeIframes.forEach(iframe => {
            const uniqueId = iframe.closest('.iframe-wrapper')?.dataset.id;
            if (iframe.contentWindow && uniqueId) {
                iframe.contentWindow.postMessage({ action: 'getLastOutput', uniqueId: uniqueId }, '*');
            } else {
                expectedResponses--;
            }
        });
        copyFallbackTimeout = setTimeout(processCollectedOutputs, 3000);
    });
    
    togglePromptButton.addEventListener('click', () => {
        const isCollapsed = promptContainer.classList.toggle('collapsed');
        document.body.classList.toggle('prompt-collapsed', isCollapsed);
        togglePromptButton.textContent = isCollapsed ? 'expand_less' : 'expand_more';
        togglePromptButton.title = isCollapsed ? 'Expand prompt area' : 'Collapse prompt area';
        if (!isCollapsed) {
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
        }
    });

    clearPromptButton.addEventListener('click', () => {
        promptInput.value = '';
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
        promptInput.focus();
    });

    promptInput.addEventListener('input', () => {
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
    });

    promptInput.addEventListener('keydown', (event) => {
        if (isSlashCommandPopupVisible()) return;
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            executeSend();
        }
    });

    sendPromptButton.addEventListener('click', executeSend);

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.managedUrls) {
            managedUrls = changes.managedUrls.newValue;
            updateIframes(iframeContainer);
        }
    });

    chrome.storage.local.get('managedUrls', (result) => {
        managedUrls = result.managedUrls ? result.managedUrls : [];
        updateIframes(iframeContainer);
    });
    
    requestAnimationFrame(() => autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton));

    uiReadyResolve();
}