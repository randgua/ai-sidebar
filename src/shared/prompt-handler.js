// Manages the contextual prompt UI that appears on text selection.

// Keep a reference to the ResizeObserver to manage its lifecycle.
let promptResizeObserver = null;

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
    const button = document.createElement('button');
    button.textContent = prompt.name;
    button.className = isMoreMenuItem ? 'more-prompt-item' : 'prompt-button';
    button.addEventListener('click', async () => {
        let fullPrompt;
        const { displayLanguage } = await chrome.storage.local.get('displayLanguage');
        const lang = displayLanguage || 'English';

        let promptContent = prompt.content.replace(/\${lang}/g, lang);
        if (promptContent.includes('${input}')) {
            fullPrompt = promptContent.replace('${input}', selectedText);
        } else {
            fullPrompt = `${promptContent}\n\n"""\n${selectedText}\n"""`;
        }
        
        sendMessageToIframes(fullPrompt);
        resetContextualUI();
    });
    return button;
}

/**
 * Dynamically renders prompt buttons based on available width.
 * This function is responsive and will move buttons into a "more" menu if space is limited.
 * @param {string} selectedText The text that the prompts will act upon.
 * @param {Array} visiblePrompts The list of prompt objects to render.
 */
function renderResponsivePrompts(selectedText, visiblePrompts) {
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const morePromptsPopup = document.getElementById('more-prompts-popup');

    // Gracefully exit if essential elements are not found.
    if (!promptButtonsContainer || !morePromptsPopup) {
        console.error('AI Sidebar: Required UI elements for prompts are missing.');
        return;
    }

    // Disconnect any previous observer to prevent conflicts and memory leaks.
    if (promptResizeObserver) {
        promptResizeObserver.disconnect();
        promptResizeObserver = null;
    }
    
    const morePromptsList = morePromptsPopup.querySelector('#more-prompts-list');
    if (!morePromptsList) {
        console.error('AI Sidebar: Prompt list within popup is missing.');
        return;
    }

    // Reset containers and hide the popup.
    promptButtonsContainer.innerHTML = '';
    morePromptsList.innerHTML = '';
    morePromptsPopup.style.display = 'none';
    // Ensure the popup is detached from any old, now-removed wrapper.
    if (morePromptsPopup.parentElement) {
        morePromptsPopup.parentElement.removeChild(morePromptsPopup);
    }

    if (!visiblePrompts || visiblePrompts.length === 0) {
        return;
    }

    const mainButtonsWrapper = document.createElement('div');
    mainButtonsWrapper.className = 'main-prompt-buttons';
    promptButtonsContainer.appendChild(mainButtonsWrapper);

    const allButtons = visiblePrompts.map(prompt => createPromptButton(prompt, selectedText, false));
    if (allButtons.length === 0) return;

    promptResizeObserver = new ResizeObserver(entries => {
        // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" errors.
        window.requestAnimationFrame(() => {
            if (!entries || !entries.length) return;

            const containerWidth = entries[0].contentRect.width;
            
            // Clear previous render state inside the observer.
            mainButtonsWrapper.innerHTML = '';
            morePromptsList.innerHTML = '';
            const existingMoreWrapper = promptButtonsContainer.querySelector('.more-prompts-wrapper');
            if (existingMoreWrapper) {
                promptButtonsContainer.removeChild(existingMoreWrapper);
            }

            // Create a temporary, off-screen container to measure button widths without affecting the layout.
            const tempContainer = document.createElement('div');
            tempContainer.style.visibility = 'hidden';
            tempContainer.style.position = 'absolute';
            document.body.appendChild(tempContainer);

            const moreButtonTemplate = document.createElement('button');
            moreButtonTemplate.className = 'prompt-button more-button';
            moreButtonTemplate.innerHTML = '<span class="material-symbols-outlined">more_horiz</span>';
            tempContainer.appendChild(moreButtonTemplate);
            const moreButtonWidth = moreButtonTemplate.offsetWidth;
            const gap = 4; // The gap between buttons in pixels.
            
            let currentWidth = 0;
            let splitIndex = -1;

            // Determine at which index to split the buttons into main view vs. "more" menu.
            for (let i = 0; i < allButtons.length; i++) {
                const button = allButtons[i];
                tempContainer.innerHTML = ''; // Clear and measure one by one.
                tempContainer.appendChild(button);
                const buttonWidth = button.offsetWidth;
                
                // Reserve space for the 'more' button if this isn't the last item.
                const potentialMoreButtonSpace = (i < allButtons.length - 1) ? (moreButtonWidth + gap) : 0;

                if (currentWidth + buttonWidth + gap + potentialMoreButtonSpace <= containerWidth) {
                    currentWidth += buttonWidth + gap;
                } else {
                    splitIndex = i;
                    break;
                }
            }
            document.body.removeChild(tempContainer);

            const promptsToShow = (splitIndex === -1) ? allButtons : allButtons.slice(0, splitIndex);
            const promptsToHide = (splitIndex === -1) ? [] : visiblePrompts.slice(splitIndex);

            // Render the buttons that fit into the main container.
            promptsToShow.forEach(button => mainButtonsWrapper.appendChild(button));

            // If there are buttons to hide, create the 'more' button and prepare the popup.
            if (promptsToHide.length > 0) {
                const morePromptsWrapper = document.createElement('div');
                morePromptsWrapper.className = 'more-prompts-wrapper';
                
                const moreButton = document.createElement('button');
                moreButton.className = 'prompt-button more-button';
                moreButton.innerHTML = '<span class="material-symbols-outlined">more_horiz</span>';
                
                morePromptsWrapper.appendChild(moreButton);
                // Append the single, persistent popup element to the new wrapper.
                morePromptsWrapper.appendChild(morePromptsPopup);
                promptButtonsContainer.appendChild(morePromptsWrapper);

                // Populate the list inside the popup.
                promptsToHide.forEach(promptData => {
                    morePromptsList.appendChild(createPromptButton(promptData, selectedText, true));
                });

                // Set up hover listeners to show/hide the popup.
                let hidePopupTimeout;
                const showPopup = () => { clearTimeout(hidePopupTimeout); morePromptsPopup.style.display = 'block'; };
                const hidePopup = () => { hidePopupTimeout = setTimeout(() => { morePromptsPopup.style.display = 'none'; }, 200); };

                morePromptsWrapper.addEventListener('mouseenter', showPopup);
                morePromptsWrapper.addEventListener('mouseleave', hidePopup);
            }
        });
    });

    promptResizeObserver.observe(promptButtonsContainer);
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
    
    contextContent.textContent = selectedText;
    contextContainer.style.display = 'flex';
    contextContainer.dataset.text = selectedText;

    promptButtonsContainer.style.display = 'flex';
    
    if (promptInputDivider) {
        promptInputDivider.style.display = 'block';
    }

    let result = await chrome.storage.local.get('prompts');
    let prompts = result.prompts || [];
    const visiblePrompts = prompts.filter(p => p.showInMenu);

    renderResponsivePrompts(selectedText, visiblePrompts);
}