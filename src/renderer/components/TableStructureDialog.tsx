import React, { useState, useEffect } from 'react';
import './TableStructureDialog.css';

interface ColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: any;
  Extra: string;
}

interface TableStructureDialogProps {
  connectionId: string;
  database: string;
  table: string;
  columns: ColumnInfo[];
  onClose: () => void;
  onChanged: () => void;
}

const MYSQL_TYPES = [
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'VARCHAR(255)', 'VARCHAR(50)', 'VARCHAR(100)',
  'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
  'DECIMAL(10,2)', 'FLOAT', 'DOUBLE',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
  'BOOLEAN', 'ENUM', 'JSON', 'BLOB'
];

const TableStructureDialog: React.FC<TableStructureDialogProps> = ({
  connectionId,
  database,
  table,
  columns,
  onClose,
  onChanged,
}) => {
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', type: '', nullable: true, defaultValue: '' });
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: '' });
  const [loading, setLoading] = useState(false);

  const handleEditColumn = (col: ColumnInfo) => {
    setEditingColumn(col.Field);
    setEditData({
      name: col.Field,
      type: col.Type.toUpperCase(),
      nullable: col.Null === 'YES',
      defaultValue: col.Default || '',
    });
  };

  const handleSaveColumn = async () => {
    if (!editingColumn) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.modifyColumn(
        connectionId,
        database,
        table,
        editingColumn,
        editData
      );
      if (result.success) {
        setEditingColumn(null);
        onChanged();
      } else {
        alert('修改失败: ' + result.error);
      }
    } catch (err: any) {
      alert('修改失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async (colName: string) => {
    if (!confirm(`确定要删除列 "${colName}" 吗？此操作不可恢复！`)) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.dropColumn(connectionId, database, table, colName);
      if (result.success) {
        onChanged();
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumn.name.trim()) {
      alert('请输入列名');
      return;
    }
    setLoading(true);
    try {
      const result = await window.electronAPI.addColumn(connectionId, database, table, newColumn);
      if (result.success) {
        setShowAddColumn(false);
        setNewColumn({ name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: '' });
        onChanged();
      } else {
        alert('添加失败: ' + result.error);
      }
    } catch (err: any) {
      alert('添加失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal structure-modal">
        <div className="modal-header">
          <h3>表结构 - {table}</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="structure-toolbar">
            <button className="btn-add-column" onClick={() => setShowAddColumn(true)}>
              ➕ 添加列
            </button>
          </div>

          <table className="structure-table">
            <thead>
              <tr>
                <th>列名</th>
                <th>类型</th>
                <th>可空</th>
                <th>键</th>
                <th>默认值</th>
                <th>额外</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.Field}>
                  {editingColumn === col.Field ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={editData.type}
                          onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                        >
                          {MYSQL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          {!MYSQL_TYPES.includes(editData.type) && (
                            <option value={editData.type}>{editData.type}</option>
                          )}
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={editData.nullable}
                          onChange={(e) => setEditData({ ...editData, nullable: e.target.checked })}
                        />
                      </td>
                      <td>{col.Key}</td>
                      <td>
                        <input
                          type="text"
                          value={editData.defaultValue}
                          onChange={(e) => setEditData({ ...editData, defaultValue: e.target.value })}
                          placeholder="NULL"
                        />
                      </td>
                      <td>{col.Extra}</td>
                      <td className="action-cell">
                        <button className="btn-save" onClick={handleSaveColumn} disabled={loading}>
                          ✓
                        </button>
                        <button className="btn-cancel" onClick={() => setEditingColumn(null)}>
                          ✕
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{col.Field}</td>
                      <td>{col.Type}</td>
                      <td>{col.Null}</td>
                      <td>{col.Key}</td>
                      <td>{col.Default ?? <span className="null-value">NULL</span>}</td>
                      <td>{col.Extra}</td>
                      <td className="action-cell">
                        <button className="btn-edit" onClick={() => handleEditColumn(col)} title="编辑">
                          ✎
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDeleteColumn(col.Field)}
                          disabled={col.Key === 'PRI'}
                          title={col.Key === 'PRI' ? '不能删除主键' : '删除'}
                        >
                          🗑️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* 添加列表单 */}
          {showAddColumn && (
            <div className="add-column-form">
              <h4>添加新列</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>列名</label>
                  <input
                    type="text"
                    value={newColumn.name}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    placeholder="列名"
                  />
                </div>
                <div className="form-group">
                  <label>类型</label>
                  <select
                    value={newColumn.type}
                    onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                  >
                    {MYSQL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>可空</label>
                  <input
                    type="checkbox"
                    checked={newColumn.nullable}
                    onChange={(e) => setNewColumn({ ...newColumn, nullable: e.target.checked })}
                  />
                </div>
                <div className="form-group">
                  <label>默认值</label>
                  <input
                    type="text"
                    value={newColumn.defaultValue}
                    onChange={(e) => setNewColumn({ ...newColumn, defaultValue: e.target.value })}
                    placeholder="默认值"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn-primary" onClick={handleAddColumn} disabled={loading}>
                    添加
                  </button>
                  <button className="btn-secondary" onClick={() => setShowAddColumn(false)}>
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default TableStructureDialog;
