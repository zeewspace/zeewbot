import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class DatabaseService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;

  constructor(private redisUrl?: string) {}

  public async connect(): Promise<void> {
    if (!this.redisUrl) {
      logger.info('Redis URL not provided, running without database');
      return;
    }

    try {
      this.redis = new Redis(this.redisUrl);
      
      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Connected to Redis');
      });

      this.redis.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    }
  }

  public isReady(): boolean {
    return this.isConnected && this.redis !== null;
  }

  // Métodos de utilidad para cuando se necesiten
  public async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    return this.redis!.get(key);
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isReady()) return;
    
    if (ttl) {
      await this.redis!.setex(key, ttl, value);
    } else {
      await this.redis!.set(key, value);
    }
  }

  public async delete(key: string): Promise<void> {
    if (!this.isReady()) return;
    await this.redis!.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    return (await this.redis!.exists(key)) === 1;
  }
}
