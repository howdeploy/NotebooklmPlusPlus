const EXPORT_AUTH_STORAGE_KEY = 'exportAuthStatus';
const EXPORT_AUTH_WORKFLOW_KEY = 'exportWorkflowCheckpoint';
const EXPORT_AUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const EXPORT_AUTH_SCOPES = [EXPORT_AUTH_SCOPE];
const EXPORT_AUTH_SETUP_PLACEHOLDER = 'YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com';

const EXPORT_AUTH_MESSAGE_KEYS = {
  authorized: 'exportAuthStatusAuthorized',
  notAuthorized: 'exportAuthStatusNotAuthorized',
  missingClientId: 'exportAuthErrorMissingClientId',
  scopeMissing: 'exportAuthErrorScopeMissing',
  identityFlowFailed: 'exportAuthErrorIdentityFlowFailed',
  cleared: 'exportAuthStatusCleared'
};

let cachedExportToken = null;

function getExportAuthClientId() {
  const manifest = chrome.runtime.getManifest();
  return manifest.oauth2 && manifest.oauth2.client_id ? manifest.oauth2.client_id : '';
}

function isExportAuthConfigured() {
  const clientId = getExportAuthClientId();
  return Boolean(clientId) && clientId !== EXPORT_AUTH_SETUP_PLACEHOLDER;
}

function buildExportAuthStatus(overrides = {}) {
  return {
    authorized: false,
    grantedScopes: [],
    accountHint: null,
    lastError: 'not_authorized',
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function classifyExportAuthError(message) {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('missing client id') || normalized.includes('oauth client')) {
    return 'missing_client_id';
  }

  if (normalized.includes('scope') && (normalized.includes('missing') || normalized.includes('not granted'))) {
    return 'scope_missing';
  }

  if (normalized.includes('cancel') || normalized.includes('signin') || normalized.includes('not signed')) {
    return 'identity_flow_failed';
  }

  if (normalized.includes('not authorize') || normalized.includes('unauthor')) {
    return 'not_authorized';
  }

  return 'identity_flow_failed';
}

function getExportAuthMessageKey(errorCode, authorized) {
  if (authorized) {
    return EXPORT_AUTH_MESSAGE_KEYS.authorized;
  }

  switch (errorCode) {
    case 'missing_client_id':
      return EXPORT_AUTH_MESSAGE_KEYS.missingClientId;
    case 'scope_missing':
      return EXPORT_AUTH_MESSAGE_KEYS.scopeMissing;
    case 'identity_flow_failed':
      return EXPORT_AUTH_MESSAGE_KEYS.identityFlowFailed;
    default:
      return EXPORT_AUTH_MESSAGE_KEYS.notAuthorized;
  }
}

async function persistExportAuthStatus(status) {
  await chrome.storage.local.set({
    [EXPORT_AUTH_STORAGE_KEY]: status,
    [EXPORT_AUTH_WORKFLOW_KEY]: null
  });
  return status;
}

async function readStoredExportAuthStatus() {
  const stored = await chrome.storage.local.get([EXPORT_AUTH_STORAGE_KEY]);
  const existing = stored[EXPORT_AUTH_STORAGE_KEY];
  if (!existing) {
    return buildExportAuthStatus();
  }

  const grantedScopes = Array.isArray(existing.grantedScopes) ? existing.grantedScopes : [];
  const hasRequiredScope = grantedScopes.includes(EXPORT_AUTH_SCOPE);

  return buildExportAuthStatus({
    authorized: Boolean(existing.authorized) && hasRequiredScope,
    grantedScopes: hasRequiredScope ? grantedScopes : [],
    accountHint: existing.accountHint || null,
    lastError: hasRequiredScope ? null : 'scope_missing',
    updatedAt: existing.updatedAt || new Date().toISOString()
  });
}

function getAuthTokenInteractive(details) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(details, (tokenValue) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tokenValue) {
        reject(new Error('Identity flow failed'));
        return;
      }

      resolve(tokenValue);
    });
  });
}

function removeCachedToken(tokenValue) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token: tokenValue }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

async function beginExportAuth() {
  if (!isExportAuthConfigured()) {
    const status = await persistExportAuthStatus(buildExportAuthStatus({
      lastError: 'missing_client_id'
    }));
    return {
      ok: false,
      authorized: false,
      error: 'missing_client_id',
      messageKey: EXPORT_AUTH_MESSAGE_KEYS.missingClientId,
      status
    };
  }

  try {
    const tokenValue = await getAuthTokenInteractive({
      interactive: true,
      scopes: EXPORT_AUTH_SCOPES
    });

    cachedExportToken = tokenValue;

    const status = await persistExportAuthStatus(buildExportAuthStatus({
      authorized: true,
      grantedScopes: [...EXPORT_AUTH_SCOPES],
      accountHint: null,
      lastError: null
    }));

    return {
      ok: true,
      authorized: true,
      grantedScopes: [...EXPORT_AUTH_SCOPES],
      messageKey: EXPORT_AUTH_MESSAGE_KEYS.authorized,
      status
    };
  } catch (error) {
    const errorCode = classifyExportAuthError(error.message);
    const status = await persistExportAuthStatus(buildExportAuthStatus({
      lastError: errorCode
    }));

    return {
      ok: false,
      authorized: false,
      error: errorCode,
      messageKey: getExportAuthMessageKey(errorCode, false),
      status
    };
  }
}

async function getExportAuthStatus() {
  const status = await readStoredExportAuthStatus();
  return {
    ok: true,
    authorized: status.authorized,
    grantedScopes: status.grantedScopes,
    accountHint: status.accountHint,
    lastError: status.lastError,
    messageKey: getExportAuthMessageKey(status.lastError, status.authorized),
    status
  };
}

async function clearExportAuth() {
  if (cachedExportToken) {
    try {
      await removeCachedToken(cachedExportToken);
    } catch (error) {
      console.warn('Failed to remove cached export auth token:', error);
    }
  }

  cachedExportToken = null;

  const status = buildExportAuthStatus({
    lastError: 'not_authorized'
  });

  await chrome.storage.local.remove([EXPORT_AUTH_STORAGE_KEY, EXPORT_AUTH_WORKFLOW_KEY]);
  await chrome.storage.local.set({ [EXPORT_AUTH_STORAGE_KEY]: status });

  return {
    ok: true,
    authorized: false,
    cleared: true,
    messageKey: EXPORT_AUTH_MESSAGE_KEYS.cleared,
    status
  };
}

self.beginExportAuth = beginExportAuth;
self.getExportAuthStatus = getExportAuthStatus;
self.clearExportAuth = clearExportAuth;
self.EXPORT_AUTH_STORAGE_KEY = EXPORT_AUTH_STORAGE_KEY;
