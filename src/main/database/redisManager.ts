import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface RedisConfig {
  type: 'redis';
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  name?: string;
}

interface RedisConnection {
  id: string;
  config: RedisConfig;
  client: Redis | null;
}

export class RedisManager {
  private connections: Map<string, RedisConnection> = new Map();

  async testConnection(config: RedisConfig): Promise<boolean> {
    const client = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || undefined,
      db: config.database || 0,
      lazyConnect: true,
    });
    
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  }

  async connect(config: RedisConfig): Promise<string> {
    const connectionId = uuidv4();
    
    const client = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || undefined,
      db: config.database || 0,
    });

    await client.ping();

    this.connections.set(connectionId, {
      id: connectionId,
      config,
      client,
    });

    return connectionId;
  }

  async disconnect(connectionId: string): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (conn && conn.client) {
      await conn.client.quit();
      this.connections.delete(connectionId);
    }
  }

  private getClient(connectionId: string): Redis {
    const conn = this.connections.get(connectionId);
    if (!conn || !conn.client) {
      throw new Error('Redis connection not found or closed');
    }
    return conn.client;
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    // Redis 有 16 个数据库 (0-15)
    return Array.from({ length: 16 }, (_, i) => `db${i}`);
  }

  async selectDatabase(connectionId: string, dbIndex: number): Promise<void> {
    const client = this.getClient(connectionId);
    await client.select(dbIndex);
  }

  async getKeys(connectionId: string, pattern: string = '*'): Promise<string[]> {
    const client = this.getClient(connectionId);
    const keys = await client.keys(pattern);
    return keys.sort();
  }

  async getKeyType(connectionId: string, key: string): Promise<string> {
    const client = this.getClient(connectionId);
    return await client.type(key);
  }

  async getValue(connectionId: string, key: string): Promise<any> {
    const client = this.getClient(connectionId);
    const type = await client.type(key);
    
    switch (type) {
      case 'string':
        return { type, value: await client.get(key) };
      case 'list':
        return { type, value: await client.lrange(key, 0, -1) };
      case 'set':
        return { type, value: await client.smembers(key) };
      case 'zset':
        return { type, value: await client.zrange(key, 0, -1, 'WITHSCORES') };
      case 'hash':
        return { type, value: await client.hgetall(key) };
      default:
        return { type, value: null };
    }
  }

  async setValue(connectionId: string, key: string, value: string, type: string = 'string'): Promise<void> {
    const client = this.getClient(connectionId);
    if (type === 'string') {
      await client.set(key, value);
    }
  }

  async deleteKey(connectionId: string, key: string): Promise<number> {
    const client = this.getClient(connectionId);
    return await client.del(key);
  }

  async getTTL(connectionId: string, key: string): Promise<number> {
    const client = this.getClient(connectionId);
    return await client.ttl(key);
  }

  async executeCommand(connectionId: string, command: string): Promise<any> {
    const client = this.getClient(connectionId);
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    const startTime = Date.now();
    // @ts-ignore
    const result = await client.call(cmd, ...args);
    const executionTime = Date.now() - startTime;
    
    return {
      result,
      executionTime,
    };
  }

  async getInfo(connectionId: string): Promise<string> {
    const client = this.getClient(connectionId);
    return await client.info();
  }

  async getDbSize(connectionId: string): Promise<number> {
    const client = this.getClient(connectionId);
    return await client.dbsize();
  }
}
