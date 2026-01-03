/**
 * DataMatrix - Generic heatmap/matrix component.
 * Used for coverage matrix, cost matrix, correlation matrix, etc.
 */

import { useState } from 'react';
import './DataMatrix.css';

const DEFAULT_COLOR_SCALE = [
  { threshold: 0, color: '#f44336' },    // Red - missing/bad
  { threshold: 25, color: '#ff9800' },   // Orange - low
  { threshold: 50, color: '#ffeb3b' },   // Yellow - medium
  { threshold: 75, color: '#8bc34a' },   // Light green - good
  { threshold: 90, color: '#4caf50' },   // Green - excellent
];

function getColorForValue(value, min, max, colorScale) {
  if (value === null || value === undefined) return 'var(--bg-gray)';

  const percent = ((value - min) / (max - min)) * 100;

  // Find the appropriate color
  let color = colorScale[0].color;
  for (const step of colorScale) {
    if (percent >= step.threshold) {
      color = step.color;
    }
  }
  return color;
}

export function DataMatrix({
  data, // 2D array of values
  rowLabels = [],
  colLabels = [],
  colorScale = DEFAULT_COLOR_SCALE,
  minValue,
  maxValue,
  cellFormatter = (v) => v?.toString() || '-',
  onCellClick,
  onCellHover,
  showLegend = true,
  title,
  subtitle,
  size = 'medium', // 'small' | 'medium' | 'large'
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!data || data.length === 0) {
    return <div className="data-matrix-empty">No data available</div>;
  }

  // Calculate min/max if not provided
  const flatData = data.flat().filter(v => v !== null && v !== undefined);
  const min = minValue ?? Math.min(...flatData);
  const max = maxValue ?? Math.max(...flatData);

  const handleCellEnter = (rowIdx, colIdx, value) => {
    const cellInfo = {
      row: rowIdx,
      col: colIdx,
      rowLabel: rowLabels[rowIdx] || rowIdx,
      colLabel: colLabels[colIdx] || colIdx,
      value,
    };
    setHoveredCell(cellInfo);
    onCellHover?.(cellInfo);
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
    onCellHover?.(null);
  };

  return (
    <div className={`data-matrix data-matrix--${size}`}>
      {title && (
        <div className="data-matrix-header">
          <h3 className="data-matrix-title">{title}</h3>
          {subtitle && <p className="data-matrix-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className="data-matrix-scroll">
        <div className="data-matrix-grid">
          {/* Header row */}
          <div className="matrix-row matrix-header-row">
            <div className="matrix-cell matrix-corner-cell"></div>
            {colLabels.map((label, idx) => (
              <div key={idx} className="matrix-cell matrix-header-cell">
                {label}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {data.map((row, rowIdx) => (
            <div key={rowIdx} className="matrix-row">
              <div className="matrix-cell matrix-row-header">
                {rowLabels[rowIdx] || rowIdx}
              </div>
              {row.map((value, colIdx) => {
                const bgColor = getColorForValue(value, min, max, colorScale);
                const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;

                return (
                  <div
                    key={colIdx}
                    className={`matrix-cell matrix-data-cell ${isHovered ? 'hovered' : ''}`}
                    style={{ backgroundColor: bgColor }}
                    onMouseEnter={() => handleCellEnter(rowIdx, colIdx, value)}
                    onMouseLeave={handleCellLeave}
                    onClick={() => onCellClick?.({
                      row: rowIdx,
                      col: colIdx,
                      rowLabel: rowLabels[rowIdx],
                      colLabel: colLabels[colIdx],
                      value,
                    })}
                  >
                    {cellFormatter(value)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="matrix-tooltip">
          <strong>{hoveredCell.rowLabel} → {hoveredCell.colLabel}</strong>
          <span>Value: {cellFormatter(hoveredCell.value)}</span>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="matrix-legend">
          {colorScale.map((step, idx) => (
            <div key={idx} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: step.color }}
              ></span>
              <span className="legend-label">{step.threshold}%+</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DataMatrix;
