/**
 * MetricCard - Reusable stat display card component.
 * Used for hero stats, dashboard metrics, and summary cards.
 */

import './MetricCard.css';

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'error'
  size = 'medium', // 'small' | 'medium' | 'large'
  onClick,
}) {
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : null;
  const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : '';

  return (
    <div
      className={`metric-card metric-card--${variant} metric-card--${size} ${onClick ? 'metric-card--clickable' : ''}`}
      onClick={onClick}
    >
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-content">
        <div className="metric-value">
          {value}
          {trendIcon && (
            <span className={`metric-trend ${trendClass}`}>
              {trendIcon} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="metric-label">{label}</div>
        {detail && <div className="metric-detail">{detail}</div>}
      </div>
    </div>
  );
}

export default MetricCard;
