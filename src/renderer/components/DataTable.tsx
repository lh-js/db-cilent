import React, { useState } from 'react';
import './DataTable.css';

interface DataTableProps {
  columns: string[];
  rows: any[];
  totalCount?: number;
  executionTime?: number;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  totalCount,
  executionTime,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

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

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <h3>查询结果</h3>
        <div className="data-table-info">
          <span>{total} 行</span>
          {executionTime !== undefined && <span> | {executionTime}ms</span>}
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col}>
                    {row[col] !== null && row[col] !== undefined
                      ? String(row[col])
                      : <span className="null-value">NULL</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
