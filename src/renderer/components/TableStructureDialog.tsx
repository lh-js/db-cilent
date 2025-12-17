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

interface EditColumn {
  originalName: string;
  name: string;
  baseType: string;
  length: string;
  nullable: boolean;
  defaultValue: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  unsigned: boolean;
  unique: boolean;
  comment: string;
  isNew?: boolean;
  deleted?: boolean;
}

interface EditIndex {
  name: string;
  columns: string[];
  type: 'INDEX' | 'UNIQUE' | 'FULLTEXT';
  isNew?: boolean;
  deleted?: boolean;
}

interface EditForeignKey {
  name: string;
  column: string;
  refTable: string;
  refColumn: string;
  onDelete: string;
  onUpdate: string;
  isNew?: boolean;
  deleted?: boolean;
}

interface TableStructureDialogProps {
  connectionId: string;
  database: string;
  table: string;
  columns: ColumnInfo[];
  onClose: () => void;
  onChanged: () => void;
}

// 基础类型
const BASE_TYPES = [
  { value: 'INT', label: 'INT', hasLength: false },
  { value: 'BIGINT', label: 'BIGINT', hasLength: false },
  { value: 'SMALLINT', label: 'SMALLINT', hasLength: false },
  { value: 'TINYINT', label: 'TINYINT', hasLength: false },
  { value: 'VARCHAR', label: 'VARCHAR', hasLength: true, defaultLength: '255' },
  { value: 'CHAR', label: 'CHAR', hasLength: true, defaultLength: '50' },
  { value: 'TEXT', label: 'TEXT', hasLength: false },
  { value: 'LONGTEXT', label: 'LONGTEXT', hasLength: false },
  { value: 'MEDIUMTEXT', label: 'MEDIUMTEXT', hasLength: false },
  { value: 'DECIMAL', label: 'DECIMAL', hasLength: true, defaultLength: '10,2' },
  { value: 'FLOAT', label: 'FLOAT', hasLength: false },
  { value: 'DOUBLE', label: 'DOUBLE', hasLength: false },
  { value: 'DATE', label: 'DATE', hasLength: false },
  { value: 'DATETIME', label: 'DATETIME', hasLength: false },
  { value: 'TIMESTAMP', label: 'TIMESTAMP', hasLength: false },
  { value: 'TIME', label: 'TIME', hasLength: false },
  { value: 'YEAR', label: 'YEAR', hasLength: false },
  { value: 'BOOLEAN', label: 'BOOLEAN', hasLength: false },
  { value: 'ENUM', label: 'ENUM', hasLength: true, defaultLength: "'v1','v2'" },
  { value: 'SET', label: 'SET', hasLength: true, defaultLength: "'v1','v2'" },
  { value: 'JSON', label: 'JSON', hasLength: false },
  { value: 'BLOB', label: 'BLOB', hasLength: false },
  { value: 'BINARY', label: 'BINARY', hasLength: true, defaultLength: '255' },
  { value: 'VARBINARY', label: 'VARBINARY', hasLength: true, defaultLength: '255' },
];

const FK_ACTIONS = ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION', 'SET DEFAULT'];

// 默认值选项
const getDefaultValueOptions = (type: string) => {
  const baseType = type.toUpperCase();
  if (baseType.includes('DATETIME') || baseType.includes('TIMESTAMP')) {
    return [
      { value: '', label: '无' },
      { value: 'CURRENT_TIMESTAMP', label: '当前时间' },
      { value: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', label: '当前时间并自动更新' },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  if (baseType.includes('DATE')) {
    return [
      { value: '', label: '无' },
      { value: 'CURRENT_DATE', label: '当前日期' },
      { value: 'NULL', label: 'NULL' },
      { value: '__custom__', label: '自定义...' },
    ];
  }
  if (baseType.includes('TIME') && !baseType.includes('TIMESTAMP')) {
    return [
      { value: '', label: '无' },
      { value: 'CURRENT_TIME', label: '当前时间' },
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
      { value: "''", label: "空字符串" },
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

// 解析类型字符串
const parseType = (typeStr: string) => {
  const isUnsigned = typeStr.toLowerCase().includes('unsigned');
  const cleanType = typeStr.replace(/\s*unsigned\s*/i, '');
  const match = cleanType.match(/^(\w+)(?:\((.+)\))?/i);
  if (match) {
    return { baseType: match[1].toUpperCase(), length: match[2] || '', unsigned: isUnsigned };
  }
  return { baseType: cleanType.toUpperCase(), length: '', unsigned: isUnsigned };
};

// 获取类型信息
const getTypeInfo = (type: string) => {
  return BASE_TYPES.find(t => t.value === type) || { hasLength: false, defaultLength: '' };
};

const TableStructureDialog: React.FC<TableStructureDialogProps> = ({
  connectionId,
  database,
  table,
  columns: initialColumns,
  onClose,
  onChanged,
}) => {
  const [tableName, setTableName] = useState(table);
  const [editColumns, setEditColumns] = useState<EditColumn[]>([]);
  const [editIndexes, setEditIndexes] = useState<EditIndex[]>([]);
  const [editForeignKeys, setEditForeignKeys] = useState<EditForeignKey[]>([]);
  const [customDefaults, setCustomDefaults] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'indexes' | 'foreignKeys'>('columns');
  const [allTables, setAllTables] = useState<string[]>([]);
  const [refTableColumns, setRefTableColumns] = useState<Record<string, string[]>>({});

  // 初始化
  useEffect(() => {
    // 初始化列数据
    const cols = initialColumns.map(col => {
      const parsed = parseType(col.Type);
      return {
        originalName: col.Field,
        name: col.Field,
        baseType: parsed.baseType,
        length: parsed.length,
        nullable: col.Null === 'YES',
        defaultValue: col.Default || '',
        isPrimaryKey: col.Key === 'PRI',
        isAutoIncrement: col.Extra.toLowerCase().includes('auto_increment'),
        unsigned: parsed.unsigned,
        unique: col.Key === 'UNI',
        comment: '',
        isNew: false,
        deleted: false,
      };
    });
    setEditColumns(cols);

    // 加载索引
    loadIndexes();
    // 加载外键
    loadForeignKeys();
    // 加载所有表（用于外键引用）
    loadAllTables();
  }, [initialColumns]);

  const loadIndexes = async () => {
    try {
      const result = await window.electronAPI.getTableIndexes(connectionId, database, table);
      if (result.success) {
        // 解析索引数据，合并同一索引的多列
        const indexMap: Record<string, EditIndex> = {};
        for (const row of result.data) {
          if (row.Key_name === 'PRIMARY') continue; // 主键单独处理
          if (!indexMap[row.Key_name]) {
            indexMap[row.Key_name] = {
              name: row.Key_name,
              columns: [],
              type: row.Non_unique === 0 ? 'UNIQUE' : (row.Index_type === 'FULLTEXT' ? 'FULLTEXT' : 'INDEX'),
              isNew: false,
              deleted: false,
            };
          }
          indexMap[row.Key_name].columns.push(row.Column_name);
        }
        setEditIndexes(Object.values(indexMap));
      }
    } catch (e) {
      console.error('加载索引失败', e);
    }
  };

  const loadForeignKeys = async () => {
    try {
      const result = await window.electronAPI.getTableForeignKeys(connectionId, database, table);
      if (result.success) {
        const fks = result.data.map((fk: any) => ({
          name: fk.name,
          column: fk.column,
          refTable: fk.refTable,
          refColumn: fk.refColumn,
          onDelete: 'RESTRICT',
          onUpdate: 'RESTRICT',
          isNew: false,
          deleted: false,
        }));
        setEditForeignKeys(fks);
      }
    } catch (e) {
      console.error('加载外键失败', e);
    }
  };

  const loadAllTables = async () => {
    try {
      const result = await window.electronAPI.getTables(connectionId, database);
      if (result.success) {
        setAllTables(result.data);
      }
    } catch (e) {
      console.error('加载表列表失败', e);
    }
  };

  const loadRefTableColumns = async (refTable: string) => {
    if (refTableColumns[refTable]) return;
    try {
      const result = await window.electronAPI.getTableColumns(connectionId, database, refTable);
      if (result.success) {
        const cols = result.data.map((c: any) => c.Field);
        setRefTableColumns({ ...refTableColumns, [refTable]: cols });
      }
    } catch (e) {
      console.error('加载引用表列失败', e);
    }
  };

  // 列操作
  const addColumn = () => {
    setEditColumns([...editColumns, {
      originalName: '',
      name: '',
      baseType: 'VARCHAR',
      length: '255',
      nullable: true,
      defaultValue: '',
      isPrimaryKey: false,
      isAutoIncrement: false,
      unsigned: false,
      unique: false,
      comment: '',
      isNew: true,
      deleted: false,
    }]);
  };

  const removeColumn = (index: number) => {
    const col = editColumns[index];
    if (col.isNew) {
      setEditColumns(editColumns.filter((_, i) => i !== index));
    } else {
      const updated = [...editColumns];
      updated[index] = { ...updated[index], deleted: true };
      setEditColumns(updated);
    }
  };

  const restoreColumn = (index: number) => {
    const updated = [...editColumns];
    updated[index] = { ...updated[index], deleted: false };
    setEditColumns(updated);
  };

  const updateColumn = (index: number, field: keyof EditColumn, value: any) => {
    const updated = [...editColumns];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'isPrimaryKey' && value === true) {
      updated[index].nullable = false;
    }
    if (field === 'isAutoIncrement' && value === true) {
      updated[index].isPrimaryKey = true;
      updated[index].nullable = false;
    }
    if (field === 'baseType') {
      const typeInfo = getTypeInfo(value);
      if (typeInfo.hasLength && typeInfo.defaultLength) {
        updated[index].length = typeInfo.defaultLength;
      } else {
        updated[index].length = '';
      }
      updated[index].defaultValue = '';
      setCustomDefaults({ ...customDefaults, [index]: false });
    }
    setEditColumns(updated);
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

  // 索引操作
  const addIndex = () => {
    setEditIndexes([...editIndexes, {
      name: `idx_${tableName}_${editIndexes.length + 1}`,
      columns: [],
      type: 'INDEX',
      isNew: true,
      deleted: false,
    }]);
  };

  const removeIndex = (index: number) => {
    const idx = editIndexes[index];
    if (idx.isNew) {
      setEditIndexes(editIndexes.filter((_, i) => i !== index));
    } else {
      const updated = [...editIndexes];
      updated[index] = { ...updated[index], deleted: true };
      setEditIndexes(updated);
    }
  };

  const updateIndex = (index: number, field: keyof EditIndex, value: any) => {
    const updated = [...editIndexes];
    updated[index] = { ...updated[index], [field]: value };
    setEditIndexes(updated);
  };

  const toggleIndexColumn = (indexIdx: number, colName: string) => {
    const updated = [...editIndexes];
    const idx = updated[indexIdx];
    if (idx.columns.includes(colName)) {
      idx.columns = idx.columns.filter(c => c !== colName);
    } else {
      idx.columns = [...idx.columns, colName];
    }
    setEditIndexes(updated);
  };

  // 外键操作
  const addForeignKey = () => {
    setEditForeignKeys([...editForeignKeys, {
      name: `fk_${tableName}_${editForeignKeys.length + 1}`,
      column: '',
      refTable: '',
      refColumn: '',
      onDelete: 'RESTRICT',
      onUpdate: 'RESTRICT',
      isNew: true,
      deleted: false,
    }]);
  };

  const removeForeignKey = (index: number) => {
    const fk = editForeignKeys[index];
    if (fk.isNew) {
      setEditForeignKeys(editForeignKeys.filter((_, i) => i !== index));
    } else {
      const updated = [...editForeignKeys];
      updated[index] = { ...updated[index], deleted: true };
      setEditForeignKeys(updated);
    }
  };

  const updateForeignKey = (index: number, field: keyof EditForeignKey, value: any) => {
    const updated = [...editForeignKeys];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'refTable' && value) {
      loadRefTableColumns(value);
    }
    setEditForeignKeys(updated);
  };

  const getFullType = (col: EditColumn) => {
    const typeInfo = getTypeInfo(col.baseType);
    let type = col.baseType;
    if (typeInfo.hasLength && col.length) {
      type = `${col.baseType}(${col.length})`;
    }
    return type;
  };

  const handleSave = async () => {
    const activeCols = editColumns.filter(c => !c.deleted);
    if (activeCols.some(c => !c.name.trim())) {
      alert('所有列名都不能为空');
      return;
    }

    setLoading(true);
    try {
      const currentTableName = tableName;

      // 1. 重命名表
      if (tableName !== table) {
        const result = await window.electronAPI.executeQuery(
          connectionId, database, `RENAME TABLE \`${table}\` TO \`${tableName}\``
        );
        if (!result.success) {
          alert('重命名表失败: ' + result.error);
          setLoading(false);
          return;
        }
      }

      // 2. 删除外键（先删外键，因为可能依赖列）
      for (const fk of editForeignKeys.filter(f => f.deleted && !f.isNew)) {
        await window.electronAPI.dropForeignKey(connectionId, database, currentTableName, fk.name);
      }

      // 3. 删除索引
      for (const idx of editIndexes.filter(i => i.deleted && !i.isNew)) {
        await window.electronAPI.dropIndex(connectionId, database, currentTableName, idx.name);
      }

      // 4. 删除列
      for (const col of editColumns.filter(c => c.deleted && !c.isNew)) {
        await window.electronAPI.dropColumn(connectionId, database, currentTableName, col.originalName);
      }

      // 5. 添加新列
      for (const col of editColumns.filter(c => c.isNew && !c.deleted)) {
        const fullType = getFullType(col);
        await window.electronAPI.addColumn(connectionId, database, currentTableName, {
          name: col.name, type: fullType, nullable: col.nullable, defaultValue: col.defaultValue
        });
      }

      // 6. 修改已有列
      for (const col of editColumns.filter(c => !c.isNew && !c.deleted)) {
        const fullType = getFullType(col);
        await window.electronAPI.modifyColumn(connectionId, database, currentTableName, col.originalName, {
          name: col.name, type: fullType, nullable: col.nullable, defaultValue: col.defaultValue
        });
      }

      // 7. 修改主键
      const pkColumns = activeCols.filter(c => c.isPrimaryKey).map(c => c.name);
      const originalPkColumns = initialColumns.filter(c => c.Key === 'PRI').map(c => c.Field);
      if (JSON.stringify(pkColumns.sort()) !== JSON.stringify(originalPkColumns.sort())) {
        await window.electronAPI.modifyPrimaryKey(connectionId, database, currentTableName, pkColumns);
      }

      // 8. 添加新索引
      for (const idx of editIndexes.filter(i => i.isNew && !i.deleted && i.columns.length > 0)) {
        await window.electronAPI.addIndex(connectionId, database, currentTableName, idx);
      }

      // 9. 添加新外键
      for (const fk of editForeignKeys.filter(f => f.isNew && !f.deleted && fk.column && fk.refTable && fk.refColumn)) {
        await window.electronAPI.addForeignKey(connectionId, database, currentTableName, fk);
      }

      onChanged();
      onClose();
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const visibleColumns = editColumns.filter(c => !c.deleted);
  const deletedColumns = editColumns.filter(c => c.deleted);

  return (
    <div className="modal-overlay">
      <div className="modal structure-modal">
        <div className="modal-header">
          <h3>编辑表结构</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group table-name-group">
            <label>表名</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="输入表名"
            />
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === 'columns' ? 'active' : ''}`} onClick={() => setActiveTab('columns')}>
              列定义
            </button>
            <button className={`tab ${activeTab === 'indexes' ? 'active' : ''}`} onClick={() => setActiveTab('indexes')}>
              索引 ({editIndexes.filter(i => !i.deleted).length})
            </button>
            <button className={`tab ${activeTab === 'foreignKeys' ? 'active' : ''}`} onClick={() => setActiveTab('foreignKeys')}>
              外键 ({editForeignKeys.filter(f => !f.deleted).length})
            </button>
          </div>

          {activeTab === 'columns' && (
            <div className="columns-section">
              <div className="columns-header">
                <span className="section-info">编辑表的列结构</span>
                <button className="btn-add-column" onClick={addColumn}>➕ 添加列</button>
              </div>

              <div className="columns-table-wrapper">
                <table className="structure-table">
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editColumns.map((col, idx) => {
                      if (col.deleted) return null;
                      const typeInfo = getTypeInfo(col.baseType);
                      const defaultOptions = getDefaultValueOptions(col.baseType);
                      const isCustomDefault = customDefaults[idx];
                      const isIntType = ['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(col.baseType);
                      const isNumericType = isIntType || ['DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.baseType);
                      
                      return (
                        <tr key={idx} className={col.isNew ? 'new-column' : ''}>
                          <td>
                            <input type="text" value={col.name} onChange={(e) => updateColumn(idx, 'name', e.target.value)} placeholder="列名" />
                          </td>
                          <td>
                            <select value={col.baseType} onChange={(e) => updateColumn(idx, 'baseType', e.target.value)}>
                              {BASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              {!BASE_TYPES.find(t => t.value === col.baseType) && <option value={col.baseType}>{col.baseType}</option>}
                            </select>
                          </td>
                          <td>
                            <input type="text" value={col.length} onChange={(e) => updateColumn(idx, 'length', e.target.value)}
                              placeholder={typeInfo.hasLength ? '长度' : '-'} disabled={!typeInfo.hasLength}
                              className={!typeInfo.hasLength ? 'disabled' : ''} />
                          </td>
                          <td className="center">
                            <input type="checkbox" checked={col.isPrimaryKey} onChange={(e) => updateColumn(idx, 'isPrimaryKey', e.target.checked)} />
                          </td>
                          <td className="center">
                            <input type="checkbox" checked={col.isAutoIncrement} onChange={(e) => updateColumn(idx, 'isAutoIncrement', e.target.checked)} disabled={!isIntType} />
                          </td>
                          <td className="center">
                            <input type="checkbox" checked={col.unsigned} onChange={(e) => updateColumn(idx, 'unsigned', e.target.checked)} disabled={!isNumericType} />
                          </td>
                          <td className="center">
                            <input type="checkbox" checked={col.nullable} onChange={(e) => updateColumn(idx, 'nullable', e.target.checked)} disabled={col.isPrimaryKey} />
                          </td>
                          <td className="center">
                            <input type="checkbox" checked={col.unique} onChange={(e) => updateColumn(idx, 'unique', e.target.checked)} />
                          </td>
                          <td className="default-cell">
                            {isCustomDefault ? (
                              <div className="custom-default">
                                <input type="text" value={col.defaultValue} onChange={(e) => updateColumn(idx, 'defaultValue', e.target.value)} placeholder="默认值" />
                                <button className="btn-cancel-custom" onClick={() => handleDefaultChange(idx, '')}>×</button>
                              </div>
                            ) : (
                              <select value={col.defaultValue} onChange={(e) => handleDefaultChange(idx, e.target.value)}>
                                {defaultOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            )}
                          </td>
                          <td>
                            <button className="btn-remove-column" onClick={() => removeColumn(idx)} title="删除">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {deletedColumns.length > 0 && (
                <div className="deleted-columns">
                  <h4>待删除的列（保存后生效）</h4>
                  <div className="deleted-list">
                    {deletedColumns.map((col, idx) => {
                      const realIdx = editColumns.findIndex(c => c === col);
                      return (
                        <div key={idx} className="deleted-item">
                          <span>{col.originalName}</span>
                          <button onClick={() => restoreColumn(realIdx)}>撤销</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'indexes' && (
            <div className="indexes-section">
              <div className="columns-header">
                <span className="section-info">管理表的索引</span>
                <button className="btn-add-column" onClick={addIndex}>➕ 添加索引</button>
              </div>

              {editIndexes.filter(i => !i.deleted).length === 0 ? (
                <div className="empty-hint">暂无索引，点击"添加索引"创建</div>
              ) : (
                <div className="indexes-list">
                  {editIndexes.map((idx, i) => {
                    if (idx.deleted) return null;
                    return (
                      <div key={i} className={`index-item ${idx.isNew ? 'new-item' : ''}`}>
                        <div className="index-header">
                          <input type="text" value={idx.name} onChange={(e) => updateIndex(i, 'name', e.target.value)}
                            placeholder="索引名称" className="index-name" disabled={!idx.isNew} />
                          <select value={idx.type} onChange={(e) => updateIndex(i, 'type', e.target.value as any)} className="index-type" disabled={!idx.isNew}>
                            <option value="INDEX">普通索引</option>
                            <option value="UNIQUE">唯一索引</option>
                            <option value="FULLTEXT">全文索引</option>
                          </select>
                          <button className="btn-remove-column" onClick={() => removeIndex(i)}>🗑️</button>
                        </div>
                        <div className="index-columns">
                          <span className="label">选择列：</span>
                          {visibleColumns.map((col) => (
                            <label key={col.name} className="index-col-check">
                              <input type="checkbox" checked={idx.columns.includes(col.name)} onChange={() => toggleIndexColumn(i, col.name)} disabled={!idx.isNew && !col.isNew} />
                              {col.name || '(未命名)'}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'foreignKeys' && (
            <div className="foreignkeys-section">
              <div className="columns-header">
                <span className="section-info">管理表的外键约束</span>
                <button className="btn-add-column" onClick={addForeignKey}>➕ 添加外键</button>
              </div>

              {editForeignKeys.filter(f => !f.deleted).length === 0 ? (
                <div className="empty-hint">暂无外键，点击"添加外键"创建</div>
              ) : (
                <div className="foreignkeys-list">
                  {editForeignKeys.map((fk, i) => {
                    if (fk.deleted) return null;
                    const refCols = refTableColumns[fk.refTable] || [];
                    return (
                      <div key={i} className={`fk-item ${fk.isNew ? 'new-item' : ''}`}>
                        <div className="fk-row">
                          <div className="fk-field">
                            <label>外键名称</label>
                            <input type="text" value={fk.name} onChange={(e) => updateForeignKey(i, 'name', e.target.value)} disabled={!fk.isNew} />
                          </div>
                          <div className="fk-field">
                            <label>本表列</label>
                            <select value={fk.column} onChange={(e) => updateForeignKey(i, 'column', e.target.value)} disabled={!fk.isNew}>
                              <option value="">选择列</option>
                              {visibleColumns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                            </select>
                          </div>
                          <div className="fk-field">
                            <label>引用表</label>
                            <select value={fk.refTable} onChange={(e) => updateForeignKey(i, 'refTable', e.target.value)} disabled={!fk.isNew}>
                              <option value="">选择表</option>
                              {allTables.filter(t => t !== tableName).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="fk-field">
                            <label>引用列</label>
                            <select value={fk.refColumn} onChange={(e) => updateForeignKey(i, 'refColumn', e.target.value)} disabled={!fk.isNew || !fk.refTable}>
                              <option value="">选择列</option>
                              {refCols.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <button className="btn-remove-column" onClick={() => removeForeignKey(i)}>🗑️</button>
                        </div>
                        <div className="fk-row fk-actions-row">
                          <div className="fk-field">
                            <label>ON DELETE</label>
                            <select value={fk.onDelete} onChange={(e) => updateForeignKey(i, 'onDelete', e.target.value)} disabled={!fk.isNew}>
                              {FK_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="fk-field">
                            <label>ON UPDATE</label>
                            <select value={fk.onUpdate} onChange={(e) => updateForeignKey(i, 'onUpdate', e.target.value)} disabled={!fk.isNew}>
                              {FK_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableStructureDialog;
