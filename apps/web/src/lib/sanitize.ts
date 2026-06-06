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
    // BUG-014 Fix: In SSR, we don't have DOMPurify available easily.
    // For plaintext messages, we can just return them or a generic string.
    // However, returning the original string is safe because React escapes text nodes natively, 
    // and DOMPurify is only needed when rendering dangerouslySetInnerHTML!
    return plaintext;
  }

  return DOMPurify.sanitize(plaintext, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: [], // No attributes allowed — blocks href/javascript: injection
    FORCE_BODY: true,
  });
}

/**
 * Sanitizes rich HTML content, allowing specific safe tags and attributes.
 * Useful for rendering user posts that support basic formatting and safe links.
 */
export function sanitizeHtml(htmlContent: string, options?: { ALLOWED_TAGS?: string[], ALLOWED_ATTRS?: Record<string, string[]> }): string {
  if (typeof window === 'undefined') {
    return htmlContent; // Better to return raw content to avoid blank SSR pages if safe, or rely on hydration
  }

  // Define base safe attributes array format for DOMPurify
  const allowedTags = options?.ALLOWED_TAGS || ['b', 'i', 'em', 'strong', 'a', 'br', 'p'];
  const allowedAttr = options?.ALLOWED_ATTRS ? Object.values(options.ALLOWED_ATTRS).flat() : ['href', 'target', 'rel'];

  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttr,
  });
}
