import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../types/auth';

export const AUTH_TOKEN_KEY = 'dressgenius_auth_token';
export const AUTH_USER_KEY = 'dressgenius_auth_user';

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* key may not exist */
  }
}

export async function getStoredAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearStoredAccessToken(): Promise<void> {
  await safeDelete(AUTH_TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser(): Promise<void> {
  await safeDelete(AUTH_USER_KEY);
}

/** Writes token (and optional profile) to Keychain / Keystore via SecureStore. */
export async function persistAuthSession(
  token: string,
  user?: AuthUser | null,
): Promise<void> {
  await setStoredAccessToken(token);
  if (user != null) {
    await setStoredUser(user);
  } else {
    await clearStoredUser();
  }
}

/** Removes token and cached user from secure storage. */
export async function clearAuthSession(): Promise<void> {
  await Promise.all([clearStoredAccessToken(), clearStoredUser()]);
}
