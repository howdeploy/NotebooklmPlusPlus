// Content script for NotebookLM - Bulk Delete Sources
// Injects a delete button when multiple sources are selected

(function() {
  'use strict';

  let deleteButton = null;
  let isEnabled = true;
  let observer = null;

  // Check if feature is enabled in settings
  async function checkEnabled() {
    try {
      const result = await chrome.storage.sync.get(['enableBulkDelete']);
      isEnabled = result.enableBulkDelete !== false; // Default to true
      return isEnabled;
    } catch (e) {
      return true;
    }
  }

  // Get selected source IDs from the page
  function getSelectedSources() {
    const selected = [];
    const containers = document.querySelectorAll('.single-source-container');

    containers.forEach(container => {
      // Check if this source is selected (checkbox is checked)
      const checkbox = container.querySelector('mat-checkbox');
      const isChecked = checkbox?.classList?.contains('mat-mdc-checkbox-checked') ||
                        container.querySelector('input[type="checkbox"]:checked') !== null;

      if (isChecked) {
        // Extract source ID from the menu button ID: source-item-more-button-{UUID}
        const menuButton = container.querySelector('[id^="source-item-more-button-"]');
        if (menuButton) {
          const buttonId = menuButton.getAttribute('id');
          const sourceId = buttonId.replace('source-item-more-button-', '');
          if (sourceId && sourceId.match(/^[a-f0-9-]{36}$/i)) {
            selected.push(sourceId);
          }
        }

        // Alternative: look for UUID in the container HTML
        if (selected.length === 0 || !selected[selected.length - 1]) {
          const html = container.outerHTML;
          const uuidMatch = html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
          if (uuidMatch && !selected.includes(uuidMatch[0])) {
            selected.push(uuidMatch[0]);
          }
        }
      }
    });

    return [...new Set(selected)]; // Remove duplicates
  }

  // Get notebook ID from URL
  function getNotebookId() {
    const match = window.location.pathname.match(/\/notebook\/([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  // Create the delete button
  function createDeleteButton() {
    if (deleteButton) return deleteButton;

    deleteButton = document.createElement('button');
    deleteButton.id = 'nlm-bulk-delete-btn';
    deleteButton.innerHTML = '🗑️ Delete Selected';
    deleteButton.style.cssText = `
      display: none;
      align-items: center;
      gap: 8px;
      background: rgba(255, 59, 48, 0.15);
      color: #FF3B30;
      border: 1px solid rgba(255, 59, 48, 0.3);
      border-radius: 50px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Google Sans', Roboto, sans-serif;
      transition: all 0.2s ease;
      margin-left: 12px;
      white-space: nowrap;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(255, 59, 48, 0.2);
    `;

    deleteButton.addEventListener('mouseenter', () => {
      deleteButton.style.background = 'rgba(255, 59, 48, 0.25)';
      deleteButton.style.borderColor = 'rgba(255, 59, 48, 0.5)';
      deleteButton.style.transform = 'translateY(-2px)';
      deleteButton.style.boxShadow = '0 6px 20px rgba(255, 59, 48, 0.3)';
    });

    deleteButton.addEventListener('mouseleave', () => {
      deleteButton.style.background = 'rgba(255, 59, 48, 0.15)';
      deleteButton.style.borderColor = 'rgba(255, 59, 48, 0.3)';
      deleteButton.style.transform = 'translateY(0)';
      deleteButton.style.boxShadow = '0 4px 16px rgba(255, 59, 48, 0.2)';
    });

    deleteButton.addEventListener('click', handleDeleteClick);

    // Insert button into the header bar next to notebook title
    insertButtonIntoHeader();

    return deleteButton;
  }

  // Insert button into the header area
  function insertButtonIntoHeader() {
    if (!deleteButton) return;

    // Try to find the header area with notebook title
    const headerSelectors = [
      '.notebook-title-container',
      '[class*="notebook-name"]',
      'header',
      '.mat-toolbar',
      '[class*="header"]'
    ];

    // Find the container with the notebook title (left side of header)
    const notebookTitle = document.querySelector('h1, [class*="title"]');
    let targetContainer = null;

    if (notebookTitle) {
      // Look for a flex container parent
      let parent = notebookTitle.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        if (parent.style.display === 'flex' ||
            getComputedStyle(parent).display === 'flex' ||
            parent.className?.includes('header') ||
            parent.className?.includes('toolbar')) {
          targetContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    if (targetContainer && !targetContainer.contains(deleteButton)) {
      // Insert after the title element
      if (notebookTitle.nextSibling) {
        targetContainer.insertBefore(deleteButton, notebookTitle.nextSibling);
      } else {
        targetContainer.appendChild(deleteButton);
      }
    } else {
      // Fallback: append to body with fixed positioning near header
      deleteButton.style.position = 'fixed';
      deleteButton.style.top = '130px';
      deleteButton.style.left = '180px';
      deleteButton.style.zIndex = '10000';
      document.body.appendChild(deleteButton);
    }
  }

  // Handle delete button click
  async function handleDeleteClick() {
    const selectedSources = getSelectedSources();
    const notebookId = getNotebookId();

    if (selectedSources.length === 0 || !notebookId) {
      console.log('No sources selected or notebook ID not found');
      return;
    }

    // Confirm deletion
    const lang = document.documentElement.lang || 'en';
    const confirmMsg = lang.startsWith('ru')
      ? `Удалить ${selectedSources.length} источник(ов)? Это действие нельзя отменить.`
      : `Delete ${selectedSources.length} source(s)? This cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // Show loading state
    deleteButton.disabled = true;
    const deletingText = lang.startsWith('ru') ? 'Удаление...' : 'Deleting...';
    deleteButton.innerHTML = '⏳ ' + deletingText;
    deleteButton.style.opacity = '0.6';
    deleteButton.style.cursor = 'wait';

    try {
      // Check if extension context is still valid
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        const reloadMsg = lang.startsWith('ru')
          ? 'Расширение было обновлено. Пожалуйста, перезагрузите страницу (F5).'
          : 'Extension was updated. Please reload the page (F5).';
        alert(reloadMsg);
        resetButton();
        return;
      }

      // Send delete request to background script
      const response = await chrome.runtime.sendMessage({
        cmd: 'delete-sources',
        notebookId: notebookId,
        sourceIds: selectedSources
      });

      if (response && response.error) {
        alert('Error: ' + response.error);
        resetButton();
      } else if (!response) {
        const reloadMsg = lang.startsWith('ru')
          ? 'Нет ответа от расширения. Перезагрузите страницу (F5).'
          : 'No response from extension. Please reload the page (F5).';
        alert(reloadMsg);
        resetButton();
      } else {
        // Show success
        const successCount = response.successCount || selectedSources.length;
        const successMsg = lang.startsWith('ru')
          ? `✓ Удалено: ${successCount}`
          : `✓ Deleted: ${successCount}`;

        deleteButton.innerHTML = successMsg;

        // Reload page after short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Delete error:', error);
      const lang = document.documentElement.lang || 'en';

      // Check if it's an extension context invalidation error
      if (error.message && (error.message.includes('sendMessage') || error.message.includes('Extension context'))) {
        const reloadMsg = lang.startsWith('ru')
          ? 'Расширение было обновлено. Перезагрузите страницу (F5).'
          : 'Extension was updated. Please reload the page (F5).';
        alert(reloadMsg);
      } else {
        alert('Error: ' + error.message);
      }
      resetButton();
    }
  }

  // Reset button to default state
  function resetButton() {
    if (!deleteButton) return;
    deleteButton.disabled = false;
    deleteButton.style.opacity = '1';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.background = 'rgba(255, 59, 48, 0.15)';
    deleteButton.style.transform = 'translateY(0)';
    deleteButton.style.boxShadow = '0 4px 16px rgba(255, 59, 48, 0.2)';
    updateButtonVisibility();
  }

  // Update button visibility based on selection
  function updateButtonVisibility() {
    if (!isEnabled) {
      if (deleteButton) deleteButton.style.display = 'none';
      return;
    }

    const selectedSources = getSelectedSources();

    if (!deleteButton) {
      createDeleteButton();
    }

    if (selectedSources.length > 0) {
      const lang = document.documentElement.lang || 'en';
      const text = lang.startsWith('ru')
        ? `🗑️ Удалить (${selectedSources.length})`
        : `🗑️ Delete (${selectedSources.length})`;

      deleteButton.innerHTML = text;
      deleteButton.style.display = 'flex';
      deleteButton.disabled = false;
      deleteButton.style.opacity = '1';
      deleteButton.style.background = 'rgba(255, 59, 48, 0.15)';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.transform = 'translateY(0)';
      deleteButton.style.boxShadow = '0 4px 16px rgba(255, 59, 48, 0.2)';
    } else {
      deleteButton.style.display = 'none';
    }
  }

  // Watch for DOM changes (source selection changes)
  function startObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      // Debounce updates
      clearTimeout(observer._timeout);
      observer._timeout = setTimeout(updateButtonVisibility, 150);
    });

    // Observe the sources panel for changes
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-checked']
    };

    // Find source panel to observe
    const sourcePanel = document.querySelector('.source-panel') || document.body;
    observer.observe(sourcePanel, config);
  }

  // Setup function - can be called multiple times for SPA navigation
  let currentNotebookId = null;

  function setup() {
    const notebookId = getNotebookId();

    // Skip if not on a notebook page
    if (!notebookId) {
      if (deleteButton) {
        deleteButton.style.display = 'none';
      }
      return;
    }

    // Skip if already set up for this notebook
    if (notebookId === currentNotebookId && deleteButton) {
      return;
    }

    currentNotebookId = notebookId;

    // Remove old button if exists
    if (deleteButton) {
      deleteButton.remove();
      deleteButton = null;
    }

    createDeleteButton();
    startObserver();
    setTimeout(updateButtonVisibility, 500);
  }

  // Initialize
  async function init() {
    const enabled = await checkEnabled();
    if (!enabled) {
      return;
    }

    // Initial setup
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }

    // Watch for SPA navigation (URL changes without page reload)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Delay to let Angular render the new page
        setTimeout(setup, 500);
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // Also watch for History API navigation
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      setTimeout(setup, 500);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      setTimeout(setup, 500);
    };

    window.addEventListener('popstate', () => {
      setTimeout(setup, 500);
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.enableBulkDelete) {
        isEnabled = changes.enableBulkDelete.newValue !== false;
        updateButtonVisibility();
      }
    });

    // Also update on clicks (for checkbox interactions)
    document.addEventListener('click', () => {
      setTimeout(updateButtonVisibility, 100);
    });
  }

  init();
})();
