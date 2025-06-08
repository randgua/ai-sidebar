let draggedDOMElement = null;
let confirmationMessageElement = null;
let popupNotificationTimeout = null;
// Flag to prevent the settings popup from closing while a modal is active.
let isModalActive = false;

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

    let managedUrls = [];
    // Cache for iframe elements to avoid re-creating them on re-render, improving performance.
    const iframeCache = {};

    const defaultUrls = [
        { id: crypto.randomUUID(), url: "https://aistudio.google.com/", selected: true },
        { id: crypto.randomUUID(), url: "https://gemini.google.com/", selected: false },
        { id: crypto.randomUUID(), url: "https://chatgpt.com/", selected: false },
        { id: crypto.randomUUID(), url: "https://claude.ai/", selected: false },
        { id: crypto.randomUUID(), url: "https://x.ai/", selected: false },
        { id: crypto.randomUUID(), url: "https://www.perplexity.ai/", selected: false },
        { id: crypto.randomUUID(), url: "https://chat.deepseek.com/", selected: false },
        { id: crypto.randomUUID(), url: "https://chat.qwen.ai/", selected: false },
        { id: crypto.randomUUID(), url: "https://www.tongyi.com/qianwen/", selected: false },
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

        if (confirmationMessageElement.timeoutId) {
            clearTimeout(confirmationMessageElement.timeoutId);
        }

        confirmationMessageElement.textContent = message;
        confirmationMessageElement.style.visibility = 'visible';
        confirmationMessageElement.style.opacity = '1';

        confirmationMessageElement.timeoutId = setTimeout(() => {
            confirmationMessageElement.style.opacity = '0';
        }, duration);
    }

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
        if (popupNotificationTimeout) clearTimeout(popupNotificationTimeout);
        popupNotificationTimeout = setTimeout(() => {
            messageElement.style.display = 'none';
            messageElement.textContent = '';
        }, duration);
    }

    function showCustomConfirm(message, onConfirm) {
        isModalActive = true; // Lock the popup from closing
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
                if (document.activeElement === yesButton) {
                    event.preventDefault();
                    handleYes();
                } else if (document.activeElement === noButton) {
                    event.preventDefault();
                    handleNo();
                }
            }
        };

        const cleanup = () => {
            yesButton.removeEventListener('click', handleYes);
            noButton.removeEventListener('click', handleNo);
            window.removeEventListener('keydown', handleEnterKey, true);
            // Use timeout to unlock after the current click event has propagated.
            setTimeout(() => {
                isModalActive = false;
            }, 0);
        };

        yesButton.addEventListener('click', handleYes);
        noButton.addEventListener('click', handleNo);
        window.addEventListener('keydown', handleEnterKey, true);
    }

    function saveUrls() {
        chrome.storage.local.set({ managedUrls: managedUrls });
    }

    function formatAndValidateUrl(input) {
        let urlString = input.trim();
    
        // Convert local file paths (e.g., "C:\Users\file.pdf" or "/home/user/file.html") to a file URL.
        // This regex checks for a drive letter at the start or a leading slash.
        if (/^([a-zA-Z]:\\|\/)/.test(urlString) && !urlString.startsWith('file:///')) {
            urlString = 'file:///' + urlString.replace(/\\/g, '/');
        }
    
        // First, try to parse the URL as is. This will succeed for valid URLs with protocols (http, https, file).
        try {
            new URL(urlString);
            return urlString;
        } catch (error) {
            // If parsing fails, check if it's because of a missing protocol.
            // We test for any protocol-like structure (e.g., "mailto:", "ftp://") to avoid incorrectly prepending "https://".
            if (!/^[a-zA-Z]+:\/\//.test(urlString) && !/^[a-zA-Z]+:/.test(urlString)) {
                const assumedUrl = 'https://' + urlString;
                try {
                    // Retry parsing with "https://" prepended.
                    new URL(assumedUrl);
                    return assumedUrl;
                } catch (assumeError) {
                    // If it still fails, the input is considered invalid.
                    return null;
                }
            }
            // If the input had a protocol-like structure but still failed to parse, it's invalid.
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

                // Update the key in the iframe cache if it exists.
                if (iframeCache[oldUrlKeyInCache]) {
                    const cachedIframe = iframeCache[oldUrlKeyInCache];
                    delete iframeCache[oldUrlKeyInCache];
                    iframeCache[formattedUrl] = cachedIframe;
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
            openButton.addEventListener('click', () => {
                chrome.tabs.create({ url: urlEntry.url });
            });

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
                    renderUrlList();
                    updateIframes();
                    showPopupMessage('URL removed.');
                });
            });

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(urlInput);
            itemDiv.appendChild(openButton);
            itemDiv.appendChild(removeButton);
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

                // OPTIMIZATION: Move the DOM element directly instead of re-rendering the whole list.
                const parent = urlListManagementDiv;
                if (isAfter) {
                    parent.insertBefore(draggedDOMElement, itemDiv.nextSibling);
                } else {
                    parent.insertBefore(draggedDOMElement, itemDiv);
                }

                updateIframes();
                showPopupMessage('List order updated successfully.');
            });
        });
    }

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
            Object.values(iframeCache).forEach(iframe => {
                if (iframe && iframe.style) iframe.style.display = 'none';
            });
            return;
        }

        const newDesiredIframeElements = [];
        selectedUrlEntries.forEach(urlEntry => {
            let iframe = iframeCache[urlEntry.url];
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.src = urlEntry.url;
                iframe.style.flexGrow = '1'; iframe.style.flexBasis = '0'; iframe.style.minWidth = '0';
                iframe.style.border = 'none'; iframe.style.height = '100%';
                iframeCache[urlEntry.url] = iframe;
            } else {
                if (iframe.src !== urlEntry.url) {
                    iframe.src = urlEntry.url;
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
            // Re-append the desired iframes in the correct sequence.
            // Appending an existing DOM element moves it, which is efficient and avoids reloading the iframe.
            newDesiredIframeElements.forEach(iframe => {
                iframeContainer.appendChild(iframe);
            });
        }

        Object.keys(iframeCache).forEach(urlInCache => {
            const isSelected = selectedUrlEntries.some(entry => entry.url === urlInCache);
            if (!isSelected) {
                const iframeToHide = iframeCache[urlInCache];
                if (iframeToHide && iframeToHide.style.display !== 'none') {
                    iframeToHide.style.display = 'none';
                }
            }
        });

        const currentManagedUrlsSet = new Set(managedUrls.map(u => u.url));
        for (const urlInCache in iframeCache) {
            if (!currentManagedUrlsSet.has(urlInCache)) {
                delete iframeCache[urlInCache];
            }
        }
    }

    function loadUrls() {
        chrome.storage.local.get(['managedUrls'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading managed URLs:', chrome.runtime.lastError.message);
                managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || crypto.randomUUID() }));
            } else if (result.managedUrls && Array.isArray(result.managedUrls) && result.managedUrls.length > 0) {
                managedUrls = result.managedUrls.map(url => ({ ...url, id: url.id || crypto.randomUUID() }));
            } else {
                managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || crypto.randomUUID() }));
            }
            saveUrls();
            renderUrlList();
            updateIframes();
        });
    }

    function syncUrlListCheckboxes() {
        const urlItems = urlListManagementDiv.querySelectorAll('.url-item');
        urlItems.forEach(item => {
            const urlId = item.dataset.id;
            const urlEntry = managedUrls.find(u => u.id.toString() === urlId);
            if (urlEntry) {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked !== urlEntry.selected) {
                    checkbox.checked = urlEntry.selected;
                }
            }
        });
    }

    addUrlButton.addEventListener('click', () => {
        const newUrlValue = newUrlInput.value.trim();
        if (newUrlValue) {
            const formattedUrl = formatAndValidateUrl(newUrlValue);
            if (!formattedUrl) {
                showPopupMessage('Please enter a valid URL or local file path.');
                return;
            }
            if (managedUrls.some(entry => entry.url === formattedUrl)) {
                showPopupMessage('This URL already exists in the list.');
                return;
            }
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
                if (iframe) {
                    iframe.src = iframe.src;
                    refreshedCount++;
                }
            }
        });
        showGlobalConfirmationMessage(refreshedCount > 0 ? `Refreshed ${refreshedCount} panel(s).` : 'No active panels to refresh.');
        setTimeout(() => refreshIcon.classList.remove('clicked'), 200);
    });

    if (invertSelectionButton) invertSelectionButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage('No URLs available in the list to invert selection.'); return; }
        managedUrls.forEach(urlEntry => urlEntry.selected = !urlEntry.selected);
        saveUrls();
        syncUrlListCheckboxes();
        updateIframes();
        showPopupMessage('Selection inverted.');
    });

    if (selectAllButton) selectAllButton.addEventListener('click', () => {
        if (managedUrls.length === 0) { showPopupMessage('No URLs available in the list to select.'); return; }
        let newlySelectedCount = 0;
        managedUrls.forEach(urlEntry => { if (!urlEntry.selected) { urlEntry.selected = true; newlySelectedCount++; } });
        if (newlySelectedCount > 0) {
            saveUrls();
            syncUrlListCheckboxes();
            updateIframes();
            showPopupMessage('All URLs selected.');
        } else {
            showPopupMessage('All URLs were already selected; no changes made.');
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
            showPopupMessage('No URLs were selected to clear; no changes made.');
        }
    });

    settingsContainer.addEventListener('mouseenter', () => {
        settingsPopup.classList.add('show');
    });

    settingsContainer.addEventListener('mouseleave', () => {
        if (!isModalActive) {
            settingsPopup.classList.remove('show');
        }
    });

    loadUrls();
});