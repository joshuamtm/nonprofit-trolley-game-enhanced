import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export interface TokenPayload {
  sessionId: string;
  participantId: string;
  fingerprint: string;
  roomCode: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  /**
   * Generate a JWT token for a participant
   */
  static generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY,
      issuer: 'nonprofit-trolley-game'
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'nonprofit-trolley-game'
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate a session secret for Socket.io authentication
   */
  static generateSessionSecret(): string {
    return nanoid(32);
  }

  /**
   * Hash a password or secret
   */
  static async hashSecret(secret: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(secret, salt);
  }

  /**
   * Verify a password or secret against its hash
   */
  static async verifySecret(secret: string, hash: string): Promise<boolean> {
    return bcrypt.compare(secret, hash);
  }

  /**
   * Generate a secure room code that's harder to guess
   */
  static generateSecureRoomCode(): string {
    // Use a combination of letters and numbers, avoiding ambiguous characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Validate token without throwing errors
   */
  static isValidToken(token: string): boolean {
    try {
      jwt.verify(token, JWT_SECRET, {
        issuer: 'nonprofit-trolley-game'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Refresh a token if it's about to expire
   */
  static refreshToken(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (!decoded) return null;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = (decoded.exp || 0) - now;

      // Refresh if less than 1 hour remaining
      if (timeUntilExpiry < 3600) {
        const { iat, exp, ...payload } = decoded;
        return this.generateToken(payload);
      }

      return token;
    } catch {
      return null;
    }
  }
}