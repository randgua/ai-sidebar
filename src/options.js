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

    // --- APPEARANCE-SPECIFIC DOM ELEMENTS ---
    const languageSelect = document.getElementById('display-language-select');
    const languageSelectTrigger = languageSelect.querySelector('.custom-select-trigger');
    const languageSearchInput = document.getElementById('language-search-input');
    const languageOptionsList = document.getElementById('language-options-list');

    // --- STATE VARIABLES ---
    let prompts = [];
    let managedUrls = [];
    let draggedItem = null; // Used for both prompts and URLs

    // --- LANGUAGE DATA ---
    const languages = [
        { code: 'English', name: 'English', native: 'English' },
        { code: 'ChineseS', name: 'Simplified Chinese', native: '中文(简体)' },
        { code: 'ChineseT', name: 'Traditional Chinese', native: '中文(繁體)' },
        { code: 'Spanish', name: 'Spanish', native: 'Español' },
        { code: 'French', name: 'French', native: 'Français' },
        { code: 'Japanese', name: 'Japanese', native: '日本語' },
        { code: 'Korean', name: 'Korean', native: '한국어' },
        { code: 'German', name: 'German', native: 'Deutsch' },
        { code: 'Russian', name: 'Russian', native: 'Русский' },
        { code: 'Portuguese', name: 'Portuguese', native: 'Português' },
        { code: 'Italian', name: 'Italian', native: 'Italiano' },
        { code: 'Dutch', name: 'Dutch', native: 'Nederlands' },
    ];

    // --- DEFAULT DATA ---
    const defaultPrompts = [
        { id: crypto.randomUUID(), name: 'Explain', content: 'Please explain clearly and concisely in ${lang} : """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Summarize', content: 'You are a highly skilled AI trained in language comprehension and summarization. I would like you to read the text delimited by triple quotes and summarize it into a concise abstract paragraph. Aim to retain the most important points, providing a coherent and readable summary that could help a person understand the main points of the discussion without needing to read the entire text. Please avoid unnecessary details or tangential points. Only give me the output and nothing else. Do not wrap responses in quotes. Respond in the ${lang} language. """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Translate', content: 'Rewrite the text in triple quotes in ${lang}. """ ${input} """ Only give me the translation and nothing else. Do not wrap responses in quotes.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Explain codes', content: 'Explain the following codes and give me a clear, concise and readable explanation.Respond in the ${lang} language. """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Web Search', content: 'Use the Internet search to extract key points. Carefully analyze the following content. Respond in the ${lang} language. """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Outline…', content: 'Please use the following topics or keywords to generate an outline that includes titles, chapters, and subsections. Output it in Markdown format. Only give me the output and nothing else. The outline should be in the ${lang} language. Topics or keywords: """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Simplify language', content: 'Rewrite the text delimited by triple quotes to be clearer, easier to comprehend, and less confusing. Only give me the output and nothing else. Do not wrap responses in quotes. # Respond in the same language of the text delimited by triple quote: """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'More engaging', content: 'Here is the original text to be rewritten: """ ${input} """ Please rewrite this text to make it more engaging and compelling to the reader. Use more vivid language, vary the sentence structure, and make the prose more dynamic overall. However, it\'s critical that you retain the core meaning and key points of the original text. Output only the rewritten text itself, without any quotes or other commentary. Write the output in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'More apologetic', content: 'Here is the original text: """${input}""" Please rewrite the text above to sound more apologetic and regretful in tone, while keeping the core meaning and intent the same. Use softening language, take responsibility where appropriate, and convey a sense of remorse or acknowledgement of wrongdoing if applicable to the context. Output only the rewritten text. Do not wrap your rewrite in quotes or tags. Respond in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Add humor', content: '# Role: Humor Enhancer You are a highly skilled AI trained in language understanding and humor enhancement. Your task is to read the original text and make the text more engaging and entertaining, not to completely alter its essence. Strive to seamlessly integrate the humorous bits so they feel natural rather than forced. ## Rules - Retain the original meaning and structure. - Enhance by strategically adding humorous elements to make the text more engaging and entertaining. - Only provide the output and nothing else. - Do not wrap responses in quotes. - Respond in the same language as the original text. # Original Text """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Add statistics', content: 'Add some statistics to the text delimited by triple quotes to make it more believable. Ensure output in the same language variety or dialect of the text - in other words don\'t change the language ,and only give me the output and nothing else. Do not wrap responses in quotes. """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Add details', content: '# Role: Detail Enhancer You are a highly skilled AI trained in language understanding and detail enhancement. You will read the original text and add some details to make it more believable. ## Rules - Retain the original meaning and structure. - Enhance the text with additional details to make it more believable. - Only provide the output and nothing else. - Do not wrap responses in quotes. - Respond in the same language as the original text. # Original Text """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'More persuasive', content: 'Here is the original text to make more persuasive: """ ${input} """ Please rewrite the text to make it more persuasive and compelling to the reader. Use persuasive language and techniques like appealing to emotions, using strong words, highlighting benefits, and ending with a clear call-to-action. The meaning and core message of the text should remain the same. Output only the rewritten text itself, without any quotes or other commentary. Write the output in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Sales email…', content: '"""${input}"""" Follow the steps below: Step 1: Create an intriguing subject line based on the product; Step 2: Address the recipient personally; Step 3: Introduce the product briefly and state its value proposition; Step 4: Describe the benefits of the product for the recipient; Step 5: Incorporate a compelling call to action; Step 6: Sign off in a professional manner; Step 7: Plan for a follow-up action; The sales email should be in ${lang}. It should not include the step information and should follow this format: Subject: <Intriguing subject line related to the product> Dear <Recipient\'s name>, I hope this email finds you well. I am reaching out today to introduce <a simple description of your product>. Our product offers <value proposition>. <Details about the benefits of the product to the recipient>. <Compelling call to action>. Thank you for your time and consideration. We will follow up with you <timeframe for follow-up action>. Best Regards, <Your name>', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Meeting agenda…', content: '"""${input}""" Following the steps below: Step 1: Identify the main topic of the meeting; Step 2: Break down the main topic into key points or items to be discussed; Step 3: Organize the key points in a logical and efficient order to form the meeting agenda; Do not return anything other than the meeting agenda. Do not include step information. The to-do list should be in ${lang}. Based on the meeting topic provided, please create a comprehensive meeting agenda using the following format(markdown): ## <Meeting Objective> ## <Agenda> 1. <agenda item> 3. <agenda item> 3. <agenda item> ## <Meeting Time and Place> Time: [Please fill in the meeting time] Place: [Please fill in the meeting location] ## <Attendees> - [Please fill in attendee\'s name and position] - [Please fill in attendee\'s name and position] - [Please fill in attendee\'s name and position] - [Please fill in attendee\'s name and position] - [Please fill in attendee\'s name and position] ## <Meeting Recorder > - [Please fill in the recorder\'s name]', showInMenu: true },
        { id: crypto.randomUUID(), name: 'To-do list…', content: '"""${input}""" Follow the steps below: Step 1: Identify the main goal or outcome of the task or idea; Step 2: Break down the main task or idea into a series of smaller, actionable steps; Step 3: Organize the steps in a logical and efficient order to form the to-do list; Do not return anything other than the to-do list. Do not include step information. The to-do list should be in ${lang}. Write a todo list of action items from my notes using the following format: # <main goal or outcome of the task or idea> - [ ] <first action item> - [ ] <second action item> - [ ] <third action item> - [ ] <fourth action item> ...', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Creative story', content: '"""${input}""" Turn my idea into a full creative story: Do not return anything other than the creative story. Do not include step information. The story should be in ${lang}. Based on the story idea provided, please create a comprehensive creative story using the following format(markdown): # <Story Title> <story content>', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Press release', content: 'You are a professional press release writing expert, please generate a professional press release based on the input content in the following format:u2028 ## < an eye-catching press release headline based on the input content > < an engaging lead > < detailed body content > < relevant quotes > ### < the company profile at the end >u2028 ## Rules - Do not return anything other than the press release. - Do not include step information in your outputs. - The press release should be in ${lang}. - Do not include any additional commentary outside of the required information outlined above. ## Input content """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Social media post…', content: 'I want you to act as a topic authority and social media influencer. Write a social media post description or caption using a few sentences for the post about """${input}""". Only give me the output and nothing else. Do not wrap responses in quotes. The post should be in the ${lang} language.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Paragraph about…', content: '"""${input}""" Rewrite the above content into a longer paragraph. Only give me the output and nothing else. Do not wrap responses in quotes. Respond in the {lang} language.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Improve writing', content: 'Rewrite the following text, which will be delimited by triple quotes, to be more concise and well-written while preserving the original meaning: """${input}""" Provide only the rewritten text as your output, without any quotes or tags. Respond in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Fix spelling & grammar', content: 'Correct any spelling, syntax, or grammar mistakes in the text delimited by triple quotes without making any improvements or changes to the original meaning or style. In other words, only correct spelling, syntax, or grammar mistakes, do not make improvements. If the original text has no mistake, just output the original text and nothing else. Do not wrap responses in quotes. """ ${input} """', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Answer this question', content: 'Use simple and clear language to answer the following question. Do not translate the question. Do not wrap responses in quotes. """ ${input} """ Respond in ${lang}', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Find action items', content: 'Find action items from the text delimited by triple quotes and output them in bullet point format. Identify only the action items that need the reader to take action, and exclude action items requiring action from anyone other than the reader. Only give me the output and nothing else. Do not wrap responses in quotes. Respond in the ${lang} language variety or dialect. """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Make shorter', content: 'Here is the original text to rewrite: """${input}""" Please rewrite the text above to be no more than half the number of characters while keeping the core meaning the same. Output only the rewritten text, without any quotes or other formatting. Write the rewritten text in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Make longer', content: 'Here is the original text to rewrite: """${input}""" Please rewrite the text above to be twice as long, while keeping the core meaning the same. Do not add any completely new information, ideas or opinions. Output the rewritten, expanded text directly, without any quotes or other formatting. Write in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Change tone', content: 'Here is the original text: """${input}""" Respond in the same language as the original text. Rewrite the text in a more professional tone. Output only the rewritten text. Do not wrap your rewrite in quotes or tags. ## Respond in the same language as the original text.', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Brainstorm about…', content: 'Please generate 10 creative ideas based on the following keywords or topics.Each idea should be unique and provide a fresh perspective. Output the ideas in the form of an unordered list.Only give me the output and nothing else. The outline should be in the ${lang} language. Keywords or topics: """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Blog post…', content: 'Help me generate a blog post based on the following topics or keywords. Follow the steps below: Step 1: Generate a catchy blog title for me; Step 2: Generate blog content, including an attractive beginning, content described in chapters, and conclusion; Step 3: Organize content according to the format of general blogs, output in markdown format; Do not return anything other than the blog post. Do not include step information. Do not wrap responses in quotes. Respond in the ${lang} language. Topics or keywords: """${input}"""', showInMenu: true },
        { id: crypto.randomUUID(), name: 'Continue writing', content: '"""${input}""" Continue writing that begins with the text above and keeping the same voice and style. Stay on the same topic. Only give me the output and nothing else. Respond in the same language variety or dialect of the text above.', showInMenu: true },
    ];
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
        prompts = (!result.prompts || result.prompts.length === 0) ? defaultPrompts : result.prompts;
        if (!result.prompts || result.prompts.length === 0) {
            await savePrompts(prompts);
        }
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
        const result = await chrome.storage.local.get('managedUrls');
        managedUrls = (!result.managedUrls || result.managedUrls.length === 0) ? defaultUrls : result.managedUrls;
        if (!result.managedUrls || result.managedUrls.length === 0) {
            await saveUrls();
        }
    };

    const saveUrls = async () => {
        await chrome.storage.local.set({ managedUrls });
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
        // Load data
        await getPrompts();
        await getUrls();

        // Render initial views
        renderPrompts();
        renderUrlList();
        populateLanguageDropdown();
        updateSelectedOption();
        
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

        // Language dropdown listeners
        languageSelectTrigger.addEventListener('click', () => {
            languageSelect.classList.toggle('open');
        });

        languageSearchInput.addEventListener('input', (e) => {
            populateLanguageDropdown(e.target.value);
        });

        // Attach listeners only to the containers that allow items to be dropped into them.
        [shownPromptsList, hiddenPromptsList].forEach(container => {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('drop', handleDrop);
        });

        // Listen for changes in storage and update the UI accordingly.
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