import React from 'react';

export default function Table({ 
  headers = [], 
  data = [], 
  renderRow, 
  actions, 
  title, 
  searchPlaceholder = "Search records...", 
  searchValue, 
  onSearchChange,
  extraHeaderActions
}) {
  return (
    <div className="table-card card-solid">
      {(title || onSearchChange || extraHeaderActions) && (
        <div className="table-header">
          <div className="table-title-block">
            {title && <h3>{title}</h3>}
          </div>
          <div className="table-actions-block">
            {onSearchChange && (
              <div className="table-search">
                <input 
                  type="text" 
                  placeholder={searchPlaceholder} 
                  value={searchValue} 
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            )}
            {extraHeaderActions && <div className="extra-actions">{extraHeaderActions}</div>}
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ width: h.width || 'auto', textAlign: h.align || 'left' }}>
                  {h.label}
                </th>
              ))}
              {actions && <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr key={item.id || index}>
                  {renderRow(item, index)}
                  {actions && (
                    <td className="table-actions-cell">
                      <div className="table-actions">
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + (actions ? 1 : 0)} className="table-empty-state">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
