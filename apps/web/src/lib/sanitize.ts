import DOMPurify from 'dompurify';

/**
 * Sanitizes decrypted E2EE plaintext before rendering it to the DOM.
 * This completely neutralizes Stored XSS attacks if a malicious payload
 * is hidden inside the ciphertext.
 */
export function sanitizeMessage(plaintext: string): string {
  if (typeof window === 'undefined') {
    // If run on the server (e.g. during SSR), return a safe placeholder
    // or instantiate a JSDOM if truly necessary. For client components,
    // window will be available.
    return '';
  }

  return DOMPurify.sanitize(plaintext, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
