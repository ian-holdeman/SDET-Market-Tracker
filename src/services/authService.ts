import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types';

export type { UserProfile, UserRole };

/**
 * Hardcoded list of allowed Admin usernames.
 * Per authorization rules: The only way to make a user an admin is directly in the code.
 */
export const ADMIN_USERNAMES: readonly string[] = ['ihadmin'] as const;

/**
 * Resolves the role for a given username based strictly on code configuration.
 */
export function getUserRole(username: string): UserRole {
  if (!username) return 'user';
  const clean = username.trim().toLowerCase();
  return ADMIN_USERNAMES.some((admin) => admin.toLowerCase() === clean) ? 'admin' : 'user';
}

/**
 * Computes SHA-256 hash of a string using Web Crypto API.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates format of username (alphanumeric and underscores, 3-20 chars).
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { valid: true };
}

/**
 * Validates format of passcode (at least 4 characters).
 */
export function validatePasscode(passcode: string): { valid: boolean; error?: string } {
  if (passcode.length < 4) {
    return { valid: false, error: 'Passcode must be at least 4 characters.' };
  }
  return { valid: true };
}

/**
 * Registers a new pseudonymous user account in Firestore.
 */
export async function signUpUser(username: string, passcode: string): Promise<UserProfile> {
  const userValidation = validateUsername(username);
  if (!userValidation.valid) {
    throw new Error(userValidation.error);
  }

  const passValidation = validatePasscode(passcode);
  if (!passValidation.valid) {
    throw new Error(passValidation.error);
  }

  const cleanKey = username.trim().toLowerCase();
  const userRef = doc(getDb(), 'users', cleanKey);
  const existingDoc = await getDoc(userRef);

  if (existingDoc.exists()) {
    throw new Error(`Username "${username.trim()}" is already taken.`);
  }

  const passcodeHash = await hashPasscode(passcode);
  const profile: UserProfile = {
    username: username.trim(),
    watchlist: [], // Default empty watchlist
    role: getUserRole(username),
  };

  await setDoc(userRef, {
    username: profile.username,
    passcodeHash,
    watchlist: profile.watchlist,
    role: profile.role,
  });

  return profile;
}

/**
 * Authenticates an existing user against their hashed passcode in Firestore.
 */
export async function loginUser(username: string, passcode: string): Promise<UserProfile> {
  const cleanKey = username.trim().toLowerCase();
  if (!cleanKey) {
    throw new Error('Please enter a username.');
  }
  if (!passcode) {
    throw new Error('Please enter your passcode.');
  }

  const userRef = doc(getDb(), 'users', cleanKey);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error(`Account "${username.trim()}" not found.`);
  }

  const data = snapshot.data();
  const enteredHash = await hashPasscode(passcode);

  if (data.passcodeHash !== enteredHash) {
    throw new Error('Incorrect passcode. Please try again.');
  }

  const resolvedUsername = data.username || username.trim();

  return {
    username: resolvedUsername,
    watchlist: Array.isArray(data.watchlist) ? data.watchlist : [],
    role: getUserRole(resolvedUsername),
  };
}

/**
 * Saves the updated watchlist array to Firestore for the user.
 */
export async function saveUserWatchlist(username: string, watchlist: string[]): Promise<void> {
  const cleanKey = username.trim().toLowerCase();
  const userRef = doc(getDb(), 'users', cleanKey);
  await updateDoc(userRef, {
    watchlist,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Permanently deletes the user account document from Firestore.
 */
export async function deleteUserAccount(username: string): Promise<void> {
  const cleanKey = username.trim().toLowerCase();
  const userRef = doc(getDb(), 'users', cleanKey);
  await deleteDoc(userRef);
}

