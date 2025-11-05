// Manages the creation, updating, and interaction with iframes.
let managedUrls = [];
const iframeCache = {};
const IFRAME_LOAD_TIMEOUT = 15000; // 15 seconds

/**
 * Appends the output from a specific iframe to the main prompt input and copies it to the clipboard.
 * @param {HTMLIFrameElement} iframe The specific iframe to get output from.
 * @param {object} urlEntry The URL entry object, containing a unique id.
 */
function handleSelectiveAppendAndCopy(iframe, urlEntry) {
    const uniqueId = urlEntry.id;
    const sourceHostname = new URL(urlEntry.url).hostname;
    let listener;
    let timeoutId;

    const cleanup = () => {
        window.removeEventListener('message', listener);
        if (timeoutId) clearTimeout(timeoutId);
    };
    
    listener = (event) => {
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
            const markdownString = `## ${title}\n${output}`;
            const existingText = promptInput.value.trim();
            promptInput.value = existingText ? `${existingText}\n\n${markdownString}` : markdownString;
            autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
            promptInput.focus();
            showGlobalConfirmationMessage(`Appended and copied output from ${title}.`);
            
            cleanup();
        }
    };

    window.addEventListener('message', listener);
    
    if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'getLastOutput', uniqueId: uniqueId }, '*');
    }

    timeoutId = setTimeout(cleanup, 3000);
}

/**
 * Handles the UI update when an iframe fails to load.
 * @param {HTMLElement} wrapper The iframe's wrapper element.
 * @param {object} urlEntry The URL entry object.
 * @param {string} reason A short description of why it failed.
 */
function handleLoadFailure(wrapper, urlEntry, reason) {
    wrapper.innerHTML = ''; // Clear everything inside
    const errorMessage = document.createElement('div');
    errorMessage.className = 'iframe-error-message';
    try {
        const hostname = new URL(urlEntry.url).hostname;
        errorMessage.textContent = `Panel for ${hostname} ${reason}.`;
    } catch (e) {
        errorMessage.textContent = `Panel for this URL ${reason}. The URL may be invalid.`;
    }
    wrapper.appendChild(errorMessage);
    // Remove from cache to allow a retry on refresh
    if (iframeCache[urlEntry.id]) {
        delete iframeCache[urlEntry.id];
    }
}

/**
 * Populates a wrapper with an iframe and its controls, handling loading asynchronously.
 * @param {HTMLElement} wrapper The wrapper element to populate.
 * @param {object} urlEntry The URL entry object.
 */
function loadIframeAsync(wrapper, urlEntry) {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'iframe-loading-indicator';
    loadingIndicator.textContent = 'Loading...';
    wrapper.appendChild(loadingIndicator);

    let iframe = iframeCache[urlEntry.id];
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframeCache[urlEntry.id] = iframe;
    }
    iframe.style.visibility = 'hidden';

    const loadTimeout = setTimeout(() => {
        handleLoadFailure(wrapper, urlEntry, "timed out");
    }, IFRAME_LOAD_TIMEOUT);

    iframe.onload = () => {
        clearTimeout(loadTimeout);
        if (wrapper.contains(loadingIndicator)) {
            wrapper.removeChild(loadingIndicator);
        }
        iframe.style.visibility = 'visible';
    };

    iframe.onerror = () => {
        clearTimeout(loadTimeout);
        handleLoadFailure(wrapper, urlEntry, "could not be loaded");
    };

    const bottomControlsContainer = document.createElement('div');
    bottomControlsContainer.className = 'iframe-controls-container';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'selective-send-button';
    sendBtn.title = 'Send prompt to this panel';
    sendBtn.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
    sendBtn.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        const promptText = promptInput.value.trim();
        if (promptText && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ action: 'injectPrompt', prompt: promptText }, '*');
            try {
                const hostname = new URL(urlEntry.url).hostname;
                showGlobalConfirmationMessage(`Prompt sent to ${hostname}`);
            } catch (e) {
                showGlobalConfirmationMessage(`Prompt sent.`);
            }
        } else {
            showGlobalConfirmationMessage('Prompt input is empty.');
        }
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'selective-copy-button';
    copyBtn.title = 'Append output to prompt area and copy as Markdown';
    copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
    copyBtn.addEventListener('click', () => handleSelectiveAppendAndCopy(iframe, urlEntry));

    bottomControlsContainer.append(sendBtn, copyBtn);
    wrapper.appendChild(bottomControlsContainer);

    try {
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
    } catch (e) {
        console.log("Could not parse URL to add top controls:", urlEntry.url, e);
    }
    
    wrapper.appendChild(iframe);
    // Setting src starts the loading process.
    iframe.src = urlEntry.url;
}

/**
 * Renders iframe wrappers in the main container and schedules them for loading.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 */
function updateIframes(iframeContainer) {
    const selectedUrlEntries = managedUrls.filter(u => u.selected);
    const selectedIdsSet = new Set(selectedUrlEntries.map(u => u.id));
    const currentWrappers = Array.from(iframeContainer.children);
    const wrappersMap = new Map(currentWrappers.map(wrapper => [wrapper.dataset.id, wrapper]));

    if (selectedUrlEntries.length === 0) {
        iframeContainer.innerHTML = '';
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = managedUrls.length === 0 ?
            'No websites available. Add some in Settings.' :
            'No websites selected. Please select websites to display from Settings.';
        iframeContainer.appendChild(emptyMessage);
        return;
    } else {
        const emptyMessage = iframeContainer.querySelector('.empty-message');
        if (emptyMessage) iframeContainer.removeChild(emptyMessage);
    }

    wrappersMap.forEach((wrapper, id) => {
        if (!selectedIdsSet.has(id)) {
            iframeContainer.removeChild(wrapper);
            delete iframeCache[id];
        }
    });

    let lastPlacedWrapper = null;
    for (const urlEntry of selectedUrlEntries) {
        let wrapper = wrappersMap.get(urlEntry.id);
        let isNew = !wrapper;

        if (isNew) {
            wrapper = document.createElement('div');
            wrapper.className = 'iframe-wrapper';
            wrapper.dataset.id = urlEntry.id;
        }

        const expectedNextSibling = lastPlacedWrapper ? lastPlacedWrapper.nextSibling : iframeContainer.firstChild;
        if (wrapper !== expectedNextSibling) {
            iframeContainer.insertBefore(wrapper, expectedNextSibling);
        }

        if (isNew) {
            // Defer the loading of the iframe to prevent one failing iframe
            // from blocking the entire UI rendering process.
            setTimeout(() => loadIframeAsync(wrapper, urlEntry), 0);
        }
        
        lastPlacedWrapper = wrapper;
    }

    const allManagedIds = new Set(managedUrls.map(u => u.id));
    for (const idInCache in iframeCache) {
        if (!allManagedIds.has(idInCache)) {
            delete iframeCache[idInCache];
        }
    }
}

/**
 * Sends a prompt to all active iframes.
 * @param {string} prompt The prompt text to send.
 */
function sendMessageToIframes(prompt) {
    // Get iframes from the cache, not the DOM, to ensure we message
    // even those that are still in the process of loading.
    const selectedIds = new Set(managedUrls.filter(u => u.selected).map(u => u.id));
    const activeIframes = Object.entries(iframeCache)
        .filter(([id, iframe]) => selectedIds.has(id))
        .map(([id, iframe]) => iframe);

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