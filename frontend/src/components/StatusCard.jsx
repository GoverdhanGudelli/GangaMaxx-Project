import React from 'react';

export default function StatusCard({ title, value, icon: Icon, description, trend, type = 'primary' }) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          iconBg: 'rgba(16, 185, 129, 0.1)',
          iconColor: 'var(--color-success)',
          glow: 'rgba(16, 185, 129, 0.15)'
        };
      case 'warning':
        return {
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: 'var(--color-warning)',
          glow: 'rgba(245, 158, 11, 0.15)'
        };
      case 'danger':
        return {
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconColor: 'var(--color-error)',
          glow: 'rgba(239, 68, 68, 0.15)'
        };
      case 'info':
        return {
          iconBg: 'rgba(14, 165, 233, 0.1)',
          iconColor: 'var(--color-info)',
          glow: 'rgba(14, 165, 233, 0.15)'
        };
      case 'primary':
      default:
        return {
          iconBg: 'rgba(99, 102, 241, 0.1)',
          iconColor: 'var(--color-primary)',
          glow: 'rgba(99, 102, 241, 0.15)'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="status-card card" style={{ '--card-glow-color': styles.glow }}>
      <div className="card-top">
        <div className="card-info-block">
          <span className="card-title">{title}</span>
          <h3 className="card-value">{value}</h3>
        </div>
        <div className="card-icon" style={{ background: styles.iconBg, color: styles.iconColor }}>
          <Icon size={20} />
        </div>
      </div>
      {(description || trend) && (
        <div className="card-bottom">
          {trend && (
            <span className={`card-trend ${trend.positive ? 'positive' : 'negative'}`}>
              {trend.positive ? '+' : ''}{trend.value}
            </span>
          )}
          {description && <span className="card-desc">{description}</span>}
        </div>
      )}
    </div>
  );
}
