import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.COOKIE_SECRET_KEY || '', 'hex'); // must be 32 bytes

export function encrypt(text: string): string {
  if (!process.env.COOKIE_SECRET_KEY) {
    throw new Error('COOKIE_SECRET_KEY not set in environment variables');
  }
  
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
  
  const data = Buffer.from(payloadB64, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return dec.toString('utf8');
}

