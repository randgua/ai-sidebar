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
    // Caches iframe DOM elements, keyed by URL string
    const iframeCache = {};

    const defaultUrls = [
        { id: Date.now() + 1, url: "https://aistudio.google.com/", selected: true },
        { id: Date.now() + 2, url: "https://gemini.google.com/", selected: false },
        { id: Date.now() + 3, url: "https://chatgpt.com/", selected: false },
        { id: Date.now() + 4, url: "https://claude.ai/", selected: false },
        { id: Date.now() + 5, url: "https://x.ai/", selected: false },
        { id: Date.now() + 6, url: "https://chat.deepseek.com/", selected: false },
        { id: Date.now() + 7, url: "https://chat.qwen.ai/", selected: false },
        { id: Date.now() + 8, url: "https://www.tongyi.com/qianwen/", selected: false },
        { id: Date.now() + 9, url: "https://chatglm.cn/", selected: false },
        { id: Date.now() + 10, url: "https://www.doubao.com/chat/", selected: false },
        { id: Date.now() + 11, url: "https://www.wenxiaobai.com", selected: false }
    ];

    // Displays a temporary global confirmation message.
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
            messageElement.style.padding = '10px';
            messageElement.style.marginTop = '10px';
            messageElement.style.backgroundColor = '#e9f5fe';
            messageElement.style.color = '#0d6efd';
            messageElement.style.border = '1px solid #b6d4fe';
            messageElement.style.borderRadius = '4px';
            messageElement.style.textAlign = 'center';
            messageElement.style.fontSize = '13px';
            messageElement.style.display = 'none';
            settingsPopup.appendChild(messageElement);
        }

        messageElement.textContent = messageText;
        messageElement.style.display = 'block';

        if (popupNotificationTimeout) {
            clearTimeout(popupNotificationTimeout);
        }

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
        urlListManagementDiv.innerHTML = ''; // Clear existing list items.

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

            urlInput.addEventListener('focus', () => {
                originalUrlOnFocus = urlInput.value;
                itemDiv.draggable = false; // Disable dragging on the parent item when input is focused
            });

            urlInput.addEventListener('blur', () => {
                const newUrlValue = urlInput.value.trim();

                if (newUrlValue === originalUrlOnFocus) {
                    itemDiv.draggable = true; // Re-enable dragging.
                    return;
                }

                if (!newUrlValue.startsWith('http://') && !newUrlValue.startsWith('https://')) {
                    showPopupMessage('Invalid URL. Must start with http:// or https://');
                    urlInput.value = originalUrlOnFocus;
                    itemDiv.draggable = true; // Re-enable dragging.
                    return;
                }
                if (managedUrls.some(u => u.url === newUrlValue && u.id !== urlEntry.id)) {
                    showPopupMessage('This URL already exists in the list.');
                    urlInput.value = originalUrlOnFocus;
                    itemDiv.draggable = true; // Re-enable dragging.
                    return;
                }

                const oldUrlForCache = urlEntry.url;
                urlEntry.url = newUrlValue;

                if (iframeCache[oldUrlForCache]) {
                    iframeCache[newUrlValue] = iframeCache[oldUrlForCache];
                    delete iframeCache[oldUrlForCache];
                    if (iframeCache[newUrlValue].src !== newUrlValue && urlEntry.selected) {
                       iframeCache[newUrlValue].src = newUrlValue;
                    }
                }

                saveUrls();
                showPopupMessage('URL updated successfully!');
                renderUrlList();
                updateIframes();
            });

            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default form submission or line break.
                    e.target.blur();    // Trigger blur to save.
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    urlInput.value = originalUrlOnFocus; // Revert to original value.
                    e.target.blur();
                }
            });

            const openButton = document.createElement('button');
            openButton.textContent = 'Open';
            openButton.className = 'open-url-button';
            openButton.addEventListener('click', () => {
                if (chrome && chrome.tabs && chrome.tabs.create) {
                    chrome.tabs.create({ url: urlEntry.url });
                } else {
                    window.open(urlEntry.url, '_blank'); // Fallback for environments where chrome.tabs is not available.
                }
            });

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Delete';
            removeButton.className = 'remove-url-button';
            removeButton.addEventListener('click', () => {
                if (window.confirm(`Are you sure you want to delete this URL: ${urlEntry.url}?`)) {
                    if (iframeCache[urlEntry.url]) {
                        if (iframeCache[urlEntry.url].parentNode) {
                            iframeContainer.removeChild(iframeCache[urlEntry.url]);
                        }
                        delete iframeCache[urlEntry.url];
                    }
                    const wasSelected = urlEntry.selected;
                    managedUrls = managedUrls.filter(u => u.id.toString() !== urlEntry.id.toString());

                    if (managedUrls.length > 0 && wasSelected && !managedUrls.some(u => u.selected)) {
                        managedUrls[0].selected = true; // Select the first URL if the deleted one was selected and no others are.
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

            // Drag and drop event listeners for reordering
            itemDiv.addEventListener('dragstart', (e) => {
                // Disable pointer events on the iframe container to prevent interference
                // Only do this if there's a chance iframes are visible (i.e., some URL is selected)
                if (managedUrls.some(u => u.selected)) {
                    iframeContainer.style.pointerEvents = 'none';
                    iframeContainer.style.opacity = '0.7'; // Optional: visual cue of disabled state
                }

                draggedDOMElement = itemDiv;
                e.dataTransfer.setData('text/plain', itemDiv.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
                // Use setTimeout to allow the browser to render the drag image before changing opacity.
                setTimeout(() => {
                    if (draggedDOMElement) draggedDOMElement.style.opacity = '0.5';
                }, 0);
            });

            itemDiv.addEventListener('dragend', () => {
                // Always restore pointer events and opacity for the iframe container
                iframeContainer.style.pointerEvents = 'auto';
                iframeContainer.style.opacity = '1';

                // Restore opacity of the dragged item itself
                if (draggedDOMElement) { // Check if draggedDOMElement is the itemDiv or another element
                    draggedDOMElement.style.opacity = '1';
                } else { // Fallback if draggedDOMElement was cleared or not set to itemDiv
                    itemDiv.style.opacity = '1';
                }


                draggedDOMElement = null; // Clear the global reference

                document.querySelectorAll('.url-item.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            itemDiv.addEventListener('dragover', (e) => {
                if (!draggedDOMElement || draggedDOMElement === itemDiv) {
                    return; // Don't allow dropping on itself or if nothing is dragged.
                }
                e.preventDefault(); // Necessary to allow dropping.
                e.dataTransfer.dropEffect = 'move';
                document.querySelectorAll('.url-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                itemDiv.classList.add('drag-over');
            });

            itemDiv.addEventListener('dragleave', () => {
                itemDiv.classList.remove('drag-over');
            });

            itemDiv.addEventListener('drop', (e) => {
                if (!draggedDOMElement || draggedDOMElement === itemDiv) {
                    return; // Prevent dropping on itself or if no drag operation.
                }
                e.preventDefault();
                itemDiv.classList.remove('drag-over');

                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = itemDiv.dataset.id;

                let draggedItemIndex = managedUrls.findIndex(u => u.id.toString() === draggedId);
                if (draggedItemIndex === -1) { // Item not found
                    console.error("Dragged item not found in managedUrls:", draggedId);
                    renderUrlList(); // Refresh UI to be safe
                    updateIframes(); // Sync iframes
                    return;
                }

                const [draggedUrlEntry] = managedUrls.splice(draggedItemIndex, 1);
                let targetItemIndex = managedUrls.findIndex(u => u.id.toString() === targetId);

                if (targetItemIndex === -1) { // Target not found
                    console.error("Target item not found in managedUrls:", targetId);
                    // Put the dragged item back where it was to maintain data integrity
                    managedUrls.splice(draggedItemIndex, 0, draggedUrlEntry);
                    renderUrlList();
                    updateIframes();
                    return;
                }

                const rect = itemDiv.getBoundingClientRect();
                const isAfter = e.clientY > rect.top + rect.height / 2;

                if (isAfter) {
                    managedUrls.splice(targetItemIndex + 1, 0, draggedUrlEntry);
                } else {
                    managedUrls.splice(targetItemIndex, 0, draggedUrlEntry);
                }

                saveUrls();
                renderUrlList(); // Update the settings panel list
                updateIframes(); // Update the actual iframes based on new order and selections
                showPopupMessage('List reordered successfully.');
            });
        });
    }

    // Updates iframe visibility and content based on selections and order.
    function updateIframes() {
        const selectedUrlEntries = managedUrls.filter(u => u.selected);

        const existingEmptyMessage = iframeContainer.querySelector('.empty-message');
        if (existingEmptyMessage) {
            iframeContainer.removeChild(existingEmptyMessage);
        }

        if (selectedUrlEntries.length === 0) {
            iframeContainer.innerHTML = ''; // Clear any existing iframes.
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = managedUrls.length === 0 ?
                'No websites available. Add some in Settings or reload for defaults.' :
                'No websites selected. Please select from Settings.';
            iframeContainer.appendChild(emptyMessage);

            // Hide all cached iframes
            Object.values(iframeCache).forEach(iframe => {
                if (iframe && iframe.style) iframe.style.display = 'none';
            });
            return;
        }

        const iframesToDisplayOrdered = [];
        selectedUrlEntries.forEach(urlEntry => {
            let iframe = iframeCache[urlEntry.url];
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.src = urlEntry.url;
                iframe.style.flexGrow = '1';
                iframe.style.flexBasis = '0';
                iframe.style.minWidth = '0';
                iframe.style.border = 'none';
                iframe.style.height = '100%';
                iframeCache[urlEntry.url] = iframe;
            } else if (iframe.src !== urlEntry.url) {
                iframe.src = urlEntry.url; // Update src if URL of cached iframe changed
            }
            iframe.style.display = 'block'; // Ensure it's visible
            iframesToDisplayOrdered.push(iframe);
        });

        // Hide iframes that are in cache but no longer selected
        Object.keys(iframeCache).forEach(urlInCache => {
            const isSelected = selectedUrlEntries.some(entry => entry.url === urlInCache);
            if (!isSelected) {
                const iframeToHide = iframeCache[urlInCache];
                if (iframeToHide) {
                    iframeToHide.style.display = 'none';
                }
            }
        });

        // Re-populate the iframe container in the correct order
        iframeContainer.innerHTML = ''; // Clear previous content.
        iframesToDisplayOrdered.forEach(iframe => {
            iframeContainer.appendChild(iframe);
        });

        // Clean up iframeCache for URLs no longer in managedUrls
        const currentManagedUrlsSet = new Set(managedUrls.map(u => u.url));
        for (const urlInCache in iframeCache) {
            if (!currentManagedUrlsSet.has(urlInCache)) {
                delete iframeCache[urlInCache];
            }
        }
    }

    // Loads URLs from storage or uses defaults on initial load.
    function loadUrls() {
        chrome.storage.local.get(['managedUrls'], function(result) {
            if (result.managedUrls && Array.isArray(result.managedUrls) && result.managedUrls.length > 0) {
                managedUrls = result.managedUrls.map(url => ({
                    ...url,
                    id: url.id || Date.now() + Math.random() // Ensure unique ID for backward compatibility
                }));
            } else {
                managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || Date.now() + Math.random() }));
            }
            saveUrls(); // Save to ensure IDs are stored if newly generated
            renderUrlList();
            updateIframes();
        });
    }

    addUrlButton.addEventListener('click', () => {
        const newUrlValue = newUrlInput.value.trim();
        if (newUrlValue) {
            if (!newUrlValue.startsWith('http://') && !newUrlValue.startsWith('https://')) {
                showPopupMessage('Please enter a valid URL (e.g., https://example.com)');
                return;
            }
            if (managedUrls.some(entry => entry.url === newUrlValue)) {
                showPopupMessage('This URL already exists in the list.');
                return;
            }
            managedUrls.push({ id: Date.now() + Math.random(), url: newUrlValue, selected: false });
            saveUrls();
            renderUrlList();
            updateIframes();
            newUrlInput.value = '';
            showPopupMessage('URL added successfully!');
        }
    });

    newUrlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addUrlButton.click(); // Trigger click on Enter key.
        }
    });

    refreshIcon.addEventListener('click', function () {
        refreshIcon.classList.add('clicked'); // Visual feedback for click.

        let refreshedCount = 0;
        managedUrls.forEach(urlEntry => {
            if (urlEntry.selected) { // Only refresh selected iframes.
                const iframe = iframeCache[urlEntry.url];
                if (iframe) {
                    try {
                        const originalSrc = iframe.src;
                        iframe.src = 'about:blank'; // Force reload by changing src temporarily
                        setTimeout(() => { iframe.src = originalSrc; }, 50);
                        refreshedCount++;
                    } catch (e) {
                        // Fallback reload attempt if the above fails (e.g., due to security restrictions)
                        iframe.src = iframe.src;
                    }
                }
            }
        });

        if (refreshedCount > 0) {
            showGlobalConfirmationMessage(`Refreshed ${refreshedCount} panel(s).`);
        } else {
            showGlobalConfirmationMessage('No active panels to refresh.');
        }

        // Duration of the click visual feedback
        setTimeout(() => {
            refreshIcon.classList.remove('clicked');
        }, 200);
    });

    if (invertSelectionButton) {
        invertSelectionButton.addEventListener('click', () => {
            if (managedUrls.length === 0) {
                showPopupMessage('No URLs available to invert selection.');
                return;
            }
            managedUrls.forEach(urlEntry => {
                urlEntry.selected = !urlEntry.selected;
            });
            saveUrls();
            renderUrlList();
            updateIframes();
            showPopupMessage('Selection inverted.');
        });
    }

    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            if (managedUrls.length === 0) {
                showPopupMessage('No URLs available to select.');
                return;
            }
            let newlySelectedCount = 0;
            managedUrls.forEach(urlEntry => {
                if (!urlEntry.selected) {
                    urlEntry.selected = true;
                    newlySelectedCount++;
                }
            });

            if (newlySelectedCount > 0) {
                saveUrls();
                renderUrlList();
                updateIframes();
                showPopupMessage('All URLs selected.');
            } else {
                showPopupMessage('All URLs were already selected.');
            }
        });
    }

    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', () => {
            let deselectedCount = 0;
            managedUrls.forEach(urlEntry => {
                if (urlEntry.selected) {
                    urlEntry.selected = false;
                    deselectedCount++;
                }
            });

            if (deselectedCount > 0) {
                saveUrls();
                renderUrlList();
                updateIframes();
                showPopupMessage('All selections cleared.');
            } else {
                showPopupMessage('No URLs were selected to clear.');
            }
        });
    }

    loadUrls(); // Initial load of URLs
});