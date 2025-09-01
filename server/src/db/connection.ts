import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import * as schema from './schema';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Create connection pool for better performance
class DatabaseConnection {
  private pool: Pool | null = null;
  private httpClient: ReturnType<typeof neon> | null = null;
  private drizzleInstance: any = null;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Create HTTP client for serverless environments
      this.httpClient = neon(process.env.DATABASE_URL);
      
      // Create connection pool for persistent connections
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
      });

      // Set up pool event handlers
      this.pool.on('connect', () => {
        logger.info('New database connection established');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.pool.on('error', (err) => {
        logger.error('Database pool error:', err);
        this.handleConnectionError(err);
      });

      this.pool.on('remove', () => {
        logger.info('Database connection removed from pool');
      });

      // Create Drizzle instance with HTTP client (for serverless)
      this.drizzleInstance = drizzle(this.httpClient, { schema });

      // Test the connection
      await this.testConnection();
      
      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      this.handleConnectionError(error);
    }
  }

  private async testConnection() {
    try {
      // Simple query to test connection
      const result = await this.httpClient!`SELECT 1 as test`;
      if (result[0]?.test !== 1) {
        throw new Error('Database connection test failed');
      }
      this.isConnected = true;
      logger.info('Database connection test successful');
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  private async handleConnectionError(error: any) {
    this.isConnected = false;
    this.connectionAttempts++;

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      logger.error(`Max connection attempts (${this.maxConnectionAttempts}) reached. Giving up.`);
      // In production, you might want to alert ops team or restart the service
      return;
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    logger.info(`Retrying database connection in ${retryDelay}ms (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
    
    setTimeout(() => {
      this.initialize();
    }, retryDelay);
  }

  /**
   * Get Drizzle ORM instance
   */
  getDrizzle() {
    if (!this.drizzleInstance) {
      throw new Error('Database not initialized');
    }
    return this.drizzleInstance;
  }

  /**
   * Get raw pool for complex queries
   */
  getPool() {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  /**
   * Execute a query with the pool
   */
  async query<T = any>(text: string, params?: any[]): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          query: text,
          duration,
          params: params?.length,
        });
      }

      return result.rows as T;
    } catch (error) {
      logger.error('Query execution failed', {
        query: text,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    connected: boolean;
    poolSize: number;
    idleCount: number;
    waitingCount: number;
  }> {
    if (!this.pool) {
      return {
        connected: false,
        poolSize: 0,
        idleCount: 0,
        waitingCount: 0,
      };
    }

    try {
      await this.testConnection();
      return {
        connected: this.isConnected,
        poolSize: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };
    } catch (error) {
      return {
        connected: false,
        poolSize: this.pool.totalCount || 0,
        idleCount: this.pool.idleCount || 0,
        waitingCount: this.pool.waitingCount || 0,
      };
    }
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('Database connections closed');
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      poolStats: this.pool ? {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      } : null,
    };
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Export the Drizzle instance
export const db = dbConnection.getDrizzle();

// Export connection utilities
export const getPool = () => dbConnection.getPool();
export const query = <T = any>(text: string, params?: any[]) => dbConnection.query<T>(text, params);
export const transaction = <T>(callback: (client: any) => Promise<T>) => dbConnection.transaction(callback);
export const healthCheck = () => dbConnection.healthCheck();
export const closeConnections = () => dbConnection.close();
export const getConnectionStatus = () => dbConnection.getStatus();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connections...');
  await dbConnection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connections...');
  await dbConnection.close();
  process.exit(0);
});

export * from './schema';