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

  // 创建表
  async createTable(
    connectionId: string, 
    database: string, 
    tableName: string, 
    columns: Array<{
      name: string, 
      type: string, 
      nullable: boolean, 
      defaultValue?: string, 
      primaryKey?: boolean,
      autoIncrement?: boolean,
      unique?: boolean,
      unsigned?: boolean,
      comment?: string
    }>,
    indexes?: Array<{name: string, columns: string[], type: 'INDEX' | 'UNIQUE' | 'FULLTEXT'}>
  ): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const columnDefs: string[] = [];
    const primaryKeys: string[] = [];
    const uniqueKeys: string[] = [];
    
    columns.forEach(col => {
      let def = `\`${col.name}\` ${col.type}`;
      if (col.unsigned) def += ' UNSIGNED';
      if (!col.nullable) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.defaultValue !== undefined && col.defaultValue !== '') {
        // 处理特殊默认值
        if (col.defaultValue.toUpperCase() === 'NULL') {
          def += ' DEFAULT NULL';
        } else if (col.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP') {
          def += ' DEFAULT CURRENT_TIMESTAMP';
        } else {
          def += ` DEFAULT '${col.defaultValue}'`;
        }
      }
      if (col.comment) def += ` COMMENT '${col.comment}'`;
      
      columnDefs.push(def);
      
      if (col.primaryKey) primaryKeys.push(`\`${col.name}\``);
      if (col.unique && !col.primaryKey) uniqueKeys.push(`\`${col.name}\``);
    });
    
    // 添加主键约束
    if (primaryKeys.length > 0) {
      columnDefs.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
    }
    
    // 添加唯一约束
    uniqueKeys.forEach(uk => {
      columnDefs.push(`UNIQUE KEY (${uk})`);
    });
    
    // 添加索引
    if (indexes && indexes.length > 0) {
      indexes.forEach((idx, i) => {
        const idxName = idx.name || `idx_${tableName}_${i}`;
        const idxCols = idx.columns.map(c => `\`${c}\``).join(', ');
        if (idx.type === 'UNIQUE') {
          columnDefs.push(`UNIQUE KEY \`${idxName}\` (${idxCols})`);
        } else if (idx.type === 'FULLTEXT') {
          columnDefs.push(`FULLTEXT KEY \`${idxName}\` (${idxCols})`);
        } else {
          columnDefs.push(`KEY \`${idxName}\` (${idxCols})`);
        }
      });
    }
    
    await connection.query(`CREATE TABLE \`${tableName}\` (${columnDefs.join(', ')})`);
  }

  // 删除表
  async dropTable(connectionId: string, database: string, table: string): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    await connection.query(`DROP TABLE \`${table}\``);
  }

  // 获取表的列信息（用于确定主键）
  async getTableColumns(connectionId: string, database: string, table: string): Promise<any[]> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    const [rows] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
    return rows as any[];
  }

  // 更新行数据
  async updateRow(connectionId: string, database: string, table: string, primaryKey: {column: string, value: any}, updates: Record<string, any>): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const setClauses = Object.entries(updates)
      .map(([col]) => `\`${col}\` = ?`)
      .join(', ');
    const values = [...Object.values(updates), primaryKey.value];
    
    await connection.query(
      `UPDATE \`${table}\` SET ${setClauses} WHERE \`${primaryKey.column}\` = ?`,
      values
    );
  }

  // 删除行
  async deleteRow(connectionId: string, database: string, table: string, primaryKey: {column: string, value: any}): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    await connection.query(
      `DELETE FROM \`${table}\` WHERE \`${primaryKey.column}\` = ?`,
      [primaryKey.value]
    );
  }

  // 格式化默认值
  private formatDefaultValue(defaultValue: string): string {
    if (!defaultValue) return '';
    const upper = defaultValue.toUpperCase();
    // 这些特殊值不需要引号
    const specialValues = ['NULL', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'NOW()'];
    if (specialValues.some(v => upper.startsWith(v))) {
      return defaultValue;
    }
    // 数字不需要引号
    if (/^-?\d+(\.\d+)?$/.test(defaultValue)) {
      return defaultValue;
    }
    // 空字符串
    if (defaultValue === "''") {
      return "''";
    }
    // 其他值需要引号
    return `'${defaultValue}'`;
  }

  // 添加列
  async addColumn(connectionId: string, database: string, table: string, column: {name: string, type: string, nullable: boolean, defaultValue?: string}): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    let sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${column.name}\` ${column.type}`;
    if (!column.nullable) sql += ' NOT NULL';
    if (column.defaultValue !== undefined && column.defaultValue !== '') {
      sql += ` DEFAULT ${this.formatDefaultValue(column.defaultValue)}`;
    }
    
    await connection.query(sql);
  }

  // 修改列
  async modifyColumn(connectionId: string, database: string, table: string, oldName: string, column: {name: string, type: string, nullable: boolean, defaultValue?: string}): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    let sql = `ALTER TABLE \`${table}\` CHANGE COLUMN \`${oldName}\` \`${column.name}\` ${column.type}`;
    if (!column.nullable) sql += ' NOT NULL';
    if (column.defaultValue !== undefined && column.defaultValue !== '') {
      sql += ` DEFAULT ${this.formatDefaultValue(column.defaultValue)}`;
    }
    
    await connection.query(sql);
  }

  // 删除列
  async dropColumn(connectionId: string, database: string, table: string, columnName: string): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${columnName}\``);
  }

  // 插入行
  async insertRow(connectionId: string, database: string, table: string, data: Record<string, any>): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const columns = Object.keys(data).map(c => `\`${c}\``).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    await connection.query(
      `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`,
      values
    );
  }

  // 批量删除行
  async deleteRows(connectionId: string, database: string, table: string, primaryKey: {column: string, values: any[]}): Promise<number> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const placeholders = primaryKey.values.map(() => '?').join(', ');
    const [result] = await connection.query(
      `DELETE FROM \`${table}\` WHERE \`${primaryKey.column}\` IN (${placeholders})`,
      primaryKey.values
    );
    return (result as any).affectedRows;
  }

  // 清空表数据
  async truncateTable(connectionId: string, database: string, table: string): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    await connection.query(`TRUNCATE TABLE \`${table}\``);
  }

  // 获取表的索引
  async getTableIndexes(connectionId: string, database: string, table: string): Promise<any[]> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    const [rows] = await connection.query(`SHOW INDEX FROM \`${table}\``);
    return rows as any[];
  }

  // 获取表的外键
  async getTableForeignKeys(connectionId: string, database: string, table: string): Promise<any[]> {
    const connection = this.getConnection(connectionId);
    const [rows] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME as name,
        COLUMN_NAME as column,
        REFERENCED_TABLE_NAME as refTable,
        REFERENCED_COLUMN_NAME as refColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [database, table]);
    return rows as any[];
  }

  // 添加索引
  async addIndex(connectionId: string, database: string, table: string, index: {name: string, columns: string[], type: string}): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    const cols = index.columns.map(c => `\`${c}\``).join(', ');
    let sql = '';
    if (index.type === 'UNIQUE') {
      sql = `CREATE UNIQUE INDEX \`${index.name}\` ON \`${table}\` (${cols})`;
    } else if (index.type === 'FULLTEXT') {
      sql = `CREATE FULLTEXT INDEX \`${index.name}\` ON \`${table}\` (${cols})`;
    } else {
      sql = `CREATE INDEX \`${index.name}\` ON \`${table}\` (${cols})`;
    }
    await connection.query(sql);
  }

  // 删除索引
  async dropIndex(connectionId: string, database: string, table: string, indexName: string): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    await connection.query(`DROP INDEX \`${indexName}\` ON \`${table}\``);
  }

  // 添加外键
  async addForeignKey(connectionId: string, database: string, table: string, fk: {name: string, column: string, refTable: string, refColumn: string, onDelete?: string, onUpdate?: string}): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    let sql = `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fk.name}\` FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.refTable}\`(\`${fk.refColumn}\`)`;
    if (fk.onDelete) sql += ` ON DELETE ${fk.onDelete}`;
    if (fk.onUpdate) sql += ` ON UPDATE ${fk.onUpdate}`;
    await connection.query(sql);
  }

  // 删除外键
  async dropForeignKey(connectionId: string, database: string, table: string, fkName: string): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    await connection.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
  }

  // 修改主键
  async modifyPrimaryKey(connectionId: string, database: string, table: string, columns: string[]): Promise<void> {
    const connection = this.getConnection(connectionId);
    await connection.query(`USE \`${database}\``);
    
    // 先删除旧主键
    try {
      await connection.query(`ALTER TABLE \`${table}\` DROP PRIMARY KEY`);
    } catch (e) {
      // 可能没有主键
    }
    
    // 添加新主键
    if (columns.length > 0) {
      const cols = columns.map(c => `\`${c}\``).join(', ');
      await connection.query(`ALTER TABLE \`${table}\` ADD PRIMARY KEY (${cols})`);
    }
  }
}

