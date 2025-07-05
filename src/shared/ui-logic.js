// Global state variables
let draggedDOMElement = null;
let confirmationMessageElement = null;
let isModalActive = false;
let managedUrls = [];
const iframeCache = {};

/**
 * Displays a short-lived confirmation message at the bottom of the screen.
 * @param {string} message The message to display.
 * @param {number} duration How long to display the message in milliseconds.
 */
function showGlobalConfirmationMessage(message, duration = 3000) {
    if (!confirmationMessageElement) {
        confirmationMessageElement = document.createElement('div');
        Object.assign(confirmationMessageElement.style, {
            position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'white',
            borderRadius: '5px', zIndex: '2000', opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        });
        document.body.appendChild(confirmationMessageElement);
    }

    if (confirmationMessageElement.timeoutId) clearTimeout(confirmationMessageElement.timeoutId);

    confirmationMessageElement.textContent = message;
    confirmationMessageElement.style.opacity = '1';

    confirmationMessageElement.timeoutId = setTimeout(() => {
        confirmationMessageElement.style.opacity = '0';
    }, duration);
}

/**
 * Displays a custom confirmation modal dialog.
 * @param {string} message The confirmation message.
 * @param {Function} onConfirm The callback function to execute if confirmed.
 */
function showCustomConfirm(message, onConfirm) {
    isModalActive = true;
    const modal = document.getElementById('custom-confirm-modal');
    const messageP = document.getElementById('custom-confirm-message');
    const yesButton = document.getElementById('confirm-yes-button');
    const noButton = document.getElementById('confirm-no-button');

    messageP.textContent = message;
    modal.style.display = 'flex';
    yesButton.focus();

    const handleYes = () => {
        modal.style.display = 'none';
        onConfirm();
        cleanup();
    };

    const handleNo = () => {
        modal.style.display = 'none';
        cleanup();
    };

    const handleEnterKey = (event) => {
        if (event.key === 'Enter') {
            if (document.activeElement === yesButton) { event.preventDefault(); handleYes(); }
            else if (document.activeElement === noButton) { event.preventDefault(); handleNo(); }
        }
    };

    const cleanup = () => {
        yesButton.removeEventListener('click', handleYes);
        noButton.removeEventListener('click', handleNo);
        window.removeEventListener('keydown', handleEnterKey, true);
        setTimeout(() => { isModalActive = false; }, 0);
    };

    yesButton.addEventListener('click', handleYes);
    noButton.addEventListener('click', handleNo);
    window.addEventListener('keydown', handleEnterKey, true);
}

/**
 * Saves the current list of URLs to chrome.storage.local.
 */
function saveUrls() {
    chrome.storage.local.set({ managedUrls: managedUrls });
}

/**
 * Handles copying the output from a single, specific iframe.
 * @param {HTMLIFrameElement} iframe The specific iframe to get output from.
 * @param {object} urlEntry The URL entry object, containing a unique id.
 */
function handleSelectiveCopy(iframe, urlEntry) {
    const uniqueId = urlEntry.id;
    const sourceHostname = new URL(urlEntry.url).hostname;
    
    const listener = (event) => {
        if (event.data && event.data.action === 'receiveLastOutput' && event.data.uniqueId === uniqueId && event.data.output) {
            const output = event.data.output.trim();
            const promptInput = document.getElementById('prompt-input');
            const promptContainer = document.getElementById('prompt-container');
            const sendPromptButton = document.getElementById('send-prompt-button');
            const clearPromptButton = document.getElementById('clear-prompt-button');

            const prettyNames = {
                'aistudio.google.com': 'AI Studio', 'gemini.google.com': 'Gemini',
                'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude',
                'chat.deepseek.com': 'DeepSeek', 'chat.qwen.ai': 'Qwen',
            };
            const title = prettyNames[sourceHostname] || sourceHostname;
            const markdownString = `## ${title}\n\n${output}`;
            
            promptInput.value = promptInput.value.trim() === '' ? markdownString : `${promptInput.value}\n\n${markdownString}`;
            navigator.clipboard.writeText(markdownString);
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            promptInput.focus();
            showGlobalConfirmationMessage(`Appended and copied output from ${title}.`);
            
            window.removeEventListener('message', listener);
        }
    };

    window.addEventListener('message', listener);
    
    if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'getLastOutput', uniqueId: uniqueId }, '*');
    }

    setTimeout(() => window.removeEventListener('message', listener), 3000);
}

/**
 * Renders iframes in the main container based on the current selection.
 * This function uses the unique ID of each URL entry to allow for duplicate URLs.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 */
function updateIframes(iframeContainer) {
    const promptContainer = document.getElementById('prompt-container');
    const isCollapsedBeforeUpdate = promptContainer.classList.contains('collapsed');

    const selectedUrlEntries = managedUrls.filter(u => u.selected);
    const selectedIdsSet = new Set(selectedUrlEntries.map(u => u.id));
    const currentWrappers = Array.from(iframeContainer.children);
    const wrappersMap = new Map(currentWrappers.map(wrapper => {
        return wrapper.dataset.id ? [wrapper.dataset.id, wrapper] : [null, wrapper];
    }));

    if (selectedUrlEntries.length === 0) {
        iframeContainer.innerHTML = '';
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = managedUrls.length === 0 ?
            'No websites available. Add some in Settings, or reload to load the default list.' :
            'No websites selected. Please select websites to display from Settings.';
        iframeContainer.appendChild(emptyMessage);
    } else {
        const emptyMessage = iframeContainer.querySelector('.empty-message');
        if (emptyMessage) {
            iframeContainer.removeChild(emptyMessage);
        }
    }

    // Remove wrappers for entries that are no longer selected.
    for (const [id, wrapper] of wrappersMap.entries()) {
        if (id && !selectedIdsSet.has(id)) {
            iframeContainer.removeChild(wrapper);
        }
    }

    let lastPlacedWrapper = null;
    for (const urlEntry of selectedUrlEntries) {
        let wrapper = wrappersMap.get(urlEntry.id);

        if (!wrapper) {
            // Use the unique ID as the key for the iframe cache.
            let iframe = iframeCache[urlEntry.id];
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.src = urlEntry.url;
                iframeCache[urlEntry.id] = iframe;
            }

            wrapper = document.createElement('div');
            wrapper.className = 'iframe-wrapper';
            // Store the unique ID on the wrapper element.
            wrapper.dataset.id = urlEntry.id;

            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'iframe-controls-container';

            const sendBtn = document.createElement('button');
            sendBtn.className = 'selective-send-button';
            sendBtn.title = 'Send prompt to this panel';
            sendBtn.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
            sendBtn.addEventListener('click', () => {
                const promptInput = document.getElementById('prompt-input');
                const promptText = promptInput.value.trim();
                if (promptText) {
                    iframe.contentWindow.postMessage({ action: 'injectPrompt', prompt: promptText }, '*');
                    const hostname = new URL(urlEntry.url).hostname;
                    showGlobalConfirmationMessage(`Prompt sent to ${hostname}`);
                } else {
                    showGlobalConfirmationMessage('Prompt input is empty.');
                }
            });

            const copyBtn = document.createElement('button');
            copyBtn.className = 'selective-copy-button';
            copyBtn.title = 'Append output to prompt area and copy as Markdown';
            copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
            // Pass the entire urlEntry object to the handler.
            copyBtn.addEventListener('click', () => handleSelectiveCopy(iframe, urlEntry));

            controlsContainer.append(sendBtn, copyBtn);
            wrapper.append(controlsContainer, iframe);
            wrappersMap.set(urlEntry.id, wrapper);
        }

        const expectedNextSibling = lastPlacedWrapper ? lastPlacedWrapper.nextSibling : iframeContainer.firstChild;
        if (wrapper !== expectedNextSibling) {
            iframeContainer.insertBefore(wrapper, expectedNextSibling);
        }

        lastPlacedWrapper = wrapper;
    }

    // Clean up the iframe cache for entries that no longer exist in managedUrls.
    const currentManagedIdsSet = new Set(managedUrls.map(u => u.id));
    for (const idInCache in iframeCache) {
        if (!currentManagedIdsSet.has(idInCache)) {
            delete iframeCache[idInCache];
        }
    }

    promptContainer.classList.toggle('collapsed', isCollapsedBeforeUpdate);
    if (!isCollapsedBeforeUpdate) {
        const promptInput = document.getElementById('prompt-input');
        const sendPromptButton = document.getElementById('send-prompt-button');
        const clearPromptButton = document.getElementById('clear-prompt-button');
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
    }
}

/**
 * Loads URLs from storage, then renders the UI.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 */
function loadUrls(iframeContainer) {
    chrome.storage.local.get('managedUrls', function(result) {
        if (chrome.runtime.lastError) {
            console.error('Error loading managed URLs:', chrome.runtime.lastError.message);
            managedUrls = [];
        } else {
            managedUrls = result.managedUrls || [];
        }
        updateIframes(iframeContainer);
    });
}

/**
 * Automatically resizes the prompt textarea and manages its scrollbar visibility.
 * @param {HTMLTextAreaElement} textarea The textarea element.
 * @param {HTMLElement} promptContainer The container for the prompt area.
 * @param {HTMLButtonElement} sendPromptButton The send button.
 * @param {HTMLButtonElement} clearPromptButton The clear button.
 */
function autoResizeTextarea(textarea, promptContainer, sendPromptButton, clearPromptButton) {
    if (!textarea || !promptContainer) return;

    if (promptContainer.classList.contains('collapsed')) {
        textarea.style.height = '';
        return;
    }

    const selection = textarea.selectionStart;
    const maxHeight = Math.floor(window.innerHeight / 3);
    textarea.style.maxHeight = `${maxHeight}px`;

    // Reset height to auto to get the correct scrollHeight for the current content.
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;

    // If content is taller than max-height, fix height to max-height and show scrollbar.
    if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
    } else {
        // Otherwise, fit height to content and hide scrollbar.
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
    }

    // Defer cursor and scroll position updates to after the resize has been rendered.
    setTimeout(() => {
        textarea.setSelectionRange(selection, selection);
        textarea.scrollTop = textarea.scrollHeight;
    }, 0);

    const hasText = textarea.value.trim() !== '';
    if (sendPromptButton) sendPromptButton.disabled = !hasText;
    
    if (clearPromptButton) {
        clearPromptButton.style.display = hasText ? 'flex' : 'none';
        const promptInputWrapper = textarea.closest('.prompt-input-wrapper');

        if (hasText && promptInputWrapper) {
            const styles = getComputedStyle(textarea);
            const singleLineHeight = parseFloat(styles.lineHeight);
            const paddingTop = parseFloat(styles.paddingTop);
            const paddingBottom = parseFloat(styles.paddingBottom);
            const textContentHeight = textarea.scrollHeight - paddingTop - paddingBottom;
            const isMultiLine = textContentHeight > singleLineHeight + 1;
            
            // Position the clear button absolutely only when it's multi-line.
            clearPromptButton.classList.toggle('top-right', isMultiLine);
            // Add a class to the wrapper to adjust textarea padding via CSS.
            promptInputWrapper.classList.toggle('multi-line-input', isMultiLine);
        } else if (promptInputWrapper) {
            // Ensure classes are removed when there is no text.
            clearPromptButton.classList.remove('top-right');
            promptInputWrapper.classList.remove('multi-line-input');
        }
    }
}


/**
 * Sends a prompt to all active iframes.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 * @param {string} prompt The prompt text to send.
 */
function sendMessageToIframes(iframeContainer, prompt) {
    const activeIframes = iframeContainer.querySelectorAll('iframe');
    if (activeIframes.length === 0) {
        showGlobalConfirmationMessage('No active panels to send prompt to.');
        return;
    }
    let sentCount = 0;
    activeIframes.forEach(iframe => {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ action: 'injectPrompt', prompt: prompt }, '*');
            sentCount++;
        }
    });
    showGlobalConfirmationMessage(`Prompt sent to ${sentCount} panel(s).`);
}

/**
 * Resets the contextual UI elements to their default hidden state.
 */
function resetContextualUI() {
    const contextContainer = document.getElementById('context-container');
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const morePromptsPopup = document.getElementById('more-prompts-popup');
    const promptInputDivider = document.querySelector('.prompt-input-divider');

    if(contextContainer) {
        contextContainer.style.display = 'none';
        contextContainer.querySelector('#context-content').textContent = '';
        delete contextContainer.dataset.text;
    }
    
    if(promptButtonsContainer) {
        promptButtonsContainer.style.display = 'none';
        promptButtonsContainer.innerHTML = '';
    }

    if(morePromptsPopup) {
        morePromptsPopup.style.display = 'none';
    }
    
    if (promptInputDivider) {
        promptInputDivider.style.display = 'none';
    }
}

/**
 * Creates a single prompt button element.
 * @param {object} prompt The prompt data.
 * @param {string} selectedText The text to be used in the prompt.
 * @param {boolean} isMoreMenuItem True if the button is for the popup menu.
 * @returns {HTMLButtonElement} The created button element.
 */
function createPromptButton(prompt, selectedText, isMoreMenuItem = false) {
    const iframeContainer = document.getElementById('iframe-container');
    const button = document.createElement('button');
    button.textContent = prompt.name;
    button.className = isMoreMenuItem ? 'more-prompt-item' : 'prompt-button';
    button.addEventListener('click', async () => {
        let fullPrompt;
        const { displayLanguage } = await chrome.storage.local.get('displayLanguage');
        const lang = displayLanguage || 'English';

        let promptContent = prompt.content.replace(/\${lang}/g, lang);
        if (promptContent.includes('${input}')) {
            fullPrompt = promptContent.replace('${input}', selectedText);
        } else {
            fullPrompt = `${promptContent}\n\n"""\n${selectedText}\n"""`;
        }
        
        sendMessageToIframes(iframeContainer, fullPrompt);
        resetContextualUI();
    });
    return button;
}

/**
 * Dynamically renders prompt buttons based on available width.
 * @param {string} selectedText The text that the prompts will act upon.
 * @param {Array} visiblePrompts The list of prompt objects to render.
 */
function renderResponsivePrompts(selectedText, visiblePrompts) {
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const morePromptsPopup = document.getElementById('more-prompts-popup');
    const morePromptsList = morePromptsPopup.querySelector('#more-prompts-list');

    promptButtonsContainer.innerHTML = '';
    morePromptsList.innerHTML = '';
    if (morePromptsPopup.parentElement) {
        morePromptsPopup.parentElement.removeChild(morePromptsPopup);
    }
    morePromptsPopup.style.display = 'none';

    if (!visiblePrompts || visiblePrompts.length === 0) {
        return;
    }

    const mainButtonsWrapper = document.createElement('div');
    mainButtonsWrapper.className = 'main-prompt-buttons';
    promptButtonsContainer.appendChild(mainButtonsWrapper);

    const allButtons = visiblePrompts.map(prompt => createPromptButton(prompt, selectedText, false));
    if (allButtons.length === 0) return;

    const observer = new ResizeObserver(entries => {
        window.requestAnimationFrame(() => {
            if (!entries || !entries.length) {
                return;
            }
            const containerWidth = entries[0].contentRect.width;
            
            mainButtonsWrapper.innerHTML = '';
            const existingMoreWrapper = promptButtonsContainer.querySelector('.more-prompts-wrapper');
            if (existingMoreWrapper) {
                promptButtonsContainer.removeChild(existingMoreWrapper);
            }
            morePromptsList.innerHTML = '';
            if (morePromptsPopup.parentElement) {
                morePromptsPopup.parentElement.removeChild(morePromptsPopup);
            }
            morePromptsPopup.style.display = 'none';

            const promptsToShow = [];
            const promptsToHide = [];
            let accumulatedWidth = 0;
            let hideStartIndex = -1;

            const tempContainer = document.createElement('div');
            tempContainer.style.visibility = 'hidden';
            tempContainer.style.position = 'absolute';
            document.body.appendChild(tempContainer);
            const moreButtonTemplate = document.createElement('button');
            moreButtonTemplate.className = 'prompt-button more-button';
            moreButtonTemplate.innerHTML = '<span class="material-symbols-outlined">more_horiz</span>';
            tempContainer.appendChild(moreButtonTemplate);
            const moreButtonWidth = moreButtonTemplate.offsetWidth;
            tempContainer.innerHTML = '';

            for (let i = 0; i < allButtons.length; i++) {
                const button = allButtons[i];
                tempContainer.appendChild(button);
                const buttonWidth = button.offsetWidth;
                const gap = 4;
                
                const spaceNeededForMore = (i < allButtons.length - 1) ? (moreButtonWidth + gap) : 0;

                if (accumulatedWidth + buttonWidth + gap + spaceNeededForMore <= containerWidth) {
                    accumulatedWidth += buttonWidth + gap;
                } else {
                    hideStartIndex = i;
                    break;
                }
            }
            document.body.removeChild(tempContainer);

            if (hideStartIndex !== -1) {
                visiblePrompts.forEach((prompt, i) => {
                    if (i < hideStartIndex) {
                        promptsToShow.push(prompt);
                    } else {
                        promptsToHide.push(prompt);
                    }
                });
            } else {
                promptsToShow.push(...visiblePrompts);
            }

            promptsToShow.forEach(prompt => {
                mainButtonsWrapper.appendChild(createPromptButton(prompt, selectedText, false));
            });

            if (promptsToHide.length > 0) {
                const morePromptsWrapper = document.createElement('div');
                morePromptsWrapper.className = 'more-prompts-wrapper';
                
                const moreButton = document.createElement('button');
                moreButton.className = 'prompt-button more-button';
                moreButton.innerHTML = '<span class="material-symbols-outlined">more_horiz</span>';
                
                morePromptsWrapper.appendChild(moreButton);
                
                morePromptsWrapper.appendChild(morePromptsPopup);
                
                promptButtonsContainer.appendChild(morePromptsWrapper);

                promptsToHide.forEach(prompt => {
                    morePromptsList.appendChild(createPromptButton(prompt, selectedText, true));
                });

                let hidePopupTimeout;
                const showPopup = () => { clearTimeout(hidePopupTimeout); morePromptsPopup.style.display = 'block'; };
                const hidePopup = () => { hidePopupTimeout = setTimeout(() => { morePromptsPopup.style.display = 'none'; }, 200); };

                morePromptsWrapper.addEventListener('mouseenter', showPopup);
                morePromptsWrapper.addEventListener('mouseleave', hidePopup);
            }
        });
    });

    observer.observe(promptButtonsContainer);
}


/**
 * Displays the contextual UI with the selected text and prompt buttons.
 * @param {string} selectedText The text selected by the user on the webpage.
 */
async function displayContextualUI(selectedText) {
    const contextContainer = document.getElementById('context-container');
    const contextContent = contextContainer.querySelector('#context-content');
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const promptInputDivider = document.querySelector('.prompt-input-divider');
    const openPromptSettings = document.querySelector('#open-prompt-settings');
    
    contextContent.textContent = selectedText;
    contextContainer.style.display = 'flex';
    contextContainer.dataset.text = selectedText;

    promptButtonsContainer.style.display = 'flex';
    
    if (promptInputDivider) {
        promptInputDivider.style.display = 'block';
    }

    let result = await chrome.storage.local.get('prompts');
    let prompts = result.prompts || [];
    const visiblePrompts = prompts.filter(p => p.showInMenu);

    renderResponsivePrompts(selectedText, visiblePrompts);

    if (openPromptSettings && !openPromptSettings.listenerAdded) {
        openPromptSettings.addEventListener('click', () => {
            chrome.tabs.create({ url: 'options.html?section=prompts' });
        });
        openPromptSettings.listenerAdded = true;
    }
}

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

    const executeSend = () => {
        let promptText = promptInput.value.trim();
        
        const isContextVisible = contextContainer.style.display === 'flex';
        if (isContextVisible) {
            const contextText = contextContainer.querySelector('#context-content').textContent.trim();
            if (contextText) {
                const finalPrompt = `Based on the following text:\n\n------\n${contextText}\n------\n\n${promptText}`;
                sendMessageToIframes(iframeContainer, finalPrompt);
            }
        } else if (promptText) {
            sendMessageToIframes(iframeContainer, promptText);
        }

        if (promptText || isContextVisible) {
            promptInput.value = '';
            resetContextualUI();
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            setTimeout(() => promptInput.focus(), 100);
        }
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'textSelected' && message.text) {
            displayContextualUI(message.text);
            sendResponse({status: "Context displayed in sidebar"});
        } else if (message.action === 'textDeselected') {
            const contextContainer = document.getElementById('context-container');
            if (contextContainer && contextContainer.style.display !== 'none') {
                resetContextualUI();
                sendResponse({status: "Context cleared in sidebar"});
            }
        }
        return true;
    });

    if (closeContextButton) {
        closeContextButton.addEventListener('click', resetContextualUI);
    }

    refreshIcon.addEventListener('click', function () {
        refreshIcon.classList.add('clicked');
        let refreshedCount = 0;
        managedUrls.forEach(urlEntry => {
            if (urlEntry.selected) {
                const iframe = iframeCache[urlEntry.id];
                if (iframe) { iframe.src = iframe.src; refreshedCount++; }
            }
        });
        showGlobalConfirmationMessage(refreshedCount > 0 ? `Refreshed ${refreshedCount} panel(s).` : 'No active panels to refresh.');
        setTimeout(() => refreshIcon.classList.remove('clicked'), 200);
    });

    settingsContainer.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html?section=general') });
    });

    let expectedResponses = 0;
    let copyFallbackTimeout = null;
    // Use a Map to store outputs, keyed by unique ID to prevent duplicates.
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
            // Convert map values to an array and create the markdown string.
            const markdownString = Array.from(collectedOutputs.values()).map(item => {
                const title = prettyNames[item.source] || item.source;
                return `## ${title}\n\n${item.output}`;
            }).join('\n\n---\n\n');
            
            promptInput.value = promptInput.value.trim() === '' ? markdownString : `${promptInput.value}\n\n${markdownString}`;
            navigator.clipboard.writeText(markdownString);
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            promptInput.focus();
            setTimeout(() => {
                promptInput.selectionStart = promptInput.selectionEnd = promptInput.value.length;
                promptInput.scrollTop = promptInput.scrollHeight;
            }, 0);
            showGlobalConfirmationMessage(`Appended and copied output from ${collectedOutputs.size} panel(s).`);
        } else {
            showGlobalConfirmationMessage('Could not find any output to copy.');
        }
    };

    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'receiveLastOutput' && event.data.output && event.data.uniqueId) {
            if (copyFallbackTimeout) {
                // Only add the output if we haven't received it for this unique ID yet.
                if (!collectedOutputs.has(event.data.uniqueId)) {
                    collectedOutputs.set(event.data.uniqueId, { 
                        source: event.data.source, 
                        output: event.data.output.trim() 
                    });
                }
                // If we've received all expected responses, process them immediately.
                if (collectedOutputs.size >= expectedResponses) {
                    processCollectedOutputs();
                }
            }
        }
    });

    copyMarkdownButton.title = 'Append all outputs to prompt area and copy as Markdown';
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
            const wrapper = iframe.closest('.iframe-wrapper');
            const uniqueId = wrapper ? wrapper.dataset.id : null;
            if (iframe.contentWindow && uniqueId) {
                // Send the request with the unique ID.
                iframe.contentWindow.postMessage({ action: 'getLastOutput', uniqueId: uniqueId }, '*');
            } else {
                // If an iframe has no ID, decrement the expected count.
                expectedResponses--;
            }
        });

        // Fallback timer in case some iframes don't respond.
        copyFallbackTimeout = setTimeout(processCollectedOutputs, 3000);
    });
    
    togglePromptButton.addEventListener('click', () => {
        promptContainer.classList.toggle('collapsed');
        const isCollapsed = promptContainer.classList.contains('collapsed');
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

    promptInput.addEventListener('input', () => autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton));
    
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    const handleResize = debounce(async () => {
        if (contextContainer.style.display === 'flex') {
            const selectedText = contextContainer.dataset.text;
            if (selectedText) {
                let result = await chrome.storage.local.get('prompts');
                let prompts = result.prompts || [];
                const visiblePrompts = prompts.filter(p => p.showInMenu);
                renderResponsivePrompts(selectedText, visiblePrompts);
            }
        }
    }, 100);

    window.addEventListener('resize', handleResize);

    sendPromptButton.addEventListener('click', executeSend);
    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            executeSend();
        }
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.managedUrls) {
            managedUrls = changes.managedUrls.newValue;
            updateIframes(iframeContainer);
        }
    });

    loadUrls(iframeContainer);
    
    setTimeout(() => {
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
    }, 10);
}