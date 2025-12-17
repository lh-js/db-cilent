import { contextBridge, ipcRenderer } from 'electron';

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'sqlite' | 'redis';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string | number;
  filename?: string; // for SQLite
  name?: string; // connection name
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  affectedRows?: number;
  executionTime?: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  testConnection: (config: DatabaseConfig) => 
    ipcRenderer.invoke('db:test-connection', config),
  
  connect: (config: DatabaseConfig) => 
    ipcRenderer.invoke('db:connect', config),
  
  disconnect: (connectionId: string) => 
    ipcRenderer.invoke('db:disconnect', connectionId),
  
  getDatabases: (connectionId: string) => 
    ipcRenderer.invoke('db:get-databases', connectionId),
  
  getTables: (connectionId: string, database: string) => 
    ipcRenderer.invoke('db:get-tables', connectionId, database),
  
  getTableStructure: (connectionId: string, database: string, table: string) => 
    ipcRenderer.invoke('db:get-table-structure', connectionId, database, table),
  
  executeQuery: (connectionId: string, database: string, query: string) => 
    ipcRenderer.invoke('db:execute-query', connectionId, database, query),
  
  getTableData: (connectionId: string, database: string, table: string) => 
    ipcRenderer.invoke('db:get-table-data', connectionId, database, table),

  // Redis operations
  redisTestConnection: (config: DatabaseConfig) =>
    ipcRenderer.invoke('redis:test-connection', config),
  
  redisConnect: (config: DatabaseConfig) =>
    ipcRenderer.invoke('redis:connect', config),
  
  redisDisconnect: (connectionId: string) =>
    ipcRenderer.invoke('redis:disconnect', connectionId),
  
  redisGetDatabases: (connectionId: string) =>
    ipcRenderer.invoke('redis:get-databases', connectionId),
  
  redisSelectDatabase: (connectionId: string, dbIndex: number) =>
    ipcRenderer.invoke('redis:select-database', connectionId, dbIndex),
  
  redisGetKeys: (connectionId: string, pattern?: string) =>
    ipcRenderer.invoke('redis:get-keys', connectionId, pattern),
  
  redisGetValue: (connectionId: string, key: string) =>
    ipcRenderer.invoke('redis:get-value', connectionId, key),
  
  redisSetValue: (connectionId: string, key: string, value: string, type?: string) =>
    ipcRenderer.invoke('redis:set-value', connectionId, key, value, type),
  
  redisDeleteKey: (connectionId: string, key: string) =>
    ipcRenderer.invoke('redis:delete-key', connectionId, key),
  
  redisGetTTL: (connectionId: string, key: string) =>
    ipcRenderer.invoke('redis:get-ttl', connectionId, key),
  
  redisExecuteCommand: (connectionId: string, command: string) =>
    ipcRenderer.invoke('redis:execute-command', connectionId, command),
  
  redisGetInfo: (connectionId: string) =>
    ipcRenderer.invoke('redis:get-info', connectionId),
  
  redisGetDbSize: (connectionId: string) =>
    ipcRenderer.invoke('redis:get-dbsize', connectionId),
});

declare global {
  interface Window {
    electronAPI: {
      testConnection: (config: DatabaseConfig) => Promise<any>;
      connect: (config: DatabaseConfig) => Promise<any>;
      disconnect: (connectionId: string) => Promise<any>;
      getDatabases: (connectionId: string) => Promise<any>;
      getTables: (connectionId: string, database: string) => Promise<any>;
      getTableStructure: (connectionId: string, database: string, table: string) => Promise<any>;
      executeQuery: (connectionId: string, database: string, query: string) => Promise<any>;
      getTableData: (connectionId: string, database: string, table: string) => Promise<any>;
      // Redis
      redisTestConnection: (config: DatabaseConfig) => Promise<any>;
      redisConnect: (config: DatabaseConfig) => Promise<any>;
      redisDisconnect: (connectionId: string) => Promise<any>;
      redisGetDatabases: (connectionId: string) => Promise<any>;
      redisSelectDatabase: (connectionId: string, dbIndex: number) => Promise<any>;
      redisGetKeys: (connectionId: string, pattern?: string) => Promise<any>;
      redisGetValue: (connectionId: string, key: string) => Promise<any>;
      redisSetValue: (connectionId: string, key: string, value: string, type?: string) => Promise<any>;
      redisDeleteKey: (connectionId: string, key: string) => Promise<any>;
      redisGetTTL: (connectionId: string, key: string) => Promise<any>;
      redisExecuteCommand: (connectionId: string, command: string) => Promise<any>;
      redisGetInfo: (connectionId: string) => Promise<any>;
      redisGetDbSize: (connectionId: string) => Promise<any>;
    };
  }
}

