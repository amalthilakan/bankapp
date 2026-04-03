import 'server-only';

import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { MongoServerError } from 'mongodb';

import { getDb } from '@/server/db/mongodb';
import { ensureUserSeedData } from '@/server/wallet/service';
import type { User } from '@/shared/types';

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE_NAME = 'bankapp_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

interface UserRecord extends User {
  emailNormalized: string;
  passwordHash: string;
}

interface SessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

let authInitPromise: Promise<void> | null = null;

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

function toPublicUser(user: UserRecord & { _id?: unknown }): User {
  const { _id, emailNormalized, passwordHash, ...publicUser } = user;
  void _id;
  void emailNormalized;
  void passwordHash;
  return publicUser;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const storedBuffer = Buffer.from(storedHash, 'hex');
  const derivedKey = (await scrypt(password, salt, storedBuffer.length)) as Buffer;

  return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
}

async function getCollections() {
  const db = await getDb();

  return {
    users: db.collection<UserRecord>('users'),
    sessions: db.collection<SessionRecord>('sessions'),
  };
}

async function getAuthenticatedUserRecord() {
  const session = await getSessionRecord();

  if (!session) {
    throw new AuthError('Unauthorized', 401);
  }

  const collections = await ensureAuthCollections();
  const user = await collections.users.findOne({ id: session.userId });

  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }

  return { collections, user, session };
}

async function initializeAuthCollections() {
  const collections = await getCollections();

  await Promise.all([
    collections.users.createIndex({ emailNormalized: 1 }, { unique: true }),
    collections.sessions.createIndex({ id: 1 }, { unique: true }),
    collections.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

async function ensureAuthCollections() {
  if (!authInitPromise) {
    authInitPromise = initializeAuthCollections().catch((error) => {
      authInitPromise = null;
      throw error;
    });
  }

  await authInitPromise;
  return getCollections();
}

async function setSessionCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, getCookieOptions(expiresAt));
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    ...getCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

async function createSession(userId: string) {
  const collections = await ensureAuthCollections();
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await collections.sessions.insertOne({
    id: sessionId,
    userId,
    createdAt: new Date(),
    expiresAt,
  });

  await setSessionCookie(sessionId, expiresAt);
}

async function finalizeAuthenticatedUser(user: UserRecord) {
  await ensureUserSeedData(user.id);
  await createSession(user.id);
  return toPublicUser(user);
}

async function resumeExistingRegistration(user: UserRecord, password: string) {
  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthError('An account with that email already exists. Try signing in instead.', 409);
  }

  return finalizeAuthenticatedUser(user);
}

async function getSessionRecord() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const collections = await ensureAuthCollections();
  const session = await collections.sessions.findOne({ id: sessionId });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return session;
}

function validateCredentials(input: { name?: string; email?: string; password?: string }, requireName = false) {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim() ?? '';
  const password = input.password ?? '';

  if (requireName && name.length < 2) {
    throw new AuthError('Name must be at least 2 characters long.', 400);
  }

  if (!email || !email.includes('@')) {
    throw new AuthError('Please enter a valid email address.', 400);
  }

  if (password.length < 8) {
    throw new AuthError('Password must be at least 8 characters long.', 400);
  }

  return {
    name,
    email,
    emailNormalized: normalizeEmail(email),
    password,
  };
}

function validateProfileInput(input: { name?: string; email?: string }) {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim() ?? '';

  if (name.length < 2) {
    throw new AuthError('Name must be at least 2 characters long.', 400);
  }

  if (!email || !email.includes('@')) {
    throw new AuthError('Please enter a valid email address.', 400);
  }

  return {
    name,
    email,
    emailNormalized: normalizeEmail(email),
  };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { user } = await getAuthenticatedUserRecord();
    return toPublicUser(user);
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function updateCurrentUserProfile(input: { name?: string; email?: string }) {
  const { name, email, emailNormalized } = validateProfileInput(input);
  const { collections, user } = await getAuthenticatedUserRecord();

  if (user.emailNormalized !== emailNormalized) {
    const existingUser = await collections.users.findOne({ emailNormalized });

    if (existingUser && existingUser.id !== user.id) {
      throw new AuthError('Another account already uses that email address.', 409);
    }
  }

  try {
    await collections.users.updateOne(
      { id: user.id },
      {
        $set: {
          name,
          email,
          emailNormalized,
        },
      }
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new AuthError('Another account already uses that email address.', 409);
    }

    throw error;
  }

  return {
    ...toPublicUser(user),
    name,
    email,
  } satisfies User;
}

export async function changeCurrentUserPassword(input: {
  currentPassword?: string;
  newPassword?: string;
}) {
  const currentPassword = input.currentPassword ?? '';
  const newPassword = input.newPassword ?? '';

  if (currentPassword.length === 0) {
    throw new AuthError('Current password is required.', 400);
  }

  if (newPassword.length < 8) {
    throw new AuthError('New password must be at least 8 characters long.', 400);
  }

  const { collections, user } = await getAuthenticatedUserRecord();
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    throw new AuthError('Current password is incorrect.', 401);
  }

  const isSamePassword = await verifyPassword(newPassword, user.passwordHash);

  if (isSamePassword) {
    throw new AuthError('Choose a different password than your current one.', 400);
  }

  await collections.users.updateOne(
    { id: user.id },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
      },
    }
  );
}

export async function registerUser(input: { name?: string; email?: string; password?: string }) {
  const { name, email, emailNormalized, password } = validateCredentials(input, true);
  const collections = await ensureAuthCollections();
  const existingUser = await collections.users.findOne({ emailNormalized });

  if (existingUser) {
    return resumeExistingRegistration(existingUser, password);
  }

  const user: UserRecord = {
    id: randomUUID(),
    name,
    email,
    emailNormalized,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  try {
    await collections.users.insertOne(user);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const duplicateUser = await collections.users.findOne({ emailNormalized });

      if (duplicateUser) {
        return resumeExistingRegistration(duplicateUser, password);
      }

      throw new AuthError('An account with that email already exists. Try signing in instead.', 409);
    }

    throw error;
  }

  return finalizeAuthenticatedUser(user);
}

export async function loginUser(input: { email?: string; password?: string }) {
  const { emailNormalized, password } = validateCredentials(input, false);
  const collections = await ensureAuthCollections();
  const user = await collections.users.findOne({ emailNormalized });

  if (!user) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthError('Invalid email or password.', 401);
  }

  return finalizeAuthenticatedUser(user);
}

export async function logoutCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    const collections = await ensureAuthCollections();
    await collections.sessions.deleteOne({ id: sessionId });
  }

  await clearSessionCookie();
}
