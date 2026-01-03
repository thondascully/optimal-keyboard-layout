/**
 * Coverage Tab - Finger pair coverage with keyboard heatmap.
 */

import { useState, useMemo } from 'react';
import { useCoverage } from '../../hooks/useCoverage';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './CoverageTab.css';

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

// QWERTY keyboard layout with finger assignments
const KEYBOARD_LAYOUT = [
  { row: 0, keys: [
    { key: 'q', finger: 'left_pinky' }, { key: 'w', finger: 'left_ring' },
    { key: 'e', finger: 'left_middle' }, { key: 'r', finger: 'left_index' },
    { key: 't', finger: 'left_index' }, { key: 'y', finger: 'right_index' },
    { key: 'u', finger: 'right_index' }, { key: 'i', finger: 'right_middle' },
    { key: 'o', finger: 'right_ring' }, { key: 'p', finger: 'right_pinky' },
  ]},
  { row: 1, keys: [
    { key: 'a', finger: 'left_pinky' }, { key: 's', finger: 'left_ring' },
    { key: 'd', finger: 'left_middle' }, { key: 'f', finger: 'left_index' },
    { key: 'g', finger: 'left_index' }, { key: 'h', finger: 'right_index' },
    { key: 'j', finger: 'right_index' }, { key: 'k', finger: 'right_middle' },
    { key: 'l', finger: 'right_ring' }, { key: ';', finger: 'right_pinky' },
  ]},
  { row: 2, keys: [
    { key: 'z', finger: 'left_pinky' }, { key: 'x', finger: 'left_ring' },
    { key: 'c', finger: 'left_middle' }, { key: 'v', finger: 'left_index' },
    { key: 'b', finger: 'left_index' }, { key: 'n', finger: 'right_index' },
    { key: 'm', finger: 'right_index' }, { key: ',', finger: 'right_middle' },
    { key: '.', finger: 'right_ring' }, { key: '/', finger: 'right_pinky' },
  ]},
];

function CoverageTab() {
  const { coverage, loading, error, fetchCoverage, matrix, gaps, summary, fingers } = useCoverage();
  const [hoveredCell, setHoveredCell] = useState(null);
  const [activeView, setActiveView] = useState('keyboard');

  // Calculate finger coverage stats for keyboard heatmap
  const fingerCoverage = useMemo(() => {
    if (!matrix || !fingers) return {};

    const stats = {};
    fingers.forEach(finger => {
      stats[finger] = { outgoing: 0, incoming: 0, total: 0, gaps: 0 };
    });

    matrix.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        const fromFinger = fingers[rowIdx];
        const toFinger = fingers[colIdx];
        stats[fromFinger].outgoing += cell.count;
        stats[toFinger].incoming += cell.count;
        stats[fromFinger].total += cell.count;
        if (cell.count < 5) stats[fromFinger].gaps++;
      });
    });

    return stats;
  }, [matrix, fingers]);

  // Get heat color for a finger based on its gap count
  const getFingerHeat = (finger) => {
    const stats = fingerCoverage[finger];
    if (!stats) return { fill: '#ccc', opacity: 0.5 };

    const gapRatio = stats.gaps / 8; // 8 possible pairs per finger
    if (gapRatio === 0) return { fill: '#4caf50', opacity: 0.8 };
    if (gapRatio <= 0.25) return { fill: '#8bc34a', opacity: 0.8 };
    if (gapRatio <= 0.5) return { fill: '#ff9800', opacity: 0.8 };
    if (gapRatio <= 0.75) return { fill: '#ff5722', opacity: 0.8 };
    return { fill: '#f44336', opacity: 0.9 };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'good': return 'status-good';
      case 'adequate': return 'status-adequate';
      case 'low': return 'status-low';
      case 'missing': return 'status-missing';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="coverage-tab">
        <div className="card"><p>Loading coverage data...</p></div>
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

  const trigraphsNeeded = Math.max(0, summary.target_trigraphs - summary.total_trigraphs);
  const highPriorityGaps = gaps.filter(g => g.priority === 'high').length;
  const progressPercent = Math.min(100, summary.trigraph_progress);

  const pieData = [
    { name: 'Good (8+)', value: summary.well_covered_pairs, color: '#4caf50' },
    { name: 'Adequate (5-7)', value: summary.covered_pairs - summary.well_covered_pairs, color: '#4A90E2' },
    { name: 'Low (1-4)', value: Math.max(0, summary.total_pairs - summary.covered_pairs - highPriorityGaps), color: '#ff9800' },
    { name: 'Missing (0)', value: highPriorityGaps, color: '#f44336' },
  ].filter(d => d.value > 0);

  return (
    <div className="coverage-tab">
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-box primary">
          <div className="stat-value">{progressPercent}%</div>
          <div className="stat-label">Progress</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{summary.total_trigraphs}</div>
          <div className="stat-label">Trigraphs</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{summary.covered_pairs}/{summary.total_pairs}</div>
          <div className="stat-label">Pairs Covered</div>
        </div>
        <div className={`stat-box ${gaps.length === 0 ? 'complete' : 'alert'}`}>
          <div className="stat-value">{gaps.length}</div>
          <div className="stat-label">Gaps</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent >= 100 ? '#4caf50' : progressPercent >= 80 ? '#4A90E2' : progressPercent >= 50 ? '#ff9800' : '#f44336'
            }}
          />
        </div>
        <div className="progress-labels">
          <span>{summary.total_trigraphs} collected</span>
          <span>Target: {summary.target_trigraphs}</span>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button className={activeView === 'keyboard' ? 'active' : ''} onClick={() => setActiveView('keyboard')}>
          Keyboard
        </button>
        <button className={activeView === 'matrix' ? 'active' : ''} onClick={() => setActiveView('matrix')}>
          Matrix
        </button>
        <button className={activeView === 'gaps' ? 'active' : ''} onClick={() => setActiveView('gaps')}>
          Gaps ({gaps.length})
        </button>
      </div>

      {/* Keyboard Heatmap View */}
      {activeView === 'keyboard' && (
        <div className="keyboard-section">
          <h4>Keyboard Coverage Heatmap</h4>
          <p className="section-subtitle">
            Colors show finger coverage gaps. Red = many gaps, Green = fully covered.
          </p>
          <div className="keyboard-heatmap">
            {KEYBOARD_LAYOUT.map((row) => (
              <div key={row.row} className="keyboard-row" style={{ marginLeft: row.row * 20 }}>
                {row.keys.map((keyInfo) => {
                  const heat = getFingerHeat(keyInfo.finger);
                  const stats = fingerCoverage[keyInfo.finger] || {};
                  return (
                    <div
                      key={keyInfo.key}
                      className="key-cap"
                      style={{ backgroundColor: heat.fill, opacity: heat.opacity }}
                      title={`${keyInfo.key.toUpperCase()} - ${FINGER_NAMES[keyInfo.finger]}\nGaps: ${stats.gaps || 0}/8`}
                    >
                      {keyInfo.key.toUpperCase()}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Finger Legend */}
          <div className="finger-legend">
            {Object.entries(fingerCoverage).map(([finger, stats]) => {
              const heat = getFingerHeat(finger);
              return (
                <div key={finger} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: heat.fill }}></span>
                  <span className="legend-label">{FINGER_LABELS[finger]}</span>
                  <span className="legend-stat">{8 - stats.gaps}/8</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matrix View */}
      {activeView === 'matrix' && (
        <div className="matrix-section">
          <div className="matrix-header">
            <h4>Finger Pair Matrix</h4>
            <div className="matrix-legend">
              <span className="legend-item"><span className="dot good"></span>8+</span>
              <span className="legend-item"><span className="dot adequate"></span>5-7</span>
              <span className="legend-item"><span className="dot low"></span>1-4</span>
              <span className="legend-item"><span className="dot missing"></span>0</span>
            </div>
          </div>

          <div className="coverage-matrix">
            <div className="matrix-row header-row">
              <div className="matrix-cell corner"></div>
              {fingers.map(f => (
                <div key={f} className="matrix-cell header">{FINGER_LABELS[f]}</div>
              ))}
            </div>
            {matrix.map((row, rowIdx) => (
              <div key={rowIdx} className="matrix-row">
                <div className="matrix-cell row-header">{FINGER_LABELS[fingers[rowIdx]]}</div>
                {row.map((cell, colIdx) => (
                  <div
                    key={colIdx}
                    className={`matrix-cell data ${getStatusClass(cell.status)}`}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {cell.count}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {hoveredCell && (
            <div className="cell-tooltip">
              {FINGER_NAMES[hoveredCell.from]} to {FINGER_NAMES[hoveredCell.to]}: {hoveredCell.count} samples
            </div>
          )}

          {/* Pie Chart */}
          <div className="pie-section">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' pairs', n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {pieData.map((d, i) => (
                <span key={i} className="legend-item">
                  <span className="dot" style={{ background: d.color }}></span>
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gaps View */}
      {activeView === 'gaps' && (
        <div className="gaps-section">
          {gaps.length === 0 ? (
            <div className="all-covered">
              <span className="check-icon">OK</span>
              <h4>All finger pairs covered</h4>
              <p>You have at least 5 samples for every finger pair combination.</p>
            </div>
          ) : (
            <>
              <h4>Coverage Gaps ({gaps.length})</h4>
              <p className="section-subtitle">
                Finger pairs that need more samples. Focus on high priority first.
              </p>
              <div className="gaps-list">
                {gaps.slice(0, 30).map((gap, idx) => (
                  <div key={idx} className={`gap-item priority-${gap.priority}`}>
                    <span className="gap-pair">
                      {FINGER_LABELS[gap.from]} -&gt; {FINGER_LABELS[gap.to]}
                    </span>
                    <span className="gap-current">{gap.current}</span>
                    <span className="gap-needed">need +{gap.needed}</span>
                  </div>
                ))}
              </div>
              {gaps.length > 30 && (
                <p className="more-gaps">+ {gaps.length - 30} more gaps</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Action Items */}
      <div className="action-section">
        <h4>Next Steps</h4>
        {trigraphsNeeded > 0 && (
          <div className="action-item">
            <span className="action-num">1</span>
            <span>Collect {trigraphsNeeded} more trigraphs using Trigraph Test mode</span>
          </div>
        )}
        {gaps.length > 0 && (
          <div className="action-item">
            <span className="action-num">{trigraphsNeeded > 0 ? '2' : '1'}</span>
            <span>Use Stratified mode to target {gaps.length} under-sampled finger pairs</span>
          </div>
        )}
        {trigraphsNeeded <= 0 && gaps.length === 0 && (
          <div className="action-item complete">
            <span className="action-check">Done</span>
            <span>Coverage complete - ready for PITF model training</span>
          </div>
        )}
        <button className="refresh-btn" onClick={() => fetchCoverage()}>Refresh Data</button>
      </div>
    </div>
  );
}

export default CoverageTab;
