import createDOMPurify from 'isomorphic-dompurify';

const DOMPurify = createDOMPurify();

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
  stripHtml?: boolean;
}

export class SanitizationService {
  /**
   * Sanitize user input to prevent XSS attacks
   */
  static sanitizeText(input: string, options: SanitizationOptions = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Apply length limit first
    let sanitized = options.maxLength 
      ? input.substring(0, options.maxLength) 
      : input;

    // Strip all HTML if requested
    if (options.stripHtml) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });
    } else {
      // Allow specific tags/attributes
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: options.allowedTags || [],
        ALLOWED_ATTR: options.allowedAttributes || [],
        KEEP_CONTENT: true
      });
    }

    // Remove any remaining dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);

    return sanitized.trim();
  }

  /**
   * Sanitize rationale text (strict mode - no HTML allowed)
   */
  static sanitizeRationale(input: string): string {
    return this.sanitizeText(input, {
      stripHtml: true,
      maxLength: 500
    });
  }

  /**
   * Sanitize mitigation text (strict mode - no HTML allowed)
   */
  static sanitizeMitigation(input: string): string {
    return this.sanitizeText(input, {
      stripHtml: true,
      maxLength: 500
    });
  }

  /**
   * Sanitize room codes to ensure they're alphanumeric
   */
  static sanitizeRoomCode(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Only allow alphanumeric characters, convert to uppercase
    return input.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 6);
  }

  /**
   * Sanitize fingerprints to ensure they're safe
   */
  static sanitizeFingerprint(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Allow alphanumeric, hyphens, and underscores
    return input.replace(/[^A-Za-z0-9_-]/g, '').substring(0, 255);
  }

  /**
   * Remove dangerous patterns that might bypass sanitization
   */
  private static removeDangerousPatterns(text: string): string {
    // Remove javascript: protocol
    text = text.replace(/javascript:/gi, '');
    
    // Remove data: protocol (except safe image types)
    text = text.replace(/data:(?!image\/(png|jpg|jpeg|gif|webp))/gi, '');
    
    // Remove vbscript: protocol
    text = text.replace(/vbscript:/gi, '');
    
    // Remove on* event handlers
    text = text.replace(/\bon\w+\s*=/gi, '');
    
    // Remove script tags (extra safety)
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove iframe tags
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    return text;
  }

  /**
   * Validate and sanitize JSON data
   */
  static sanitizeJSON(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input, { stripHtml: true });
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJSON(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Sanitize the key as well
        const sanitizedKey = this.sanitizeText(key, { stripHtml: true });
        sanitized[sanitizedKey] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Escape HTML entities for safe display
   */
  static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, char => map[char]);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize file names for safe storage
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }
    
    // Remove path traversal attempts
    fileName = fileName.replace(/\.\./g, '');
    fileName = fileName.replace(/[\/\\]/g, '');
    
    // Keep only safe characters
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Limit length
    return fileName.substring(0, 255);
  }
}