/**
 * Week0Validation - Validation gate before PITF model training.
 * Shows RF baseline tests and coverage validation.
 * Uses mock data until backend ML is implemented.
 */

import { DemoModeIndicator, MetricCard, ProgressGauge } from '../../common';
import { mockWeek0Validation } from '../../../data/mockData';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import './Week0Validation.css';

function Week0Validation() {
  const data = mockWeek0Validation;

  const getStatusColor = (result) => {
    if (result === 'pass') return '#4caf50';
    if (result === 'warning') return '#ff9800';
    return '#f44336';
  };

  const getStatusIcon = (result) => {
    if (result === 'pass') return '✓';
    if (result === 'warning') return '⚠';
    return '✗';
  };

  return (
    <div className="week0-validation">
      <DemoModeIndicator
        message="Demo Mode - Showing sample validation results. Requires ML backend."
      />

      {/* Overall Status */}
      <div className={`validation-status status-${data.overall}`}>
        <div className="status-indicator">
          {data.overall === 'go' ? '✓ GO' : '✗ NO-GO'}
        </div>
        <div className="status-message">
          {data.overall === 'go'
            ? 'All validation tests passed. Ready to proceed with PITF model training.'
            : 'Some validation tests failed. Address issues before proceeding.'}
        </div>
      </div>

      {/* Test Results */}
      <div className="card">
        <h3>Validation Tests</h3>
        <div className="test-results">
          {data.tests.map((test) => (
            <div key={test.id} className={`test-card result-${test.result}`}>
              <div className="test-header">
                <span className="test-icon" style={{ color: getStatusColor(test.result) }}>
                  {getStatusIcon(test.result)}
                </span>
                <span className="test-name">{test.name}</span>
                <span className="test-badge" style={{ background: getStatusColor(test.result) }}>
                  {test.result.toUpperCase()}
                </span>
              </div>
              <p className="test-desc">{test.description}</p>
              <div className="test-metrics">
                {test.spearman !== undefined && (
                  <div className="test-metric">
                    <span className="metric-label">Spearman ρ:</span>
                    <span className="metric-value">{test.spearman.toFixed(2)}</span>
                    <span className="metric-threshold">(threshold: {test.threshold})</span>
                  </div>
                )}
                {test.r2 !== undefined && (
                  <div className="test-metric">
                    <span className="metric-label">R²:</span>
                    <span className="metric-value">{test.r2.toFixed(2)}</span>
                  </div>
                )}
                {test.current !== undefined && (
                  <div className="test-metric">
                    <span className="metric-label">Coverage:</span>
                    <span className="metric-value">{test.current} / {test.target}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predicted vs Actual */}
      <div className="card">
        <h3>Predicted vs Actual (RF Baseline)</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" />
              <XAxis
                dataKey="actual"
                name="Actual"
                type="number"
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: 'Actual Time (ms)', position: 'bottom', offset: 20 }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <YAxis
                dataKey="predicted"
                name="Predicted"
                type="number"
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: 'Predicted Time (ms)', angle: -90, position: 'insideLeft' }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)' }}
                formatter={(value) => [`${value}ms`]}
              />
              <Scatter
                data={data.predictions}
                fill="var(--accent-color, #4A90E2)"
                opacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-caption">
          Points close to the diagonal line indicate accurate predictions.
          Spearman ρ = {data.tests[0].spearman.toFixed(2)}
        </p>
      </div>

      {/* Feature Importance */}
      <div className="card">
        <h3>Feature Importance (Random Forest)</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={data.featureImportance}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 0.4]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <YAxis
                dataKey="feature"
                type="category"
                tick={{ fill: 'var(--text-secondary, #666)', fontSize: 12 }}
                width={100}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)' }}
                formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'Importance']}
              />
              <Bar dataKey="importance" fill="var(--accent-color, #4A90E2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-caption">
          Euclidean distance and same-finger are the strongest predictors of transition time.
        </p>
      </div>

      {/* Decision Matrix */}
      <div className="card">
        <h3>Decision Matrix</h3>
        <div className="decision-matrix">
          <div className="matrix-header">
            <span>Test</span>
            <span>Result</span>
            <span>Threshold</span>
            <span>Status</span>
          </div>
          {data.tests.map((test) => (
            <div key={test.id} className="matrix-row">
              <span>{test.name}</span>
              <span>
                {test.spearman !== undefined ? test.spearman.toFixed(2) : `${test.current}/${test.target}`}
              </span>
              <span>
                {test.threshold !== undefined ? `> ${test.threshold}` : `${test.target}/${test.target}`}
              </span>
              <span className={`status-badge status-${test.result}`}>
                {test.result.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Week0Validation;
