import React, { useState } from 'react';
import './CreateTableDialog.css';

interface Column {
  name: string;
  type: string;
  length: string;
  nullable: boolean;
  defaultValue: string;
  primaryKey: boolean;
  autoIncrement: boolean;
  unique: boolean;
  index: boolean;
  unsigned: boolean;
  comment: string;
}

interface Index {
  name: string;
  columns: string[];
  type: 'INDEX' | 'UNIQUE' | 'FULLTEXT';
}

interface CreateTableDialogProps {
  onClose: () => void;
  onSubmit: (tableName: string, columns: Column[], indexes: Index[]) => void;
}

// 基础类型（不带长度）
const BASE_TYPES = [
  { value: 'INT', label: 'INT', hasLength: false, hasDecimals: false },
  { value: 'BIGINT', label: 'BIGINT', hasLength: false, hasDecimals: false },
  { value: 'SMALLINT', label: 'SMALLINT', hasLength: false, hasDecimals: false },
  { value: 'TINYINT', label: 'TINYINT', hasLength: false, hasDecimals: false },
  { value: 'VARCHAR', label: 'VARCHAR', hasLength: true, defaultLength: '255', hasDecimals: false },
  { value: 'CHAR', label: 'CHAR', hasLength: true, defaultLength: '50', hasDecimals: false },
  { value: 'TEXT', label: 'TEXT', hasLength: false, hasDecimals: false },
  { value: 'LONGTEXT', label: 'LONGTEXT', hasLength: false, hasDecimals: false },
  { value: 'MEDIUMTEXT', label: 'MEDIUMTEXT', hasLength: false, hasDecimals: false },
  { value: 'DECIMAL', label: 'DECIMAL', hasLength: true, defaultLength: '10,2', hasDecimals: true },
  { value: 'FLOAT', label: 'FLOAT', hasLength: false, hasDecimals: false },
  { value: 'DOUBLE', label: 'DOUBLE', hasLength: false, hasDecimals: false },
  { value: 'DATE', label: 'DATE', hasLength: false, hasDecimals: false },
  { value: 'DATETIME', label: 'DATETIME', hasLength: false, hasDecimals: false },
  { value: 'TIMESTAMP', label: 'TIMESTAMP', hasLength: false, hasDecimals: false },
  { value: 'TIME', label: 'TIME', hasLength: false, hasDecimals: false },
  { value: 'YEAR', label: 'YEAR', hasLength: false, hasDecimals: false },
  { value: 'BOOLEAN', label: 'BOOLEAN', hasLength: false, hasDecimals: false },
  { value: 'ENUM', label: 'ENUM', hasLength: true, defaultLength: "'value1','value2'", hasDecimals: false },
  { value: 'SET', label: 'SET', hasLength: true, defaultLength: "'value1','value2'", hasDecimals: false },
  { value: 'JSON', label: 'JSON', hasLength: false, hasDecimals: false },
  { value: 'BLOB', label: 'BLOB', hasLength: false, hasDecimals: false },
  { value: 'BINARY', label: 'BINARY', hasLength: true, defaultLength: '255', hasDecimals: false },
  { value: 'VARBINARY', label: 'VARBINARY', hasLength: true, defaultLength: '255', hasDecimals: false },
];

// 默认值选项
const getDefaultValueOptions = (type: string) => {
  const baseType = type.toUpperCase();
  if (baseType.includes('DATETIME') || baseType.includes('TIMESTAMP')) {
    return [
      { value: '', label: '无' },
      { value: 'CURRENT_TIMESTAMP', label: '当前时间 (CURRENT_TIMESTAMP)' },
      { value: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', label: '当前时间并自动更新' },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  if (baseType.includes('DATE')) {
    return [
      { value: '', label: '无' },
      { value: 'CURRENT_DATE', label: '当前日期 (CURRENT_DATE)' },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  if (baseType.includes('TIME') && !baseType.includes('TIMESTAMP')) {
    return [
      { value: '', label: '无' },
      { value: 'CURRENT_TIME', label: '当前时间 (CURRENT_TIME)' },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  if (baseType.includes('INT') || baseType.includes('DECIMAL') || baseType.includes('FLOAT') || baseType.includes('DOUBLE')) {
    return [
      { value: '', label: '无' },
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  if (baseType === 'BOOLEAN' || baseType === 'TINYINT') {
    return [
      { value: '', label: '无' },
      { value: '0', label: 'FALSE (0)' },
      { value: '1', label: 'TRUE (1)' },
      { value: 'NULL', label: 'NULL' },
    ];
  }
  if (baseType.includes('CHAR') || baseType.includes('TEXT')) {
    return [
      { value: '', label: '无' },
      { value: "''", label: "空字符串 ('')" },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  return [
    { value: '', label: '无' },
    { value: 'NULL', label: 'NULL' },
    { value: '__custom__', label: '自定义...' },
  ];
};

// 获取类型是否需要长度
const getTypeInfo = (type: string) => {
  return BASE_TYPES.find(t => t.value === type) || { hasLength: false, defaultLength: '' };
};

const CreateTableDialog: React.FC<CreateTableDialogProps> = ({ onClose, onSubmit }) => {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([
    { name: 'id', type: 'INT', length: '', nullable: false, defaultValue: '', primaryKey: true, autoIncrement: true, unique: false, index: false, unsigned: true, comment: '' }
  ]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [activeTab, setActiveTab] = useState<'columns' | 'indexes'>('columns');
  const [customDefaults, setCustomDefaults] = useState<Record<number, boolean>>({});

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'VARCHAR', length: '255', nullable: true, defaultValue: '', primaryKey: false, autoIncrement: false, unique: false, index: false, unsigned: false, comment: '' }]);
  };

  const removeColumn = (index: number) => {
    const colName = columns[index].name;
    setColumns(columns.filter((_, i) => i !== index));
    // 同时从索引中移除该列
    setIndexes(indexes.map(idx => ({
      ...idx,
      columns: idx.columns.filter(c => c !== colName)
    })).filter(idx => idx.columns.length > 0));
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    // 主键自动设置为非空
    if (field === 'primaryKey' && value === true) {
      updated[index].nullable = false;
    }
    // 自增必须是主键
    if (field === 'autoIncrement' && value === true) {
      updated[index].primaryKey = true;
      updated[index].nullable = false;
    }
    // 切换类型时设置默认长度
    if (field === 'type') {
      const typeInfo = getTypeInfo(value);
      if (typeInfo.hasLength && typeInfo.defaultLength) {
        updated[index].length = typeInfo.defaultLength;
      } else {
        updated[index].length = '';
      }
      // 清空默认值
      updated[index].defaultValue = '';
      setCustomDefaults({ ...customDefaults, [index]: false });
    }
    setColumns(updated);
  };

  const handleDefaultChange = (index: number, value: string) => {
    if (value === '__custom__') {
      setCustomDefaults({ ...customDefaults, [index]: true });
      updateColumn(index, 'defaultValue', '');
    } else {
      setCustomDefaults({ ...customDefaults, [index]: false });
      updateColumn(index, 'defaultValue', value);
    }
  };

  // 获取完整的类型字符串
  const getFullType = (col: Column) => {
    const typeInfo = getTypeInfo(col.type);
    if (typeInfo.hasLength && col.length) {
      return `${col.type}(${col.length})`;
    }
    return col.type;
  };

  const addIndex = () => {
    setIndexes([...indexes, { name: '', columns: [], type: 'INDEX' }]);
  };

  const removeIndex = (index: number) => {
    setIndexes(indexes.filter((_, i) => i !== index));
  };

  const updateIndex = (index: number, field: keyof Index, value: any) => {
    const updated = [...indexes];
    updated[index] = { ...updated[index], [field]: value };
    setIndexes(updated);
  };

  const toggleIndexColumn = (indexIdx: number, colName: string) => {
    const updated = [...indexes];
    const idx = updated[indexIdx];
    if (idx.columns.includes(colName)) {
      idx.columns = idx.columns.filter(c => c !== colName);
    } else {
      idx.columns = [...idx.columns, colName];
    }
    setIndexes(updated);
  };

  const handleSubmit = () => {
    if (!tableName.trim()) {
      alert('请输入表名');
      return;
    }
    if (columns.length === 0) {
      alert('请至少添加一个列');
      return;
    }
    if (columns.some(c => !c.name.trim())) {
      alert('所有列名都不能为空');
      return;
    }
    // 构建完整类型的列数据
    const columnsWithFullType = columns.map(col => ({
      ...col,
      type: getFullType(col)
    }));
    // 验证索引
    const validIndexes = indexes.filter(idx => idx.columns.length > 0);
    onSubmit(tableName, columnsWithFullType, validIndexes);
  };

  return (
    <div className="modal-overlay">
      <div className="modal create-table-modal">
        <div className="modal-header">
          <h3>创建新表</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>表名</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="输入表名"
            />
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'columns' ? 'active' : ''}`}
              onClick={() => setActiveTab('columns')}
            >
              列定义
            </button>
            <button 
              className={`tab ${activeTab === 'indexes' ? 'active' : ''}`}
              onClick={() => setActiveTab('indexes')}
            >
              索引
            </button>
          </div>

          {activeTab === 'columns' && (
            <div className="columns-section">
              <div className="columns-header">
                <span className="section-info">定义表的列结构</span>
                <button className="btn-add-column" onClick={addColumn}>➕ 添加列</button>
              </div>

              <div className="columns-table-wrapper">
                <table className="columns-table">
                  <thead>
                    <tr>
                      <th>列名</th>
                      <th>类型</th>
                      <th>长度</th>
                      <th>主键</th>
                      <th>自增</th>
                      <th>无符号</th>
                      <th>可空</th>
                      <th>唯一</th>
                      <th>默认值</th>
                      <th>注释</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, idx) => {
                      const typeInfo = getTypeInfo(col.type);
                      const defaultOptions = getDefaultValueOptions(col.type);
                      const isCustomDefault = customDefaults[idx];
                      return (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                            placeholder="列名"
                          />
                        </td>
                        <td>
                          <select
                            value={col.type}
                            onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                          >
                            {BASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={col.length}
                            onChange={(e) => updateColumn(idx, 'length', e.target.value)}
                            placeholder={typeInfo.hasLength ? (typeInfo.defaultLength || '长度') : '-'}
                            disabled={!typeInfo.hasLength}
                            className={!typeInfo.hasLength ? 'disabled' : ''}
                          />
                        </td>
                        <td className="center">
                          <input
                            type="checkbox"
                            checked={col.primaryKey}
                            onChange={(e) => updateColumn(idx, 'primaryKey', e.target.checked)}
                          />
                        </td>
                        <td className="center">
                          <input
                            type="checkbox"
                            checked={col.autoIncrement}
                            onChange={(e) => updateColumn(idx, 'autoIncrement', e.target.checked)}
                            disabled={col.type !== 'INT' && col.type !== 'BIGINT' && col.type !== 'SMALLINT' && col.type !== 'TINYINT'}
                          />
                        </td>
                        <td className="center">
                          <input
                            type="checkbox"
                            checked={col.unsigned}
                            onChange={(e) => updateColumn(idx, 'unsigned', e.target.checked)}
                            disabled={!['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.type)}
                          />
                        </td>
                        <td className="center">
                          <input
                            type="checkbox"
                            checked={col.nullable}
                            onChange={(e) => updateColumn(idx, 'nullable', e.target.checked)}
                            disabled={col.primaryKey}
                          />
                        </td>
                        <td className="center">
                          <input
                            type="checkbox"
                            checked={col.unique}
                            onChange={(e) => updateColumn(idx, 'unique', e.target.checked)}
                          />
                        </td>
                        <td className="default-cell">
                          {isCustomDefault ? (
                            <div className="custom-default">
                              <input
                                type="text"
                                value={col.defaultValue}
                                onChange={(e) => updateColumn(idx, 'defaultValue', e.target.value)}
                                placeholder="输入默认值"
                              />
                              <button 
                                className="btn-cancel-custom"
                                onClick={() => handleDefaultChange(idx, '')}
                                title="取消自定义"
                              >×</button>
                            </div>
                          ) : (
                            <select
                              value={col.defaultValue}
                              onChange={(e) => handleDefaultChange(idx, e.target.value)}
                            >
                              {defaultOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={col.comment}
                            onChange={(e) => updateColumn(idx, 'comment', e.target.value)}
                            placeholder="注释"
                          />
                        </td>
                        <td>
                          <button 
                            className="btn-remove-column" 
                            onClick={() => removeColumn(idx)}
                            disabled={columns.length === 1}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'indexes' && (
            <div className="indexes-section">
              <div className="columns-header">
                <span className="section-info">定义表的索引</span>
                <button className="btn-add-column" onClick={addIndex}>➕ 添加索引</button>
              </div>

              {indexes.length === 0 ? (
                <div className="empty-hint">暂无索引，点击"添加索引"创建</div>
              ) : (
                <div className="indexes-list">
                  {indexes.map((idx, i) => (
                    <div key={i} className="index-item">
                      <div className="index-header">
                        <input
                          type="text"
                          value={idx.name}
                          onChange={(e) => updateIndex(i, 'name', e.target.value)}
                          placeholder="索引名称（留空自动生成）"
                          className="index-name"
                        />
                        <select
                          value={idx.type}
                          onChange={(e) => updateIndex(i, 'type', e.target.value as any)}
                          className="index-type"
                        >
                          <option value="INDEX">普通索引</option>
                          <option value="UNIQUE">唯一索引</option>
                          <option value="FULLTEXT">全文索引</option>
                        </select>
                        <button className="btn-remove-column" onClick={() => removeIndex(i)}>🗑️</button>
                      </div>
                      <div className="index-columns">
                        <span className="label">选择列：</span>
                        {columns.map((col) => (
                          <label key={col.name} className="index-col-check">
                            <input
                              type="checkbox"
                              checked={idx.columns.includes(col.name)}
                              onChange={() => toggleIndexColumn(i, col.name)}
                              disabled={!col.name}
                            />
                            {col.name || '(未命名)'}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>创建</button>
        </div>
      </div>
    </div>
  );
};

export default CreateTableDialog;
