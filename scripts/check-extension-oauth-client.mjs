import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLACEHOLDER_CLIENT_ID = 'YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_CLIENT_ID_PATTERN = /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i;
const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const manifestPath = path.join(repoRoot, 'manifest.json');
const entryPath = fileURLToPath(import.meta.url);

export function validateManifestOauthClientId(manifest) {
  const clientId = manifest?.oauth2?.client_id;

  if (typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('manifest.oauth2.client_id is missing');
  }

  if (clientId === PLACEHOLDER_CLIENT_ID) {
    throw new Error('manifest.oauth2.client_id is still the placeholder value');
  }

  if (!GOOGLE_CLIENT_ID_PATTERN.test(clientId)) {
    throw new Error(`manifest.oauth2.client_id does not look like a Google OAuth client ID: ${clientId}`);
  }

  return clientId;
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  try {
    const clientId = validateManifestOauthClientId(readManifest());
    console.log(`check-extension-oauth-client: OK (${clientId})`);
  } catch (error) {
    console.error(`check-extension-oauth-client: ${error.message}`);
    process.exit(1);
  }
}
