import React, { useState, useEffect } from 'react';
import './DatabaseExplorer.css';

interface DatabaseExplorerProps {
  connectionId: string;
  currentDatabase: string | null;
  onDatabaseSelected: (database: string) => void;
  onTableSelected?: (table: string, data: any) => void;
  onLoadingChange?: (loading: boolean) => void;
  onCreateTable?: () => void;
  onTablesChanged?: () => void;
  onEditStructure?: (table: string) => void;
}

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  connectionId,
  currentDatabase,
  onDatabaseSelected,
  onTableSelected,
  onLoadingChange,
  onCreateTable,
  onTablesChanged,
  onEditStructure,
}) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, table: string} | null>(null);

  useEffect(() => {
    if (connectionId) {
      loadDatabases();
    }
  }, [connectionId]);

  useEffect(() => {
    if (connectionId && currentDatabase) {
      loadTables();
    } else {
      setTables([]);
    }
  }, [connectionId, currentDatabase]);

  const loadDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getDatabases(connectionId);
      if (result.success) {
        setDatabases(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!currentDatabase) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getTables(connectionId, currentDatabase);
      if (result.success) {
        setTables(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, table: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, table });
  };

  const handleDropTable = async () => {
    if (!contextMenu || !currentDatabase) return;
    if (!confirm(`确定要删除表 "${contextMenu.table}" 吗？此操作不可恢复！`)) return;
    
    try {
      const result = await window.electronAPI.dropTable(connectionId, currentDatabase, contextMenu.table);
      if (result.success) {
        loadTables();
        onTablesChanged?.();
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
    setContextMenu(null);
  };

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="database-explorer">
      <div className="explorer-header">
        <h3>数据库</h3>
        <div className="explorer-actions">
          {currentDatabase && onCreateTable && (
            <button className="btn-icon" onClick={onCreateTable} title="新建表">
              ➕
            </button>
          )}
          <button className="btn-icon" onClick={loadDatabases} title="刷新">
            🔄
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading">加载中...</div>}

      <div className="database-list">
        {databases.map((db) => (
          <div key={db} className="database-item">
            <div
              className={`database-name ${currentDatabase === db ? 'active' : ''}`}
              onClick={() => onDatabaseSelected(db)}
            >
              📁 {db}
            </div>
            {currentDatabase === db && (
              <div className="table-list">
                {tables.map((table) => (
                  <div
                    key={table}
                    className={`table-item ${selectedTable === table ? 'active' : ''} ${loadingTable && selectedTable === table ? 'loading' : ''}`}
                    onClick={async () => {
                      setSelectedTable(table);
                      if (onTableSelected && currentDatabase) {
                        setLoadingTable(true);
                        onLoadingChange?.(true);
                        try {
                          const result = await window.electronAPI.getTableData(connectionId, currentDatabase, table);
                          if (result.success) {
                            onTableSelected(table, result.data);
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setLoadingTable(false);
                          onLoadingChange?.(false);
                        }
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, table)}
                  >
                    📊 {table}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {onEditStructure && (
            <div className="context-menu-item" onClick={() => {
              onEditStructure(contextMenu.table);
              setContextMenu(null);
            }}>
              🔧 修改表结构
            </div>
          )}
          <div className="context-menu-item danger" onClick={handleDropTable}>
            🗑️ 删除表
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseExplorer;

