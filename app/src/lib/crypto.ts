// PIN-derived AES-GCM encryption with Web Crypto. Nothing here ever leaves the device.
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface Sealed { iv: Uint8Array<ArrayBuffer>; ct: ArrayBuffer }

export function randomSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKey(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv, ct };
}

export async function open<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, key, sealed.ct);
  return JSON.parse(dec.decode(pt)) as T;
}
