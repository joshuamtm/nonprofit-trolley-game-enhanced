import { Filter } from 'bad-words';

// Initialize profanity filter
const filter = new Filter();

// Common stop words to remove from word clouds
const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'would', 'i', 'we', 'they', 'you',
  'but', 'can', 'could', 'should', 'this', 'these', 'those', 'or',
  'not', 'no', 'yes', 'more', 'most', 'very', 'so', 'too', 'just',
  'than', 'only', 'other', 'some', 'all', 'any', 'may', 'might',
  'must', 'shall', 'do', 'does', 'did', 'have', 'had', 'been',
  'being', 'am', 'were', 'what', 'when', 'where', 'who', 'why',
  'how', 'which', 'there', 'here', 'their', 'them', 'him', 'her'
]);

// PII patterns to detect
const piiPatterns = [
  /\b\d{3}-?\d{2}-?\d{4}\b/g, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, // Phone
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
];

export interface ProcessedRationale {
  original: string;
  sanitized: string;
  moderated: boolean;
  moderationReasons: string[];
  words: string[];
}

export function moderateText(text: string): ProcessedRationale {
  const moderationReasons: string[] = [];
  let sanitized = text.trim();
  let moderated = false;

  // Check for profanity
  if (filter.isProfane(sanitized)) {
    sanitized = filter.clean(sanitized);
    moderationReasons.push('profanity_filtered');
    moderated = true;
  }

  // Check for PII
  for (const pattern of piiPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
      moderationReasons.push('pii_removed');
      moderated = true;
    }
  }

  // Extract meaningful words for word cloud
  const words = extractWords(sanitized);

  return {
    original: text,
    sanitized,
    moderated,
    moderationReasons,
    words
  };
}

export function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/\s+/)
    .filter(word => 
      word.length >= 3 && // At least 3 characters
      !stopWords.has(word) && // Not a stop word
      !/^\d+$/.test(word) && // Not just numbers
      word !== '[redacted]' // Not redacted content
    )
    .map(word => word.replace(/-+/g, '-').trim()) // Clean up hyphens
    .filter(word => word.length >= 3); // Filter again after cleanup
}

export interface WordFrequency {
  text: string;
  count: number;
}

export function calculateWordFrequencies(rationales: string[]): WordFrequency[] {
  const wordCounts = new Map<string, number>();

  rationales.forEach(rationale => {
    const words = extractWords(rationale);
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  return Array.from(wordCounts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 words max
}

// Stem words to group similar forms together
export function stemWord(word: string): string {
  // Simple stemming - remove common suffixes
  const suffixes = [
    'ing', 'ly', 'ed', 'ies', 'ied', 'ies', 's', 'es', 'er', 'est',
    'tion', 'sion', 'ness', 'ment', 'able', 'ible', 'ful', 'less'
  ];
  
  let stemmed = word.toLowerCase();
  
  for (const suffix of suffixes) {
    if (stemmed.endsWith(suffix) && stemmed.length > suffix.length + 2) {
      stemmed = stemmed.slice(0, -suffix.length);
      break;
    }
  }
  
  return stemmed;
}

export function calculateStemmedWordFrequencies(rationales: string[]): WordFrequency[] {
  const stemCounts = new Map<string, { count: number; original: string }>();

  rationales.forEach(rationale => {
    const words = extractWords(rationale);
    words.forEach(word => {
      const stem = stemWord(word);
      const current = stemCounts.get(stem);
      
      if (current) {
        stemCounts.set(stem, {
          count: current.count + 1,
          // Keep the shortest original word as the display text
          original: word.length < current.original.length ? word : current.original
        });
      } else {
        stemCounts.set(stem, { count: 1, original: word });
      }
    });
  });

  return Array.from(stemCounts.entries())
    .map(([stem, { count, original }]) => ({ text: original, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 words max
}

// Rate limiting for content submission
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) { // 5 attempts per minute
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canSubmit(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count < this.maxAttempts) {
      record.count++;
      return true;
    }

    return false;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    
    return Math.max(0, record.resetTime - Date.now());
  }
}

export const rateLimiter = new RateLimiter();