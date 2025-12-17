import React, { useState } from 'react';
import ConnectionForm from './ConnectionForm';
import './ConnectionPanel.css';

interface ConnectionConfig {
  id?: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlite';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface Connection {
  id: string;
  name: string;
  type: string;
  config?: ConnectionConfig;
}

interface ConnectionPanelProps {
  connections: Connection[];
  currentConnection: string | null;
  onConnectionCreated: (connection: Connection) => void;
  onConnectionSelected: (connectionId: string) => Promise<void> | void;
  onConnectionDeleted: (connectionId: string) => void;
  onConnectionUpdated: (connection: Connection) => void;
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  connections,
  currentConnection,
  onConnectionCreated,
  onConnectionSelected,
  onConnectionDeleted,
  onConnectionUpdated,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnectionClick = async (connectionId: string) => {
    setConnectingId(connectionId);
    try {
      await onConnectionSelected(connectionId);
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="connection-panel">
      <div className="connection-panel-header">
        <h2>连接</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 新建连接'}
        </button>
      </div>

      {(showForm || editingConnection) && (
        <ConnectionForm
          editConnection={editingConnection}
          onSuccess={(connection) => {
            if (editingConnection) {
              onConnectionUpdated(connection);
            } else {
            onConnectionCreated(connection);
            }
            setShowForm(false);
            setEditingConnection(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingConnection(null);
          }}
        />
      )}

      <div className="connection-list">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className={`connection-item ${currentConnection === conn.id ? 'active' : ''} ${connectingId === conn.id ? 'connecting' : ''}`}
            onClick={() => !connectingId && handleConnectionClick(conn.id)}
          >
            <div className="connection-icon">
              {connectingId === conn.id ? '⏳' : (conn.type === 'mysql' ? '🗄️' : conn.type === 'redis' ? '🔴' : '📊')}
            </div>
            <div className="connection-info">
              <div className="connection-name">{conn.name}</div>
              <div className="connection-type">{conn.type.toUpperCase()}</div>
            </div>
            <button
              className="btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                if (conn.config) {
                  setEditingConnection({ ...conn.config, id: conn.id });
                } else {
                  setEditingConnection({
                    id: conn.id,
                    name: conn.name,
                    type: conn.type as 'mysql' | 'postgresql' | 'sqlite',
                    host: 'localhost',
                    port: 3306,
                    user: 'root',
                    password: '',
                    database: '',
                  });
                }
              }}
              title="编辑连接"
            >
              ✎
            </button>
            <button
              className="btn-delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要删除此连接吗？')) {
                  onConnectionDeleted(conn.id);
                }
              }}
              title="删除连接"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectionPanel;

