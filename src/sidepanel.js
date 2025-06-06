// Tracks the DOM element currently being dragged
let draggedDOMElement = null;
// Stores the DOM element for the global confirmation message
let confirmationMessageElement = null;
// Timeout ID for the popup notification
let popupNotificationTimeout = null;

document.addEventListener('DOMContentLoaded', function () {
    const iframeContainer = document.getElementById('iframe-container');
    const refreshIcon = document.getElementById('refresh-icon');
    const urlListManagementDiv = document.getElementById('url-list-management');
    const newUrlInput = document.getElementById('new-url-input');
    const addUrlButton = document.getElementById('add-url-button');
    const settingsPopup = document.getElementById('settings-popup');
    const clearSelectionButton = document.getElementById('clear-selection-button');
    const invertSelectionButton = document.getElementById('invert-selection-button');
    const selectAllButton = document.getElementById('select-all-button');

    // Stores URL objects: { id: number, url: string, selected: boolean }
    let managedUrls = [];
    // Caches iframe DOM elements, keyed by URL string, for performance.
    const iframeCache = {};

    const defaultUrls = [
        { id: Date.now() + 1, url: "https://aistudio.google.com/", selected: true },
        { id: Date.now() + 2, url: "https://gemini.google.com/", selected: false },
        { id: Date.now() + 3, url: "https://chatgpt.com/", selected: false },
        { id: Date.now() + 4, url: "https://claude.ai/", selected: false },
        { id: Date.now() + 5, url: "https://x.ai/", selected: false },
        { id: Date.now() + 6, url: "https://www.perplexity.ai/", selected: false },
        { id: Date.now() + 7, url: "https://chat.deepseek.com/", selected: false },
        { id: Date.now() + 8, url: "https://chat.qwen.ai/", selected: false },
        { id: Date.now() + 9, url: "https://www.tongyi.com/qianwen/", selected: false },
        { id: Date.now() + 10, url: "https://chatglm.cn/", selected: false },
        { id: Date.now() + 11, url: "https://www.doubao.com/chat/", selected: false },
        { id: Date.now() + 12, url: "https://www.wenxiaobai.com", selected: false }
    ];

    // Displays a temporary global confirmation message at the bottom center of the screen.
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
            confirmationMessageElement.style.zIndex = '2000'; // Ensure it's above most content.
            confirmationMessageElement.style.opacity = '0';
            confirmationMessageElement.style.transition = 'opacity 0.3s ease-in-out';
            document.body.appendChild(confirmationMessageElement);
        }
        confirmationMessageElement.textContent = message;
        confirmationMessageElement.style.opacity = '1';
        setTimeout(() => {
            confirmationMessageElement.style.opacity = '0';
        }, duration);
    }

    // Displays a temporary message at the bottom of the settings popup.
    function showPopupMessage(messageText, duration = 3000) {
        if (!settingsPopup) {
            console.error('Settings popup element not found.');
            return;
        }
        let messageElement = settingsPopup.querySelector('.popup-message-area');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.className = 'popup-message-area';
            // Basic styling for the message area.
            messageElement.style.padding = '10px';
            messageElement.style.marginTop = '10px';
            messageElement.style.backgroundColor = '#e9f5fe';
            messageElement.style.color = '#0d6efd';
            messageElement.style.border = '1px solid #b6d4fe';
            messageElement.style.borderRadius = '4px';
            messageElement.style.textAlign = 'center';
            messageElement.style.fontSize = '13px';
            messageElement.style.display = 'none'; // Initially hidden.
            settingsPopup.appendChild(messageElement);
        }
        messageElement.textContent = messageText;
        messageElement.style.display = 'block';
        if (popupNotificationTimeout) clearTimeout(popupNotificationTimeout); // Clear existing timeout.
        popupNotificationTimeout = setTimeout(() => {
            messageElement.style.display = 'none';
            messageElement.textContent = '';
        }, duration);
    }

    // Saves the current list of managed URLs to local storage.
    function saveUrls() {
        chrome.storage.local.set({ managedUrls: managedUrls });
    }

    // Renders the list of manageable URLs in the settings popup.
    function renderUrlList() {
        urlListManagementDiv.innerHTML = ''; // Clear existing list items before re-rendering.

        managedUrls.forEach(urlEntry => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'url-item';
            itemDiv.setAttribute('draggable', true);
            itemDiv.dataset.id = urlEntry.id.toString();

            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '☰'; // Unicode character U+2630 (TRIGRAM FOR HEAVEN) used as drag handle.
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

            urlInput.addEventListener('focus', () => {
                originalUrlOnFocus = urlInput.value;
                itemDiv.draggable = false; // Disable dragging on the item when its URL input is focused.
            });

            urlInput.addEventListener('blur', () => {
                const newUrlValue = urlInput.value.trim();
                itemDiv.draggable = true; // Re-enable dragging when input loses focus.

                if (newUrlValue === originalUrlOnFocus) return;

                if (!newUrlValue.startsWith('http://') && !newUrlValue.startsWith('https://')) {
                    showPopupMessage('Invalid URL. Must start with http:// or https://');
                    urlInput.value = originalUrlOnFocus;
                    return;
                }
                if (managedUrls.some(u => u.url === newUrlValue && u.id !== urlEntry.id)) {
                    showPopupMessage('This URL already exists in the list.');
                    urlInput.value = originalUrlOnFocus;
                    return;
                }

                const oldUrlKeyInCache = urlEntry.url; // Store the old URL to update the iframe cache key.
                urlEntry.url = newUrlValue;

                if (iframeCache[oldUrlKeyInCache]) {
                    const cachedIframe = iframeCache[oldUrlKeyInCache];
                    delete iframeCache[oldUrlKeyInCache];
                    iframeCache[newUrlValue] = cachedIframe;

                    // If this iframe is selected, its src must be updated to the new URL.
                    // This will cause this specific iframe to reload.
                    if (urlEntry.selected && cachedIframe.src !== newUrlValue) {
                        cachedIframe.src = newUrlValue;
                    }
                }
                saveUrls();
                showPopupMessage('URL updated successfully!');
                renderUrlList();
                updateIframes();
            });

            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                else if (e.key === 'Escape') { e.preventDefault(); urlInput.value = originalUrlOnFocus; e.target.blur(); }
            });

            const openButton = document.createElement('button');
            openButton.textContent = 'Open';
            openButton.className = 'open-url-button';
            openButton.addEventListener('click', () => {
                if (chrome && chrome.tabs && chrome.tabs.create) {
                    chrome.tabs.create({ url: urlEntry.url });
                } else {
                    window.open(urlEntry.url, '_blank'); // Fallback for environments without chrome.tabs.
                }
            });

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Delete';
            removeButton.className = 'remove-url-button';
            removeButton.addEventListener('click', () => {
                if (window.confirm(`Are you sure you want to delete this URL: ${urlEntry.url}?`)) {
                    // Remove from iframe cache and DOM if it exists.
                    if (iframeCache[urlEntry.url]) {
                        if (iframeCache[urlEntry.url].parentNode) {
                            iframeContainer.removeChild(iframeCache[urlEntry.url]);
                        }
                        delete iframeCache[urlEntry.url];
                    }
                    const wasSelected = urlEntry.selected;
                    managedUrls = managedUrls.filter(u => u.id.toString() !== urlEntry.id.toString());
                    // If the deleted URL was selected and no other URL is selected, select the first URL.
                    if (managedUrls.length > 0 && wasSelected && !managedUrls.some(u => u.selected)) {
                        managedUrls[0].selected = true;
                    }
                    saveUrls();
                    renderUrlList();
                    updateIframes();
                    showPopupMessage('URL removed.');
                }
            });

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(urlInput);
            itemDiv.appendChild(openButton);
            itemDiv.appendChild(removeButton);
            urlListManagementDiv.appendChild(itemDiv);

            // Drag and drop event listeners for reordering.
            itemDiv.addEventListener('dragstart', (e) => {
                // If iframes are visible, make them non-interactive during drag for better UX.
                if (managedUrls.some(u => u.selected)) {
                    iframeContainer.style.pointerEvents = 'none';
                    iframeContainer.style.opacity = '0.7';
                }
                draggedDOMElement = itemDiv;
                e.dataTransfer.setData('text/plain', itemDiv.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
                // Briefly set opacity for visual feedback of drag start.
                setTimeout(() => { if (draggedDOMElement) draggedDOMElement.style.opacity = '0.5'; }, 0);
            });
            itemDiv.addEventListener('dragend', () => {
                iframeContainer.style.pointerEvents = 'auto'; // Restore iframe interactivity.
                iframeContainer.style.opacity = '1';
                if (draggedDOMElement) draggedDOMElement.style.opacity = '1'; // Reset opacity.
                else itemDiv.style.opacity = '1'; // Fallback if draggedDOMElement is null.
                draggedDOMElement = null;
                document.querySelectorAll('.url-item.drag-over').forEach(el => el.classList.remove('drag-over'));
            });
            itemDiv.addEventListener('dragover', (e) => {
                if (!draggedDOMElement || draggedDOMElement === itemDiv) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                document.querySelectorAll('.url-item.drag-over').forEach(el => el.classList.remove('drag-over')); // Clear previous drag-over states.
                itemDiv.classList.add('drag-over'); // Highlight the potential drop target.
            });
            itemDiv.addEventListener('dragleave', () => itemDiv.classList.remove('drag-over'));
            itemDiv.addEventListener('drop', (e) => {
                if (!draggedDOMElement || draggedDOMElement === itemDiv) return;
                e.preventDefault();
                itemDiv.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = itemDiv.dataset.id;

                const draggedItemIndex = managedUrls.findIndex(u => u.id.toString() === draggedId);
                if (draggedItemIndex === -1) return; // Should not happen if IDs are consistent.

                const [draggedUrlEntry] = managedUrls.splice(draggedItemIndex, 1);

                let targetItemIndex = managedUrls.findIndex(u => u.id.toString() === targetId);
                if (targetItemIndex === -1) { // Should not happen, put item back if target not found.
                    managedUrls.splice(draggedItemIndex, 0, draggedUrlEntry);
                    return;
                }

                // Determine if dropping before or after the target item.
                const rect = itemDiv.getBoundingClientRect();
                const isAfter = e.clientY > rect.top + rect.height / 2;
                managedUrls.splice(isAfter ? targetItemIndex + 1 : targetItemIndex, 0, draggedUrlEntry);

                saveUrls();
                renderUrlList();
                updateIframes();
                showPopupMessage('List order updated successfully.');
            });
        });
    }

    // Updates iframe visibility and content based on selections and order.
    // Aims to re-order existing iframe DOM elements without reloading their content if src hasn't changed.
    function updateIframes() {
        const selectedUrlEntries = managedUrls.filter(u => u.selected);

        const existingEmptyMessage = iframeContainer.querySelector('.empty-message');
        if (existingEmptyMessage) iframeContainer.removeChild(existingEmptyMessage);

        if (selectedUrlEntries.length === 0) {
            iframeContainer.innerHTML = '';
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = managedUrls.length === 0 ?
                'No websites available. Add some in Settings, or reload to load the default list.' :
                'No websites selected. Please select websites to display from Settings.';
            iframeContainer.appendChild(emptyMessage);
            // Ensure all cached iframes are hidden if no URLs are selected.
            Object.values(iframeCache).forEach(iframe => {
                if (iframe && iframe.style) iframe.style.display = 'none';
            });
            return;
        }

        // Build the list of iframe DOM elements that should be currently displayed, in the correct order.
        const newDesiredIframeElements = [];
        selectedUrlEntries.forEach(urlEntry => {
            let iframe = iframeCache[urlEntry.url];
            if (!iframe) { // If iframe not in cache, create it.
                iframe = document.createElement('iframe');
                iframe.src = urlEntry.url; // Setting src loads the content.
                iframe.style.flexGrow = '1'; iframe.style.flexBasis = '0'; iframe.style.minWidth = '0';
                iframe.style.border = 'none'; iframe.style.height = '100%';
                iframeCache[urlEntry.url] = iframe;
            } else {
                // If the URL for this entry was edited, the iframe.src might be different from urlEntry.url.
                // The blur handler for urlInput should have already updated iframe.src if necessary.
                // This check ensures src is correct as a safeguard.
                if (iframe.src !== urlEntry.url) {
                    iframe.src = urlEntry.url; // This will trigger a reload for this specific iframe if src changed.
                }
            }
            iframe.style.display = 'block';
            newDesiredIframeElements.push(iframe);
        });

        const currentDomIframes = Array.from(iframeContainer.children).filter(el => el.tagName === 'IFRAME');

        currentDomIframes.forEach(domIframe => {
            if (!newDesiredIframeElements.includes(domIframe)) {
                iframeContainer.removeChild(domIframe);
            }
        });

        // Add/Reorder iframes in the container to match newDesiredIframeElements.
        // Appending an existing child moves it. This loop ensures correct order.
        // We check if the current DOM order already matches the desired order.
        let domOrderMatchesDesired = true;
        if (iframeContainer.children.length !== newDesiredIframeElements.length) {
            domOrderMatchesDesired = false;
        } else {
            for (let i = 0; i < newDesiredIframeElements.length; i++) {
                if (iframeContainer.children[i] !== newDesiredIframeElements[i]) {
                    domOrderMatchesDesired = false;
                    break;
                }
            }
        }

        if (!domOrderMatchesDesired) {
            // If order is not correct, re-append all desired iframes in the correct order.
            // Appending an existing child to the same parent moves it without reloading (if src is same).
            newDesiredIframeElements.forEach(iframe => {
                iframeContainer.appendChild(iframe);
            });
        }

        // Hide iframes in cache that are not selected (their elements might still be in cache but not in DOM).
        Object.keys(iframeCache).forEach(urlInCache => {
            const isSelected = selectedUrlEntries.some(entry => entry.url === urlInCache);
            if (!isSelected) {
                const iframeToHide = iframeCache[urlInCache];
                if (iframeToHide && iframeToHide.style.display !== 'none') {
                    iframeToHide.style.display = 'none';
                }
            }
        });

        // Clean up iframeCache for URLs no longer in managedUrls (e.g., deleted URLs).
        const currentManagedUrlsSet = new Set(managedUrls.map(u => u.url));
        for (const urlInCache in iframeCache) {
            if (!currentManagedUrlsSet.has(urlInCache)) {
                // The iframe should have already been removed from DOM if it was displayed and then deleted.
                // This just cleans the cache entry.
                delete iframeCache[urlInCache];
            }
        }
    }

    // Loads URLs from storage or uses defaults on initial load.
    function loadUrls() {
        chrome.storage.local.get(['managedUrls'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading managed URLs:', chrome.runtime.lastError.message);
                // Fallback to default URLs if loading fails
                managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || Date.now() + Math.random() }));
            } else if (result.managedUrls && Array.isArray(result.managedUrls) && result.managedUrls.length > 0) {
                // Ensure each URL has an ID, generating one if missing (for backward compatibility or manual edits)
                managedUrls = result.managedUrls.map(url => ({ ...url, id: url.id || Date.now() + Math.random() }));
            } else {
                // If no URLs in storage or the list is empty, initialize with defaults.
                managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || Date.now() + Math.random() }));
            }
            saveUrls(); // Save (potentially defaults or augmented existing) URLs back to storage.
            renderUrlList();
            updateIframes();
        });
    }

    addUrlButton.addEventListener('click', () => {
        const newUrlValue = newUrlInput.value.trim();
        if (newUrlValue) {
            if (!newUrlValue.startsWith('http://') && !newUrlValue.startsWith('https://')) {
                showPopupMessage('Please enter a valid URL (e.g., https://example.com)'); return;
            }
            if (managedUrls.some(entry => entry.url === newUrlValue)) {
                showPopupMessage('This URL already exists in the list.'); return;
            }
            managedUrls.push({ id: Date.now() + Math.random(), url: newUrlValue, selected: false });
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
                if (iframe) {
                    try {
                        // Force reload by briefly setting src to 'about:blank' then back to original.
                        const originalSrc = iframe.src;
                        iframe.src = 'about:blank';
                        setTimeout(() => { iframe.src = originalSrc; }, 50);
                        refreshedCount++;
                    }
                    catch (e) {
                        // Fallback reload method if the about:blank trick fails (e.g., due to security policies).
                        iframe.src = iframe.src;
                        refreshedCount++;
                    }
                }
            }
        });
        showGlobalConfirmationMessage(refreshedCount > 0 ? `Refreshed ${refreshedCount} panel(s).` : 'No active panels to refresh.');
        setTimeout(() => refreshIcon.classList.remove('clicked'), 200);
    });

    if (invertSelectionButton) invertSelectionButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage('No URLs available in the list to invert selection.'); return; }
        managedUrls.forEach(urlEntry => urlEntry.selected = !urlEntry.selected);
        saveUrls(); renderUrlList(); updateIframes(); showPopupMessage('Selection inverted.');
    });
    if (selectAllButton) selectAllButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage('No URLs available in the list to select.'); return; }
        let newlySelectedCount = 0;
        managedUrls.forEach(urlEntry => { if (!urlEntry.selected) { urlEntry.selected = true; newlySelectedCount++; } });
        if (newlySelectedCount > 0) {
            saveUrls(); renderUrlList(); updateIframes(); showPopupMessage('All URLs selected.');
        } else {
            showPopupMessage('All URLs were already selected; no changes made.');
        }
    });
    if (clearSelectionButton) clearSelectionButton.addEventListener('click', () => {
        let deselectedCount = 0;
        managedUrls.forEach(urlEntry => { if (urlEntry.selected) { urlEntry.selected = false; deselectedCount++; } });
        if (deselectedCount > 0) {
            saveUrls(); renderUrlList(); updateIframes(); showPopupMessage('All selections cleared.');
        } else {
            showPopupMessage('No URLs were selected to clear; no changes made.');
        }
    });

    loadUrls();
});