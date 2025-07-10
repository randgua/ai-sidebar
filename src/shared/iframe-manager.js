// Manages the creation, updating, and interaction with iframes.
let managedUrls = [];
const iframeCache = {};

/**
 * Appends the output from a specific iframe to the main prompt input and copies it to the clipboard.
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
            wrapper.dataset.id = urlEntry.id;

            const bottomControlsContainer = document.createElement('div');
            bottomControlsContainer.className = 'iframe-controls-container';

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
            copyBtn.addEventListener('click', () => handleSelectiveCopy(iframe, urlEntry));

            bottomControlsContainer.append(sendBtn, copyBtn);

            const currentUrl = new URL(urlEntry.url);
            if (currentUrl.hostname.includes('gemini.google.com') || currentUrl.hostname.includes('aistudio.google.com')) {
                const topControlsContainer = document.createElement('div');
                topControlsContainer.className = 'iframe-top-controls-container';

                const toggleSearchBtn = document.createElement('button');
                toggleSearchBtn.className = 'toggle-search-button';
                toggleSearchBtn.title = 'Toggle Google Search';
                toggleSearchBtn.innerHTML = '<span class="material-symbols-outlined">search</span>';
                toggleSearchBtn.addEventListener('click', () => {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ action: 'toggleGoogleSearch' }, '*');
                        const hostname = new URL(urlEntry.url).hostname;
                        showGlobalConfirmationMessage(`Toggled Google Search in ${hostname}.`);
                    }
                });
                topControlsContainer.appendChild(toggleSearchBtn);
                wrapper.appendChild(topControlsContainer);
            }
            
            wrapper.append(bottomControlsContainer, iframe);
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