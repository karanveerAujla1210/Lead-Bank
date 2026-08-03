import crypto from 'node:crypto';

const algorithm = 'aes-256-gcm';

function key() {
  const secret = process.env.FIELD_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('FIELD_ENCRYPTION_KEY is required for sensitive field encryption.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptField(value?: string | null) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}
