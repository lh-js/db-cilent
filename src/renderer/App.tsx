import React, { useState, useEffect, useRef } from 'react';
import ConnectionPanel from './components/ConnectionPanel';
import DatabaseExplorer from './components/DatabaseExplorer';
import RedisExplorer from './components/RedisExplorer';
import QueryEditor from './components/QueryEditor';
import DataTable from './components/DataTable';
import RedisDataView from './components/RedisDataView';
import CreateTableDialog from './components/CreateTableDialog';
import TableStructureDialog from './components/TableStructureDialog';
import './styles/App.css';

interface Connection {
  id: string;
  name: string;
  type: string;
  config?: any;
}

interface AppProps {
  onReady?: () => void;
}

function App({ onReady }: AppProps) {
  const [currentConnection, setCurrentConnection] = useState<string | null>(null);
  const [currentDatabase, setCurrentDatabase] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [queryResults, setQueryResults] = useState<any>(null);
  const [redisData, setRedisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState<string | null>(null);
  const [columnInfo, setColumnInfo] = useState<any[]>([]);
  const [showStructure, setShowStructure] = useState(false);
  const [structureTable, setStructureTable] = useState<string | null>(null);
  const explorerRef = useRef<any>(null);

  useEffect(() => {
    // Load saved connections from localStorage
    const saved = localStorage.getItem('db-connections');
    if (saved) {
      setConnections(JSON.parse(saved));
    }
    // 通知应用已加载完成
    onReady?.();
  }, []);

  const handleConnectionCreated = (connection: Connection) => {
    const connWithConfig = {
      ...connection,
      config: connection.config || null,
    };
    const updated = [...connections, connWithConfig];
    setConnections(updated);
    localStorage.setItem('db-connections', JSON.stringify(updated));
    setCurrentConnection(connection.id);
    // 如果配置了数据库名，自动选中
    if (connection.config?.database) {
      setCurrentDatabase(connection.config.database);
    }
  };

  const handleConnectionSelected = async (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (conn?.config) {
      try {
        // 根据类型选择连接方法
        const result = conn.config.type === 'redis'
          ? await window.electronAPI.redisConnect(conn.config)
          : await window.electronAPI.connect(conn.config);
        if (result.success) {
          // 更新连接ID
          const newId = result.connectionId;
          const updated = connections.map(c => 
            c.id === connectionId ? { ...c, id: newId } : c
          );
          setConnections(updated);
          localStorage.setItem('db-connections', JSON.stringify(updated));
          setCurrentConnection(newId);
          setQueryResults(null);
          setRedisData(null);
          // 如果配置了数据库名，自动选中
          if (conn.config.database && conn.config.type !== 'redis') {
            setCurrentDatabase(conn.config.database);
          } else {
            setCurrentDatabase(null);
          }
          return;
        }
      } catch (e) {
        console.error('重新连接失败:', e);
      }
    }
    setCurrentConnection(connectionId);
    setCurrentDatabase(null);
  };

  const handleConnectionDeleted = async (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    try {
      if (conn?.config?.type === 'redis') {
        await window.electronAPI.redisDisconnect(connectionId);
      } else {
        await window.electronAPI.disconnect(connectionId);
      }
    } catch (e) {
      // 连接可能已断开，忽略错误
    }
    const updated = connections.filter(c => c.id !== connectionId);
    setConnections(updated);
    localStorage.setItem('db-connections', JSON.stringify(updated));
    if (currentConnection === connectionId) {
      setCurrentConnection(null);
      setCurrentDatabase(null);
    }
  };

  const handleConnectionUpdated = (connection: Connection) => {
    const updated = connections.map(c => c.id === connection.id ? connection : c);
    setConnections(updated);
    localStorage.setItem('db-connections', JSON.stringify(updated));
  };

  const handleTableSelected = async (table: string, data: any) => {
    setCurrentTable(table);
    setQueryResults(data);
    // 获取列信息（包括主键和类型）
    if (currentConnection && currentDatabase) {
      try {
        const result = await window.electronAPI.getTableColumns(currentConnection, currentDatabase, table);
        if (result.success) {
          setColumnInfo(result.data);
          const pkCol = result.data.find((c: any) => c.Key === 'PRI');
          setPrimaryKeyColumn(pkCol?.Field || null);
        }
      } catch (e) {
        console.error('获取列信息失败', e);
      }
    }
  };

  const handleCreateTable = async (tableName: string, columns: any[], indexes: any[], foreignKeys: any[]) => {
    if (!currentConnection || !currentDatabase) return;
    try {
      const result = await window.electronAPI.createTable(currentConnection, currentDatabase, tableName, columns, indexes);
      if (result.success) {
        // 添加外键
        for (const fk of foreignKeys) {
          await window.electronAPI.addForeignKey(currentConnection, currentDatabase, tableName, fk);
        }
        setShowCreateTable(false);
        // 触发刷新表列表
        explorerRef.current?.loadTables?.();
      } else {
        alert('创建表失败: ' + result.error);
      }
    } catch (err: any) {
      alert('创建表失败: ' + err.message);
    }
  };

  const refreshTableData = async () => {
    if (!currentConnection || !currentDatabase || !currentTable) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.getTableData(currentConnection, currentDatabase, currentTable);
      if (result.success) {
        setQueryResults(result.data);
      }
      // 同时刷新列信息
      const colResult = await window.electronAPI.getTableColumns(currentConnection, currentDatabase, currentTable);
      if (colResult.success) {
        setColumnInfo(colResult.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStructure = async (table: string) => {
    if (!currentConnection || !currentDatabase) return;
    try {
      const result = await window.electronAPI.getTableColumns(currentConnection, currentDatabase, table);
      if (result.success) {
        setColumnInfo(result.data);
        setStructureTable(table);
        setShowStructure(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStructureChanged = async () => {
    if (!currentConnection || !currentDatabase || !structureTable) return;
    // 刷新列信息
    try {
      const result = await window.electronAPI.getTableColumns(currentConnection, currentDatabase, structureTable);
      if (result.success) {
        setColumnInfo(result.data);
      }
      // 如果正在查看这个表的数据，也刷新数据
      if (currentTable === structureTable) {
        refreshTableData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedisKeySelected = (key: string, data: any) => {
    setRedisData(data);
  };

  const getCurrentConnectionType = () => {
    const conn = connections.find(c => c.id === currentConnection);
    return conn?.config?.type || conn?.type || 'mysql';
  };

  const isRedis = getCurrentConnectionType() === 'redis';


  return (
    <div className="app">
      <div className="app-header">
        <h1>Neurix DB Client</h1>
      </div>
      <div className="app-content">
        <div className="sidebar">
          <ConnectionPanel
            connections={connections}
            currentConnection={currentConnection}
            onConnectionCreated={handleConnectionCreated}
            onConnectionSelected={handleConnectionSelected}
            onConnectionDeleted={handleConnectionDeleted}
            onConnectionUpdated={handleConnectionUpdated}
          />
        </div>
        <div className="main-content">
          {currentConnection ? (
            <>
              <div className="top-section">
                <div className="explorer-panel">
                  {isRedis ? (
                    <RedisExplorer
                      connectionId={currentConnection}
                      onKeySelected={handleRedisKeySelected}
                      onLoadingChange={setLoading}
                    />
                  ) : (
                    <DatabaseExplorer
                      connectionId={currentConnection}
                      currentDatabase={currentDatabase}
                      onDatabaseSelected={setCurrentDatabase}
                      onTableSelected={handleTableSelected}
                      onLoadingChange={setLoading}
                      onCreateTable={() => setShowCreateTable(true)}
                      onEditStructure={handleEditStructure}
                    />
                  )}
                </div>
                <div className="results-panel">
                  {loading && (
                    <div className="loading-overlay">
                      <div className="loading-spinner"></div>
                      <span>加载中...</span>
                    </div>
                  )}
                  {isRedis ? (
                    <RedisDataView data={redisData} />
                  ) : queryResults ? (
                    <DataTable
                      columns={queryResults.columns || []}
                      rows={queryResults.rows || []}
                      totalCount={queryResults.totalCount}
                      executionTime={queryResults.executionTime}
                      editable={!!currentTable && !!primaryKeyColumn}
                      connectionId={currentConnection || undefined}
                      database={currentDatabase || undefined}
                      table={currentTable || undefined}
                      primaryKeyColumn={primaryKeyColumn || undefined}
                      columnInfo={columnInfo}
                      onDataChanged={refreshTableData}
                    />
                  ) : (
                    <div className="no-results">
                      <p>点击表或执行查询后结果将显示在这里</p>
                    </div>
                  )}
                </div>
              </div>
              {!isRedis && (
                <div className="bottom-section">
                  <div className="editor-panel">
                    <QueryEditor
                      connectionId={currentConnection}
                      database={currentDatabase}
                      onResults={setQueryResults}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="welcome-screen">
              <h2>欢迎使用 Neurix DB Client</h2>
              <p>请先创建一个数据库连接</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建表对话框 */}
      {showCreateTable && (
        <CreateTableDialog
          connectionId={currentConnection || undefined}
          database={currentDatabase || undefined}
          onClose={() => setShowCreateTable(false)}
          onSubmit={handleCreateTable}
        />
      )}

      {/* 修改表结构对话框 */}
      {showStructure && structureTable && currentConnection && currentDatabase && (
        <TableStructureDialog
          connectionId={currentConnection}
          database={currentDatabase}
          table={structureTable}
          columns={columnInfo}
          onClose={() => setShowStructure(false)}
          onChanged={handleStructureChanged}
        />
      )}
    </div>
  );
}

export default App;

