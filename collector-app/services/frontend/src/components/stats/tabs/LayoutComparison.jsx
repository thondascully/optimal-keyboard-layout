/**
 * LayoutComparison - Side-by-side layout comparison.
 * Uses mock data until optimization backend is implemented.
 */

import { DemoModeIndicator, MetricCard } from '../../common';
import { mockLayoutComparison } from '../../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import './LayoutComparison.css';

// Simple inline keyboard visualization
function ComparisonKeyboard({ layout, label, color, highlights = [] }) {
  const rows = [
    layout.slice(0, 10),
    layout.slice(10, 19),
    layout.slice(19, 26),
  ];

  return (
    <div className="comparison-keyboard">
      <div className="keyboard-header" style={{ borderColor: color }}>
        <span className="keyboard-label">{label}</span>
      </div>
      <div className="keyboard-rows">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="keyboard-row" style={{ marginLeft: rowIdx === 1 ? '18px' : rowIdx === 2 ? '45px' : '0' }}>
            {row.map((key, keyIdx) => {
              const isHighlighted = highlights.includes(key.toLowerCase());
              return (
                <div
                  key={keyIdx}
                  className={`comp-key ${isHighlighted ? 'highlighted' : ''}`}
                  style={isHighlighted ? { borderColor: color, background: `${color}20` } : {}}
                >
                  {key}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutComparison() {
  const data = mockLayoutComparison;

  // Prepare radar chart data
  const radarData = data.comparisonMetrics.map(metric => ({
    metric: metric.name,
    ...data.layouts.reduce((acc, layout) => {
      acc[layout.name] = metric.values[layout.id];
      return acc;
    }, {}),
  }));

  // Prepare bar chart data for finger usage
  const fingerData = data.fingerLabels.map((finger, idx) => ({
    finger,
    ...data.layouts.reduce((acc, layout) => {
      acc[layout.name] = layout.fingerUsage[idx];
      return acc;
    }, {}),
  }));

  return (
    <div className="layout-comparison">
      <DemoModeIndicator
        message="Demo Mode - Showing sample layout comparisons. Requires optimization backend."
      />

      {/* Summary Cards */}
      <div className="comparison-summary">
        {data.layouts.map((layout) => (
          <div key={layout.id} className="layout-summary-card" style={{ borderTopColor: layout.color }}>
            <h3>{layout.name}</h3>
            <div className="summary-stats">
              <MetricCard label="Total Cost" value={layout.totalCost.toFixed(2)} size="small" />
              <MetricCard label="vs QWERTY" value={`${layout.improvement > 0 ? '+' : ''}${layout.improvement.toFixed(1)}%`} variant={layout.improvement > 0 ? 'success' : 'error'} size="small" />
            </div>
          </div>
        ))}
      </div>

      {/* Side by Side Keyboards */}
      <div className="card">
        <h3>Layout Visualization</h3>
        <div className="keyboards-row">
          {data.layouts.map((layout) => (
            <ComparisonKeyboard
              key={layout.id}
              layout={layout.layout}
              label={layout.name}
              color={layout.color}
              highlights={layout.highlights || []}
            />
          ))}
        </div>
        <p className="keyboard-note">
          Highlighted keys show positions that differ from QWERTY
        </p>
      </div>

      {/* Radar Chart - Multi-metric comparison */}
      <div className="card">
        <h3>Performance Radar</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="var(--border-color, #e0e0e0)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary, #666)', fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fill: 'var(--text-secondary, #666)' }} />
              {data.layouts.map((layout) => (
                <Radar
                  key={layout.id}
                  name={layout.name}
                  dataKey={layout.name}
                  stroke={layout.color}
                  fill={layout.color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-note">Higher values = better performance (normalized 0-100)</p>
      </div>

      {/* Finger Usage Comparison */}
      <div className="card">
        <h3>Finger Usage Distribution</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fingerData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" />
              <XAxis
                dataKey="finger"
                tick={{ fill: 'var(--text-secondary, #666)', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                label={{ value: 'Usage %', angle: -90, position: 'insideLeft' }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)' }}
                formatter={(value) => [`${value.toFixed(1)}%`, '']}
              />
              <Legend />
              {data.layouts.map((layout) => (
                <Bar
                  key={layout.id}
                  dataKey={layout.name}
                  fill={layout.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="card">
        <h3>Detailed Metrics</h3>
        <div className="metrics-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                {data.layouts.map((layout) => (
                  <th key={layout.id} style={{ color: layout.color }}>{layout.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.detailedMetrics.map((metric) => (
                <tr key={metric.name}>
                  <td className="metric-name">{metric.name}</td>
                  {data.layouts.map((layout) => (
                    <td key={layout.id} className="metric-value">
                      {metric.values[layout.id]}{metric.unit}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Position Changes */}
      <div className="card">
        <h3>Notable Key Relocations</h3>
        <div className="relocations-grid">
          {data.layouts.filter(l => l.id !== 'qwerty').map((layout) => (
            <div key={layout.id} className="relocation-section">
              <h4 style={{ color: layout.color }}>{layout.name}</h4>
              <div className="relocation-list">
                {layout.keyChanges.map((change, idx) => (
                  <div key={idx} className="relocation-item">
                    <span className="key-moved">{change.key}</span>
                    <span className="move-arrow">→</span>
                    <span className="key-position">{change.from} → {change.to}</span>
                    <span className="move-reason">{change.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LayoutComparison;
