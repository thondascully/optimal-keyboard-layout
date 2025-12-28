/**
 * Coverage Tab - Displays finger pair coverage for PITF model training.
 *
 * Shows an 8x8 heatmap of finger pairs with sample counts,
 * progress toward 400-500 trigraph target, and coverage gaps.
 */

import { useState } from 'react';
import { useCoverage } from '../../hooks/useCoverage';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './CoverageTab.css';

// Short finger labels for the matrix
const FINGER_LABELS = {
  'left_pinky': 'L.Pk',
  'left_ring': 'L.Rg',
  'left_middle': 'L.Md',
  'left_index': 'L.Ix',
  'right_index': 'R.Ix',
  'right_middle': 'R.Md',
  'right_ring': 'R.Rg',
  'right_pinky': 'R.Pk',
};

// Full finger names for tooltips
const FINGER_NAMES = {
  'left_pinky': 'Left Pinky',
  'left_ring': 'Left Ring',
  'left_middle': 'Left Middle',
  'left_index': 'Left Index',
  'right_index': 'Right Index',
  'right_middle': 'Right Middle',
  'right_ring': 'Right Ring',
  'right_pinky': 'Right Pinky',
};

function CoverageTab() {
  const { coverage, loading, error, fetchCoverage, matrix, gaps, summary, fingers } = useCoverage();
  const [hoveredCell, setHoveredCell] = useState(null);

  if (loading) {
    return (
      <div className="coverage-tab">
        <div className="card">
          <p>Loading coverage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coverage-tab">
        <div className="card">
          <p className="error">Error: {error}</p>
          <button onClick={() => fetchCoverage()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!coverage) {
    return (
      <div className="coverage-tab">
        <div className="card">
          <p>No coverage data available.</p>
          <button onClick={() => fetchCoverage()}>Load Coverage</button>
        </div>
      </div>
    );
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'good': return 'status-good';
      case 'adequate': return 'status-adequate';
      case 'low': return 'status-low';
      case 'missing': return 'status-missing';
      default: return '';
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return 'var(--success-color, #4caf50)';
    if (percent >= 80) return 'var(--accent-color, #4A90E2)';
    if (percent >= 50) return 'var(--warning-color, #ff9800)';
    return 'var(--error-color, #f44336)';
  };

  // Calculate additional metrics
  const trigraphsNeeded = Math.max(0, summary.target_trigraphs - summary.total_trigraphs);
  const gapsNeeded = gaps.reduce((sum, g) => sum + g.needed, 0);
  const highPriorityGaps = gaps.filter(g => g.priority === 'high').length;
  const mediumPriorityGaps = gaps.filter(g => g.priority === 'medium').length;

  // Pie chart data for coverage status
  const pieData = [
    { name: 'Good (8+)', value: summary.well_covered_pairs, color: '#4caf50' },
    { name: 'Adequate (5-7)', value: summary.covered_pairs - summary.well_covered_pairs, color: '#4A90E2' },
    { name: 'Low (1-4)', value: summary.total_pairs - summary.covered_pairs - highPriorityGaps, color: '#ff9800' },
    { name: 'Missing (0)', value: highPriorityGaps, color: '#f44336' },
  ].filter(d => d.value > 0);

  return (
    <div className="coverage-tab">
      {/* Hero Stats */}
      <div className="card coverage-hero">
        <div className="hero-grid">
          <div className="hero-stat main-stat">
            <div className="hero-value">{summary.trigraph_progress}%</div>
            <div className="hero-label">Collection Progress</div>
            <div className="hero-detail">{summary.total_trigraphs} / {summary.target_trigraphs} trigraphs</div>
          </div>
          <div className="hero-stat">
            <div className="hero-value">{summary.pair_coverage_percent}%</div>
            <div className="hero-label">Pair Coverage</div>
            <div className="hero-detail">{summary.covered_pairs} / {summary.total_pairs} pairs</div>
          </div>
          <div className={`hero-stat ${gaps.length === 0 ? 'complete' : ''}`}>
            <div className="hero-value">{gaps.length}</div>
            <div className="hero-label">Gaps Remaining</div>
            <div className="hero-detail">{gapsNeeded} samples needed</div>
          </div>
        </div>
      </div>

      {/* What's Missing Summary */}
      <div className="card needs-summary">
        <h3>What You Still Need</h3>
        <div className="needs-grid">
          {trigraphsNeeded > 0 && (
            <div className="need-item">
              <span className="need-icon">📊</span>
              <div className="need-content">
                <strong>{trigraphsNeeded} more trigraphs</strong>
                <span>to reach the {summary.target_trigraphs} target</span>
              </div>
            </div>
          )}
          {highPriorityGaps > 0 && (
            <div className="need-item urgent">
              <span className="need-icon">🔴</span>
              <div className="need-content">
                <strong>{highPriorityGaps} finger pairs with 0 samples</strong>
                <span>High priority - no data at all</span>
              </div>
            </div>
          )}
          {mediumPriorityGaps > 0 && (
            <div className="need-item">
              <span className="need-icon">🟡</span>
              <div className="need-content">
                <strong>{mediumPriorityGaps} finger pairs need more samples</strong>
                <span>Have 1-4 samples, need at least 5</span>
              </div>
            </div>
          )}
          {gaps.length === 0 && trigraphsNeeded <= 0 && (
            <div className="need-item complete">
              <span className="need-icon">✅</span>
              <div className="need-content">
                <strong>All targets met!</strong>
                <span>You have sufficient coverage for PITF model training</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coverage Distribution Chart */}
      <div className="card coverage-charts">
        <h3>Coverage Distribution</h3>
        <div className="charts-row">
          <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value + ' pairs', name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {pieData.map((entry, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-dot" style={{ background: entry.color }}></span>
                  <span className="legend-text">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar section */}
          <div className="progress-section">
            <div className="progress-item">
              <div className="progress-header">
                <span>Trigraph Collection</span>
                <span className="progress-numbers">{summary.total_trigraphs} / {summary.target_trigraphs}</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${Math.min(100, summary.trigraph_progress)}%`, backgroundColor: getProgressColor(summary.trigraph_progress) }} />
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-header">
                <span>Pair Coverage (5+ samples)</span>
                <span className="progress-numbers">{summary.covered_pairs} / {summary.total_pairs}</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${summary.pair_coverage_percent}%`, backgroundColor: getProgressColor(summary.pair_coverage_percent) }} />
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-header">
                <span>Well Covered (8+ samples)</span>
                <span className="progress-numbers">{summary.well_covered_pairs} / {summary.total_pairs}</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${(summary.well_covered_pairs / summary.total_pairs) * 100}%`, backgroundColor: getProgressColor((summary.well_covered_pairs / summary.total_pairs) * 100) }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage Matrix Heatmap */}
      <div className="card coverage-matrix-card">
        <h3>Finger Pair Coverage Matrix</h3>
        <p className="matrix-subtitle">
          Rows = source finger, Columns = target finger.
          <span className="status-good"> Green</span> = 8+ samples,
          <span className="status-adequate"> Blue</span> = 5-7,
          <span className="status-low"> Yellow</span> = 1-4,
          <span className="status-missing"> Red</span> = 0
        </p>

        <div className="coverage-matrix">
          {/* Header row */}
          <div className="matrix-row header-row">
            <div className="matrix-cell corner-cell"></div>
            {fingers.map(finger => (
              <div key={finger} className="matrix-cell header-cell">
                {FINGER_LABELS[finger] || finger}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {matrix.map((row, rowIdx) => (
            <div key={rowIdx} className="matrix-row">
              <div className="matrix-cell row-header">
                {FINGER_LABELS[fingers[rowIdx]] || fingers[rowIdx]}
              </div>
              {row.map((cell, colIdx) => (
                <div
                  key={colIdx}
                  className={`matrix-cell data-cell ${getStatusClass(cell.status)}`}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  title={`${FINGER_NAMES[cell.from]} → ${FINGER_NAMES[cell.to]}: ${cell.count} samples`}
                >
                  {cell.count}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip for hovered cell */}
        {hoveredCell && (
          <div className="cell-tooltip">
            <strong>{FINGER_NAMES[hoveredCell.from]} → {FINGER_NAMES[hoveredCell.to]}</strong>
            <div>Samples: {hoveredCell.count}</div>
            {hoveredCell.avg_time && <div>Avg time: {hoveredCell.avg_time}ms</div>}
            <div>Status: {hoveredCell.status}</div>
          </div>
        )}
      </div>

      {/* Coverage Gaps */}
      {gaps.length > 0 && (
        <div className="card coverage-gaps-card">
          <h3>Coverage Gaps ({gaps.length})</h3>
          <p className="gaps-subtitle">
            These finger pairs need more samples. High priority = 0 samples.
          </p>

          <div className="gaps-grid">
            {gaps.slice(0, 20).map((gap, idx) => (
              <div
                key={idx}
                className={`gap-item priority-${gap.priority}`}
              >
                <span className="gap-pair">
                  {FINGER_LABELS[gap.from]} → {FINGER_LABELS[gap.to]}
                </span>
                <span className="gap-info">
                  {gap.current}/{summary.min_samples_per_pair}
                  <span className="needed">(need {gap.needed})</span>
                </span>
              </div>
            ))}
          </div>

          {gaps.length > 20 && (
            <p className="more-gaps">...and {gaps.length - 20} more gaps</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="card coverage-legend">
        <h4>How to use this data</h4>
        <ol>
          <li>
            <strong>Collect trigraphs</strong> using the Trigraph Test mode until you reach 400-500 total.
          </li>
          <li>
            <strong>Fill gaps</strong> by using the stratified mode which targets under-sampled finger pairs.
          </li>
          <li>
            <strong>Target 5+ samples</strong> for each of the 64 finger pair combinations.
          </li>
          <li>
            Once complete, you can train the PITF model for keyboard optimization.
          </li>
        </ol>

        <button
          className="refresh-button"
          onClick={() => fetchCoverage()}
        >
          Refresh Coverage
        </button>
      </div>
    </div>
  );
}

export default CoverageTab;
