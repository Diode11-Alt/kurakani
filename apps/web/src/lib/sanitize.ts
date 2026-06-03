import DOMPurify from 'dompurify';

/**
 * Sanitizes decrypted E2EE plaintext before rendering it to the DOM.
 * This completely neutralizes Stored XSS attacks if a malicious payload
 * is hidden inside the ciphertext.
 *
 * SECURITY: <a href> is explicitly removed from allowed tags.
 * Links should be detected separately with URL validation
 * to prevent javascript: and data: URI injection.
 */
export function sanitizeMessage(plaintext: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return DOMPurify.sanitize(plaintext, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: [], // No attributes allowed — blocks href/javascript: injection
    FORCE_BODY: true,
  });
}
