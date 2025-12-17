import React, { useState, useEffect } from 'react';
import ConnectionPanel from './components/ConnectionPanel';
import DatabaseExplorer from './components/DatabaseExplorer';
import RedisExplorer from './components/RedisExplorer';
import QueryEditor from './components/QueryEditor';
import DataTable from './components/DataTable';
import RedisDataView from './components/RedisDataView';
import './styles/App.css';

interface Connection {
  id: string;
  name: string;
  type: string;
  config?: any;
}

function App() {
  const [currentConnection, setCurrentConnection] = useState<string | null>(null);
  const [currentDatabase, setCurrentDatabase] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [queryResults, setQueryResults] = useState<any>(null);
  const [redisData, setRedisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentTable, setCurrentTable] = useState<string | null>(null);

  useEffect(() => {
    // Load saved connections from localStorage
    const saved = localStorage.getItem('db-connections');
    if (saved) {
      setConnections(JSON.parse(saved));
    }
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
    </div>
  );
}

export default App;

