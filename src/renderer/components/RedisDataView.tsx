import React from 'react';
import './DataTable.css';

interface RedisDataViewProps {
  data: {
    key: string;
    type: string;
    value: any;
    ttl: number;
  } | null;
}

const RedisDataView: React.FC<RedisDataViewProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="no-results">
        <p>点击 key 查看数据</p>
      </div>
    );
  }

  const renderValue = () => {
    switch (data.type) {
      case 'string':
        return (
          <div style={{ padding: '16px', background: '#2d2d2d', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {data.value}
          </div>
        );
      
      case 'list':
      case 'set':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>索引</th>
                <th>值</th>
              </tr>
            </thead>
            <tbody>
              {(data.value as string[]).map((item, idx) => (
                <tr key={idx}>
                  <td>{idx}</td>
                  <td>{item}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      
      case 'zset':
        const pairs: { value: string; score: string }[] = [];
        for (let i = 0; i < data.value.length; i += 2) {
          pairs.push({ value: data.value[i], score: data.value[i + 1] });
        }
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>值</th>
                <th style={{ width: '100px' }}>分数</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair, idx) => (
                <tr key={idx}>
                  <td>{pair.value}</td>
                  <td>{pair.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      
      case 'hash':
        return (
          <table className="data-table">
            <thead>
              <tr>
                <th>字段</th>
                <th>值</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.value).map(([field, value]) => (
                <tr key={field}>
                  <td>{field}</td>
                  <td>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      
      default:
        return <div style={{ padding: '16px', color: '#888' }}>不支持的数据类型</div>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return '#4fc3f7';
      case 'list': return '#81c784';
      case 'set': return '#ffb74d';
      case 'zset': return '#ba68c8';
      case 'hash': return '#f06292';
      default: return '#888';
    }
  };

  return (
    <div className="data-table-wrapper">
      <div className="data-table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>{data.key}</h3>
          <span style={{ 
            background: getTypeColor(data.type), 
            color: '#000', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            fontSize: '11px',
            fontWeight: 600 
          }}>
            {data.type.toUpperCase()}
          </span>
        </div>
        <div className="data-table-info">
          TTL: {data.ttl === -1 ? '永不过期' : data.ttl === -2 ? '已过期' : `${data.ttl}s`}
        </div>
      </div>
      <div className="data-table-container">
        {renderValue()}
      </div>
    </div>
  );
};

export default RedisDataView;
