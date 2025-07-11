document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const views = {
        general: document.getElementById('general-view'),
        prompts: document.getElementById('prompts-view')
    };

    // Prompts-specific DOM elements
    const newPromptButton = document.getElementById('new-prompt-button');
    const promptModal = document.getElementById('prompt-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cancelPromptButton = document.getElementById('cancel-button');
    const promptForm = document.getElementById('prompt-form');
    const shownPromptsList = document.getElementById('shown-prompts-list');
    const hiddenPromptsList = document.getElementById('hidden-prompts-list');
    const promptModalTitle = document.getElementById('modal-title');
    const promptIdInput = document.getElementById('prompt-id');
    const promptNameInput = document.getElementById('prompt-name');
    const promptContentInput = document.getElementById('prompt-content');

    // General (URLs) specific DOM elements
    const urlListManagementDiv = document.getElementById('url-list-management');
    const newUrlInput = document.getElementById('new-url-input');
    const addUrlButton = document.getElementById('add-url-button');
    const invertSelectionButton = document.getElementById('invert-selection-button');
    const selectAllButton = document.getElementById('select-all-button');
    const clearSelectionButton = document.getElementById('clear-selection-button');

    // Appearance-specific DOM elements
    const languageSelect = document.getElementById('display-language-select');
    const languageSelectTrigger = languageSelect.querySelector('.custom-select-trigger');
    const languageSearchInput = document.getElementById('language-search-input');
    const languageOptionsList = document.getElementById('language-options-list');

    // --- STATE VARIABLES ---
    let prompts = [];
    let managedUrls = [];
    let draggedItem = null; // Used for both prompts and URLs

    // --- LANGUAGE DATA ---
    // Expanded language list for the display language setting.
    const languages = [
        { code: 'English', name: 'English', native: 'English' },
        { code: 'Chinese(Simplified)', name: 'Chinese (Simplified)', native: '中文 (简体)' },
        { code: 'Chinese(Traditional)', name: 'Chinese (Traditional)', native: '中文 (繁體)' },
        { code: 'Spanish', name: 'Spanish', native: 'Español' },
        { code: 'French', name: 'French', native: 'Français' },
        { code: 'Japanese', name: 'Japanese', native: '日本語' },
        { code: 'German', name: 'German', native: 'Deutsch' },
        { code: 'Portuguese', name: 'Portuguese', native: 'Português' },
        { code: 'Arabic', name: 'Arabic', native: 'العربية' },
        { code: 'Russian', name: 'Russian', native: 'Русский' },
        { code: 'Italian', name: 'Italian', native: 'Italiano' },
        { code: 'Korean', name: 'Korean', native: '한국어' },
        { code: 'Hindi', name: 'Hindi', native: 'हिन्दी' },
        { code: 'Dutch', name: 'Dutch', native: 'Nederlands' },
        { code: 'Polish', name: 'Polish', native: 'Polski' },
        { code: 'Amharic', name: 'Amharic', native: 'አማርኛ' },
        { code: 'Bulgarian', name: 'Bulgarian', native: 'Български' },
        { code: 'Bengali', name: 'Bengali', native: 'বাংলা' },
        { code: 'Catalan', name: 'Catalan', native: 'Català' },
        { code: 'Czech', name: 'Czech', native: 'Čeština' },
        { code: 'Danish', name: 'Danish', native: 'Dansk' },
        { code: 'Greek', name: 'Greek', native: 'Ελληνικά' },
        { code: 'Estonian', name: 'Estonian', native: 'Eesti' },
        { code: 'Persian', name: 'Persian', native: 'فارسی' },
        { code: 'Finnish', name: 'Finnish', native: 'Suomi' },
        { code: 'Filipino', name: 'Filipino', native: 'Tagalog' },
        { code: 'Gujarati', name: 'Gujarati', native: 'ગુજરાતી' },
        { code: 'Hebrew', name: 'Hebrew', native: 'עברית' },
        { code: 'Croatian', name: 'Croatian', native: 'Hrvatski' },
        { code: 'Hungarian', name: 'Hungarian', native: 'Magyar' },
        { code: 'Indonesian', name: 'Indonesian', native: 'Bahasa Indonesia' },
        { code: 'Kannada', name: 'Kannada', native: 'ಕನ್ನಡ' },
        { code: 'Lithuanian', name: 'Lithuanian', native: 'Lietuvių' },
        { code: 'Latvian', name: 'Latvian', native: 'Latviešu' },
        { code: 'Malayalam', name: 'Malayalam', native: 'മലയാളം' },
        { code: 'Marathi', name: 'Marathi', native: 'मराठी' },
        { code: 'Malay', name: 'Malay', native: 'Bahasa Melayu' },
        { code: 'Norwegian', name: 'Norwegian', native: 'Norsk' },
        { code: 'Romanian', name: 'Romanian', native: 'Română' },
        { code: 'Slovak', name: 'Slovak', native: 'Slovenčina' },
        { code: 'Slovenian', name: 'Slovenian', native: 'Slovenščina' },
        { code: 'Serbian', name: 'Serbian', native: 'Српски' },
        { code: 'Swedish', name: 'Swedish', native: 'Svenska' },
        { code: 'Swahili', name: 'Swahili', native: 'Kiswahili' },
        { code: 'Tamil', name: 'Tamil', native: 'தமிழ்' },
        { code: 'Telugu', name: 'Telugu', native: 'తెలుగు' },
        { code: 'Thai', name: 'Thai', native: 'ไทย' },
        { code: 'Turkish', name: 'Turkish', native: 'Türkçe' },
        { code: 'Ukrainian', name: 'Ukrainian', native: 'Українська' },
        { code: 'Urdu', name: 'Urdu', native: 'اردو' },
        { code: 'Vietnamese', name: 'Vietnamese', native: 'Tiếng Việt' }
    ];

    // --- CUSTOM CONFIRM MODAL LOGIC ---
    /**
     * Displays a custom confirmation modal.
     * @param {string} message The message to display in the modal.
     * @param {Function} onConfirm The callback function to execute if the user confirms.
     */
    function showCustomConfirm(message, onConfirm) {
        const confirmModal = document.getElementById('custom-confirm-modal');
        const confirmMessage = document.getElementById('custom-confirm-message');
        const confirmYesButton = document.getElementById('confirm-yes-button');
        const confirmNoButton = document.getElementById('confirm-no-button');

        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';
        confirmYesButton.focus(); // Set focus on the 'Delete' button.

        const yesHandler = () => {
            hide();
            onConfirm();
        };

        const noHandler = () => {
            hide();
        };
        
        // Handle key presses for the modal.
        const keydownHandler = (e) => {
            if (e.key === 'Enter') {
                if (document.activeElement === confirmYesButton) {
                    e.preventDefault();
                    yesHandler();
                } else if (document.activeElement === confirmNoButton) {
                    e.preventDefault();
                    noHandler();
                }
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                noHandler();
            }
        };

        const hide = () => {
            confirmModal.style.display = 'none';
            confirmYesButton.removeEventListener('click', yesHandler);
            confirmNoButton.removeEventListener('click', noHandler);
            window.removeEventListener('keydown', keydownHandler, true);
        };

        confirmYesButton.addEventListener('click', yesHandler);
        confirmNoButton.addEventListener('click', noHandler);
        window.addEventListener('keydown', keydownHandler, true);
    }

    // --- VIEW SWITCHING LOGIC ---
    const switchView = (viewName) => {
        Object.values(views).forEach(view => view.style.display = 'none');
        menuItems.forEach(item => item.classList.remove('active'));

        const activeView = views[viewName];
        const activeMenuItem = document.querySelector(`.menu-item[data-view="${viewName}"]`);
        
        if (activeView) activeView.style.display = 'flex';
        if (activeMenuItem) activeMenuItem.classList.add('active');
    };

    menuItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // --- PROMPT MANAGEMENT LOGIC ---
    const openPromptModal = (prompt = null) => {
        promptForm.reset();
        if (prompt) {
            promptModalTitle.textContent = 'Edit Prompt';
            promptIdInput.value = prompt.id;
            promptNameInput.value = prompt.name;
            promptContentInput.value = prompt.content;
        } else {
            promptModalTitle.textContent = 'New Prompt';
            promptIdInput.value = '';
        }
        promptModal.style.display = 'flex';
    };

    const closePromptModal = () => {
        promptModal.style.display = 'none';
    };

    const getPrompts = async () => {
        const result = await chrome.storage.local.get('prompts');
        prompts = result.prompts || [];
    };

    const savePrompts = async (updatedPrompts) => {
        prompts = updatedPrompts;
        await chrome.storage.local.set({ prompts });
    };

    const renderPrompts = () => {
        shownPromptsList.innerHTML = '';
        hiddenPromptsList.innerHTML = '';
        prompts.forEach(prompt => {
            const container = prompt.showInMenu ? shownPromptsList : hiddenPromptsList;
            createPromptElement(prompt, container);
        });
    };

    const createPromptElement = (prompt, container) => {
        const item = document.createElement('div');
        item.className = 'prompt-item';
        item.dataset.id = prompt.id;
        const showHideIcon = prompt.showInMenu ? 'visibility_off' : 'visibility';
        const showHideTitle = prompt.showInMenu ? 'Hide' : 'Show';
        item.innerHTML = `
            <span class="material-symbols-outlined drag-handle" draggable="true">drag_indicator</span>
            <span class="material-symbols-outlined prompt-item-icon">style</span>
            <span class="prompt-item-name"></span>
            <div class="prompt-item-actions">
                <button class="edit-button" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button class="delete-button" title="Delete"><span class="material-symbols-outlined">delete</span></button>
                <button class="toggle-show-button" title="${showHideTitle}"><span class="material-symbols-outlined">${showHideIcon}</span></button>
            </div>
        `;
        item.querySelector('.prompt-item-name').textContent = prompt.name;
        item.querySelector('.edit-button').addEventListener('click', () => openPromptModal(prompt));
        item.querySelector('.delete-button').addEventListener('click', () => deletePrompt(prompt));
        item.querySelector('.toggle-show-button').addEventListener('click', () => togglePromptVisibility(prompt.id));
        
        const dragHandle = item.querySelector('.drag-handle');
        dragHandle.addEventListener('dragstart', handleDragStart);
        dragHandle.addEventListener('dragend', handleDragEnd);

        container.appendChild(item);
    };

    const deletePrompt = (prompt) => {
        showCustomConfirm(`Are you sure you want to delete "${prompt.name}"?`, async () => {
            const updatedPrompts = prompts.filter(p => p.id !== prompt.id);
            await savePrompts(updatedPrompts);
            renderPrompts();
        });
    };

    const togglePromptVisibility = async (promptId) => {
        const promptToToggle = prompts.find(p => p.id === promptId);
        if (promptToToggle) {
            promptToToggle.showInMenu = !promptToToggle.showInMenu;
            await savePrompts(prompts);
            renderPrompts();
        }
    };

    // --- URL MANAGEMENT LOGIC ---
    const getUrls = async () => {
        const result = await chrome.storage.local.get('managedUrls');
        managedUrls = result.managedUrls || [];
    };

    const saveUrls = async () => {
        await chrome.storage.local.set({ managedUrls });
    };

    const renderUrlList = () => {
        urlListManagementDiv.innerHTML = '';
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
            urlListManagementDiv.appendChild(itemDiv);

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

            itemDiv.querySelector('.remove-url-button').addEventListener('click', () => deleteUrl(urlEntry));
            itemDiv.querySelector('.open-url-button').addEventListener('click', () => chrome.tabs.create({ url: urlEntry.url }));
            
            const dragHandle = itemDiv.querySelector('.drag-handle');
            dragHandle.addEventListener('dragstart', handleDragStart);
            dragHandle.addEventListener('dragend', handleDragEnd);
            
            itemDiv.addEventListener('dragover', handleDragOver);
        });
    };
    
    const deleteUrl = (urlEntry) => {
        showCustomConfirm(`Are you sure you want to delete "${urlEntry.url}"?`, async () => {
            managedUrls = managedUrls.filter(u => u.id !== urlEntry.id);
            await saveUrls();
            renderUrlList();
        });
    };

    // --- DRAG & DROP LOGIC (for both lists) ---
    function handleDragStart(e) {
        draggedItem = this.closest('.prompt-item, .url-item');
        if (!draggedItem) return;

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
    }

    function handleDragOver(e) {
        e.preventDefault();
        const container = this.classList.contains('prompt-list-container') || this.id === 'url-list-management' ? this : this.parentElement;
        const currentlyDragged = document.querySelector('.dragging');

        if (!currentlyDragged) return;
        
        const isDraggedItemUrl = currentlyDragged.classList.contains('url-item');
        const isDraggedItemPrompt = currentlyDragged.classList.contains('prompt-item');

        const isTargetUrlContainer = container.id === 'url-list-management';
        const isTargetPromptContainer = container.classList.contains('prompt-list-container');

        if ((isDraggedItemUrl && !isTargetUrlContainer) || (isDraggedItemPrompt && !isTargetPromptContainer)) {
            return;
        }

        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(currentlyDragged);
        } else {
            container.insertBefore(currentlyDragged, afterElement);
        }
    }
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.prompt-item:not(.dragging), .url-item:not(.dragging)')];
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
    
        const container = this;
    
        if (draggedItem.classList.contains('prompt-item')) {
            const promptId = draggedItem.dataset.id;
            const prompt = prompts.find(p => p.id === promptId);
    
            if (prompt) {
                const newShowInMenu = container.id === 'shown-prompts-list';
                if (prompt.showInMenu !== newShowInMenu) {
                    prompt.showInMenu = newShowInMenu;
                    const toggleButton = draggedItem.querySelector('.toggle-show-button');
                    const icon = toggleButton.querySelector('.material-symbols-outlined');
                    toggleButton.title = newShowInMenu ? 'Hide' : 'Show';
                    icon.textContent = newShowInMenu ? 'visibility_off' : 'visibility';
                }
            }
    
            const newOrder = [
                ...Array.from(shownPromptsList.querySelectorAll('.prompt-item')),
                ...Array.from(hiddenPromptsList.querySelectorAll('.prompt-item'))
            ].map(item => item.dataset.id);
    
            prompts.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
            await savePrompts(prompts);
    
        } else if (draggedItem.classList.contains('url-item')) {
            const newOrder = Array.from(urlListManagementDiv.querySelectorAll('.url-item')).map(item => item.dataset.id);
            managedUrls.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
            await saveUrls();
        }
    }

    // --- LANGUAGE DROPDOWN LOGIC ---
    const populateLanguageDropdown = (filter = '') => {
        languageOptionsList.innerHTML = '';
        const lowerCaseFilter = filter.toLowerCase();
        const filteredLanguages = languages.filter(lang => 
            lang.name.toLowerCase().includes(lowerCaseFilter) || 
            lang.native.toLowerCase().includes(lowerCaseFilter)
        );

        filteredLanguages.forEach(lang => {
            const option = document.createElement('div');
            option.className = 'custom-option';
            option.dataset.value = lang.code;
            option.innerHTML = `<span>${lang.name}</span><span class="lang-native">${lang.native}</span>`;
            
            option.addEventListener('click', () => {
                languageSelectTrigger.querySelector('span').textContent = lang.name;
                chrome.storage.local.set({ displayLanguage: lang.code });
                languageSelect.classList.remove('open');
                updateSelectedOption(lang.code);
            });
            languageOptionsList.appendChild(option);
        });
        updateSelectedOption();
    };

    const updateSelectedOption = async () => {
        const { displayLanguage } = await chrome.storage.local.get({ displayLanguage: 'English' });
        const selectedLanguage = languages.find(l => l.code === displayLanguage) || languages[0];
        languageSelectTrigger.querySelector('span').textContent = selectedLanguage.name;
        
        document.querySelectorAll('.custom-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.value === displayLanguage) {
                opt.classList.add('selected');
            }
        });
    };

    // --- INITIALIZATION ---
    const init = async () => {
        await getPrompts();
        await getUrls();

        renderPrompts();
        renderUrlList();
        populateLanguageDropdown();
        updateSelectedOption();
        
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');

        if (section === 'prompts') {
            switchView('prompts');
        } else {
            switchView('general'); 
        }

        newPromptButton.addEventListener('click', () => openPromptModal());
        closeModalButton.addEventListener('click', closePromptModal);
        cancelPromptButton.addEventListener('click', closePromptModal);
        window.addEventListener('click', (e) => {
            if (e.target === promptModal) closePromptModal();
            if (!languageSelect.contains(e.target)) {
                languageSelect.classList.remove('open');
            }
        });

        promptForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPrompts = [...prompts];
            const promptData = {
                id: promptIdInput.value || crypto.randomUUID(),
                name: promptNameInput.value.trim(),
                content: promptContentInput.value.trim(),
                showInMenu: true
            };
            if (promptIdInput.value) {
                const index = currentPrompts.findIndex(p => p.id === promptData.id);
                if (index > -1) {
                    promptData.showInMenu = currentPrompts[index].showInMenu;
                    currentPrompts[index] = promptData;
                }
            } else {
                currentPrompts.push(promptData);
            }
            await savePrompts(currentPrompts);
            closePromptModal();
            renderPrompts();
        });

        // Handles adding single or multiple URLs from the textarea.
        addUrlButton.addEventListener('click', async () => {
            const newUrlValue = newUrlInput.value.trim();
            if (newUrlValue) {
                // Split by newlines, trim whitespace, and filter out empty lines.
                const urlsToAdd = newUrlValue.split('\n')
                    .map(url => url.trim())
                    .filter(url => url.length > 0);

                if (urlsToAdd.length > 0) {
                    const newEntries = urlsToAdd.map(url => ({
                        id: crypto.randomUUID(),
                        url: url,
                        selected: true
                    }));
                    managedUrls.push(...newEntries);
                    await saveUrls();
                    renderUrlList();
                    newUrlInput.value = ''; // Clear the textarea after adding.
                }
            }
        });

        // Add keydown listener to the textarea.
        // Pressing 'Enter' (without Shift) will add the URLs.
        // Pressing 'Shift+Enter' will create a new line.
        newUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent creating a new line.
                addUrlButton.click();
            }
        });
        
        selectAllButton.addEventListener('click', async () => {
            managedUrls.forEach(u => u.selected = true);
            await saveUrls();
            renderUrlList();
        });

        clearSelectionButton.addEventListener('click', async () => {
            managedUrls.forEach(u => u.selected = false);
            await saveUrls();
            renderUrlList();
        });

        invertSelectionButton.addEventListener('click', async () => {
            managedUrls.forEach(u => u.selected = !u.selected);
            await saveUrls();
            renderUrlList();
        });

        languageSelectTrigger.addEventListener('click', () => {
            languageSelect.classList.toggle('open');
        });

        languageSearchInput.addEventListener('input', (e) => {
            populateLanguageDropdown(e.target.value);
        });

        [shownPromptsList, hiddenPromptsList, urlListManagementDiv].forEach(container => {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('drop', handleDrop);
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.managedUrls) {
                    managedUrls = changes.managedUrls.newValue;
                    renderUrlList();
                }
                if (changes.displayLanguage) {
                    updateSelectedOption();
                }
            }
        });
    };

    init();
});