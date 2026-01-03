/**
 * ProgressGauge - SVG circular progress indicator.
 * Used for collection progress, completion tracking, and scores.
 */

import './ProgressGauge.css';

export function ProgressGauge({
  value, // 0-100
  max = 100,
  label,
  size = 'medium', // 'small' | 'medium' | 'large'
  showValue = true,
  valueFormatter = (v) => `${Math.round(v)}%`,
  colorThresholds = { // Define color based on value
    success: 80,
    warning: 50,
    error: 0,
  },
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  // Determine color based on thresholds
  let color = 'var(--accent)';
  if (percent >= colorThresholds.success) {
    color = '#4caf50';
  } else if (percent >= colorThresholds.warning) {
    color = '#ff9800';
  } else {
    color = '#f44336';
  }

  // SVG dimensions based on size
  const dimensions = {
    small: { size: 80, stroke: 6 },
    medium: { size: 120, stroke: 8 },
    large: { size: 160, stroke: 10 },
  };

  const { size: svgSize, stroke } = dimensions[size];
  const radius = (svgSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={`progress-gauge progress-gauge--${size}`}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="progress-gauge-svg"
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-gray)"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
          className="progress-gauge-circle"
        />
      </svg>
      <div className="progress-gauge-content">
        {showValue && (
          <span className="progress-gauge-value" style={{ color }}>
            {valueFormatter(value)}
          </span>
        )}
        {label && <span className="progress-gauge-label">{label}</span>}
      </div>
    </div>
  );
}

export default ProgressGauge;
