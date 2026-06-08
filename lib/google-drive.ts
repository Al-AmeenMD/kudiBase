import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

import { exportData, getAppSetting, importData, initDb, setAppSetting } from '@/lib/db';

type DriveConfig = {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
};

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'kudibase-backup.json';
const DRIVE_REDIRECT_URI = 'com.kudibase.app:/oauthredirect';

function getConfig(): DriveConfig {
  return (Constants.expoConfig?.extra?.googleDrive as DriveConfig | undefined) ?? {};
}

export function getDriveClientIds() {
  const config = getConfig();
  return {
    iosClientId: config.iosClientId ?? '',
    androidClientId: config.androidClientId ?? '',
    webClientId: config.webClientId ?? '',
  };
}

export function getDriveScope() {
  return DRIVE_SCOPE;
}

export function getDriveRedirectUri() {
  return DRIVE_REDIRECT_URI;
}

export async function savePendingDriveAuth(params: {
  clientId: string;
  codeVerifier: string;
  redirectUri: string;
  state?: string;
}) {
  await Promise.all([
    setAppSetting('drive_auth_client_id', params.clientId),
    setAppSetting('drive_auth_code_verifier', params.codeVerifier),
    setAppSetting('drive_auth_redirect_uri', params.redirectUri),
    setAppSetting('drive_auth_state', params.state ?? ''),
    setAppSetting('drive_auth_started_at', String(Date.now())),
  ]);
}

export async function clearPendingDriveAuth() {
  await Promise.all([
    setAppSetting('drive_auth_client_id', ''),
    setAppSetting('drive_auth_code_verifier', ''),
    setAppSetting('drive_auth_redirect_uri', ''),
    setAppSetting('drive_auth_state', ''),
    setAppSetting('drive_auth_started_at', ''),
  ]);
}

function parseAuthCallbackUrl(url: string) {
  if (!url.startsWith(DRIVE_REDIRECT_URI)) {
    return null;
  }
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const params = new URLSearchParams(query);
  const error = params.get('error');
  if (error) {
    throw new Error(params.get('error_description') ?? error);
  }
  return {
    code: params.get('code') ?? '',
    state: params.get('state') ?? '',
  };
}

export async function completePendingDriveAuthFromUrl(url: string) {
  const callback = parseAuthCallbackUrl(url);
  if (!callback) {
    return false;
  }
  if (!callback.code) {
    throw new Error('Google returned to KudiBase without an authorization code.');
  }

  const [clientId, codeVerifier, redirectUri, expectedState, startedAt] = await Promise.all([
    getAppSetting('drive_auth_client_id'),
    getAppSetting('drive_auth_code_verifier'),
    getAppSetting('drive_auth_redirect_uri'),
    getAppSetting('drive_auth_state'),
    getAppSetting('drive_auth_started_at'),
  ]);

  if (!clientId || !codeVerifier || !redirectUri) {
    if (await isDriveEnabled()) {
      return false;
    }
    throw new Error('Google returned, but KudiBase no longer has the pending sign-in request.');
  }
  if (expectedState && callback.state !== expectedState) {
    throw new Error('Google sign-in state did not match. Please try connecting again.');
  }
  const started = Number(startedAt || 0);
  if (Number.isFinite(started) && started > 0 && Date.now() - started > 10 * 60 * 1000) {
    await clearPendingDriveAuth();
    throw new Error('Google sign-in expired. Please try connecting again.');
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: callback.code,
      redirectUri,
      scopes: [DRIVE_SCOPE],
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    Google.discovery
  );

  if (!tokenResponse.accessToken) {
    throw new Error('Google returned to KudiBase, but no Drive token was received.');
  }

  await saveDriveSession({
    accessToken: tokenResponse.accessToken,
    expiresIn: tokenResponse.expiresIn,
  });
  await setDailySyncEnabled(true);
  await clearPendingDriveAuth();
  return true;
}

export async function saveDriveSession(params: { accessToken: string; expiresIn?: number }) {
  const expiryMs = params.expiresIn ? Date.now() + params.expiresIn * 1000 : Date.now() + 3600 * 1000;
  await setAppSetting('drive_access_token', params.accessToken);
  await setAppSetting('drive_token_expiry', String(expiryMs));
  await setAppSetting('drive_enabled', 'true');
}

export async function clearDriveSession() {
  await setAppSetting('drive_access_token', '');
  await setAppSetting('drive_token_expiry', '');
  await setAppSetting('drive_enabled', 'false');
}

export async function getDriveSession() {
  const [token, expiry] = await Promise.all([
    getAppSetting('drive_access_token'),
    getAppSetting('drive_token_expiry'),
  ]);
  if (!token) {
    return null;
  }
  const expiryMs = Number(expiry || 0);
  return { token, expiryMs };
}

export async function isDriveEnabled() {
  const enabled = await getAppSetting('drive_enabled');
  return enabled === 'true';
}

function buildMultipartBody(metadata: Record<string, unknown>, content: string, boundary: string) {
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}\r\n`;
  const filePart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n`;
  return `${metaPart}${filePart}--${boundary}--`;
}

async function fetchDriveJson<T>(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Drive request failed');
  }
  return response.json() as Promise<T>;
}

async function fetchDriveText(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Drive request failed');
  }
  return response.text();
}

async function findBackupFile(accessToken: string) {
  const query = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=${query}`;
  const data = await fetchDriveJson<{ files: { id: string; name: string; modifiedTime: string }[] }>(
    url,
    accessToken
  );
  if (!data.files.length) {
    return null;
  }
  return data.files[0];
}

export async function uploadDriveBackup(accessToken: string) {
  const payload = await exportData();
  const content = JSON.stringify(payload);
  const existing = await findBackupFile(accessToken);
  const boundary = `kudibase-${Date.now()}`;
  const metadata = existing
    ? { name: BACKUP_FILENAME }
    : { name: BACKUP_FILENAME, parents: ['appDataFolder'] };
  const body = buildMultipartBody(metadata, content, boundary);
  const endpoint = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const response = await fetch(endpoint, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Drive upload failed');
  }
  await setAppSetting('drive_last_sync', String(Date.now()));
}

export async function downloadDriveBackup(accessToken: string) {
  const existing = await findBackupFile(accessToken);
  if (!existing) {
    throw new Error('No backup found in Drive.');
  }
  const content = await fetchDriveText(
    `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
    accessToken
  );
  const payload = JSON.parse(content);
  await initDb();
  await importData(payload);
  await setAppSetting('drive_last_sync', String(Date.now()));
}

export async function shouldRunDailySync() {
  const lastSync = await getAppSetting('drive_last_sync');
  if (!lastSync) {
    return true;
  }
  const last = Number(lastSync);
  if (!Number.isFinite(last)) {
    return true;
  }
  return Date.now() - last >= 24 * 60 * 60 * 1000;
}

export async function setDailySyncEnabled(enabled: boolean) {
  await setAppSetting('drive_daily_sync', enabled ? 'true' : 'false');
}

export async function isDailySyncEnabled() {
  const value = await getAppSetting('drive_daily_sync');
  return value === 'true';
}
