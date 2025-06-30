# AI Sidebar

A Chrome extension to open one or more user-configured websites side-by-side in the browser's side panel.

<p align="center">
  <img src="src/icons/icon128.png" alt="AI Sidebar Icon">
</p>

## Features

-   **Multi-Website Display**: Open multiple websites simultaneously in the side panel, arranged horizontally.
-   **Advanced URL Management**: Control your website list via the settings popup (hover over the gear icon):
    -   **Add & Edit**: Add new web URLs or local file paths. Edit any existing URL directly in the list.
    -   **Select & Display**: Check or uncheck URLs to instantly show or hide them in the side panel.
    -   **Drag-and-Drop Reordering**: Seamlessly reorder URLs. During the drag operation, active panels become semi-transparent and unresponsive to ensure a smooth experience.
    -   **Bulk Actions**: Quickly invert, select all, or clear all selections.
    -   **Delete & Open**: Remove URLs from the list or open any URL in a new tab.
-   **Optimized Refresh**: A floating refresh button reloads all active websites in the side panel without affecting the main browser window.
-   **Selective Output Handling**: Hover over any active panel to reveal controls. You can send the main prompt to just that panel, or append its latest output back into the prompt area (it will also be copied to your clipboard).
-   **Aggregate Outputs**: A dedicated button next to the main prompt bar allows you to collect the latest outputs from all active panels, format them in Markdown, and append them to the prompt area for further use.
-   **Embed Compatibility**: Automatically modifies HTTP headers to allow most websites (e.g., `gemini.google.com`, `chatgpt.com`) to be embedded in iframes.
-   **Synced Storage**: Remembers your complete list of URLs, their selection state, and their custom order across all your Chrome browsers where you are logged in.
-   **Standalone Full-Page Mode**: Open the entire interface in a full browser tab for more space, accessible via a button in the side panel or with the `Ctrl+Shift+Y` (or `Cmd+Shift+Y` on Mac) keyboard shortcut.
-   **Intelligent Selection Handling**: If the only selected URL is deleted, the extension automatically selects the first URL in the list to prevent an empty panel.
-   **Default URL Set**: Comes pre-loaded with a list of popular AI websites on first installation. If you delete all URLs, this default list will be restored on the next load.
-   **Local File Support**: View local documents like PDFs and HTML files by adding their file paths (e.g., `file:///...`). This requires granting the extension permission to access file URLs.

## Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `src` directory from this project.

## Usage

-   **Open the Sidebar:** Click the extension icon in the Chrome toolbar.
-   **Open in a Full Tab:** Click the **"Full page chat"** icon in the top-left of the sidebar, or use the keyboard shortcut `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac).
-   **Manage URLs & Settings:**
    -   Inside the side panel, **hover your mouse over the settings area** in the top-right corner (marked with a gear icon) to reveal the settings popup.
    -   On the settings popup, you can manage your URL list:
        -   **Add new URLs** by typing in the input field and clicking "Add URL". The extension supports web URLs (e.g., `https://example.com`) and local file paths.
        -   **Select/Deselect URLs** for display by checking/unchecking the checkbox next to each URL. Selected URLs will appear in the side panel.
        -   **Edit URLs** directly in the list by clicking on the URL text. Press Enter or click away to save.
        -   **Reorder URLs** within their list using drag-and-drop (click and drag the '≡' handle). The order in the list determines the order of iframes if multiple are selected.
        -   **Delete URLs** from the list using the "Delete" button.
        -   **Open a URL** from the list in a new tab using the "Open" button.
        -   Use **Invert Selection**, **Select All**, or **Clear All Selections** buttons for bulk management.
-   **Interact with Panels:**
    -   **Refresh Content:** Click the **refresh icon** (circular arrow) to reload all currently active iframes.
    -   **Hover over an active website panel** to see individual controls for sending the prompt or appending its output to the prompt area.
    -   Use the **"Copy all outputs"** button next to the "Send" button to gather text from all active panels at once.

### Advanced Usage: Viewing Local Files

To view local files (e.g., PDFs, HTML files) in the side panel, you must first grant the extension permission to access file URLs.

1.  In Chrome, navigate to `chrome://extensions`.
2.  Find the **AI Sidebar** extension and click on **Details**.
3.  On the details page, find and enable the **"Allow access to file URLs"** toggle switch.

Once enabled, you can add local file paths to the URL list, for example:
-   **Windows:** `C:\Users\YourUser\Documents\MyFile.pdf`
-   **macOS/Linux:** `/Users/YourUser/Downloads/MyDocument.html`

## How it Works

The extension utilizes Chrome's Side Panel API to display web content. It employs an optimized rendering strategy for iframes, caching them to minimize reloads and DOM updates for smoother performance when changing selections or reordering the list. The settings popup dynamically renders and manages the URL list.

To enable embedding of websites that would normally block it, the extension uses the `declarativeNetRequest` API to modify network headers. This action removes the `x-frame-options` and `content-security-policy` response headers, which are common mechanisms for preventing a site from being placed in an iframe. It also removes the `Sec-Fetch-Dest` request header, which can help bypass server-side checks that identify and block iframe requests.

User preferences, including the list of custom URLs, their selection state, and their order, are stored using `chrome.storage.local`. This allows your configured list of websites to be automatically synchronized across all Chrome browsers where you are logged into the same Google account. On first installation, or if the list becomes empty, the extension populates storage with a set of default AI service URLs.