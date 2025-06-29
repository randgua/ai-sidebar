document.addEventListener('DOMContentLoaded', () => {
    // --- SHARED DOM ELEMENTS ---
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const views = {
        general: document.getElementById('general-view'),
        prompts: document.getElementById('prompts-view')
    };

    // --- PROMPTS-SPECIFIC DOM ELEMENTS ---
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

    // --- GENERAL (URLS) -SPECIFIC DOM ELEMENTS ---
    const urlListManagementDiv = document.getElementById('url-list-management');
    const newUrlInput = document.getElementById('new-url-input');
    const addUrlButton = document.getElementById('add-url-button');
    const invertSelectionButton = document.getElementById('invert-selection-button');
    const selectAllButton = document.getElementById('select-all-button');
    const clearSelectionButton = document.getElementById('clear-selection-button');
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmMessage = document.getElementById('custom-confirm-message');
    const confirmYesButton = document.getElementById('confirm-yes-button');
    const confirmNoButton = document.getElementById('confirm-no-button');

    // --- STATE VARIABLES ---
    let prompts = [];
    let managedUrls = [];
    let draggedItem = null; // Used for both prompts and URLs

    // --- DEFAULT DATA ---
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
    const defaultUrls = [
        { id: crypto.randomUUID(), url: "https://aistudio.google.com/", selected: true },
        { id: crypto.randomUUID(), url: "https://gemini.google.com/", selected: false },
        { id: crypto.randomUUID(), url: "https://chatgpt.com/", selected: false },
        { id: crypto.randomUUID(), url: "https://claude.ai/", selected: false },
        { id: crypto.randomUUID(), url: "https://grok.com/", selected: false },
        { id: crypto.randomUUID(), url: "https://perplexity.ai/", selected: false },
    ];

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
        const result = await chrome.storage.sync.get('prompts');
        prompts = (!result.prompts || result.prompts.length === 0) ? defaultPrompts : result.prompts;
        if (!result.prompts || result.prompts.length === 0) {
            await savePrompts(prompts);
        }
    };

    const savePrompts = async (updatedPrompts) => {
        prompts = updatedPrompts;
        await chrome.storage.sync.set({ prompts });
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
        item.setAttribute('draggable', true);
        item.dataset.id = prompt.id;
        const showHideIcon = prompt.showInMenu ? 'visibility_off' : 'visibility';
        const showHideTitle = prompt.showInMenu ? 'Hide' : 'Show';
        item.innerHTML = `
            <span class="material-symbols-outlined drag-handle">drag_indicator</span>
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
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        container.appendChild(item);
    };

    const deletePrompt = async (prompt) => {
        if (confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
            const updatedPrompts = prompts.filter(p => p.id !== prompt.id);
            await savePrompts(updatedPrompts);
            renderPrompts();
        }
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
        const result = await chrome.storage.sync.get('managedUrls');
        managedUrls = (!result.managedUrls || result.managedUrls.length === 0) ? defaultUrls : result.managedUrls;
        if (!result.managedUrls || result.managedUrls.length === 0) {
            await saveUrls();
        }
    };

    const saveUrls = async () => {
        await chrome.storage.sync.set({ managedUrls });
    };

    const renderUrlList = () => {
        urlListManagementDiv.innerHTML = '';
        managedUrls.forEach(urlEntry => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'url-item';
            itemDiv.setAttribute('draggable', true);
            itemDiv.dataset.id = urlEntry.id;
            itemDiv.innerHTML = `
                <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                <input type="checkbox" ${urlEntry.selected ? 'checked' : ''}>
                <input type="text" value="${urlEntry.url}">
                <div class="url-actions">
                    <button class="open-url-button" title="Open in new tab"><span class="material-symbols-outlined">open_in_new</span></button>
                    <button class="remove-url-button" title="Delete URL"><span class="material-symbols-outlined">delete</span></button>
                </div>
            `;
            urlListManagementDiv.appendChild(itemDiv);

            // Add event listeners
            itemDiv.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                urlEntry.selected = e.target.checked;
                saveUrls();
            });
            itemDiv.querySelector('.remove-url-button').addEventListener('click', () => deleteUrl(urlEntry));
            itemDiv.querySelector('.open-url-button').addEventListener('click', () => chrome.tabs.create({ url: urlEntry.url }));
            
            // Attach drag-and-drop listeners directly to the item
            itemDiv.addEventListener('dragstart', handleDragStart);
            itemDiv.addEventListener('dragend', handleDragEnd);
            itemDiv.addEventListener('dragover', handleDragOver);
            itemDiv.addEventListener('drop', handleDrop);
        });
    };
    
    const deleteUrl = (urlEntry) => {
        if (confirm(`Are you sure you want to delete "${urlEntry.url}"?`)) {
            managedUrls = managedUrls.filter(u => u.id !== urlEntry.id);
            saveUrls();
            renderUrlList();
        }
    };

    // --- DRAG & DROP LOGIC (for both lists) ---
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
    }

    function handleDragEnd() {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        draggedItem = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        const isItem = this.classList.contains('url-item') || this.classList.contains('prompt-item');
        const container = isItem ? this.parentElement : this;
        const currentlyDragged = document.querySelector('.dragging');

        if (!currentlyDragged) return;
        
        // Prevent dropping items into the wrong type of list
        const isDraggedItemUrl = currentlyDragged.classList.contains('url-item');
        const isContainerForUrls = container.id === 'url-list-management';
        if (isDraggedItemUrl !== isContainerForUrls) return;

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

        const isItem = this.classList.contains('url-item') || this.classList.contains('prompt-item');
        const container = isItem ? this.parentElement : this;

        // Update prompt visibility if it was moved between prompt lists
        if (draggedItem.classList.contains('prompt-item')) {
            const showInMenu = container.id === 'shown-prompts-list';
            const promptId = draggedItem.dataset.id;
            const prompt = prompts.find(p => p.id === promptId);
            if (prompt) {
                prompt.showInMenu = showInMenu;
            }
        }
        
        // Resync data arrays based on the new DOM order
        const newPromptsOrder = [...shownPromptsList.querySelectorAll('.prompt-item'), ...hiddenPromptsList.querySelectorAll('.prompt-item')].map(item => prompts.find(p => p.id === item.dataset.id));
        prompts = newPromptsOrder.filter(Boolean);
        await savePrompts(prompts);

        const newUrlsOrder = [...urlListManagementDiv.querySelectorAll('.url-item')].map(item => managedUrls.find(u => u.id === item.dataset.id));
        managedUrls = newUrlsOrder.filter(Boolean);
        await saveUrls();
        
        // Re-render to ensure UI is perfectly in sync with data
        renderPrompts();
        renderUrlList();
    }

    // --- INITIALIZATION ---
    const init = async () => {
        // Load data
        await getPrompts();
        await getUrls();

        // Render initial views
        renderPrompts();
        renderUrlList();
        
        // Handle view switching based on URL parameter.
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');

        // Default to 'general' unless 'prompts' is explicitly specified.
        if (section === 'prompts') {
            switchView('prompts');
        } else {
            switchView('general'); 
        }

        // Add event listeners
        newPromptButton.addEventListener('click', () => openPromptModal());
        closeModalButton.addEventListener('click', closePromptModal);
        cancelPromptButton.addEventListener('click', closePromptModal);
        window.addEventListener('click', (e) => {
            if (e.target === promptModal) closePromptModal();
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

        addUrlButton.addEventListener('click', async () => {
            const newUrlValue = newUrlInput.value.trim();
            if (newUrlValue) {
                managedUrls.push({ id: crypto.randomUUID(), url: newUrlValue, selected: true });
                await saveUrls();
                renderUrlList();
                newUrlInput.value = '';
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

        // Attach listeners only to the containers that allow items to be dropped into them.
        [shownPromptsList, hiddenPromptsList].forEach(container => {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('drop', handleDrop);
        });

        // Listen for changes in storage and update the UI accordingly.
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.managedUrls) {
                managedUrls = changes.managedUrls.newValue;
                renderUrlList();
            }
        });
    };

    init();
});