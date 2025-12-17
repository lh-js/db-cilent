import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { DatabaseManager } from './database/databaseManager';
import { RedisManager } from './database/redisManager';

// 禁用 GPU 加速以避免虚拟机/某些系统上的兼容性问题
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow: BrowserWindow | null = null;
const dbManager = new DatabaseManager();
const redisManager = new RedisManager();

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // preload 脚本路径 - 编译后 main.js 和 preload.js 都在 dist/ 目录下
  const preloadPath = path.join(__dirname, 'preload.js');
  
  // 检查 preload 文件是否存在
  const fs = require('fs');
  if (!fs.existsSync(preloadPath)) {
    console.error('Preload file not found at:', preloadPath);
    console.error('Please make sure to run "npm run build:main" or "npm run dev:main" first');
  } else {
    console.log('Preload file found at:', preloadPath);
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // 开发模式保留默认菜单（包含开发者工具），打包后隐藏或简化菜单
  if (isDev) {
    // 开发模式：保留完整菜单（包含 View 菜单的开发者工具）
    // 不设置菜单，使用 Electron 默认菜单
  } else {
    // 打包模式：隐藏菜单栏（Windows/Linux）或设置简洁菜单（Mac）
    if (process.platform === 'darwin') {
      // Mac 保留基本菜单
      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        },
        {
          label: '编辑',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' }
          ]
        }
      ];
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    } else {
      // Windows/Linux 隐藏菜单
      Menu.setApplicationMenu(null);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for database operations
ipcMain.handle('db:test-connection', async (_event, config) => {
  try {
    const result = await dbManager.testConnection(config);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:connect', async (_event, config) => {
  try {
    const connectionId = await dbManager.connect(config);
    return { success: true, connectionId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:disconnect', async (_event, connectionId) => {
  try {
    await dbManager.disconnect(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-databases', async (_event, connectionId) => {
  try {
    const databases = await dbManager.getDatabases(connectionId);
    return { success: true, data: databases };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-tables', async (_event, connectionId, database) => {
  try {
    const tables = await dbManager.getTables(connectionId, database);
    return { success: true, data: tables };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-table-structure', async (_event, connectionId, database, table) => {
  try {
    const structure = await dbManager.getTableStructure(connectionId, database, table);
    return { success: true, data: structure };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:execute-query', async (_event, connectionId, database, query) => {
  try {
    const result = await dbManager.executeQuery(connectionId, database, query);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-table-data', async (_event, connectionId, database, table) => {
  try {
    const data = await dbManager.getTableData(connectionId, database, table);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Table management handlers
ipcMain.handle('db:create-table', async (_event, connectionId, database, tableName, columns, indexes) => {
  try {
    await dbManager.createTable(connectionId, database, tableName, columns, indexes);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:drop-table', async (_event, connectionId, database, table) => {
  try {
    await dbManager.dropTable(connectionId, database, table);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-table-columns', async (_event, connectionId, database, table) => {
  try {
    const columns = await dbManager.getTableColumns(connectionId, database, table);
    return { success: true, data: columns };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:update-row', async (_event, connectionId, database, table, primaryKey, updates) => {
  try {
    await dbManager.updateRow(connectionId, database, table, primaryKey, updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:delete-row', async (_event, connectionId, database, table, primaryKey) => {
  try {
    await dbManager.deleteRow(connectionId, database, table, primaryKey);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:add-column', async (_event, connectionId, database, table, column) => {
  try {
    await dbManager.addColumn(connectionId, database, table, column);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:modify-column', async (_event, connectionId, database, table, oldName, column) => {
  try {
    await dbManager.modifyColumn(connectionId, database, table, oldName, column);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:drop-column', async (_event, connectionId, database, table, columnName) => {
  try {
    await dbManager.dropColumn(connectionId, database, table, columnName);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:insert-row', async (_event, connectionId, database, table, data) => {
  try {
    await dbManager.insertRow(connectionId, database, table, data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:delete-rows', async (_event, connectionId, database, table, primaryKey) => {
  try {
    const count = await dbManager.deleteRows(connectionId, database, table, primaryKey);
    return { success: true, data: count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:truncate-table', async (_event, connectionId, database, table) => {
  try {
    await dbManager.truncateTable(connectionId, database, table);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-table-indexes', async (_event, connectionId, database, table) => {
  try {
    const indexes = await dbManager.getTableIndexes(connectionId, database, table);
    return { success: true, data: indexes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get-table-foreign-keys', async (_event, connectionId, database, table) => {
  try {
    const fks = await dbManager.getTableForeignKeys(connectionId, database, table);
    return { success: true, data: fks };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:add-index', async (_event, connectionId, database, table, index) => {
  try {
    await dbManager.addIndex(connectionId, database, table, index);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:drop-index', async (_event, connectionId, database, table, indexName) => {
  try {
    await dbManager.dropIndex(connectionId, database, table, indexName);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:add-foreign-key', async (_event, connectionId, database, table, fk) => {
  try {
    await dbManager.addForeignKey(connectionId, database, table, fk);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:drop-foreign-key', async (_event, connectionId, database, table, fkName) => {
  try {
    await dbManager.dropForeignKey(connectionId, database, table, fkName);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:modify-primary-key', async (_event, connectionId, database, table, columns) => {
  try {
    await dbManager.modifyPrimaryKey(connectionId, database, table, columns);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Redis IPC Handlers
ipcMain.handle('redis:test-connection', async (_event, config) => {
  try {
    const result = await redisManager.testConnection(config);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:connect', async (_event, config) => {
  try {
    const connectionId = await redisManager.connect(config);
    return { success: true, connectionId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:disconnect', async (_event, connectionId) => {
  try {
    await redisManager.disconnect(connectionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:get-databases', async (_event, connectionId) => {
  try {
    const databases = await redisManager.getDatabases(connectionId);
    return { success: true, data: databases };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:select-database', async (_event, connectionId, dbIndex) => {
  try {
    await redisManager.selectDatabase(connectionId, dbIndex);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:get-keys', async (_event, connectionId, pattern) => {
  try {
    const keys = await redisManager.getKeys(connectionId, pattern);
    return { success: true, data: keys };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:get-value', async (_event, connectionId, key) => {
  try {
    const value = await redisManager.getValue(connectionId, key);
    return { success: true, data: value };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:set-value', async (_event, connectionId, key, value, type) => {
  try {
    await redisManager.setValue(connectionId, key, value, type);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:delete-key', async (_event, connectionId, key) => {
  try {
    const result = await redisManager.deleteKey(connectionId, key);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:get-ttl', async (_event, connectionId, key) => {
  try {
    const ttl = await redisManager.getTTL(connectionId, key);
    return { success: true, data: ttl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:execute-command', async (_event, connectionId, command) => {
  try {
    const result = await redisManager.executeCommand(connectionId, command);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:get-info', async (_event, connectionId) => {
  try {
    const info = await redisManager.getInfo(connectionId);
    return { success: true, data: info };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('redis:get-dbsize', async (_event, connectionId) => {
  try {
    const size = await redisManager.getDbSize(connectionId);
    return { success: true, data: size };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

