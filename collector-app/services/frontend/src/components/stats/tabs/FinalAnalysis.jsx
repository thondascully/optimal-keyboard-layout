/**
 * FinalAnalysis - Summary of selected optimized layout.
 * Uses mock data until optimization backend is implemented.
 */

import { DemoModeIndicator, MetricCard } from '../../common';
import { mockFinalAnalysis } from '../../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './FinalAnalysis.css';

// Final keyboard visualization with finger coloring
function FinalKeyboard({ layout, fingerMap, fingerColors }) {
  const rows = [
    { keys: layout.slice(0, 10), fingers: fingerMap.slice(0, 10) },
    { keys: layout.slice(10, 19), fingers: fingerMap.slice(10, 19), offset: 18 },
    { keys: layout.slice(19, 26), fingers: fingerMap.slice(19, 26), offset: 45 },
  ];

  return (
    <div className="final-keyboard">
      <div className="keyboard-container">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="final-keyboard-row" style={{ marginLeft: row.offset || 0 }}>
            {row.keys.map((key, keyIdx) => {
              const finger = row.fingers[keyIdx];
              const color = fingerColors[finger] || '#888';
              return (
                <div
                  key={keyIdx}
                  className="final-key"
                  style={{ background: `${color}25`, borderColor: color }}
                  title={finger}
                >
                  {key}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="finger-legend">
        {Object.entries(fingerColors).map(([finger, color]) => (
          <div key={finger} className="legend-item">
            <span className="legend-color" style={{ background: color }}></span>
            <span className="legend-label">{finger}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalAnalysis() {
  const data = mockFinalAnalysis;

  // Prepare improvement chart data
  const improvementData = Object.entries(data.improvements).map(([key, value]) => ({
    metric: key.replace(/([A-Z])/g, ' $1').trim(),
    improvement: value,
    fill: value > 0 ? '#4caf50' : '#f44336',
  }));

  return (
    <div className="final-analysis">
      <DemoModeIndicator
        message="Demo Mode - Showing sample final analysis. Requires completed optimization."
      />

      {/* Hero Section */}
      <div className="hero-section">
        <h2 className="layout-name">{data.selectedLayout.name}</h2>
        <p className="layout-subtitle">Personalized Keyboard Layout</p>
        <div className="hero-stats">
          <MetricCard
            label="Total Cost"
            value={data.selectedLayout.totalCost.toFixed(2)}
            size="large"
            variant="primary"
          />
          <MetricCard
            label="vs QWERTY"
            value={`+${data.selectedLayout.improvement.toFixed(1)}%`}
            size="large"
            variant="success"
          />
          <MetricCard
            label="Predicted WPM"
            value={data.selectedLayout.predictedWpm}
            size="large"
            variant="default"
          />
          <MetricCard
            label="Optimization Time"
            value={data.selectedLayout.optimizationTime}
            size="large"
            variant="default"
          />
        </div>
      </div>

      {/* Final Layout */}
      <div className="card">
        <h3>Your Optimized Layout</h3>
        <FinalKeyboard
          layout={data.selectedLayout.layout}
          fingerMap={data.selectedLayout.fingerMap}
          fingerColors={data.fingerColors}
        />
      </div>

      {/* Improvements Chart */}
      <div className="card">
        <h3>Performance Improvements</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={improvementData} layout="vertical" margin={{ top: 20, right: 50, left: 100, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" />
              <XAxis
                type="number"
                tick={{ fill: 'var(--text-secondary, #666)' }}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              />
              <YAxis
                type="category"
                dataKey="metric"
                tick={{ fill: 'var(--text-secondary, #666)', fontSize: 12 }}
                width={90}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)' }}
                formatter={(value) => [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Improvement']}
              />
              <Bar dataKey="improvement" radius={[0, 4, 4, 0]}>
                {improvementData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Highlights */}
      <div className="highlights-grid">
        <div className="card highlight-card">
          <h3>Best Bigrams</h3>
          <div className="highlight-list">
            {data.bestBigrams.map((bg, idx) => (
              <div key={idx} className="highlight-item good">
                <span className="bigram">{bg.bigram}</span>
                <span className="stats">{bg.cost}ms • {(bg.frequency * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card highlight-card">
          <h3>Remaining Challenges</h3>
          <div className="highlight-list">
            {data.worstBigrams.map((bg, idx) => (
              <div key={idx} className="highlight-item bad">
                <span className="bigram">{bg.bigram}</span>
                <span className="stats">{bg.cost}ms • {(bg.frequency * 100).toFixed(3)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3>Recommendations</h3>
        <div className="recommendations">
          {data.recommendations.map((rec, idx) => (
            <div key={idx} className={`recommendation-item ${rec.priority}`}>
              <span className="rec-icon">{rec.priority === 'high' ? '!' : rec.priority === 'medium' ? '•' : '○'}</span>
              <div className="rec-content">
                <strong>{rec.title}</strong>
                <span>{rec.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="card export-section">
        <h3>Export Layout</h3>
        <p className="export-desc">
          Export your optimized layout for use with keyboard remapping software.
        </p>
        <div className="export-buttons">
          <button className="export-btn" disabled>
            <span className="btn-icon">📋</span>
            Copy to Clipboard
          </button>
          <button className="export-btn" disabled>
            <span className="btn-icon">📄</span>
            Download JSON
          </button>
          <button className="export-btn" disabled>
            <span className="btn-icon">⌨️</span>
            Karabiner Config
          </button>
          <button className="export-btn" disabled>
            <span className="btn-icon">🔧</span>
            AutoHotkey Script
          </button>
        </div>
        <p className="export-note">Export functionality will be available when optimization is complete.</p>
      </div>

      {/* Training Stats */}
      <div className="card">
        <h3>Optimization Summary</h3>
        <div className="summary-grid">
          {Object.entries(data.trainingStats).map(([key, value]) => (
            <div key={key} className="summary-item">
              <span className="summary-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="summary-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FinalAnalysis;
