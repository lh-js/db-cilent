import React, { useState, useEffect } from 'react';
import './QueryEditor.css';

interface QueryEditorProps {
  connectionId: string;
  database: string | null;
  onResults?: (results: any) => void;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ connectionId, database, onResults }) => {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleExecute = async () => {
    if (!database) {
      setError('请先选择一个数据库');
      return;
    }

    if (!query.trim()) {
      setError('请输入 SQL 查询');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const startTime = Date.now();
      const result = await window.electronAPI.executeQuery(connectionId, database, query);
      const endTime = Date.now();

      if (result.success) {
        setResults(result.data);
        setExecutionTime(result.data.executionTime || endTime - startTime);
        onResults?.(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleExecute();
    }
  };

  const exportToCSV = () => {
    if (!results || !results.rows || results.rows.length === 0) return;

    const headers = results.columns.join(',');
    const rows = results.rows.map((row: any) =>
      results.columns.map((col: string) => {
        const value = row[col];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="query-editor">
      <div className="editor-header">
        <h3>SQL 查询</h3>
        <div className="editor-actions">
          {results && (
            <button className="btn-secondary" onClick={exportToCSV}>
              导出 CSV
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handleExecute}
            disabled={loading || !database}
          >
            {loading ? '执行中...' : '执行 (⌘+Enter)'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <textarea
          className="query-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入 SQL 查询语句..."
        />
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default QueryEditor;

