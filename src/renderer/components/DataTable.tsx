import React, { useState, useEffect } from 'react';
import './DataTable.css';

interface ColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: any;
  Extra: string;
}

interface DataTableProps {
  columns: string[];
  rows: any[];
  totalCount?: number;
  executionTime?: number;
  editable?: boolean;
  connectionId?: string;
  database?: string;
  table?: string;
  primaryKeyColumn?: string;
  columnInfo?: ColumnInfo[];
  onDataChanged?: () => void;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  totalCount,
  executionTime,
  editable = false,
  connectionId,
  database,
  table,
  primaryKeyColumn,
  columnInfo = [],
  onDataChanged,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [editingCell, setEditingCell] = useState<{rowIdx: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const total = totalCount || rows.length;
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // 前端分页
  const displayRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCellDoubleClick = (rowIdx: number, col: string, value: any) => {
    if (!editable) return;
    setEditingCell({ rowIdx, col });
    setEditValue(value === null ? '' : String(value));
  };

  const handleCellSave = async () => {
    if (!editingCell || !connectionId || !database || !table || !primaryKeyColumn) return;
    
    const actualRowIdx = (currentPage - 1) * pageSize + editingCell.rowIdx;
    const row = rows[actualRowIdx];
    const pkValue = row[primaryKeyColumn];
    
    try {
      const result = await window.electronAPI.updateRow(
        connectionId,
        database,
        table,
        { column: primaryKeyColumn, value: pkValue },
        { [editingCell.col]: editValue || null }
      );
      if (result.success) {
        onDataChanged?.();
      } else {
        alert('更新失败: ' + result.error);
      }
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
    setEditingCell(null);
  };

  const handleDeleteRow = async (rowIdx: number) => {
    if (!connectionId || !database || !table || !primaryKeyColumn) return;
    if (!confirm('确定要删除这行数据吗？')) return;
    
    const actualRowIdx = (currentPage - 1) * pageSize + rowIdx;
    const row = rows[actualRowIdx];
    const pkValue = row[primaryKeyColumn];
    
    try {
      const result = await window.electronAPI.deleteRow(
        connectionId,
        database,
        table,
        { column: primaryKeyColumn, value: pkValue }
      );
      if (result.success) {
        onDataChanged?.();
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  const handleAddRow = async () => {
    if (!connectionId || !database || !table) return;
    
    const data: Record<string, any> = {};
    for (const col of columns) {
      if (newRowData[col] !== undefined && newRowData[col] !== '') {
        data[col] = newRowData[col];
      }
    }
    
    try {
      const result = await window.electronAPI.insertRow(connectionId, database, table, data);
      if (result.success) {
        setShowAddRow(false);
        setNewRowData({});
        onDataChanged?.();
      } else {
        alert('插入失败: ' + result.error);
      }
    } catch (err: any) {
      alert('插入失败: ' + err.message);
    }
  };

  const handleSelectRow = (rowIdx: number, checked: boolean) => {
    const actualIdx = (currentPage - 1) * pageSize + rowIdx;
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(actualIdx);
    } else {
      newSelected.delete(actualIdx);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set<number>();
      const start = (currentPage - 1) * pageSize;
      const end = Math.min(start + pageSize, rows.length);
      for (let i = start; i < end; i++) {
        newSelected.add(i);
      }
      setSelectedRows(newSelected);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (!connectionId || !database || !table || !primaryKeyColumn) return;
    if (selectedRows.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedRows.size} 行数据吗？`)) return;
    
    const values = Array.from(selectedRows).map(idx => rows[idx][primaryKeyColumn]);
    try {
      const result = await window.electronAPI.deleteRows(connectionId, database, table, {
        column: primaryKeyColumn,
        values
      });
      if (result.success) {
        setSelectedRows(new Set());
        onDataChanged?.();
      } else {
        alert('批量删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('批量删除失败: ' + err.message);
    }
  };

  const handleTruncate = async () => {
    if (!connectionId || !database || !table) return;
    if (!confirm(`确定要清空表 "${table}" 的所有数据吗？此操作不可恢复！`)) return;
    
    try {
      const result = await window.electronAPI.truncateTable(connectionId, database, table);
      if (result.success) {
        setSelectedRows(new Set());
        onDataChanged?.();
      } else {
        alert('清空失败: ' + result.error);
      }
    } catch (err: any) {
      alert('清空失败: ' + err.message);
    }
  };

  // 计算当前页选中状态
  const isAllSelected = () => {
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, rows.length);
    if (end <= start) return false;
    for (let i = start; i < end; i++) {
      if (!selectedRows.has(i)) return false;
    }
    return true;
  };

  // 根据列类型获取输入类型
  const getColumnType = (colName: string): string => {
    const info = columnInfo.find(c => c.Field === colName);
    if (!info) return 'text';
    const type = info.Type.toLowerCase();
    if (type.includes('datetime') || type.includes('timestamp')) return 'datetime-local';
    if (type.includes('date')) return 'date';
    if (type.includes('time')) return 'time';
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double')) return 'number';
    if (type.includes('bool') || type.includes('tinyint(1)')) return 'checkbox';
    return 'text';
  };

  // 判断列是否为自增
  const isAutoIncrement = (colName: string): boolean => {
    const info = columnInfo.find(c => c.Field === colName);
    return info?.Extra?.toLowerCase().includes('auto_increment') || false;
  };

  // 渲染输入控件
  const renderInput = (col: string, value: string, onChange: (val: string) => void, forInsert = false) => {
    // 自增列在插入时禁止输入
    if (forInsert && isAutoIncrement(col)) {
      return (
        <input
          type="text"
          value=""
          disabled
          placeholder="(自动生成)"
          className="disabled-input"
        />
      );
    }

    const inputType = getColumnType(col);
    
    if (inputType === 'checkbox') {
      return (
        <label className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={value === '1' || value === 'true'}
            onChange={(e) => onChange(e.target.checked ? '1' : '0')}
          />
          <span>{value === '1' || value === 'true' ? '是' : '否'}</span>
        </label>
      );
    }

    if (inputType === 'datetime-local') {
      // 将 MySQL datetime 格式转换为 input datetime-local 格式
      const formatted = value ? value.replace(' ', 'T').slice(0, 16) : '';
      return (
        <input
          type="datetime-local"
          value={formatted}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v ? v.replace('T', ' ') + ':00' : '');
          }}
        />
      );
    }

    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`输入 ${col} 的值`}
      />
    );
  };

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <h3>查询结果</h3>
        <div className="data-table-info">
          <span>{total} 行</span>
          {executionTime !== undefined && <span> | {executionTime}ms</span>}
          {editable && (
            <>
              <button className="btn-add-row" onClick={() => setShowAddRow(true)}>
                ➕ 添加行
              </button>
              {selectedRows.size > 0 && (
                <button className="btn-delete-selected" onClick={handleDeleteSelected}>
                  🗑️ 删除选中 ({selectedRows.size})
                </button>
              )}
              <button className="btn-truncate" onClick={handleTruncate}>
                ⚠️ 清空表
              </button>
            </>
          )}
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {editable && (
                <th className="select-col">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected()} 
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    title="全选/取消"
                  />
                </th>
              )}
              {editable && <th className="action-col">操作</th>}
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const actualIdx = (currentPage - 1) * pageSize + idx;
              return (
              <tr key={idx} className={selectedRows.has(actualIdx) ? 'selected' : ''}>
                {editable && (
                  <td className="select-col">
                    <input 
                      type="checkbox" 
                      checked={selectedRows.has(actualIdx)}
                      onChange={(e) => handleSelectRow(idx, e.target.checked)}
                    />
                  </td>
                )}
                {editable && (
                  <td className="action-col">
                    <button 
                      className="btn-row-delete" 
                      onClick={() => handleDeleteRow(idx)}
                      title="删除行"
                    >
                      🗑️
                    </button>
                  </td>
                )}
                {columns.map((col) => (
                  <td 
                    key={col}
                    onDoubleClick={() => handleCellDoubleClick(idx, col, row[col])}
                    className={editable ? 'editable' : ''}
                  >
                    {editingCell?.rowIdx === idx && editingCell?.col === col ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellSave();
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="cell-input"
                      />
                    ) : row[col] !== null && row[col] !== undefined
                      ? String(row[col])
                      : <span className="null-value">NULL</span>}
                  </td>
                ))}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* 添加行对话框 */}
      {showAddRow && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>添加新行</h3>
              <button className="btn-close" onClick={() => setShowAddRow(false)}>×</button>
            </div>
            <div className="modal-body">
              {columns.map((col) => {
                const info = columnInfo.find(c => c.Field === col);
                const typeLabel = info ? info.Type : '';
                return (
                  <div key={col} className="form-group">
                    <label>
                      {col}
                      {typeLabel && <span className="type-hint">({typeLabel})</span>}
                      {info?.Extra?.toLowerCase().includes('auto_increment') && <span className="auto-increment-hint">自增</span>}
                    </label>
                    {renderInput(col, newRowData[col] || '', (val) => setNewRowData({ ...newRowData, [col]: val }), true)}
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddRow(false)}>取消</button>
              <button className="btn-primary" onClick={handleAddRow}>添加</button>
            </div>
          </div>
        </div>
      )}

      <div className="data-table-pagination">
        <div className="pagination-left">
          <span>每页显示</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
          <span>条</span>
        </div>

        <div className="pagination-center">
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(1)}
          >
            首页
          </button>
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            上一页
          </button>
          <span className="page-info">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            下一页
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(totalPages)}
          >
            末页
          </button>
        </div>

        <div className="pagination-right">
          跳转到
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = Number(e.target.value);
              if (page >= 1 && page <= totalPages) {
                handlePageChange(page);
              }
            }}
          />
          页
        </div>
      </div>
    </div>
  );
};

export default DataTable;
