// Global state variables
let draggedDOMElement = null;
let confirmationMessageElement = null;
let isModalActive = false;
let collectedOutputs = [];
let managedUrls = [];
const iframeCache = {};

// Default URLs to populate the list if storage is empty.
const defaultUrls = [
    { id: crypto.randomUUID(), url: "https://aistudio.google.com/", selected: true },
    { id: crypto.randomUUID(), url: "https://gemini.google.com/", selected: false },
    { id: crypto.randomUUID(), url: "https://chatgpt.com/", selected: false },
    { id: crypto.randomUUID(), url: "https://claude.ai/", selected: false },
    { id: crypto.randomUUID(), url: "https://grok.com/", selected: false },
    { id: crypto.randomUUID(), url: "https://perplexity.ai/", selected: false },
    { id: crypto.randomUUID(), url: "https://chat.deepseek.com/", selected: false },
    { id: crypto.randomUUID(), url: "https://chat.qwen.ai/", selected: false },
    { id: crypto.randomUUID(), url: "https://chatglm.cn/", selected: false },
    { id: crypto.randomUUID(), url: "https://www.doubao.com/chat/", selected: false }
];

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
        confirmationMessageElement.addEventListener('transitionend', () => {
            if (confirmationMessageElement.style.opacity === '0') {
                confirmationMessageElement.style.visibility = 'hidden';
            }
        });
        document.body.appendChild(confirmationMessageElement);
    }

    if (confirmationMessageElement.timeoutId) clearTimeout(confirmationMessageElement.timeoutId);

    confirmationMessageElement.textContent = message;
    confirmationMessageElement.style.visibility = 'visible';
    confirmationMessageElement.style.opacity = '1';

    confirmationMessageElement.timeoutId = setTimeout(() => {
        confirmationMessageElement.style.opacity = '0';
    }, duration);
}

/**
 * Displays a message inside the settings popup.
 * @param {HTMLElement} settingsPopup The popup element to show the message in.
 * @param {string} messageText The message to display.
 * @param {number} duration How long to display the message in milliseconds.
 */
function showPopupMessage(settingsPopup, messageText, duration = 3000) {
    if (!settingsPopup) return;
    let messageElement = settingsPopup.querySelector('.popup-message-area');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'popup-message-area';
        Object.assign(messageElement.style, {
            padding: '10px', marginTop: '10px', backgroundColor: '#e9f5fe',
            color: '#0d6efd', border: '1px solid #b6d4fe', borderRadius: '4px',
            textAlign: 'center', fontSize: '13px', display: 'none'
        });
        settingsPopup.appendChild(messageElement);
    }
    messageElement.textContent = messageText;
    messageElement.style.display = 'block';
    if (messageElement.timeoutId) clearTimeout(messageElement.timeoutId);
    messageElement.timeoutId = setTimeout(() => {
        messageElement.style.display = 'none';
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
 * Saves the current list of URLs to chrome.storage.sync.
 */
function saveUrls() {
    chrome.storage.sync.set({ managedUrls: managedUrls });
}

/**
 * Validates and formats a URL, assuming https if no protocol is provided.
 * @param {string} input The URL string to validate.
 * @returns {string|null} The formatted URL or null if invalid.
 */
function formatAndValidateUrl(input) {
    let urlString = input.trim();
    if (/^([a-zA-Z]:\\|\/)/.test(urlString) && !urlString.startsWith('file:///')) {
        urlString = 'file:///' + urlString.replace(/\\/g, '/');
    }
    try {
        new URL(urlString);
        return urlString;
    } catch (error) {
        if (!/^[a-zA-Z]+:\/\//.test(urlString) && !/^[a-zA-Z]+:/.test(urlString)) {
            const assumedUrl = 'https://' + urlString;
            try { new URL(assumedUrl); return assumedUrl; } catch (e) { return null; }
        }
        return null;
    }
}

/**
 * Renders the list of manageable URLs in the settings popup.
 * @param {HTMLElement} urlListManagementDiv The container for the URL list.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 * @param {HTMLElement} settingsPopup The settings popup element.
 */
function renderUrlList(urlListManagementDiv, iframeContainer, settingsPopup) {
    urlListManagementDiv.innerHTML = '';

    managedUrls.forEach(urlEntry => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'url-item';
        itemDiv.setAttribute('draggable', true);
        itemDiv.dataset.id = urlEntry.id.toString();

        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '☰';
        dragHandle.title = 'Drag to reorder';
        itemDiv.appendChild(dragHandle);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = urlEntry.selected;
        checkbox.addEventListener('change', () => {
            urlEntry.selected = checkbox.checked;
            saveUrls();
            updateIframes(iframeContainer, urlListManagementDiv);
        });

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = urlEntry.url;
        let originalUrlOnFocus = urlEntry.url;

        urlInput.addEventListener('focus', () => {
            originalUrlOnFocus = urlInput.value;
            itemDiv.draggable = false;
        });

        urlInput.addEventListener('blur', () => {
            itemDiv.draggable = true;
            const newUrlValue = urlInput.value.trim();
            if (newUrlValue === originalUrlOnFocus) return;

            const formattedUrl = formatAndValidateUrl(newUrlValue);
            if (!formattedUrl) {
                showPopupMessage(settingsPopup, 'Invalid URL format.');
                urlInput.value = originalUrlOnFocus;
                return;
            }
            if (managedUrls.some(u => u.url === formattedUrl && u.id !== urlEntry.id)) {
                showPopupMessage(settingsPopup, 'This URL already exists in the list.');
                urlInput.value = originalUrlOnFocus;
                return;
            }

            const oldUrlKeyInCache = urlEntry.url;
            urlEntry.url = formattedUrl;
            if (iframeCache[oldUrlKeyInCache]) {
                iframeCache[formattedUrl] = iframeCache[oldUrlKeyInCache];
                delete iframeCache[oldUrlKeyInCache];
            }
            saveUrls();
            showPopupMessage(settingsPopup, 'URL updated successfully!');
            updateIframes(iframeContainer, urlListManagementDiv);
        });

        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
            else if (e.key === 'Escape') { e.preventDefault(); urlInput.value = originalUrlOnFocus; e.target.blur(); }
        });

        const openIcon = document.createElement('span');
        openIcon.textContent = 'open_in_new';
        openIcon.className = 'material-symbols-outlined open-url-icon';
        openIcon.title = 'Open in new tab';
        openIcon.addEventListener('click', () => chrome.tabs.create({ url: urlEntry.url }));

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Delete';
        removeButton.className = 'remove-url-button';
        removeButton.addEventListener('click', () => {
            showCustomConfirm(`Are you sure you want to delete this URL: ${urlEntry.url}?`, () => {
                if (iframeCache[urlEntry.url]) {
                    if (iframeCache[urlEntry.url].parentNode) {
                        iframeContainer.removeChild(iframeCache[urlEntry.url]);
                    }
                    delete iframeCache[urlEntry.url];
                }
                const wasSelected = urlEntry.selected;
                managedUrls = managedUrls.filter(u => u.id.toString() !== urlEntry.id.toString());
                if (managedUrls.length > 0 && wasSelected && !managedUrls.some(u => u.selected)) {
                    managedUrls[0].selected = true;
                }
                saveUrls();
                renderUrlList(urlListManagementDiv, iframeContainer, settingsPopup);
                updateIframes(iframeContainer, urlListManagementDiv);
                showPopupMessage(settingsPopup, 'URL removed.');
            });
        });

        itemDiv.append(dragHandle, checkbox, urlInput, openIcon, removeButton);
        urlListManagementDiv.appendChild(itemDiv);

        // Drag and drop event listeners
        itemDiv.addEventListener('dragstart', (e) => {
            if (managedUrls.some(u => u.selected)) {
                iframeContainer.style.pointerEvents = 'none';
                iframeContainer.style.opacity = '0.7';
            }
            draggedDOMElement = itemDiv;
            e.dataTransfer.setData('text/plain', itemDiv.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => { if (draggedDOMElement) draggedDOMElement.style.opacity = '0.5'; }, 0);
        });

        itemDiv.addEventListener('dragend', () => {
            iframeContainer.style.pointerEvents = 'auto';
            iframeContainer.style.opacity = '1';
            if (draggedDOMElement) draggedDOMElement.style.opacity = '1';
            else itemDiv.style.opacity = '1';
            draggedDOMElement = null;
            document.querySelectorAll('.url-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        itemDiv.addEventListener('dragover', (e) => {
            if (!draggedDOMElement || draggedDOMElement === itemDiv) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.url-item.drag-over').forEach(el => el.classList.remove('drag-over'));
            itemDiv.classList.add('drag-over');
        });

        itemDiv.addEventListener('dragleave', () => itemDiv.classList.remove('drag-over'));

        itemDiv.addEventListener('drop', (e) => {
            if (!draggedDOMElement || draggedDOMElement === itemDiv) return;
            e.preventDefault();
            itemDiv.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetId = itemDiv.dataset.id;

            const draggedItemIndex = managedUrls.findIndex(u => u.id.toString() === draggedId);
            if (draggedItemIndex === -1) return;

            const [draggedUrlEntry] = managedUrls.splice(draggedItemIndex, 1);
            let targetItemIndex = managedUrls.findIndex(u => u.id.toString() === targetId);
            if (targetItemIndex === -1) {
                managedUrls.splice(draggedItemIndex, 0, draggedUrlEntry);
                return;
            }

            const rect = itemDiv.getBoundingClientRect();
            const isAfter = e.clientY > rect.top + rect.height / 2;
            managedUrls.splice(isAfter ? targetItemIndex + 1 : targetItemIndex, 0, draggedUrlEntry);

            saveUrls();
            const parent = urlListManagementDiv;
            if (isAfter) {
                parent.insertBefore(draggedDOMElement, itemDiv.nextSibling);
            } else {
                parent.insertBefore(draggedDOMElement, itemDiv);
            }
            updateIframes(iframeContainer, urlListManagementDiv);
            showPopupMessage(settingsPopup, 'List order updated successfully.');
        });
    });
}

/**
 * Gets the last output from a single iframe, appends it to the prompt input,
 * and copies the appended text to the clipboard.
 * @param {HTMLIFrameElement} iframe The iframe to get output from.
 * @param {string} url The URL of the iframe for display purposes.
 */
async function handleSelectiveAppend(iframe, url) {
    const outputPromise = new Promise(resolve => {
        const listener = (event) => {
            if (event.data && event.data.action === 'receiveLastOutput' && event.source === iframe.contentWindow) {
                window.removeEventListener('message', listener);
                resolve({ output: event.data.output, source: new URL(url).hostname });
            }
        };
        window.addEventListener('message', listener);
        setTimeout(() => {
            window.removeEventListener('message', listener);
            resolve(null);
        }, 1500);
    });

    iframe.contentWindow.postMessage({ action: 'getLastOutput' }, '*');
    const result = await outputPromise;

    if (result && result.output && result.output.trim()) {
        const prettyNames = {
            'aistudio.google.com': 'AI Studio', 'gemini.google.com': 'Gemini',
            'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude',
            'chat.deepseek.com': 'DeepSeek', 'chat.qwen.ai': 'Qwen',
        };
        const title = prettyNames[result.source] || result.source;
        const markdownString = `## ${title}\n\n${result.output.trim()}`;
        
        const promptInput = document.getElementById('prompt-input');
        promptInput.value = promptInput.value.trim() === '' ? markdownString : `${promptInput.value}\n\n${markdownString}`;
        navigator.clipboard.writeText(markdownString);

        const promptContainer = document.getElementById('prompt-container');
        const sendPromptButton = document.getElementById('send-prompt-button');
        const clearPromptButton = document.getElementById('clear-prompt-button');
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
        
        promptInput.focus();
        setTimeout(() => {
            promptInput.selectionStart = promptInput.selectionEnd = promptInput.value.length;
            promptInput.scrollTop = promptInput.scrollHeight;
        }, 0);

        showGlobalConfirmationMessage(`Output from ${result.source} appended and copied to clipboard`);
    } else {
        showGlobalConfirmationMessage('Could not find any output to append from this panel.');
    }
}

/**
 * Renders iframes in the main container based on the current selection.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 * @param {HTMLElement} urlListManagementDiv The container for the URL list.
 */
function updateIframes(iframeContainer, urlListManagementDiv) {
    const promptContainer = document.getElementById('prompt-container');
    const isCollapsedBeforeUpdate = promptContainer.classList.contains('collapsed');

    const selectedUrlEntries = managedUrls.filter(u => u.selected);
    iframeContainer.innerHTML = '';

    if (selectedUrlEntries.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = managedUrls.length === 0 ?
            'No websites available. Add some in Settings, or reload to load the default list.' :
            'No websites selected. Please select websites to display from Settings.';
        iframeContainer.appendChild(emptyMessage);
    } else {
        selectedUrlEntries.forEach(urlEntry => {
            let iframe = iframeCache[urlEntry.url];
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.src = urlEntry.url;
                iframeCache[urlEntry.url] = iframe;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'iframe-wrapper';

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
            copyBtn.addEventListener('click', () => handleSelectiveAppend(iframe, urlEntry.url));

            controlsContainer.append(sendBtn, copyBtn);
            wrapper.append(controlsContainer, iframe);
            iframeContainer.appendChild(wrapper);
        });
    }

    const currentManagedUrlsSet = new Set(managedUrls.map(u => u.url));
    for (const urlInCache in iframeCache) {
        if (!currentManagedUrlsSet.has(urlInCache)) {
            delete iframeCache[urlInCache];
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
 * Loads URLs from storage or uses defaults, then renders the UI.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 * @param {HTMLElement} urlListManagementDiv The container for the URL list.
 * @param {HTMLElement} settingsPopup The settings popup element.
 */
function loadUrls(iframeContainer, urlListManagementDiv, settingsPopup) {
    chrome.storage.sync.get(['managedUrls'], function(result) {
        const loadedUrls = result.managedUrls;
        if (chrome.runtime.lastError || !Array.isArray(loadedUrls) || loadedUrls.length === 0) {
            if (chrome.runtime.lastError) console.error('Error loading managed URLs:', chrome.runtime.lastError.message);
            managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || crypto.randomUUID() }));
        } else {
            managedUrls = loadedUrls.map(url => ({ ...url, id: url.id || crypto.randomUUID() }));
        }
        saveUrls();
        renderUrlList(urlListManagementDiv, iframeContainer, settingsPopup);
        updateIframes(iframeContainer, urlListManagementDiv);
    });
}

/**
 * Ensures checkboxes in the URL list match the state in managedUrls.
 * @param {HTMLElement} urlListManagementDiv The container for the URL list.
 */
function syncUrlListCheckboxes(urlListManagementDiv) {
    urlListManagementDiv.querySelectorAll('.url-item').forEach(item => {
        const urlEntry = managedUrls.find(u => u.id.toString() === item.dataset.id);
        if (urlEntry) {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked !== urlEntry.selected) {
                checkbox.checked = urlEntry.selected;
            }
        }
    });
}

/**
 * Automatically resizes the prompt textarea based on its content.
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
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    setTimeout(() => {
        textarea.setSelectionRange(selection, selection);
        textarea.scrollTop = textarea.scrollHeight;
    }, 0);

    const hasText = textarea.value.trim() !== '';
    if (sendPromptButton) sendPromptButton.disabled = !hasText;
    if (clearPromptButton) clearPromptButton.style.display = hasText ? 'flex' : 'none';
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
 * Main function to initialize all shared UI logic and event listeners.
 * @param {object} elements A dictionary of DOM elements required by the functions.
 */
function initializeSharedUI(elements) {
    const {
        iframeContainer, refreshIcon, settingsContainer, settingsPopup, urlListManagementDiv,
        newUrlInput, addUrlButton, clearSelectionButton, invertSelectionButton, selectAllButton,
        copyMarkdownButton, promptInput, promptContainer, togglePromptButton, sendPromptButton,
        clearPromptButton
    } = elements;

    const contextContainer = document.getElementById('context-container');
    const contextContent = document.getElementById('context-content');
    const closeContextButton = document.getElementById('close-context-button');

    // This function handles sending the prompt, combining context if available.
    const executeSend = () => {
        let promptText = promptInput.value.trim();
        
        const isContextVisible = contextContainer.style.display === 'flex';
        if (isContextVisible) {
            const contextText = contextContent.textContent.trim();
            if (contextText) {
                // Combine context and prompt into a single message.
                promptText = `Based on the following text:\n\n------\n${contextText}\n------\n\n${promptText}\n\n`;
            }
        }

        if (promptText) {
            sendMessageToIframes(iframeContainer, promptText);
            promptInput.value = ''; // Clear input after sending.
            
            // Hide and clear the context container after sending.
            contextContainer.style.display = 'none';
            contextContent.textContent = '';

            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            setTimeout(() => promptInput.focus(), 300);
        }
    };

    // Listen for messages from content scripts (e.g., for selected text).
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'textSelected' && message.text) {
            contextContent.textContent = message.text;
            contextContainer.style.display = 'flex';
            promptInput.focus();
        }
        return true; // Indicate that the response may be sent asynchronously.
    });

    if (closeContextButton) {
        closeContextButton.addEventListener('click', () => {
            contextContainer.style.display = 'none';
            contextContent.textContent = '';
        });
    }

    addUrlButton.addEventListener('click', () => {
        const newUrlValue = newUrlInput.value.trim();
        if (newUrlValue) {
            const formattedUrl = formatAndValidateUrl(newUrlValue);
            if (!formattedUrl) {
                showPopupMessage(settingsPopup, 'Please enter a valid URL or local file path.');
                return;
            }
            if (managedUrls.some(entry => entry.url === formattedUrl)) {
                showPopupMessage(settingsPopup, 'This URL already exists in the list.');
                return;
            }
            managedUrls.push({ id: crypto.randomUUID(), url: formattedUrl, selected: false });
            saveUrls();
            renderUrlList(urlListManagementDiv, iframeContainer, settingsPopup);
            updateIframes(iframeContainer, urlListManagementDiv);
            newUrlInput.value = '';
            showPopupMessage(settingsPopup, 'URL added successfully!');
        }
    });
    newUrlInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') addUrlButton.click(); });

    refreshIcon.addEventListener('click', function () {
        refreshIcon.classList.add('clicked');
        let refreshedCount = 0;
        managedUrls.forEach(urlEntry => {
            if (urlEntry.selected) {
                const iframe = iframeCache[urlEntry.url];
                if (iframe) { iframe.src = iframe.src; refreshedCount++; }
            }
        });
        showGlobalConfirmationMessage(refreshedCount > 0 ? `Refreshed ${refreshedCount} panel(s).` : 'No active panels to refresh.');
        setTimeout(() => refreshIcon.classList.remove('clicked'), 200);
    });

    invertSelectionButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage(settingsPopup, 'No URLs available in the list to invert selection.'); return; }
        managedUrls.forEach(urlEntry => urlEntry.selected = !urlEntry.selected);
        saveUrls();
        syncUrlListCheckboxes(urlListManagementDiv);
        updateIframes(iframeContainer, urlListManagementDiv);
        showPopupMessage(settingsPopup, 'Selection inverted.');
    });

    selectAllButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage(settingsPopup, 'No URLs available in the list to select.'); return; }
        let newlySelectedCount = 0;
        managedUrls.forEach(urlEntry => { if (!urlEntry.selected) { urlEntry.selected = true; newlySelectedCount++; } });
        if (newlySelectedCount > 0) {
            saveUrls();
            syncUrlListCheckboxes(urlListManagementDiv);
            updateIframes(iframeContainer, urlListManagementDiv);
            showPopupMessage(settingsPopup, 'All URLs selected.');
        } else {
            showPopupMessage(settingsPopup, 'All URLs were already selected; no changes made.');
        }
    });

    clearSelectionButton.addEventListener('click', () => {
        let deselectedCount = 0;
        managedUrls.forEach(urlEntry => { if (urlEntry.selected) { urlEntry.selected = false; deselectedCount++; } });
        if (deselectedCount > 0) {
            saveUrls();
            syncUrlListCheckboxes(urlListManagementDiv);
            updateIframes(iframeContainer, urlListManagementDiv);
            showPopupMessage(settingsPopup, 'All selections cleared.');
        } else {
            showPopupMessage(settingsPopup, 'No URLs were selected to clear; no changes made.');
        }
    });

    settingsContainer.addEventListener('mouseenter', () => settingsPopup.classList.add('show'));
    settingsContainer.addEventListener('mouseleave', () => { if (!isModalActive) settingsPopup.classList.remove('show'); });

    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'receiveLastOutput' && event.data.output) {
            collectedOutputs.push({ source: event.data.source, output: event.data.output.trim() });
        }
    });

    copyMarkdownButton.title = 'Append all outputs to prompt area and copy as Markdown';
    copyMarkdownButton.addEventListener('click', () => {
        collectedOutputs = [];
        const activeIframes = iframeContainer.querySelectorAll('iframe');
        if (activeIframes.length === 0) {
            showGlobalConfirmationMessage('No active panels to copy from.');
            return;
        }
        activeIframes.forEach(iframe => {
            if (iframe.contentWindow) iframe.contentWindow.postMessage({ action: 'getLastOutput' }, '*');
        });

        // This is a "best effort" collection. It waits for a fixed period for iframes
        // to respond. Slower iframes may be missed. This prevents the UI from
        // getting stuck waiting for a non-responsive panel.
        setTimeout(() => {
            if (collectedOutputs.length > 0) {
                const prettyNames = {
                    'aistudio.google.com': 'AI Studio', 'gemini.google.com': 'Gemini',
                    'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude',
                    'chat.deepseek.com': 'DeepSeek', 'chat.qwen.ai': 'Qwen',
                };
                const markdownString = collectedOutputs.map(item => {
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
                showGlobalConfirmationMessage(`Appended and copied output from ${collectedOutputs.length} panel(s).`);
            } else {
                showGlobalConfirmationMessage('Could not find any output to copy.');
            }
        }, 1500);
    });

    togglePromptButton.addEventListener('click', () => {
        promptContainer.classList.toggle('collapsed');
        const isCollapsed = promptContainer.classList.contains('collapsed');
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
    window.addEventListener('resize', () => autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton));
    sendPromptButton.addEventListener('click', executeSend);
    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            executeSend();
        }
    });

    // Initial load
    loadUrls(iframeContainer, urlListManagementDiv, settingsPopup);
    autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
}