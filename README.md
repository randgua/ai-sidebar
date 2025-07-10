# AI Sidebar

A powerful AI sidebar for Chrome that lets you open multiple websites side-by-side, manage a library of custom prompts, and seamlessly interact with content from any webpage.

<p align="center">
  <img src="src/icons/icon128.png" alt="AI Sidebar Icon">
</p>

## Key Features

### Advanced Prompting & Interaction
-   **Contextual Prompts**: Select text on any webpage, and it will automatically appear in the sidebar, along with a dynamic menu of your custom prompts to act on that text.
-   **Slash Commands**: Type `/` in the prompt input to bring up a searchable menu of your custom prompts for quick access.
-   **Pinning Prompts**: Select a prompt via the slash command menu to "pin" it. While pinned, all text you type in the input area is used as the input for that specific prompt, allowing for specialized, multi-turn conversations.
-   **Selective Interaction**: Hover over any active panel to reveal controls. You can send the main prompt to just that panel or append its latest output back into the prompt area.
-   **Aggregate Outputs**: A dedicated button collects the latest outputs from all active panels, formats them in Markdown, and appends them to the prompt area for further use.
-   **Google Search Toggle**: On supported sites (e.g., Gemini), a button appears to toggle Google Search grounding for that specific panel.

### Comprehensive Management
-   **Full URL Control**: From the settings page, you can add, edit, delete, reorder (via drag-and-drop), and select/deselect the websites you want to use. Bulk actions are also available.
-   **Full Prompt Management**: A dedicated "Prompts" section in the settings allows you to create, edit, and delete custom prompts. You can also drag-and-drop prompts to reorder them or to show/hide them from the UI menus.
-   **Language Customization**: Choose a display language in settings, and the extension will use it to format prompts that include the `${lang}` placeholder.

### Core Functionality
-   **Multi-Website Display**: Open multiple websites simultaneously in the side panel.
-   **Standalone Full-Page Mode**: Open the entire interface in a full browser tab for more space, accessible via a button or the `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac) shortcut.
-   **Local Storage**: Remembers your URLs, prompts, and settings on your device.
-   **Embed Compatibility**: Automatically modifies HTTP headers to allow most websites (e.g., `gemini.google.com`, `chatgpt.com`) to be embedded in iframes.
-   **Local File Support**: View local documents like PDFs and HTML files by adding their file paths and granting the extension permission to access file URLs.

## Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `src` directory from this project.

## Usage

-   **Open Sidebar/Settings:** Click the extension icon to open the sidebar. Use the keyboard shortcut `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac) to open the main interface in a full tab, which is the best place to manage all settings.

### Prompting Workflows
-   **Contextual Prompting:** Highlight any text on a webpage. It will automatically appear in the sidebar. A set of prompt buttons will also appear, allowing you to instantly "Summarize," "Translate," etc., using the selected text as input.
-   **Slash Commands:** In the prompt input, type `/` to open a searchable menu of your prompts. Use arrow keys and Enter to select one.
-   **Pinning a Prompt:** After selecting a prompt via slash command, it becomes "pinned." Now, anything you type will be used as the input for that pinned prompt. This is ideal for multi-turn conversations or repeated tasks. Click the 'x' on the pinned prompt tag to unpin it.

### Managing Panels & Settings
-   **Access Settings:** Click the **gear icon** in the top-right of the sidebar or full-page view.
-   **General Tab:** Manage your URL list and set your preferred display language.
-   **Prompts Tab:** Create, edit, delete, and organize your custom prompts. Drag prompts between the "Show in list" and "Hide from list" columns to control which ones appear in the contextual and slash command menus.

## How it Works

The extension utilizes Chrome's Side Panel API. To enable embedding of websites that would normally block it, the extension uses the `declarativeNetRequest` API to modify network headers, removing `x-frame-options`, `content-security-policy`, and `Sec-Fetch-Dest` headers. User preferences are stored using `chrome.storage.local`. A set of default URLs and prompts are added on first installation.