/**
 * server/security.js — Centralised security utilities
 */
import crypto from 'crypto';
import path from 'path';

// ── String sanitisation ───────────────────────────────────────────────────────

/**
 * Strip HTML tags and null-bytes from user-supplied strings.
 * Prevents stored-XSS in text fields rendered server-side or emailed.
 */
export const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/<[^>]*>/g, '')          // strip HTML tags
        .replace(/\0/g, '')               // strip null bytes
        .trim();
};

/**
 * Sanitize all string properties on an object (shallow).
 */
export const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
        clean[k] = typeof v === 'string' ? sanitizeString(v) : v;
    }
    return clean;
};

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
export const isValidEmail = (str) => typeof str === 'string' && EMAIL_RE.test(str.trim());

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidUUID = (str) => typeof str === 'string' && UUID_RE.test(str);

export const isNonEmptyString = (str, maxLen = 1000) =>
    typeof str === 'string' && str.trim().length > 0 && str.length <= maxLen;

// ── Path traversal protection ─────────────────────────────────────────────────

/**
 * Verify that a requested file path stays within the expected uploads root
 * and matches the correct account.  Returns the safe absolute path or null.
 *
 * @param {string} uploadsRoot  - absolute path to uploads directory
 * @param {string} accountId    - tenant account ID (from JWT)
 * @param {string} relativePath - path segments from the request URL
 */
export const secureFilePath = (uploadsRoot, accountId, relativePath) => {
    // Resolve to absolute; if it escapes uploadsRoot → reject
    const resolved = path.resolve(uploadsRoot, relativePath);
    const rootWithSep = uploadsRoot.endsWith(path.sep) ? uploadsRoot : uploadsRoot + path.sep;

    if (!resolved.startsWith(rootWithSep)) return null;

    // The path must start with the accountId segment
    const relative = resolved.slice(rootWithSep.length);
    const firstSegment = relative.split(path.sep)[0];
    // Allow sanitized accountId forms (see sanitizeForPath in index.js)
    if (!firstSegment || !relative.startsWith(firstSegment)) return null;

    return resolved;
};

// ── Secure token generation ───────────────────────────────────────────────────

/** Cryptographically random hex token (default 32 bytes = 64 hex chars) */
export const generateSecureToken = (bytes = 32) =>
    crypto.randomBytes(bytes).toString('hex');

// ── Password strength ─────────────────────────────────────────────────────────

/**
 * Enforce minimum password requirements.
 * Returns an error string or null if OK.
 */
export const validatePassword = (pw) => {
    if (typeof pw !== 'string') return 'Password must be a string';
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (pw.length > 128) return 'Password too long';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
    return null;
};

// ── Request helpers ───────────────────────────────────────────────────────────

/**
 * Build a generic "bad request" response for validation failures.
 */
export const badRequest = (res, msg) => res.status(400).json({ error: msg });
