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

// Default prompts to be used if none are found in storage.
const defaultPrompts = [
    { id: crypto.randomUUID(), name: 'Explain', content: 'Please explain clearly and concisely in ${lang}: """${input}"""', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Summarize', content: 'Summarize the following text into three key points: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Translate', content: 'Translate the following text into ${lang}: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Explain codes', content: 'Explain the following code snippet, describing its purpose, inputs, and outputs: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Web Search', content: 'Perform a web search for: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Outline...', content: 'Create an outline for the following topic: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Simplify language', content: 'Simplify the language of the following text to make it easier to understand: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'More engaging', content: 'Rewrite the following text to be more engaging: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'More apologetic', content: 'Rewrite the following text to be more apologetic: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Add humor', content: 'Add some humor to the following text: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Add statistics', content: 'Enhance the following text by adding relevant (placeholder) statistics: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Add details', content: '# Role: Detail Enhancer\n\nYou are a highly skilled AI trained in language understanding and detail enhancement. You will read the original text and add some details to make it more believable.\n\n## Rules\n- Retain the original meaning and structure.\n- Enhance the text with additional details to make it more believable.\n- Only provide the output and nothing else.\n- Do not wrap responses in quotes.\n- Respond in the same language as the original text.\n\n# Original Text """${input}"""', showInMenu: true },
    { id: crypto.randomUUID(), name: 'More persuasive', content: 'Make the following text more persuasive: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Sales email...', content: 'Write a sales email about the following: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Meeting agenda...', content: 'Create a meeting agenda for the following topic: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'To-do list...', content: 'Create a to-do list based on the following: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Creative story', content: 'Write a creative story based on the following prompt: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Press release', content: 'Write a press release about the following: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Social media post...', content: 'Write a social media post about the following: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Paragraph about...', content: 'Write a paragraph about the following: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Improve writing', content: 'Improve the writing of the following text: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Fix spelling & grammar', content: 'Fix the spelling and grammar of the following text: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Answer this question', content: 'Answer the following question: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Find action items', content: 'Identify the action items from the following text: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Make shorter', content: 'Make the following text shorter: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Make longer', content: 'Make the following text longer: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Change tone', content: 'Change the tone of the following text to be more ${tone}: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Brainstorm about...', content: 'Brainstorm ideas about the following topic: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Blog post...', content: 'Write a blog post about the following topic: "${input}"', showInMenu: true },
    { id: crypto.randomUUID(), name: 'Continue writing', content: 'Continue writing from the following text.', showInMenu: false },
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

        const removeButton = document.createElement('span');
        removeButton.textContent = 'delete';
        removeButton.className = 'material-symbols-outlined remove-url-button';
        removeButton.title = 'Delete URL';
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
 * Gets the last output from a single iframe and appends it to the prompt input.
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
 * Automatically resizes the prompt textarea and manages its scrollbar visibility.
 * The scrollbar will only appear when the content exceeds the maximum height.
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
            clearPromptButton.classList.toggle('top-right', isMultiLine);
            promptInputWrapper.classList.toggle('multi-line-input', isMultiLine);
        } else if (promptInputWrapper) {
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
    
    // Hide the divider when the contextual UI is reset.
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
    button.addEventListener('click', () => {
        const fullPrompt = `Based on the following text:\n\n------\n${selectedText}\n------\n\n${prompt.content}`;
        sendMessageToIframes(iframeContainer, fullPrompt);
        resetContextualUI();
    });
    return button;
}

/**
 * Dynamically renders prompt buttons based on available width, ensuring they stay on a single line.
 * @param {string} selectedText The text that the prompts will act upon.
 * @param {Array} visiblePrompts The list of prompt objects to render.
 */
function renderResponsivePrompts(selectedText, visiblePrompts) {
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const morePromptsPopup = document.getElementById('more-prompts-popup');
    const morePromptsList = morePromptsPopup.querySelector('#more-prompts-list');

    promptButtonsContainer.innerHTML = '';
    morePromptsList.innerHTML = '';
    // Detach popup so it can be re-appended into the correct wrapper later
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
        // Defer the execution to the next animation frame to avoid ResizeObserver loop errors.
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
                
                // Create a dedicated "..." button that does not send a prompt on click
                const moreButton = document.createElement('button');
                moreButton.className = 'prompt-button more-button';
                moreButton.innerHTML = '<span class="material-symbols-outlined">more_horiz</span>';
                
                morePromptsWrapper.appendChild(moreButton);
                
                // Move the popup menu to be a child of the wrapper
                morePromptsWrapper.appendChild(morePromptsPopup);
                
                promptButtonsContainer.appendChild(morePromptsWrapper);

                promptsToHide.forEach(prompt => {
                    morePromptsList.appendChild(createPromptButton(prompt, selectedText, true));
                });

                let hidePopupTimeout;
                const showPopup = () => { clearTimeout(hidePopupTimeout); morePromptsPopup.style.display = 'block'; };
                const hidePopup = () => { hidePopupTimeout = setTimeout(() => { morePromptsPopup.style.display = 'none'; }, 200); };

                // Apply hover logic to the wrapper, which contains both the button and the now-child popup
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
    // Show the divider when the contextual UI is displayed.
    if (promptInputDivider) {
        promptInputDivider.style.display = 'block';
    }

    let result = await chrome.storage.sync.get('prompts');
    let prompts = result.prompts;
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
        prompts = defaultPrompts;
    }
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
        iframeContainer, refreshIcon, settingsContainer, settingsPopup, urlListManagementDiv,
        newUrlInput, addUrlButton, clearSelectionButton, invertSelectionButton, selectAllButton,
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

    // Listen for messages from content scripts (e.g., text selection).
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'textSelected' && message.text) {
            displayContextualUI(message.text);
            sendResponse({status: "Context displayed in sidebar"});
        } else if (message.action === 'textDeselected') {
            const contextContainer = document.getElementById('context-container');
            // Only reset if the UI is currently visible.
            if (contextContainer && contextContainer.style.display !== 'none') {
                resetContextualUI();
                sendResponse({status: "Context cleared in sidebar"});
            }
        }
        return true; // Keep the message channel open for async responses.
    });

    if (closeContextButton) {
        closeContextButton.addEventListener('click', resetContextualUI);
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
                let result = await chrome.storage.sync.get('prompts');
                let prompts = result.prompts;
                if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
                    prompts = defaultPrompts;
                }
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
        if (namespace === 'sync' && changes.managedUrls) {
            managedUrls = changes.managedUrls.newValue;
            renderUrlList(urlListManagementDiv, iframeContainer, settingsPopup);
            updateIframes(iframeContainer, urlListManagementDiv);
        }
    });

    loadUrls(iframeContainer, urlListManagementDiv, settingsPopup);
    
    // Delay the initial resize to ensure the browser has calculated the layout.
    setTimeout(() => {
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
    }, 10);
}