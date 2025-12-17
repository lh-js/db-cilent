import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseManager } from './database/databaseManager';
import { RedisManager } from './database/redisManager';

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

