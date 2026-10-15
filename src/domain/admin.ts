/** 관리자 잠금 — 설계서 10-1. PIN은 기기별 salt와 함께 SHA-256으로만 저장한다. */

export interface AdminData {
  pinHash: string | null;
  salt: string;
  recoveryHash: string | null;
  failedAttempts: number;
  lockedUntil: number | null;
}

export const PIN_LENGTH = 4;
export const MAX_FAILURES = 5;
export const LOCK_MS = 60_000;
export const IDLE_LOCK_MS = 2 * 60_000;
export const RECOVERY_LENGTH = 8;
/** 헷갈리는 글자(0/O, 1/I/L)는 뺀다 */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function initialAdmin(): AdminData {
  return { pinHash: null, salt: '', recoveryHash: null, failedAttempts: 0, lockedUntil: null };
}

function randomString(length: number, alphabet: string): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function newSalt(): string {
  return randomString(16, 'abcdefghijklmnopqrstuvwxyz0123456789');
}

export function newRecoveryCode(): string {
  return randomString(RECOVERY_LENGTH, RECOVERY_ALPHABET);
}

/** 사람이 적은 복구 코드: 공백·하이픈 무시, 대문자로 */
export function normalizeRecovery(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** 잠겨 있으면 남은 ms, 아니면 0 */
export function lockRemaining(admin: AdminData, now: number): number {
  return admin.lockedUntil && now < admin.lockedUntil ? admin.lockedUntil - now : 0;
}

/** 틀린 PIN: 5번째에 1분 잠금, 횟수는 다시 0부터 */
export function registerFailure(admin: AdminData, now: number): AdminData {
  const failed = admin.failedAttempts + 1;
  return failed >= MAX_FAILURES ? { ...admin, failedAttempts: 0, lockedUntil: now + LOCK_MS } : { ...admin, failedAttempts: failed };
}

export function registerSuccess(admin: AdminData): AdminData {
  return { ...admin, failedAttempts: 0, lockedUntil: null };
}

/** 처음 설정: 새 salt로 PIN과 복구 코드를 해시한다. 복구 코드 원문은 화면에 한 번만 보여준다. */
export async function firstSetup(admin: AdminData, pin: string, recoveryCode: string): Promise<AdminData> {
  const salt = newSalt();
  return {
    ...registerSuccess(admin),
    salt,
    pinHash: await hashSecret(pin, salt),
    recoveryHash: await hashSecret(normalizeRecovery(recoveryCode), salt),
  };
}

/** PIN만 바꾼다 (salt는 그대로라 복구 코드는 계속 쓸 수 있다) */
export async function changePin(admin: AdminData, pin: string): Promise<AdminData> {
  return { ...registerSuccess(admin), pinHash: await hashSecret(pin, admin.salt) };
}

/** 복구 코드만 새로 만든다 */
export async function reissueRecovery(admin: AdminData, recoveryCode: string): Promise<AdminData> {
  return { ...admin, recoveryHash: await hashSecret(normalizeRecovery(recoveryCode), admin.salt) };
}

export async function checkPin(admin: AdminData, pin: string): Promise<boolean> {
  return !!admin.pinHash && (await hashSecret(pin, admin.salt)) === admin.pinHash;
}

export async function checkRecovery(admin: AdminData, code: string): Promise<boolean> {
  return !!admin.recoveryHash && (await hashSecret(normalizeRecovery(code), admin.salt)) === admin.recoveryHash;
}
