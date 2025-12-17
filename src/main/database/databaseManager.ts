import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'sqlite';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string;
  name?: string;
}

interface Connection {
  id: string;
  config: DatabaseConfig;
  connection: mysql.Connection | null;
}

export class DatabaseManager {
  private connections: Map<string, Connection> = new Map();

  async testConnection(config: DatabaseConfig): Promise<boolean> {
    if (config.type === 'mysql') {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
      });
      await connection.end();
      return true;
    }
    throw new Error(`Database type ${config.type} is not yet supported`);
  }

  async connect(config: DatabaseConfig): Promise<string> {
    const connectionId = uuidv4();
    let connection: mysql.Connection | null = null;

    if (config.type === 'mysql') {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
      });
    } else {
      throw new Error(`Database type ${config.type} is not yet supported`);
    }

    this.connections.set(connectionId, {
      id: connectionId,
      config,
      connection,
    });

    return connectionId;
  }

  async disconnect(connectionId: string): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (conn && conn.connection) {
      await conn.connection.end();
      this.connections.delete(connectionId);
    }
  }

  private getConnection(connectionId: string): mysql.Connection {
    const conn = this.connections.get(connectionId);
    if (!conn || !conn.connection) {
      throw new Error('Connection not found or closed');
    }
    return conn.connection;
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    const connection = this.getConnection(connectionId);
    const [rows] = await connection.query('SHOW DATABASES');
    return (rows as any[]).map((row: any) => Object.values(row)[0] as string);
  }

  async getTables(connectionId: string, database: string): Promise<string[]> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    const [rows] = await connection.query('SHOW TABLES');
    return (rows as any[]).map((row: any) => Object.values(row)[0] as string);
  }

  async getTableStructure(connectionId: string, database: string, table: string): Promise<any[]> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    const [rows] = await connection.query(`DESCRIBE \`${table}\``);
    return rows as any[];
  }

  async executeQuery(connectionId: string, database: string, query: string): Promise<any> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const startTime = Date.now();
    const [rows, fields] = await connection.query(query);
    const executionTime = Date.now() - startTime;

    return {
      columns: fields?.map((f: any) => f.name) || [],
      rows: rows as any[],
      executionTime,
    };
  }

  async getTableData(connectionId: string, database: string, table: string): Promise<any> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const startTime = Date.now();
    const [rows, fields] = await connection.query(`SELECT * FROM \`${table}\``);
    const executionTime = Date.now() - startTime;
    
    return {
      columns: fields?.map((f: any) => f.name) || [],
      rows: rows as any[],
      totalCount: (rows as any[]).length,
      executionTime,
    };
  }
}

