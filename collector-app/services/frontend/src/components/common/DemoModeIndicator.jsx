/**
 * DemoModeIndicator - Banner indicating mock/demo data.
 * Used on tabs that don't have real backend data yet.
 */

import './DemoModeIndicator.css';

export function DemoModeIndicator({
  message = 'Demo Mode - Showing sample data',
  variant = 'info', // 'info' | 'warning'
}) {
  return (
    <div className={`demo-mode-indicator demo-mode-indicator--${variant}`}>
      <span className="demo-mode-icon">
        {variant === 'warning' ? '⚠️' : '🔬'}
      </span>
      <span className="demo-mode-message">{message}</span>
      <span className="demo-mode-badge">DEMO</span>
    </div>
  );
}

export default DemoModeIndicator;
