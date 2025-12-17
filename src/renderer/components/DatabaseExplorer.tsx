import React, { useState, useEffect } from 'react';
import './DatabaseExplorer.css';

interface DatabaseExplorerProps {
  connectionId: string;
  currentDatabase: string | null;
  onDatabaseSelected: (database: string) => void;
  onTableSelected?: (table: string, data: any) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  connectionId,
  currentDatabase,
  onDatabaseSelected,
  onTableSelected,
  onLoadingChange,
}) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

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

  return (
    <div className="database-explorer">
      <div className="explorer-header">
        <h3>数据库</h3>
        <button className="btn-icon" onClick={loadDatabases} title="刷新">
          🔄
        </button>
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
                  >
                    📊 {table}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatabaseExplorer;

