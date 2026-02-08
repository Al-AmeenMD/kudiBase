import Constants from 'expo-constants';

import { exportData, getAppSetting, importData, initDb, setAppSetting } from '@/lib/db';

type DriveConfig = {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
};

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'kudibase-backup.json';

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
  const data = await fetchDriveJson<{ files: Array<{ id: string; name: string; modifiedTime: string }> }>(
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
