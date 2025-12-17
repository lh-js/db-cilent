import React, { useState, useEffect } from 'react';
import './ConnectionForm.css';

interface ConnectionConfig {
  id?: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlite' | 'redis';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface ConnectionFormProps {
  onSuccess: (connection: { id: string; name: string; type: string; config: ConnectionConfig }) => void;
  onCancel: () => void;
  editConnection?: ConnectionConfig | null;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ onSuccess, onCancel, editConnection }) => {
  const [formData, setFormData] = useState<ConnectionConfig>({
    name: editConnection?.name || '',
    type: editConnection?.type || 'mysql',
    host: editConnection?.host || 'localhost',
    port: editConnection?.port || 3306,
    user: editConnection?.user || 'root',
    password: editConnection?.password || '',
    database: editConnection?.database || '',
  });
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [electronAPIAvailable, setElectronAPIAvailable] = useState(false);

  useEffect(() => {
    // 检查 electronAPI 是否可用
    const checkAPI = () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        setElectronAPIAvailable(true);
      } else {
        setElectronAPIAvailable(false);
        console.warn('electronAPI is not available');
      }
    };
    
    checkAPI();
    // 定期检查（以防延迟加载）
    const interval = setInterval(checkAPI, 500);
    return () => clearInterval(interval);
  }, []);

  const getDefaultPort = (type: string) => {
    switch (type) {
      case 'mysql': return 3306;
      case 'postgresql': return 5432;
      case 'redis': return 6379;
      default: return 3306;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFormData((prev) => ({
        ...prev,
        type: value as any,
        port: getDefaultPort(value),
        user: value === 'redis' ? '' : (prev.user || 'root'),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'port' ? parseInt(value) || getDefaultPort(prev.type) : value,
      }));
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI) {
        setError('Electron API 未加载，请确保应用正常运行');
        setTesting(false);
        return;
      }

      const config = {
        type: formData.type,
        host: formData.host,
        port: formData.port,
        user: formData.user,
        password: formData.password,
        database: formData.database,
        name: formData.name,
      };
      const result = formData.type === 'redis' 
        ? await window.electronAPI.redisTestConnection(config)
        : await window.electronAPI.testConnection(config);
      if (result.success) {
        alert('连接测试成功！');
      } else {
        setError(result.error || '连接测试失败');
      }
    } catch (err: any) {
      setError(err.message || '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // 检查 electronAPI 是否可用
      if (!window.electronAPI) {
        setError('Electron API 未加载，请确保应用正常运行');
        return;
      }

      const config = {
        type: formData.type,
        host: formData.host,
        port: formData.port,
        user: formData.user,
        password: formData.password,
        database: formData.database,
        name: formData.name,
      };
      const result = formData.type === 'redis'
        ? await window.electronAPI.redisConnect(config)
        : await window.electronAPI.connect(config);
      if (result.success) {
        onSuccess({
          id: editConnection?.id || result.connectionId,
          name: formData.name || `${formData.type}@${formData.host}`,
          type: formData.type,
          config: { ...formData, id: editConnection?.id || result.connectionId },
        });
      } else {
        setError(result.error || '连接失败');
      }
    } catch (err: any) {
      setError(err.message || '连接失败');
    }
  };

  return (
    <form className="connection-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>连接名称</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="我的数据库连接"
        />
      </div>

      <div className="form-group">
        <label>数据库类型</label>
        <select name="type" value={formData.type} onChange={handleChange}>
          <option value="mysql">MySQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="redis">Redis</option>
          <option value="sqlite">SQLite</option>
        </select>
      </div>

      {formData.type !== 'sqlite' && (
        <>
          <div className="form-group">
            <label>主机</label>
            <input
              type="text"
              name="host"
              value={formData.host}
              onChange={handleChange}
              placeholder="localhost"
            />
          </div>

          <div className="form-group">
            <label>端口</label>
            <input
              type="number"
              name="port"
              value={formData.port}
              onChange={handleChange}
              placeholder={formData.type === 'redis' ? '6379' : '3306'}
            />
          </div>

          {formData.type !== 'redis' && (
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                name="user"
                value={formData.user}
                onChange={handleChange}
                placeholder="root"
              />
            </div>
          )}

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={formData.type === 'redis' ? '密码（可选）' : '密码'}
            />
          </div>
        </>
      )}

      {formData.type !== 'redis' && (
        <div className="form-group">
          <label>数据库名</label>
          <input
            type="text"
            name="database"
            value={formData.database}
            onChange={handleChange}
            placeholder="数据库名（可选）"
          />
        </div>
      )}

      {formData.type === 'redis' && (
        <div className="form-group">
          <label>数据库索引</label>
          <input
            type="number"
            name="database"
            value={formData.database}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="15"
          />
        </div>
      )}

      {!electronAPIAvailable && (
        <div className="error-message" style={{ backgroundColor: '#5a4d1d', color: '#ffd700' }}>
          ⚠️ Electron API 未加载。请确保：
          <br />1. 已运行 "npm run dev:main" 编译主进程代码
          <br />2. 应用在 Electron 环境中运行（不是普通浏览器）
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={handleTest} 
          disabled={testing || !electronAPIAvailable}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
        <button 
          type="submit" 
          className="btn-primary"
          disabled={!electronAPIAvailable}
        >
          {editConnection ? '保存' : '连接'}
        </button>
      </div>
    </form>
  );
};

export default ConnectionForm;

