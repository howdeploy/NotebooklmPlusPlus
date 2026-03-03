// Content script for NotebookLM++
// Keeps existing bulk-delete and Drive-sync helpers while adding Phase 2 note selection UI.

(function() {
  'use strict';

  const NOTE_SELECTION_STORAGE_PREFIX = 'nlm-note-selection:';
  const ACTION_HOST_ID = 'nlm-action-host';
  const EXPORT_BAR_ID = 'nlm-note-export-bar';
  const EXPORT_BUTTON_ID = 'nlm-note-export-btn';
  const EXPORT_COUNT_ID = 'nlm-note-export-count';
  const NOTE_CHECKBOX_CLASS = 'nlm-note-checkbox';
  const NOTE_WRAPPER_CLASS = 'nlm-note-selection-chip';
  const NOTE_BADGE_CLASS = 'nlm-note-selection-badge';
  const NOTE_KEY_ATTR = 'data-nlm-note-key';
  const NOTE_INDEX_ATTR = 'data-nlm-note-index';
  const EXPORT_SELECTION_STORAGE_KEY = 'nlmPendingNoteExportSelection';
  const EXTENSION_STYLE_ID = 'nlm-phase2-styles';
  const EXPORT_ACTION_SOURCE = 'phase2-note-selection';

  const NOTE_CONTAINER_SELECTORS = [
    'artifact-library-note',
    '.artifact-item-button',
    '[class*="artifact-library"] [class*="artifact-item"]'
  ];

  const NOTE_HEADING_SELECTORS = [
    '.artifact-title',
    '[data-note-title]',
    'h1',
    'h2',
    'h3',
    'h4',
    '[role="heading"]',
    '[class*="title"]'
  ];

  const EXCLUDED_NOTE_SELECTORS = [
    '.single-source-container',
    '#nlm-bulk-delete-btn',
    '#nlm-sync-drive-btn',
    `#${EXPORT_BAR_ID}`,
    `.${NOTE_WRAPPER_CLASS}`,
    '[data-nlm-ignore="true"]'
  ];

  const FALLBACK_MESSAGES = {
    noteExportAction: {
      en: 'NotebookLM++ Export',
      ru: 'NotebookLM++ Экспорт'
    },
    noteExportSelect: {
      en: 'Select note for NotebookLM++ export',
      ru: 'Выбрать заметку для экспорта NotebookLM++'
    },
    noteExportSelected: {
      en: 'selected',
      ru: 'выбрано'
    },
    noteExportBadge: {
      en: 'Export',
      ru: 'Экспорт'
    },
    noteExportReady: {
      en: 'Selection saved for export',
      ru: 'Выбор сохранён для экспорта'
    },
    noteExportEmpty: {
      en: 'Select at least one note first',
      ru: 'Сначала выберите хотя бы одну заметку'
    },
    noteExportUnavailable: {
      en: 'No exportable notes found yet',
      ru: 'Пока не найдены заметки для экспорта'
    },
    noteExportQueued: {
      en: 'Ready for Phase 3 export pipeline',
      ru: 'Готово для Phase 3 export pipeline'
    },
    noteExportRunning: {
      en: 'Exporting selected notes...',
      ru: 'Экспорт выбранных заметок...'
    },
    noteExportCompleted: {
      en: 'Export automation finished',
      ru: 'Автоматизация экспорта завершена'
    },
    noteExportFailed: {
      en: 'Export automation failed',
      ru: 'Ошибка автоматизации экспорта'
    },
    noteExportStatusRunning: {
      en: 'Export in progress',
      ru: 'Экспорт выполняется'
    },
    noteExportStatusFinished: {
      en: 'Last export batch',
      ru: 'Последний batch экспорта'
    },
    noteExportResultReady: {
      en: 'Export triggered',
      ru: 'Экспорт запущен'
    },
    noteExportResultError: {
      en: 'Export failed',
      ru: 'Экспорт не удался'
    },
    noteExportResultPending: {
      en: 'Waiting',
      ru: 'Ожидание'
    },
    noteExportResultModeDirect: {
      en: 'direct control',
      ru: 'прямой control'
    },
    noteExportResultModeMenu: {
      en: 'menu action',
      ru: 'через меню'
    },
    noteExportResultModeUnknown: {
      en: 'automation path',
      ru: 'automation path'
    },
    noteExportResultsEmpty: {
      en: 'No export batch recorded yet',
      ru: 'Пока нет сохранённого batch экспорта'
    },
    noteExportResultsClear: {
      en: 'Clear results',
      ru: 'Очистить результаты'
    },
    noteExportResultsHint: {
      en: 'NotebookLM usually opens exported Google Docs in its own flow. Use these note titles to verify what finished.',
      ru: 'NotebookLM обычно открывает экспортированные Google Docs своим нативным способом. Используйте эти названия заметок, чтобы сверить, что завершилось.'
    },
    noteExportProgressSummary: {
      en: 'Completed',
      ru: 'Завершено'
    },
    noteExportSucceededCount: {
      en: 'Succeeded',
      ru: 'Успешно'
    },
    noteExportFailedCount: {
      en: 'Failed',
      ru: 'Ошибки'
    },
    noteExportNativeMissing: {
      en: 'Native NotebookLM export control not found',
      ru: 'Не найден нативный control экспорта NotebookLM'
    },
    noteExportNativeClicked: {
      en: 'Triggered native NotebookLM export',
      ru: 'Запущен нативный экспорт NotebookLM'
    },
    syncDriveSources: {
      en: 'Sync Google Drive sources',
      ru: 'Синхронизировать Google Drive источники'
    },
    syncing: {
      en: 'Syncing...',
      ru: 'Синхронизация...'
    },
    deleteSelected: {
      en: 'Delete Selected',
      ru: 'Удалить выбранное'
    },
    deleting: {
      en: 'Deleting...',
      ru: 'Удаление...'
    },
    extensionReload: {
      en: 'Extension was updated. Please reload the page (F5).',
      ru: 'Расширение было обновлено. Пожалуйста, перезагрузите страницу (F5).'
    },
    noResponse: {
      en: 'No response from extension. Please reload the page (F5).',
      ru: 'Нет ответа от расширения. Перезагрузите страницу (F5).'
    }
  };

  let deleteButton = null;
  let syncButton = null;
  let exportActionBar = null;
  let exportActionButton = null;
  let exportCount = null;
  let observer = null;
  let isEnabled = true;
  let isSyncEnabled = true;
  let isSyncing = false;
  let currentNotebookId = null;
  let noteRegistry = new Map();
  let selectionStateByNotebook = new Map();
  let selectionLoadedForNotebook = new Set();
  let saveSelectionTimeout = null;
  let exportInProgress = false;
  // Status panel variables removed — export runs silently.

  function getLang() {
    return (document.documentElement.lang || navigator.language || 'en').substring(0, 2).toLowerCase();
  }

  function t(key) {
    try {
      const localized = chrome.i18n?.getMessage?.(key);
      if (localized) {
        return localized;
      }
    } catch (error) {
      // Fall back to inline defaults.
    }

    const entry = FALLBACK_MESSAGES[key];
    if (!entry) {
      return key;
    }

    return entry[getLang()] || entry.en || key;
  }

  function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function isVisible(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }

    if (element.matches('artifact-library-note')) {
      return element.querySelector('.artifact-item-button, .artifact-title') !== null;
    }

    if (element.offsetParent === null && getComputedStyle(element).position !== 'fixed') {
      return false;
    }

    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    return true;
  }

  function stableHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }

    return `nlm-${Math.abs(hash).toString(36)}`;
  }

  function getNotebookId() {
    const match = window.location.pathname.match(/\/notebook\/([^/?#]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    const notebookRoot = document.querySelector('notebook, notebook-header');
    const fallbackId = notebookRoot?.getAttribute('data-notebook-id') ||
      notebookRoot?.getAttribute('notebook-id') ||
      notebookRoot?.getAttribute('data-id');
    return fallbackId || null;
  }

  function getNotebookScopeId() {
    const explicitId = getNotebookId();
    if (explicitId) {
      return explicitId;
    }

    const title = normalizeText(document.querySelector('notebook-header .notebook-title, h1.notebook-title, h1')?.textContent);
    if (title) {
      return `title:${title}`;
    }

    const path = normalizeText(window.location.pathname);
    if (path && path !== '/') {
      return `path:${path}`;
    }

    const hasArtifacts = document.querySelector('artifact-library-note, .artifact-item-button');
    if (hasArtifacts) {
      return 'notebook:unknown';
    }

    return null;
  }

  function getSelectionStorageKey(notebookId) {
    return `${NOTE_SELECTION_STORAGE_PREFIX}${notebookId}`;
  }

  function ensureSelectionSet(notebookId) {
    if (!selectionStateByNotebook.has(notebookId)) {
      selectionStateByNotebook.set(notebookId, new Set());
    }

    return selectionStateByNotebook.get(notebookId);
  }

  async function loadPersistedSelection(notebookId) {
    if (!notebookId || selectionLoadedForNotebook.has(notebookId)) {
      return;
    }

    try {
      const result = await chrome.storage.local.get([getSelectionStorageKey(notebookId)]);
      const stored = result[getSelectionStorageKey(notebookId)];
      const nextSet = ensureSelectionSet(notebookId);
      nextSet.clear();

      if (stored && stored.notebookId === notebookId && Array.isArray(stored.noteKeys)) {
        stored.noteKeys.forEach((noteKey) => {
          if (typeof noteKey === 'string' && noteKey) {
            nextSet.add(noteKey);
          }
        });
      }
    } catch (error) {
      // Ignore storage restore failures and continue in-memory only.
    } finally {
      selectionLoadedForNotebook.add(notebookId);
    }
  }

  function scheduleSelectionPersist(notebookId) {
    clearTimeout(saveSelectionTimeout);
    saveSelectionTimeout = setTimeout(async () => {
      if (!notebookId) {
        return;
      }

      const noteKeys = Array.from(ensureSelectionSet(notebookId));

      try {
        await chrome.storage.local.set({
          [getSelectionStorageKey(notebookId)]: {
            notebookId,
            noteKeys,
            updatedAt: Date.now()
          }
        });
      } catch (error) {
        // Ignore persistence failures for this phase.
      }
    }, 120);
  }

  async function checkEnabled() {
    try {
      const result = await chrome.storage.sync.get(['enableBulkDelete']);
      isEnabled = result.enableBulkDelete !== false;
      return isEnabled;
    } catch (error) {
      return true;
    }
  }

  async function checkSyncEnabled() {
    try {
      const result = await chrome.storage.sync.get(['enableSyncDrive']);
      isSyncEnabled = result.enableSyncDrive !== false;
      return isSyncEnabled;
    } catch (error) {
      return true;
    }
  }

  function getHeaderAnchor() {
    const notebookTitle = document.querySelector('main h1, header h1, h1');
    if (!notebookTitle) {
      return null;
    }

    let parent = notebookTitle.parentElement;
    for (let i = 0; i < 6 && parent; i++) {
      const className = typeof parent.className === 'string' ? parent.className : '';
      const style = getComputedStyle(parent);
      const isNotebookLevelContainer = !parent.closest('artifact-library-note') && (
        style.display === 'flex' ||
        style.display === 'grid' ||
        className.includes('header') ||
        className.includes('toolbar')
      );
      if (
        isNotebookLevelContainer
      ) {
        return { notebookTitle, targetContainer: parent };
      }
      parent = parent.parentElement;
    }

    return { notebookTitle, targetContainer: notebookTitle.parentElement };
  }

  function ensureActionHost() {
    const notesContainer = findNotesContainer();

    let host = document.getElementById(ACTION_HOST_ID);

    // Notes list not visible (e.g. a note is open) — hide the host
    if (!notesContainer) {
      if (host && host.isConnected) host.remove();
      return null;
    }

    const anchor = getHeaderAnchor();
    if (!anchor || !anchor.targetContainer) {
      if (host && host.isConnected) host.remove();
      return null;
    }

    if (!host) {
      host = document.createElement('div');
      host.id = ACTION_HOST_ID;
      host.dataset.nlmIgnore = 'true';
      host.style.cssText = `
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-left: 12px;
      `;
    }

    if (!host.isConnected) {
      const { notebookTitle, targetContainer } = anchor;
      if (notebookTitle && notebookTitle.nextSibling) {
        targetContainer.insertBefore(host, notebookTitle.nextSibling);
      } else {
        targetContainer.appendChild(host);
      }
    }

    return host;
  }

  function addFloatingFallback(element, top, left) {
    if (!element || element.isConnected) {
      return;
    }

    element.style.position = 'fixed';
    element.style.top = top;
    element.style.left = left;
    element.style.zIndex = '10000';
    document.body.appendChild(element);
  }

  function getSelectedSources() {
    const selected = [];
    const containers = document.querySelectorAll('.single-source-container');

    containers.forEach((container) => {
      const checkbox = container.querySelector('mat-checkbox');
      const isChecked = checkbox?.classList?.contains('mat-mdc-checkbox-checked') ||
        container.querySelector('input[type="checkbox"]:checked') !== null;

      if (!isChecked) {
        return;
      }

      const menuButton = container.querySelector('[id^="source-item-more-button-"]');
      if (menuButton) {
        const buttonId = menuButton.getAttribute('id');
        const sourceId = buttonId.replace('source-item-more-button-', '');
        if (sourceId && sourceId.match(/^[a-f0-9-]{36}$/i)) {
          selected.push(sourceId);
          return;
        }
      }

      const html = container.outerHTML;
      const uuidMatch = html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
      if (uuidMatch && !selected.includes(uuidMatch[0])) {
        selected.push(uuidMatch[0]);
      }
    });

    return [...new Set(selected)];
  }

  function createDeleteButton() {
    if (deleteButton) {
      return deleteButton;
    }

    deleteButton = document.createElement('button');
    deleteButton.id = 'nlm-bulk-delete-btn';
    deleteButton.dataset.nlmIgnore = 'true';
    deleteButton.innerHTML = `🗑️ ${t('deleteSelected')}`;
    deleteButton.style.cssText = `
      display: none;
      align-items: center;
      gap: 8px;
      background: rgba(243, 139, 168, 0.12);
      color: #f38ba8;
      border: 1px solid rgba(243, 139, 168, 0.25);
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Fira Code', 'Google Sans', Roboto, monospace;
      transition: background 0.2s ease, border-color 0.2s ease;
      white-space: nowrap;
    `;

    deleteButton.addEventListener('mouseenter', () => {
      deleteButton.style.background = 'rgba(243, 139, 168, 0.2)';
      deleteButton.style.borderColor = 'rgba(243, 139, 168, 0.4)';
    });

    deleteButton.addEventListener('mouseleave', () => {
      deleteButton.style.background = 'rgba(243, 139, 168, 0.12)';
      deleteButton.style.borderColor = 'rgba(243, 139, 168, 0.25)';
    });

    deleteButton.addEventListener('click', handleDeleteClick);
    return deleteButton;
  }

  function mountDeleteButton() {
    const button = createDeleteButton();
    const host = ensureActionHost();

    if (host && !host.contains(button)) {
      host.appendChild(button);
      button.style.position = 'static';
      button.style.top = '';
      button.style.left = '';
      return;
    }

    addFloatingFallback(button, '130px', '180px');
  }

  async function handleDeleteClick() {
    const selectedSources = getSelectedSources();
    const notebookId = getNotebookId();

    if (selectedSources.length === 0 || !notebookId) {
      return;
    }

    const lang = getLang();
    const confirmMsg = lang === 'ru'
      ? `Удалить ${selectedSources.length} источник(ов)? Это действие нельзя отменить.`
      : `Delete ${selectedSources.length} source(s)? This cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    deleteButton.disabled = true;
    deleteButton.innerHTML = `⏳ ${t('deleting')}`;
    deleteButton.style.opacity = '0.6';
    deleteButton.style.cursor = 'wait';

    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        alert(t('extensionReload'));
        resetDeleteButton();
        return;
      }

      const response = await chrome.runtime.sendMessage({
        cmd: 'delete-sources',
        notebookId,
        sourceIds: selectedSources
      });

      if (response?.error) {
        alert(`Error: ${response.error}`);
        resetDeleteButton();
        return;
      }

      if (!response) {
        alert(t('noResponse'));
        resetDeleteButton();
        return;
      }

      const successCount = response.successCount || selectedSources.length;
      deleteButton.innerHTML = lang === 'ru'
        ? `✓ Удалено: ${successCount}`
        : `✓ Deleted: ${successCount}`;

      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      if (error.message && (error.message.includes('sendMessage') || error.message.includes('Extension context'))) {
        alert(t('extensionReload'));
      } else {
        alert(`Error: ${error.message}`);
      }
      resetDeleteButton();
    }
  }

  function resetDeleteButton() {
    if (!deleteButton) {
      return;
    }

    deleteButton.disabled = false;
    deleteButton.style.opacity = '1';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.background = 'rgba(243, 139, 168, 0.12)';
    updateDeleteButtonVisibility();
  }

  function updateDeleteButtonVisibility() {
    if (!isEnabled) {
      if (deleteButton) {
        deleteButton.style.display = 'none';
      }
      return;
    }

    mountDeleteButton();

    const selectedSources = getSelectedSources();
    if (selectedSources.length > 0) {
      deleteButton.innerHTML = getLang() === 'ru'
        ? `🗑️ Удалить (${selectedSources.length})`
        : `🗑️ Delete (${selectedSources.length})`;
      deleteButton.style.display = 'flex';
      deleteButton.disabled = false;
      deleteButton.style.opacity = '1';
      deleteButton.style.cursor = 'pointer';
    } else {
      deleteButton.style.display = 'none';
    }
  }

  const SYNC_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.5 11.5a10 10 0 0 1 18.4-4.3L21.5 8"/><path d="M21.5 12.5a10 10 0 0 1-18.4 4.3L2.5 16"/></svg>';

  function createSyncButton() {
    if (syncButton) {
      return syncButton;
    }

    syncButton = document.createElement('button');
    syncButton.id = 'nlm-sync-drive-btn';
    syncButton.dataset.nlmIgnore = 'true';
    syncButton.innerHTML = SYNC_ICON_SVG;
    syncButton.title = t('syncDriveSources');
    syncButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      color: #6c7086;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      padding: 0;
      transition: background 0.2s ease, color 0.2s ease;
      flex-shrink: 0;
    `;

    syncButton.addEventListener('mouseenter', () => {
      if (!isSyncing) {
        syncButton.style.background = 'rgba(137, 180, 250, 0.12)';
        syncButton.style.color = '#89b4fa';
      }
    });

    syncButton.addEventListener('mouseleave', () => {
      if (!isSyncing) {
        syncButton.style.background = 'transparent';
        syncButton.style.color = '#6c7086';
      }
    });

    syncButton.addEventListener('click', handleSyncClick);
    return syncButton;
  }

  function insertSyncButton() {
    const button = createSyncButton();
    if (button.parentElement) {
      return;
    }

    const headings = document.querySelectorAll('h2, h3, [class*="heading"], [class*="title"]');
    let sourcesHeading = null;
    for (const heading of headings) {
      const text = normalizeText(heading.textContent).toLowerCase();
      if (text === 'sources' || text === 'источники') {
        sourcesHeading = heading;
        break;
      }
    }

    if (sourcesHeading?.parentElement) {
      const container = sourcesHeading.parentElement;
      const lastChild = container.lastElementChild;
      if (lastChild && lastChild !== sourcesHeading && lastChild !== button) {
        container.insertBefore(button, lastChild);
      } else {
        container.appendChild(button);
      }
      return;
    }

    addFloatingFallback(button, '90px', '350px');
  }

  async function handleSyncClick() {
    if (isSyncing) {
      return;
    }

    const notebookId = getNotebookId();
    if (!notebookId) {
      return;
    }

    isSyncing = true;
    syncButton.style.color = '#89b4fa';
    syncButton.style.animation = 'nlm-spin 1s linear infinite';
    syncButton.disabled = true;
    syncButton.style.cursor = 'wait';
    syncButton.title = t('syncing');

    ensureStyleSheet();

    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        showToast(t('extensionReload'), 'error');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        cmd: 'sync-drive-sources',
        notebookId
      });

      if (response?.error) {
        showToast(`Error: ${response.error}`, 'error');
      } else if (response?.success) {
        const results = response.results;
        const driveTotal = results.synced + results.fresh + results.errors;

        if (driveTotal === 0) {
          showToast(getLang() === 'ru' ? 'Нет источников Google Drive' : 'No Google Drive sources found', 'info');
        } else if (results.synced > 0) {
          showToast(
            getLang() === 'ru'
              ? `Синхронизировано: ${results.synced}, актуальны: ${results.fresh}`
              : `Synced: ${results.synced}, up-to-date: ${results.fresh}`,
            'success'
          );
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast(
            getLang() === 'ru'
              ? `Все ${results.fresh} Drive-источник(ов) актуальны`
              : `All ${results.fresh} Drive source(s) up-to-date`,
            'success'
          );
        }
      } else {
        showToast(getLang() === 'ru' ? 'Нет ответа' : 'No response', 'error');
      }
    } catch (error) {
      if (error.message && (error.message.includes('sendMessage') || error.message.includes('Extension context'))) {
        showToast(t('extensionReload'), 'error');
      } else {
        showToast(`Error: ${error.message}`, 'error');
      }
    } finally {
      resetSyncButton();
    }
  }

  function resetSyncButton() {
    isSyncing = false;
    if (!syncButton) {
      return;
    }

    syncButton.disabled = false;
    syncButton.style.cursor = 'pointer';
    syncButton.style.animation = 'none';
    syncButton.style.color = '#6c7086';
    syncButton.style.background = 'transparent';
    syncButton.title = t('syncDriveSources');
  }

  function showToast(message, type) {
    const existing = document.getElementById('nlm-sync-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'nlm-sync-toast';
    toast.dataset.nlmIgnore = 'true';

    const colors = {
      success: { bg: '#313244', border: 'rgba(166, 227, 161, 0.3)', text: '#a6e3a1' },
      error: { bg: '#313244', border: 'rgba(243, 139, 168, 0.3)', text: '#f38ba8' },
      info: { bg: '#313244', border: 'rgba(137, 180, 250, 0.3)', text: '#89b4fa' }
    };
    const color = colors[type] || colors.info;

    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color.bg};
      color: ${color.text};
      border: 1px solid ${color.border};
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 13px;
      font-family: 'Fira Code', 'Google Sans', Roboto, monospace;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function ensureStyleSheet() {
    if (document.getElementById(EXTENSION_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = EXTENSION_STYLE_ID;
    style.textContent = `
      @keyframes nlm-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      artifact-library-note {
        display: flex !important;
        align-items: stretch;
        position: relative;
      }

      artifact-library-note .artifact-item-button {
        flex: 1;
        min-width: 0;
      }

      .${NOTE_WRAPPER_CLASS} {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 28px;
        padding: 0;
        margin: 0;
        cursor: pointer;
        border-right: 1px solid #45475a;
        background: transparent;
        transition: background 0.15s ease;
      }

      .${NOTE_WRAPPER_CLASS}:hover {
        background: rgba(203, 166, 247, 0.08);
      }

      .${NOTE_WRAPPER_CLASS} input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: #cba6f7;
        cursor: pointer;
        margin: 0;
      }

      .${NOTE_BADGE_CLASS} {
        display: none;
      }

      .nlm-note-selected {
        outline: 2px solid rgba(203, 166, 247, 0.25);
        outline-offset: -2px;
        border-radius: 8px;
      }

      #${EXPORT_BAR_ID} {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        background: #313244;
        border: 1px solid #45475a;
        color: #cdd6f4;
        font-family: 'Fira Code', 'Google Sans', Roboto, monospace;
      }

      #${EXPORT_BUTTON_ID} {
        border: none;
        background: #89b4fa;
        color: #1e1e2e;
        padding: 9px 14px;
        border-radius: 8px;
        font: 600 13px/1 'Fira Code', 'Google Sans', Roboto, monospace;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      #${EXPORT_BUTTON_ID}:hover:not([disabled]) {
        background: #b4befe;
      }

      #${EXPORT_BUTTON_ID}[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      #${EXPORT_COUNT_ID} {
        font: 600 12px/1 'Fira Code', 'Google Sans', Roboto, monospace;
        white-space: nowrap;
        color: #a6adc8;
      }

      /* Status panel styles removed — export runs silently */
    `;
    document.head.appendChild(style);
  }

  function hasExcludedAncestor(element) {
    return EXCLUDED_NOTE_SELECTORS.some((selector) => element.closest(selector));
  }

  function buildCandidateList() {
    const selector = NOTE_CONTAINER_SELECTORS.join(',');
    const candidates = [];
    const seen = new Set();

    document.querySelectorAll(selector).forEach((element) => {
      if (!(element instanceof HTMLElement) || seen.has(element)) {
        return;
      }
      seen.add(element);
      candidates.push(element);
    });

    return candidates;
  }

  function isLikelyExportableNote(element) {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      return false;
    }

    if (hasExcludedAncestor(element)) {
      return false;
    }

    if (element.matches('artifact-library-note') && element.querySelector('.artifact-title')) {
      return true;
    }

    const text = normalizeText(element.innerText);
    if (text.length < 40 || text.length > 6000) {
      return false;
    }

    if (element.querySelector('.single-source-container')) {
      return false;
    }

    const heading = findNoteHeading(element);
    const contentBlocks = element.querySelectorAll('p, li, blockquote, pre').length;
    const buttons = element.querySelectorAll('button, [role="button"]').length;

    if (!heading && contentBlocks === 0 && buttons < 2) {
      return false;
    }

    return true;
  }

  function findNoteHeading(element) {
    for (const selector of NOTE_HEADING_SELECTORS) {
      const heading = element.querySelector(selector);
      const text = normalizeText(heading?.textContent);
      if (text && text.length >= 3) {
        return heading;
      }
    }

    return null;
  }

  function deriveNoteKey(element, notebookId, index) {
    const artifactTitle = element.querySelector('.artifact-title');
    if (artifactTitle) {
      const title = normalizeText(artifactTitle.textContent);
      if (title.length >= 3) {
        return stableHash(`${notebookId}:artifact:${title}`);
      }
    }

    const explicitCandidates = [
      element.getAttribute('data-note-id'),
      element.getAttribute('data-note-key'),
      element.id
    ].filter(Boolean);

    for (const candidate of explicitCandidates) {
      if (candidate && candidate.length >= 4) {
        return `note-${candidate}`;
      }
    }

    const actionElement = element.querySelector('[id*="note"], [data-note-id], [aria-controls]');
    if (actionElement) {
      const actionId = actionElement.getAttribute('id') ||
        actionElement.getAttribute('data-note-id') ||
        actionElement.getAttribute('aria-controls');
      if (actionId) {
        return `note-${actionId}`;
      }
    }

    const title = normalizeText(findNoteHeading(element)?.textContent);
    const snippet = normalizeText(element.innerText).slice(0, 140);
    return stableHash(`${notebookId}:${title}:${snippet}:${index}`);
  }

  function discoverExportableNotes() {
    const notebookId = getNotebookScopeId();
    const discovered = [];
    const seenKeys = new Set();

    buildCandidateList().forEach((element, index) => {
      if (!isLikelyExportableNote(element)) {
        return;
      }

      const key = deriveNoteKey(element, notebookId || 'unknown', index);
      if (seenKeys.has(key)) {
        return;
      }

      const title = normalizeText(findNoteHeading(element)?.textContent) || normalizeText(element.innerText).slice(0, 80);
      discovered.push({
        key,
        title: title || `Note ${index + 1}`,
        element,
        index
      });
      seenKeys.add(key);
    });

    return discovered;
  }

  function updateNoteVisualState(note, isSelected) {
    note.element.classList.toggle('nlm-note-selected', isSelected);
    const existingWrapper = note.element.querySelector(`.${NOTE_WRAPPER_CLASS}`);
    const checkbox = existingWrapper?.querySelector(`input.${NOTE_CHECKBOX_CLASS}`);
    if (checkbox && checkbox.checked !== isSelected) {
      checkbox.checked = isSelected;
    }
  }

  function handleNoteCheckboxChange(noteKey, checked) {
    const notebookId = getNotebookScopeId();
    if (!notebookId) {
      return;
    }

    const selectedSet = ensureSelectionSet(notebookId);
    if (checked) {
      selectedSet.add(noteKey);
    } else {
      selectedSet.delete(noteKey);
    }

    const note = noteRegistry.get(noteKey);
    if (note) {
      updateNoteVisualState(note, checked);
    }

    scheduleSelectionPersist(notebookId);
    syncExportActionUi();
  }

  function injectNoteCheckbox(note) {
    note.element.setAttribute(NOTE_KEY_ATTR, note.key);
    note.element.setAttribute(NOTE_INDEX_ATTR, String(note.index));

    let wrapper = note.element.querySelector(`.${NOTE_WRAPPER_CLASS}`);
    if (!wrapper) {
      wrapper = document.createElement('label');
      wrapper.className = NOTE_WRAPPER_CLASS;
      wrapper.dataset.nlmIgnore = 'true';
      wrapper.setAttribute('aria-label', t('noteExportSelect'));

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = NOTE_CHECKBOX_CLASS;
      checkbox.dataset.noteKey = note.key;
      checkbox.addEventListener('change', (event) => {
        handleNoteCheckboxChange(note.key, event.target.checked);
      });

      const badge = document.createElement('span');
      badge.className = NOTE_BADGE_CLASS;
      badge.style.display = 'none';
      badge.innerHTML = `<strong>NotebookLM++</strong> ${t('noteExportBadge')}`;

      wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-shrink:0;width:28px;padding:0;margin:0;cursor:pointer;border-right:1px solid #45475a;background:transparent';

      wrapper.appendChild(checkbox);
      wrapper.appendChild(badge);
    }

    if (wrapper.parentElement !== note.element) {
      note.element.prepend(wrapper);
    }

    // Force flex layout on the note element (Angular styles may override stylesheet)
    note.element.style.display = 'flex';
    note.element.style.alignItems = 'stretch';

    const selectedSet = ensureSelectionSet(getNotebookScopeId());
    updateNoteVisualState(note, selectedSet.has(note.key));
  }

  function rebuildNoteRegistry() {
    noteRegistry.clear();
    discoverExportableNotes().forEach((note) => {
      noteRegistry.set(note.key, note);
      injectNoteCheckbox(note);
    });
  }

  function createExportActionBar() {
    if (exportActionBar) {
      return exportActionBar;
    }

    exportActionBar = document.createElement('div');
    exportActionBar.id = EXPORT_BAR_ID;
    exportActionBar.dataset.nlmIgnore = 'true';

    exportActionButton = document.createElement('button');
    exportActionButton.id = EXPORT_BUTTON_ID;
    exportActionButton.type = 'button';
    exportActionButton.textContent = t('noteExportAction');
    exportActionButton.addEventListener('click', handleExportActionClick);

    exportCount = document.createElement('span');
    exportCount.id = EXPORT_COUNT_ID;

    exportActionBar.appendChild(exportActionButton);
    exportActionBar.appendChild(exportCount);
    return exportActionBar;
  }

  // createExportStatusPanel removed — export runs silently.

  function findNotesContainer() {
    // Find the Studio panel that contains the artifact-library notes
    const selectors = [
      'artifact-library',
      '.artifact-library-container',
      '.panel-content-scrollable',
      'section.studio-panel'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function mountExportActionBar() {
    const bar = createExportActionBar();
    const notesContainer = findNotesContainer();

    // Notes list not visible (e.g. a note is open) — detach and hide
    if (!notesContainer || !notesContainer.parentElement) {
      if (bar.isConnected) bar.remove();
      return;
    }

    // Already in the right place
    if (bar.isConnected && bar.parentElement === notesContainer.parentElement) return;

    // Mount above the notes container
    notesContainer.parentElement.insertBefore(bar, notesContainer);
    bar.style.cssText = 'position:static;margin:0 12px 8px';
  }

  // Status panel removed — export runs silently.

  function getSelectedNotes() {
    const notebookId = getNotebookScopeId();
    if (!notebookId) {
      return [];
    }

    const selectedSet = ensureSelectionSet(notebookId);
    return Array.from(selectedSet)
      .map((noteKey) => noteRegistry.get(noteKey))
      .filter(Boolean)
      .map((note) => ({
        key: note.key,
        title: note.title,
        index: note.index
      }));
  }

  function syncExportActionUi() {
    mountExportActionBar();

    const notebookId = getNotebookScopeId();
    const selectedSet = notebookId ? ensureSelectionSet(notebookId) : new Set();
    const selectedCount = selectedSet.size;
    const hasNotes = noteRegistry.size > 0;

    exportActionBar.style.display = hasNotes ? 'flex' : 'none';
    exportActionButton.disabled = selectedCount === 0 || exportInProgress;
    exportActionButton.textContent = selectedCount > 0
      ? `${t('noteExportAction')} (${selectedCount})`
      : t('noteExportAction');
    exportCount.textContent = selectedCount > 0
      ? `${selectedCount} ${t('noteExportSelected')}`
      : '';
  }

  function getAccessibleText(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return '';
    }

    const values = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-tooltip'),
      element.textContent
    ].filter(Boolean);

    return normalizeText(values.join(' ')).toLowerCase();
  }

  function isVisibleClickable(element) {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      return false;
    }

    if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    return true;
  }

  function findCandidateButtons(root) {
    if (!(root instanceof HTMLElement)) {
      return [];
    }

    return Array.from(root.querySelectorAll('button, [role="button"], [role="menuitem"], [aria-label], [title]'))
      .filter((element) => isVisibleClickable(element) && !element.closest('[data-nlm-ignore="true"]'));
  }

  function findNativeExportButton(noteElement) {
    const artifactMenuButton = noteElement.querySelector('.artifact-more-button');
    if (artifactMenuButton && isVisibleClickable(artifactMenuButton)) {
      return { type: 'menu', element: artifactMenuButton };
    }

    const directPatterns = [
      /google docs/i,
      /\bdocs\b/i,
      /export/i,
      /документ/i,
      /экспорт/i
    ];

    const menuPatterns = [
      /more/i,
      /options/i,
      /actions/i,
      /menu/i,
      /ещ[её]/i,
      /действ/i
    ];

    const buttons = findCandidateButtons(noteElement);
    const directMatch = buttons.find((button) => {
      const text = getAccessibleText(button);
      return directPatterns.some((pattern) => pattern.test(text));
    });

    if (directMatch) {
      return { type: 'direct', element: directMatch };
    }

    const menuMatch = buttons.find((button) => {
      const text = getAccessibleText(button);
      return menuPatterns.some((pattern) => pattern.test(text));
    });

    if (menuMatch) {
      return { type: 'menu', element: menuMatch };
    }

    return null;
  }

  function findNativeMenuExportItem() {
    const visibleMenus = Array.from(document.querySelectorAll('[role="menu"].mat-mdc-menu-panel, [role="menu"]'))
      .filter((menu) => isVisible(menu));

    for (const menu of visibleMenus) {
      const items = Array.from(menu.querySelectorAll('[role="menuitem"], button'))
        .filter((item) => isVisibleClickable(item) && !(item.id && item.id.startsWith('nlm-')));

      const iconMatch = items.find((item) => {
        const icon = item.querySelector('mat-icon');
        return normalizeText(icon?.textContent) === 'drive_document';
      });
      if (iconMatch) {
        return iconMatch;
      }

      const textMatch = items.find((item) => {
        const text = getAccessibleText(item);
        return /google docs|\bdocs\b|export|документ|экспорт/i.test(text);
      });
      if (textMatch) {
        return textMatch;
      }
    }

    return null;
  }

  function suppressNewTabs() {
    const origOpen = window.open;
    window.open = function() { return null; };

    const origAssign = Object.getOwnPropertyDescriptor(Location.prototype, 'assign');
    if (origAssign && origAssign.configurable) {
      Object.defineProperty(Location.prototype, 'assign', {
        configurable: true,
        value: function() {}
      });
    }

    // Also intercept click-created <a target="_blank"> navigations
    function blockBlankLinks(e) {
      const link = e.target.closest?.('a[target="_blank"]');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener('click', blockBlankLinks, true);

    return function restore() {
      window.open = origOpen;
      if (origAssign && origAssign.configurable) {
        Object.defineProperty(Location.prototype, 'assign', origAssign);
      }
      document.removeEventListener('click', blockBlankLinks, true);
    };
  }

  async function triggerNativeNoteExport(note) {
    const noteElement = note?.element;
    if (!(noteElement instanceof HTMLElement)) {
      return { success: false, reason: 'note_missing' };
    }

    noteElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await wait(180);

    const nativeTrigger = findNativeExportButton(noteElement);
    if (!nativeTrigger) {
      return { success: false, reason: 'native_control_missing' };
    }

    const restoreTabs = suppressNewTabs();

    try {
      nativeTrigger.element.click();

      if (nativeTrigger.type === 'direct') {
        await wait(800);
        return { success: true, mode: 'direct' };
      }

      await wait(250);
      const menuItem = findNativeMenuExportItem();
      if (!menuItem) {
        return { success: false, reason: 'native_menu_item_missing' };
      }

      menuItem.click();
      await wait(900);
      return { success: true, mode: 'menu' };
    } finally {
      restoreTabs();
    }
  }

  // Export status/results functions removed — export runs silently.

  async function handleExportActionClick() {
    const notebookId = getNotebookScopeId();
    if (!notebookId) {
      showToast(t('noteExportUnavailable'), 'error');
      return;
    }

    const selectedNotes = getSelectedNotes();
    if (selectedNotes.length === 0) {
      showToast(t('noteExportEmpty'), 'info');
      return;
    }

    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      showToast(t('extensionReload'), 'error');
      return;
    }

    exportInProgress = true;
    syncExportActionUi();

    try {
      await chrome.runtime.sendMessage({
        cmd: 'set-note-export-selection',
        notebookId,
        noteKeys: selectedNotes.map((note) => note.key),
        notes: selectedNotes,
        source: EXPORT_ACTION_SOURCE
      });

      for (const selectedNote of selectedNotes) {
        const liveNote = noteRegistry.get(selectedNote.key);
        await triggerNativeNoteExport(liveNote);
      }
    } catch (error) {
      // silent
    } finally {
      exportInProgress = false;
      syncExportActionUi();
    }
  }

  function setupSyncButton() {
    if (!isSyncEnabled) {
      if (syncButton) {
        syncButton.style.display = 'none';
      }
      return;
    }

    const notebookId = getNotebookScopeId();
    if (!notebookId) {
      if (syncButton) {
        syncButton.style.display = 'none';
      }
      return;
    }

    insertSyncButton();
    syncButton.style.display = 'flex';
  }

  function refreshInjectedUi() {
    if (!getNotebookScopeId()) {
      if (deleteButton) {
        deleteButton.style.display = 'none';
      }
      if (syncButton) {
        syncButton.style.display = 'none';
      }
      if (exportActionBar) {
        exportActionBar.style.display = 'none';
      }
      noteRegistry.clear();
      return;
    }

    ensureStyleSheet();
    rebuildNoteRegistry();
    updateDeleteButtonVisibility();
    setupSyncButton();
    syncExportActionUi();
  }

  function startObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(() => {
      clearTimeout(observer._timeout);
      observer._timeout = setTimeout(refreshInjectedUi, 180);
    });

    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-checked']
    };

    observer.observe(document.body, config);
  }

  async function setup() {
    const notebookId = getNotebookScopeId();

    if (!notebookId) {
      refreshInjectedUi();
      return;
    }

    currentNotebookId = notebookId;
    await loadPersistedSelection(notebookId);
    refreshInjectedUi();
    startObserver();
  }

  async function init() {
    document.documentElement.setAttribute('data-nlm-ext', 'phase2-selection');

    await Promise.all([checkEnabled(), checkSyncEnabled()]);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setup();
      });
    } else {
      setup();
    }

    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
          setup();
        }, 500);
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      setTimeout(() => {
        setup();
      }, 500);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      setTimeout(() => {
        setup();
      }, 500);
    };

    window.addEventListener('popstate', () => {
      setTimeout(() => {
        setup();
      }, 500);
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'sync') {
        return;
      }

      if (changes.enableBulkDelete) {
        isEnabled = changes.enableBulkDelete.newValue !== false;
        updateDeleteButtonVisibility();
      }

      if (changes.enableSyncDrive) {
        isSyncEnabled = changes.enableSyncDrive.newValue !== false;
        setupSyncButton();
      }
    });

    document.addEventListener('click', () => {
      setTimeout(refreshInjectedUi, 100);
    });
  }

  init();
})();
