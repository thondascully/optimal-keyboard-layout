/**
 * LayoutOptimizer - Simulated Annealing optimization progress.
 * Uses mock data until optimization backend is implemented.
 */

import { DemoModeIndicator, MetricCard, ProgressGauge } from '../../common';
import { mockLayoutOptimizer } from '../../../data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './LayoutOptimizer.css';

// Simple inline keyboard visualization for current best layout
function MiniKeyboard({ layout, label }) {
  const rows = [
    layout.slice(0, 10),
    layout.slice(10, 19),
    layout.slice(19, 26),
  ];

  return (
    <div className="mini-keyboard">
      <div className="keyboard-label">{label}</div>
      <div className="keyboard-rows">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="keyboard-row" style={{ marginLeft: rowIdx === 1 ? '15px' : rowIdx === 2 ? '35px' : '0' }}>
            {row.map((key, keyIdx) => (
              <div key={keyIdx} className="mini-key">{key}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutOptimizer() {
  const data = mockLayoutOptimizer;

  const progressPercent = (data.iteration / data.maxIterations) * 100;

  // Format iteration number for display
  const formatIteration = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  return (
    <div className="layout-optimizer">
      <DemoModeIndicator
        message="Demo Mode - Showing sample optimization run. Requires optimization backend."
      />

      {/* Optimization Status */}
      <div className="optimizer-status">
        <div className="status-left">
          <ProgressGauge
            value={progressPercent}
            size="large"
            label="Progress"
            valueFormatter={(v) => `${Math.round(v)}%`}
          />
          <div className="iteration-info">
            {formatIteration(data.iteration)} / {formatIteration(data.maxIterations)} iterations
          </div>
        </div>
        <div className="status-metrics">
          <MetricCard
            label="Current Cost"
            value={data.currentCost.toFixed(2)}
            variant="primary"
          />
          <MetricCard
            label="Best Cost"
            value={data.bestCost.toFixed(2)}
            variant="success"
          />
          <MetricCard
            label="Temperature"
            value={data.temperature.toFixed(4)}
            variant="default"
          />
          <MetricCard
            label="Acceptance Rate"
            value={`${(data.acceptanceRate * 100).toFixed(1)}%`}
            variant="default"
          />
        </div>
      </div>

      {/* Convergence Chart */}
      <div className="card">
        <h3>Cost Convergence</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.convergenceHistory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" />
              <XAxis
                dataKey="iteration"
                tickFormatter={formatIteration}
                label={{ value: 'Iteration', position: 'bottom', offset: 0 }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <YAxis
                label={{ value: 'Cost', angle: -90, position: 'insideLeft' }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)' }}
                formatter={(value) => [value.toFixed(3), 'Cost']}
                labelFormatter={(v) => `Iteration ${formatIteration(v)}`}
              />
              <ReferenceLine y={data.qwertyCost} stroke="#f44336" strokeDasharray="5 5" label={{ value: 'QWERTY', fill: '#f44336', position: 'right' }} />
              <Line type="monotone" dataKey="cost" stroke="#4A90E2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-note">
          Red dashed line = QWERTY baseline cost ({data.qwertyCost.toFixed(2)})
        </p>
      </div>

      {/* Current Best Layout */}
      <div className="card">
        <h3>Current Best Layout</h3>
        <div className="layout-display">
          <MiniKeyboard layout={data.currentBestLayout} label="Optimized" />
          <MiniKeyboard layout={data.qwertyLayout} label="QWERTY" />
        </div>
        <div className="improvement-summary">
          <span className="improvement-value">
            {((1 - data.bestCost / data.qwertyCost) * 100).toFixed(1)}% improvement
          </span>
          <span className="improvement-label">over QWERTY baseline</span>
        </div>
      </div>

      {/* SA Parameters */}
      <div className="card">
        <h3>Optimizer Parameters</h3>
        <div className="param-grid">
          {Object.entries(data.parameters).map(([key, value]) => (
            <div key={key} className="param-item">
              <span className="param-name">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="param-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Swaps */}
      <div className="card">
        <h3>Recent Key Swaps</h3>
        <div className="swap-list">
          {data.recentSwaps.map((swap, idx) => (
            <div key={idx} className={`swap-item ${swap.accepted ? 'accepted' : 'rejected'}`}>
              <span className="swap-keys">{swap.key1} ↔ {swap.key2}</span>
              <span className="swap-delta">Δ = {swap.delta > 0 ? '+' : ''}{swap.delta.toFixed(3)}</span>
              <span className="swap-status">{swap.accepted ? 'Accepted' : 'Rejected'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LayoutOptimizer;
