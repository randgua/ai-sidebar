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
 * Saves the current list of URLs to chrome.storage.local.
 */
function saveUrls() {
    chrome.storage.local.set({ managedUrls: managedUrls });
}

/**
 * Renders iframes in the main container based on the current selection.
 * @param {HTMLElement} iframeContainer The container for the iframes.
 */
function updateIframes(iframeContainer) {
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
 */
function loadUrls(iframeContainer) {
    chrome.storage.local.get(['managedUrls'], function(result) {
        const loadedUrls = result.managedUrls;
        if (chrome.runtime.lastError || !Array.isArray(loadedUrls) || loadedUrls.length === 0) {
            if (chrome.runtime.lastError) console.error('Error loading managed URLs:', chrome.runtime.lastError.message);
            managedUrls = defaultUrls.map(u => ({ ...u, id: u.id || crypto.randomUUID() }));
        } else {
            managedUrls = loadedUrls.map(url => ({ ...url, id: url.id || crypto.randomUUID() }));
        }
        saveUrls();
        updateIframes(iframeContainer);
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
    button.addEventListener('click', async () => {
        let fullPrompt;
        const { displayLanguage } = await chrome.storage.local.get('displayLanguage');
        const lang = displayLanguage || 'English'; // Default to English if not set

        // Replace placeholders
        let promptContent = prompt.content.replace(/\${lang}/g, lang);
        if (promptContent.includes('${input}')) {
            fullPrompt = promptContent.replace('${input}', selectedText);
        } else {
            fullPrompt = `${promptContent}\n\n"""\n${selectedText}\n"""`;
        }
        
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

    let result = await chrome.storage.local.get('prompts');
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
        iframeContainer, refreshIcon, settingsContainer,
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

    settingsContainer.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html?section=general') });
    });

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
                let result = await chrome.storage.local.get('prompts');
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
        if (namespace === 'local' && changes.managedUrls) {
            managedUrls = changes.managedUrls.newValue;
            updateIframes(iframeContainer);
        }
    });

    loadUrls(iframeContainer);
    
    // Delay the initial resize to ensure the browser has calculated the layout.
    setTimeout(() => {
        autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
    }, 10);
}