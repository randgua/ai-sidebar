let draggedDOMElement = null;
let confirmationMessageElement = null;
let popupNotificationTimeout = null;
let isModalActive = false;
let collectedOutputs = [];

document.addEventListener('DOMContentLoaded', function () {
    const iframeContainer = document.getElementById('iframe-container');
    const refreshIcon = document.getElementById('refresh-icon');
    const settingsContainer = document.getElementById('settings-container');
    const urlListManagementDiv = document.getElementById('url-list-management');
    const newUrlInput = document.getElementById('new-url-input');
    const addUrlButton = document.getElementById('add-url-button');
    const settingsPopup = document.getElementById('settings-popup');
    const clearSelectionButton = document.getElementById('clear-selection-button');
    const invertSelectionButton = document.getElementById('invert-selection-button');
    const selectAllButton = document.getElementById('select-all-button');
    const copyMarkdownButton = document.getElementById('copy-markdown-button');
    const promptInput = document.getElementById('prompt-input');
    const promptContainer = document.getElementById('prompt-container');
    const togglePromptButton = document.getElementById('toggle-prompt-button');
    const sendPromptButton = document.getElementById('send-prompt-button');
    const backToPanelButton = document.getElementById('back-to-panel-button');
    const collapseButton = document.getElementById('collapse-sidebar-button');
    const leftSidebar = document.getElementById('left-sidebar');
    const clearPromptButton = document.getElementById('clear-prompt-button');

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

    function showGlobalConfirmationMessage(message, duration = 3000) {
        if (!confirmationMessageElement) {
            confirmationMessageElement = document.createElement('div');
            confirmationMessageElement.style.position = 'fixed';
            confirmationMessageElement.style.bottom = '10px';
            confirmationMessageElement.style.left = '50%';
            confirmationMessageElement.style.transform = 'translateX(-50%)';
            confirmationMessageElement.style.padding = '10px 20px';
            confirmationMessageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
            confirmationMessageElement.style.color = 'white';
            confirmationMessageElement.style.borderRadius = '5px';
            confirmationMessageElement.style.zIndex = '2000';
            confirmationMessageElement.style.opacity = '0';
            confirmationMessageElement.style.transition = 'opacity 0.3s ease-in-out';
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

    function showPopupMessage(messageText, duration = 3000) {
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
        if (popupNotificationTimeout) clearTimeout(popupNotificationTimeout);
        popupNotificationTimeout = setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }

    function showCustomConfirm(message, onConfirm) {
        isModalActive = true;
        const modal = document.getElementById('custom-confirm-modal');
        const messageP = document.getElementById('custom-confirm-message');
        const yesButton = document.getElementById('confirm-yes-button');
        const noButton = document.getElementById('confirm-no-button');
        messageP.textContent = message;
        modal.style.display = 'flex';
        yesButton.focus();
        const handleYes = () => { modal.style.display = 'none'; onConfirm(); cleanup(); };
        const handleNo = () => { modal.style.display = 'none'; cleanup(); };
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

    function renderUrlList() {
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
                updateIframes();
            });
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = urlEntry.url;
            let originalUrlOnFocus = urlEntry.url;
            urlInput.addEventListener('focus', () => { originalUrlOnFocus = urlInput.value; itemDiv.draggable = false; });
            urlInput.addEventListener('blur', () => {
                itemDiv.draggable = true;
                const newUrlValue = urlInput.value.trim();
                if (newUrlValue === originalUrlOnFocus) return;
                const formattedUrl = formatAndValidateUrl(newUrlValue);
                if (!formattedUrl) {
                    showPopupMessage('Invalid URL format.');
                    urlInput.value = originalUrlOnFocus;
                    return;
                }
                if (managedUrls.some(u => u.url === formattedUrl && u.id !== urlEntry.id)) {
                    showPopupMessage('This URL already exists in the list.');
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
                showPopupMessage('URL updated successfully!');
                updateIframes();
            });
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                else if (e.key === 'Escape') { e.preventDefault(); urlInput.value = originalUrlOnFocus; e.target.blur(); }
            });
            const openButton = document.createElement('button');
            openButton.textContent = 'Open';
            openButton.className = 'open-url-button';
            openButton.addEventListener('click', () => { chrome.tabs.create({ url: urlEntry.url }); });
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Delete';
            removeButton.className = 'remove-url-button';
            removeButton.addEventListener('click', () => {
                showCustomConfirm(`Are you sure you want to delete this URL: ${urlEntry.url}?`, () => {
                    if (iframeCache[urlEntry.url]) {
                        if (iframeCache[urlEntry.url].parentNode) iframeContainer.removeChild(iframeCache[urlEntry.url]);
                        delete iframeCache[urlEntry.url];
                    }
                    const wasSelected = urlEntry.selected;
                    managedUrls = managedUrls.filter(u => u.id.toString() !== urlEntry.id.toString());
                    if (managedUrls.length > 0 && wasSelected && !managedUrls.some(u => u.selected)) {
                        managedUrls[0].selected = true;
                    }
                    saveUrls();
                    renderUrlList();
                    updateIframes();
                    showPopupMessage('URL removed.');
                });
            });
            itemDiv.append(checkbox, urlInput, openButton, removeButton);
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
                if (targetItemIndex === -1) { managedUrls.splice(draggedItemIndex, 0, draggedUrlEntry); return; }
                const rect = itemDiv.getBoundingClientRect();
                const isAfter = e.clientY > rect.top + rect.height / 2;
                managedUrls.splice(isAfter ? targetItemIndex + 1 : targetItemIndex, 0, draggedUrlEntry);
                saveUrls();
                const parent = urlListManagementDiv;
                if (isAfter) parent.insertBefore(draggedDOMElement, itemDiv.nextSibling);
                else parent.insertBefore(draggedDOMElement, itemDiv);
                updateIframes();
                showPopupMessage('List order updated successfully.');
            });
        });
    }

    /**
     * Handles appending the last output from a single iframe to the prompt input.
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
            const isInputEmpty = promptInput.value.trim() === '';
            
            if (isInputEmpty) {
                promptInput.value = markdownString;
            } else {
                promptInput.value += '\n\n' + markdownString;
            }

            autoResizeTextarea(promptInput);
            promptInput.focus();
            
            setTimeout(() => {
                promptInput.selectionStart = promptInput.selectionEnd = promptInput.value.length;
                promptInput.scrollTop = promptInput.scrollHeight;
            }, 0);

            showGlobalConfirmationMessage(`Appended output from ${result.source}`);
        } else {
            showGlobalConfirmationMessage('Could not find any output to append from this panel.');
        }
    }
    
    // Renders iframes based on the current selection, wrapping them with controls.
    function updateIframes() {
        const selectedUrlEntries = managedUrls.filter(u => u.selected);
        iframeContainer.innerHTML = '';

        if (selectedUrlEntries.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = managedUrls.length === 0 ? 
                'No websites available. Add some in Settings.' : 
                'No websites selected. Please select websites from Settings.';
            iframeContainer.appendChild(emptyMessage);
            return;
        }

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
                    iframe.contentWindow.postMessage({
                        action: 'injectPrompt',
                        prompt: promptText
                    }, '*');
                    const hostname = new URL(urlEntry.url).hostname;
                    showGlobalConfirmationMessage(`Prompt sent to ${hostname}`);
                } else {
                    showGlobalConfirmationMessage('Prompt input is empty.');
                }
            });

            const copyBtn = document.createElement('button');
            copyBtn.className = 'selective-copy-button';
            copyBtn.title = '输出markdown格式';
            copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
            copyBtn.addEventListener('click', () => {
                handleSelectiveAppend(iframe, urlEntry.url);
            });
            
            controlsContainer.appendChild(sendBtn);
            controlsContainer.appendChild(copyBtn);

            wrapper.appendChild(controlsContainer);
            wrapper.appendChild(iframe);
            iframeContainer.appendChild(wrapper);
        });

        const currentManagedUrlsSet = new Set(managedUrls.map(u => u.url));
        for (const urlInCache in iframeCache) {
            if (!currentManagedUrlsSet.has(urlInCache)) {
                delete iframeCache[urlInCache];
            }
        }
    }

    function loadUrls() {
        chrome.storage.sync.get(['managedUrls'], function(result) {
            const loadedUrls = result.managedUrls;
            if (chrome.runtime.lastError || !Array.isArray(loadedUrls) || loadedUrls.length === 0) {
                if (chrome.runtime.lastError) console.error('Error loading URLs:', chrome.runtime.lastError.message);
                managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || crypto.randomUUID() }));
            } else {
                managedUrls = loadedUrls.map(url => ({ ...url, id: url.id || crypto.randomUUID() }));
            }
            saveUrls();
            renderUrlList();
            updateIframes();
        });
    }

    function syncUrlListCheckboxes() {
        urlListManagementDiv.querySelectorAll('.url-item').forEach(item => {
            const urlEntry = managedUrls.find(u => u.id.toString() === item.dataset.id);
            if (urlEntry) {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked !== urlEntry.selected) checkbox.checked = urlEntry.selected;
            }
        });
    }

    function autoResizeTextarea(textarea) {
        if (!textarea || promptContainer.classList.contains('collapsed')) return;
        const maxHeight = Math.floor(window.innerHeight / 3);
        textarea.style.maxHeight = `${maxHeight}px`;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.scrollTop = textarea.scrollHeight;

        const hasText = textarea.value.trim() !== '';
        if (sendPromptButton) {
            sendPromptButton.disabled = !hasText;
        }
        if (clearPromptButton) {
            clearPromptButton.style.display = hasText ? 'flex' : 'none';
        }
    }

    function sendMessageToIframes(prompt) {
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

    function executeSend() {
        const promptText = promptInput.value.trim();
        if (promptText) {
            sendMessageToIframes(promptText);
            promptInput.value = '';
            autoResizeTextarea(promptInput);
            setTimeout(() => promptInput.focus(), 300);
        }
    }

    addUrlButton.addEventListener('click', () => {
        const newUrlValue = newUrlInput.value.trim();
        if (newUrlValue) {
            const formattedUrl = formatAndValidateUrl(newUrlValue);
            if (!formattedUrl) { showPopupMessage('Please enter a valid URL.'); return; }
            if (managedUrls.some(entry => entry.url === formattedUrl)) { showPopupMessage('This URL already exists.'); return; }
            managedUrls.push({ id: crypto.randomUUID(), url: formattedUrl, selected: false });
            saveUrls();
            renderUrlList();
            updateIframes();
            newUrlInput.value = '';
            showPopupMessage('URL added successfully!');
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

    if (invertSelectionButton) invertSelectionButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage('No URLs to invert selection.'); return; }
        managedUrls.forEach(urlEntry => urlEntry.selected = !urlEntry.selected);
        saveUrls();
        syncUrlListCheckboxes();
        updateIframes();
        showPopupMessage('Selection inverted.');
    });

    if (selectAllButton) selectAllButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage('No URLs to select.'); return; }
        let newlySelectedCount = 0;
        managedUrls.forEach(urlEntry => { if (!urlEntry.selected) { urlEntry.selected = true; newlySelectedCount++; } });
        if (newlySelectedCount > 0) {
            saveUrls();
            syncUrlListCheckboxes();
            updateIframes();
            showPopupMessage('All URLs selected.');
        } else {
            showPopupMessage('All URLs were already selected.');
        }
    });

    if (clearSelectionButton) clearSelectionButton.addEventListener('click', () => {
        let deselectedCount = 0;
        managedUrls.forEach(urlEntry => { if (urlEntry.selected) { urlEntry.selected = false; deselectedCount++; } });
        if (deselectedCount > 0) {
            saveUrls();
            syncUrlListCheckboxes();
            updateIframes();
            showPopupMessage('All selections cleared.');
        } else {
            showPopupMessage('No URLs were selected.');
        }
    });

    settingsContainer.addEventListener('mouseenter', () => settingsPopup.classList.add('show'));
    settingsContainer.addEventListener('mouseleave', () => { if (!isModalActive) settingsPopup.classList.remove('show'); });

    // Collects outputs from iframes, including the source hostname.
    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'receiveLastOutput' && event.data.output) {
            collectedOutputs.push({ source: event.data.source, output: event.data.output.trim() });
        }
    });

    if (copyMarkdownButton) {
        copyMarkdownButton.addEventListener('click', () => {
            collectedOutputs = [];
            const activeIframes = iframeContainer.querySelectorAll('iframe');
    
            if (activeIframes.length === 0) {
                showGlobalConfirmationMessage('No active panels to copy from.');
                return;
            }
    
            activeIframes.forEach(iframe => {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ action: 'getLastOutput' }, '*');
                }
            });
    
            // Wait for async messages to be collected before processing.
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
                    
                    const isInputEmpty = promptInput.value.trim() === '';
    
                    if (isInputEmpty) {
                        promptInput.value = markdownString;
                    } else {
                        promptInput.value += '\n\n' + markdownString;
                    }
    
                    autoResizeTextarea(promptInput);
                    promptInput.focus();
                    
                    setTimeout(() => {
                        promptInput.selectionStart = promptInput.selectionEnd = promptInput.value.length;
                        promptInput.scrollTop = promptInput.scrollHeight;
                    }, 0);
                    
                    showGlobalConfirmationMessage(`Appended output from ${collectedOutputs.length} panel(s).`);
                } else {
                    showGlobalConfirmationMessage('Could not find any output to copy.');
                }
            }, 1500);
        });
    }

    if (togglePromptButton) {
        togglePromptButton.addEventListener('click', () => {
            promptContainer.classList.toggle('collapsed');
            const isCollapsed = promptContainer.classList.contains('collapsed');
            togglePromptButton.textContent = isCollapsed ? 'expand_less' : 'expand_more';
            togglePromptButton.title = isCollapsed ? 'Expand prompt area' : 'Collapse prompt area';
            if (!isCollapsed) autoResizeTextarea(promptInput);
        });
    }

    if (clearPromptButton) {
        clearPromptButton.addEventListener('click', () => {
            promptInput.value = '';
            autoResizeTextarea(promptInput);
            promptInput.focus();
        });
    }

    promptInput.addEventListener('input', () => autoResizeTextarea(promptInput));
    window.addEventListener('resize', () => autoResizeTextarea(promptInput));
    if (sendPromptButton) sendPromptButton.addEventListener('click', executeSend);
    promptInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); executeSend(); } });

    if (backToPanelButton) {
        backToPanelButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "openSidePanel" }, () => {
                window.close();
            });
        });
    }
    if (collapseButton && leftSidebar) {
        collapseButton.addEventListener('click', () => {
            leftSidebar.classList.toggle('collapsed');
        });
    }

    loadUrls();
    autoResizeTextarea(promptInput);
});