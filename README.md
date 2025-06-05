# AI Sidebar

A Chrome extension to open one or more user-configured websites side-by-side in the browser's side panel.

<p align="center">
  <img src="src/icons/icon128.png" alt="Quick Launch Icon">
</p>

## Features

-   Open multiple websites simultaneously in the side panel.
-   Manage a list of custom URLs via the extension's settings popup in the side panel:
    -   Add new URLs to the list.
    -   Select/deselect URLs from your list to be displayed in the side panel.
    -   Edit existing URLs directly in the list.
    -   Seamlessly reorder URLs using drag-and-drop, maintaining visibility of active panels during the reordering process.
    -   Delete URLs from the list.
    -   Conveniently open any configured URL in a new tab directly from the settings.
    -   Bulk selection options: Invert selection, Select All, Clear All Selections.
-   Floating refresh button in the side panel to reload the currently displayed website(s) using an optimized refresh mechanism.
-   Modifies necessary HTTP response headers to allow many websites (e.g., `gemini.google.com`, `aistudio.google.com`, and `accounts.google.com` for login) to be embedded in iframes.
-   Remembers your list of URLs and their selection state.
-   Includes a default list of popular AI websites on first installation.
-   Efficiently updates and displays selected websites, ensuring quick transitions when changing your selection.

## Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `src` directory from this project.

## Usage

-   **Open the Sidebar:** Click the extension icon in the Chrome toolbar.
-   **Manage URLs & Settings:**
    -   Inside the side panel, click the **settings icon** (a gear symbol, typically found towards the top-right area of the panel) to reveal the settings popup.
    -   On the settings popup, you can manage your URL list:
        -   **Add new URLs** by typing in the input field and clicking "Add URL".
        -   **Select/Deselect URLs** for display by checking/unchecking the checkbox next to each URL. Selected URLs will appear in the side panel.
        -   **Edit URLs** directly in the list by clicking on the URL text. Press Enter or click away to save.
        -   **Reorder URLs** within their list using drag-and-drop (click and drag the '≡' handle). The order in the list determines the order of iframes if multiple are selected. The drag-and-drop experience has been refined to minimize visual disruption.
        -   **Delete URLs** from the list using the "Delete" button.
        -   **Open a URL** from the list in a new tab using the "Open" button.
        -   Use **Invert Selection**, **Select All**, or **Clear All Selections** buttons for bulk management.
-   **Refresh Content:** Click the **refresh icon** (circular arrow) in the side panel to reload all currently active iframes.

## How it Works

The extension utilizes Chrome's Side Panel API to display web content. It employs an optimized rendering strategy for iframes, efficiently managing their lifecycle and minimizing DOM updates for smoother performance when switching between selected URLs. The settings popup dynamically renders the URL list, employing optimized DOM manipulation techniques (e.g., using DocumentFragments) to ensure smooth performance even with a large number of URLs. It uses the `declarativeNetRequest` API to dynamically modify HTTP response headers. This action removes `x-frame-options` and `content-security-policy` headers from websites, allowing them to be embedded within an iframe in the side panel. It also sets `access-control-allow-origin` to `*`.

User preferences, including the list of custom URLs, their selection state, and their order, are stored using `chrome.storage.local`. On first installation, the extension populates the list with several default AI service URLs. If the URL list becomes empty (e.g., if all URLs are deleted and the panel is reloaded), it will be repopulated with these defaults upon next load.