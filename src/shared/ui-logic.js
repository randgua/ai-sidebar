// A promise that resolves when the main UI elements are initialized.
// This prevents race conditions where messages arrive before the UI is ready.
let uiReadyResolve;
const uiReadyPromise = new Promise(resolve => {
    uiReadyResolve = resolve;
});

// --- START: Logic for Settings Popup ---
let draggedItem = null; // Used for drag-and-drop in the settings popup.

/**
 * Saves the current state of the managedUrls array to local storage.
 */
async function saveUrls() {
    await chrome.storage.local.set({ managedUrls });
}

/**
 * Renders the list of URLs in the settings popup.
 */
function renderSettingsPopupUrlList() {
    const listContainer = document.getElementById('settings-popup-url-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear previous items.
    managedUrls.forEach(urlEntry => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'url-item';
        itemDiv.dataset.id = urlEntry.id;
        itemDiv.innerHTML = `
            <span class="material-symbols-outlined drag-handle" draggable="true">drag_indicator</span>
            <input type="checkbox" ${urlEntry.selected ? 'checked' : ''}>
            <input type="text" value="${urlEntry.url}">
            <div class="url-actions">
                <button class="open-url-button" title="Open in new tab"><span class="material-symbols-outlined">open_in_new</span></button>
                <button class="remove-url-button" title="Delete URL"><span class="material-symbols-outlined">delete</span></button>
            </div>
        `;
        listContainer.appendChild(itemDiv);

        itemDiv.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            urlEntry.selected = e.target.checked;
            saveUrls();
        });

        const urlTextInput = itemDiv.querySelector('input[type="text"]');
        urlTextInput.addEventListener('blur', (e) => {
            const urlToUpdate = managedUrls.find(u => u.id === urlEntry.id);
            if (urlToUpdate && urlToUpdate.url !== e.target.value) {
                urlToUpdate.url = e.target.value;
                saveUrls();
            }
        });
        urlTextInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });

        itemDiv.querySelector('.open-url-button').addEventListener('click', () => {
            chrome.tabs.create({ url: urlEntry.url });
        });

        itemDiv.querySelector('.remove-url-button').addEventListener('click', () => {
            managedUrls = managedUrls.filter(u => u.id !== urlEntry.id);
            saveUrls(); // This will trigger a re-render via the storage listener.
        });
        
        const dragHandle = itemDiv.querySelector('.drag-handle');
        dragHandle.addEventListener('dragstart', handleDragStart);
        dragHandle.addEventListener('dragend', handleDragEnd);
    });
}

// --- Drag & Drop Handlers for Settings Popup ---
function handleDragStart(e) {
    draggedItem = this.closest('.url-item');
    // Add a class to the body to prevent the hover-based popup from closing during the drag.
    document.body.classList.add('is-dragging-url');
    setTimeout(() => {
        if (draggedItem) {
            draggedItem.classList.add('dragging');
        }
    }, 0);
}

function handleDragEnd() {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
    document.body.classList.remove('is-dragging-url');
}

function handleDragOver(e) {
    e.preventDefault();
    const container = document.getElementById('settings-popup-url-list');
    const afterElement = getDragAfterElement(container, e.clientY);
    const currentlyDragged = document.querySelector('#settings-popup-url-list .dragging');
    if (!currentlyDragged) return;

    if (afterElement == null) {
        container.appendChild(currentlyDragged);
    } else {
        container.insertBefore(currentlyDragged, afterElement);
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.url-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;
    const container = document.getElementById('settings-popup-url-list');
    const newOrder = Array.from(container.querySelectorAll('.url-item')).map(item => item.dataset.id);
    managedUrls.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    await saveUrls();
}
// --- END: Logic for Settings Popup ---

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
    const scrollToTopIcon = document.getElementById('scroll-to-top-icon');
    const scrollToBottomIcon = document.getElementById('scroll-to-bottom-icon');
    
    // This block is conditional, as these elements may not exist in all contexts (e.g., options page).
    const settingsPopupUrlList = document.getElementById('settings-popup-url-list');
    if (settingsPopupUrlList) {
        const newUrlInputPopup = document.getElementById('new-url-input-popup');
        const addUrlButtonPopup = document.getElementById('add-url-button-popup');
        const invertSelectionButtonPopup = document.getElementById('invert-selection-button-popup');
        const selectAllButtonPopup = document.getElementById('select-all-button-popup');
        const clearSelectionButtonPopup = document.getElementById('clear-selection-button-popup');

        addUrlButtonPopup.addEventListener('click', async () => {
            const newUrlValue = newUrlInputPopup.value.trim();
            if (newUrlValue) {
                const urlsToAdd = newUrlValue.split('\n').map(url => url.trim()).filter(url => url.length > 0);
                if (urlsToAdd.length > 0) {
                    const newEntries = urlsToAdd.map(url => ({ id: crypto.randomUUID(), url: url, selected: true }));
                    managedUrls.push(...newEntries);
                    await saveUrls();
                    newUrlInputPopup.value = '';
                }
            }
        });
        invertSelectionButtonPopup.addEventListener('click', async () => {
            managedUrls.forEach(u => u.selected = !u.selected);
            await saveUrls();
        });
        selectAllButtonPopup.addEventListener('click', async () => {
            managedUrls.forEach(u => u.selected = true);
            await saveUrls();
        });
        clearSelectionButtonPopup.addEventListener('click', async () => {
            managedUrls.forEach(u => u.selected = false);
            await saveUrls();
        });
    }

    initializeSlashCommands(elements);

    // Create a debounced version of the textarea resize function to optimize performance.
    const debouncedAutoResize = debounce(() => {
        autoResizeTextarea(promptInput, promptContainer);
    }, 100);

    // Central logic for sending a prompt.
    const executeSend = async () => {
        const promptText = promptInput.value.trim();
        const pinned = getPinnedPrompt();
        const isContextVisible = contextContainer.style.display === 'flex';
        const contextText = isContextVisible ? contextContainer.querySelector('#context-content').textContent.trim() : '';

        let promptToSend = null;

        if (pinned) {
            // In pinned mode, a prompt is only sent if there is text.
            if (promptText) {
                const { displayLanguage } = await chrome.storage.local.get({ displayLanguage: 'English' });
                const lang = displayLanguage || 'English';
                let promptContent = pinned.content.replace(/\${lang}/g, lang);
                
                promptToSend = promptContent.includes('${input}')
                    ? promptContent.replace('${input}', promptText)
                    : `${promptContent}\n\n"""\n${promptText}\n"""`;
            }
        } else {
            // In normal mode, a prompt can be just the context, or text, or both.
            if (contextText) {
                promptToSend = `Based on the following text:\n\n------\n${contextText}\n------\n\n${promptText}`;
            } else if (promptText) {
                promptToSend = promptText;
            }
        }

        // Only send a message and clear the input if there is a valid prompt to send.
        if (promptToSend !== null) {
            sendMessageToIframes(promptToSend);

            // Unified UI cleanup for any successful send operation.
            promptInput.value = '';
            resetContextualUI();
            updatePromptButtonsState(promptInput, sendPromptButton, clearPromptButton);
            autoResizeTextarea(promptInput, promptContainer);
            requestAnimationFrame(() => promptInput.focus());
        }
    };

    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        await uiReadyPromise;
        
        if (message.action === 'textSelected' && message.text) {
            if (getPinnedPrompt()) {
                promptInput.value = message.text;
                updatePromptButtonsState(promptInput, sendPromptButton, clearPromptButton);
                autoResizeTextarea(promptInput, promptContainer);
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

    if (scrollToTopIcon) {
        scrollToTopIcon.addEventListener('click', () => {
            const sentCount = postMessageToAllIframes({ action: 'selectFirstTurn' });
            if (sentCount > 0) {
                showGlobalConfirmationMessage('Requesting top position...');
            } else {
                showGlobalConfirmationMessage('No active panels.');
            }
        });
    }

    if (scrollToBottomIcon) {
        scrollToBottomIcon.addEventListener('click', () => {
            const sentCount = postMessageToAllIframes({ action: 'selectLastTurn' });
            if (sentCount > 0) {
                showGlobalConfirmationMessage('Requesting bottom position...');
            } else {
                showGlobalConfirmationMessage('No active panels.');
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

    settingsContainer.addEventListener('click', (e) => {
        if (e.target.id === 'settings-icon') {
            chrome.tabs.create({ url: 'options.html?section=general' });
        }
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
                return `## ${title}\n${item.output}`;
            }).join('\n\n---\n\n');

            const existingText = promptInput.value.trim();
            promptInput.value = existingText ? `${existingText}\n\n${markdownString}` : markdownString;
            updatePromptButtonsState(promptInput, sendPromptButton, clearPromptButton);
            autoResizeTextarea(promptInput, promptContainer);
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
            autoResizeTextarea(promptInput, promptContainer);
        }
    });

    clearPromptButton.addEventListener('click', () => {
        promptInput.value = '';
        updatePromptButtonsState(promptInput, sendPromptButton, clearPromptButton);
        autoResizeTextarea(promptInput, promptContainer);
        promptInput.focus();
    });

    promptInput.addEventListener('input', () => {
        // Immediately update button state for responsiveness.
        updatePromptButtonsState(promptInput, sendPromptButton, clearPromptButton);
        // Defer the expensive resize operation.
        debouncedAutoResize();
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
            if (settingsPopupUrlList) {
                renderSettingsPopupUrlList();
            }
        }
    });

    chrome.storage.local.get('managedUrls', (result) => {
        managedUrls = result.managedUrls ? result.managedUrls : [];
        updateIframes(iframeContainer);
        if (settingsPopupUrlList) {
            renderSettingsPopupUrlList();
        }
    });
    
    if (settingsPopupUrlList) {
        settingsPopupUrlList.addEventListener('dragover', handleDragOver);
        settingsPopupUrlList.addEventListener('drop', handleDrop);
    }

    requestAnimationFrame(() => {
        updatePromptButtonsState(promptInput, sendPromptButton, clearPromptButton);
        autoResizeTextarea(promptInput, promptContainer);
    });

    uiReadyResolve();
}