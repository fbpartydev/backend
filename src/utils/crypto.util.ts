import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const secretKey = process.env.COOKIE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('COOKIE_SECRET_KEY not set in environment variables');
  }
  
  // Remove any quotes that might be in the env value
  const cleanKey = secretKey.replace(/['"]/g, '');
  
  // Try to parse as hex
  let key: Buffer;
  try {
    key = Buffer.from(cleanKey, 'hex');
  } catch (e) {
    // If not valid hex, use the string directly
    key = Buffer.from(cleanKey, 'utf8');
  }
  
  // Ensure the key is exactly 32 bytes for AES-256
  if (key.length !== 32) {
    if (key.length < 32) {
      // If too short, pad with zeros (not ideal but functional)
      key = Buffer.concat([key, Buffer.alloc(32 - key.length)]);
    } else {
      // If too long, truncate
      key = key.slice(0, 32);
    }
  }
  
  cachedKey = key;
  return key;
}

export function encrypt(text: string): string {
  if (!process.env.COOKIE_SECRET_KEY) {
    throw new Error('COOKIE_SECRET_KEY not set in environment variables');
  }
  
  const KEY = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payloadB64: string): string {
  if (!process.env.COOKIE_SECRET_KEY) {
    throw new Error('COOKIE_SECRET_KEY not set in environment variables');
  }
  
  const KEY = getKey();
  const data = Buffer.from(payloadB64, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return dec.toString('utf8');
}

