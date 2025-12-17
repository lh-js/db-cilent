import React, { useState, useEffect } from 'react';
import './DatabaseExplorer.css';

interface RedisExplorerProps {
  connectionId: string;
  onKeySelected?: (key: string, data: any) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const RedisExplorer: React.FC<RedisExplorerProps> = ({
  connectionId,
  onKeySelected,
  onLoadingChange,
}) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [currentDb, setCurrentDb] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchPattern, setSearchPattern] = useState('*');

  useEffect(() => {
    if (connectionId) {
      loadDatabases();
      loadKeys();
    }
  }, [connectionId]);

  const loadDatabases = async () => {
    try {
      const result = await window.electronAPI.redisGetDatabases(connectionId);
      if (result.success) {
        setDatabases(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadKeys = async (pattern: string = '*') => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.redisGetKeys(connectionId, pattern);
      if (result.success) {
        setKeys(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDbSelect = async (dbIndex: number) => {
    setCurrentDb(dbIndex);
    setLoading(true);
    try {
      await window.electronAPI.redisSelectDatabase(connectionId, dbIndex);
      await loadKeys(searchPattern);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleKeyClick = async (key: string) => {
    setSelectedKey(key);
    if (onKeySelected) {
      setLoadingKey(true);
      onLoadingChange?.(true);
      try {
        const result = await window.electronAPI.redisGetValue(connectionId, key);
        if (result.success) {
          const ttlResult = await window.electronAPI.redisGetTTL(connectionId, key);
          onKeySelected(key, {
            ...result.data,
            key,
            ttl: ttlResult.success ? ttlResult.data : -1,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingKey(false);
        onLoadingChange?.(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadKeys(searchPattern);
  };

  return (
    <div className="database-explorer">
      <div className="explorer-header">
        <h3>Redis</h3>
        <button className="btn-icon" onClick={() => loadKeys(searchPattern)} title="刷新">
          🔄
        </button>
      </div>

      <div className="form-group" style={{ padding: '0 12px', marginBottom: '8px' }}>
        <select 
          value={currentDb} 
          onChange={(e) => handleDbSelect(Number(e.target.value))}
          style={{ width: '100%', padding: '6px', background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #555', borderRadius: '4px' }}
        >
          {databases.map((db, idx) => (
            <option key={db} value={idx}>{db}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSearch} style={{ padding: '0 12px', marginBottom: '8px' }}>
        <input
          type="text"
          value={searchPattern}
          onChange={(e) => setSearchPattern(e.target.value)}
          placeholder="搜索 key（支持 * 通配符）"
          style={{ width: '100%', padding: '6px', background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #555', borderRadius: '4px' }}
        />
      </form>

      {error && <div className="error-message" style={{ margin: '0 12px' }}>{error}</div>}

      {loading && <div className="loading">加载中...</div>}

      <div className="database-list">
        <div className="table-list" style={{ marginLeft: 0, paddingLeft: '12px', borderLeft: 'none' }}>
          {keys.length === 0 && !loading && (
            <div style={{ padding: '12px', color: '#888', fontSize: '12px' }}>暂无数据</div>
          )}
          {keys.map((key) => (
            <div
              key={key}
              className={`table-item ${selectedKey === key ? 'active' : ''} ${loadingKey && selectedKey === key ? 'loading' : ''}`}
              onClick={() => handleKeyClick(key)}
            >
              🔑 {key}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RedisExplorer;
