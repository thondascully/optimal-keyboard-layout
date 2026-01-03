/**
 * ModelTraining - PITF model training progress and monitoring.
 * Uses mock data until ML backend is implemented.
 */

import { DemoModeIndicator, MetricCard, ProgressGauge } from '../../common';
import { mockModelTraining } from '../../../data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './ModelTraining.css';

function ModelTraining() {
  const data = mockModelTraining;

  // Prepare loss curve data
  const lossData = data.trainingLoss.map((loss, i) => ({
    epoch: i + 1,
    training: loss,
    validation: data.validationLoss[i],
  }));

  const progressPercent = (data.currentEpoch / data.epochs) * 100;

  return (
    <div className="model-training">
      <DemoModeIndicator
        message="Demo Mode - Showing sample training progress. Requires ML backend."
      />

      {/* Training Status */}
      <div className="training-status">
        <div className="status-left">
          <ProgressGauge
            value={progressPercent}
            size="large"
            label="Training"
            valueFormatter={(v) => `${Math.round(v)}%`}
          />
          <div className="epoch-info">
            Epoch {data.currentEpoch} / {data.epochs}
          </div>
        </div>
        <div className="status-metrics">
          <MetricCard label="Current Loss" value={data.metrics.currentLoss.toFixed(4)} variant="primary" />
          <MetricCard label="Validation R²" value={data.metrics.validationR2.toFixed(2)} variant="success" />
          <MetricCard label="Spearman ρ" value={data.metrics.validationSpearman.toFixed(2)} variant="success" />
          <MetricCard label="MAE" value={`${data.metrics.mae}ms`} variant="default" />
        </div>
      </div>

      {/* Loss Curves */}
      <div className="card">
        <h3>Training Progress</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lossData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e0e0e0)" />
              <XAxis
                dataKey="epoch"
                label={{ value: 'Epoch', position: 'bottom', offset: 0 }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <YAxis
                label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
                tick={{ fill: 'var(--text-secondary, #666)' }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-primary, white)', border: '1px solid var(--border-color, #ddd)' }}
                formatter={(value) => [value.toFixed(4), '']}
              />
              <Legend />
              <Line type="monotone" dataKey="training" stroke="#4A90E2" strokeWidth={2} dot={false} name="Training Loss" />
              <Line type="monotone" dataKey="validation" stroke="#FF9800" strokeWidth={2} dot={false} name="Validation Loss" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="convergence-status">
          Status: <strong>{data.convergenceStatus}</strong> • Est. time remaining: {data.estimatedTimeRemaining}
        </p>
      </div>

      {/* Hyperparameters */}
      <div className="card">
        <h3>Hyperparameters</h3>
        <div className="hyperparam-grid">
          {Object.entries(data.hyperparameters).map(([key, value]) => (
            <div key={key} className="hyperparam-item">
              <span className="param-name">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="param-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Finger Agility */}
      <div className="card">
        <h3>Learned Finger Agility</h3>
        <p className="section-desc">
          Relative speed coefficients learned from your typing data.
        </p>
        <div className="agility-grid">
          {data.fingerAgility.map((f, idx) => (
            <div key={idx} className="agility-item">
              <span className="finger-name">{f.finger.replace(/_/g, ' ')}</span>
              <div className="agility-bars">
                <div className="agility-bar">
                  <span className="bar-label">Launch</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${f.launch * 100}%` }}></div>
                  </div>
                  <span className="bar-value">{(f.launch * 100).toFixed(0)}%</span>
                </div>
                <div className="agility-bar">
                  <span className="bar-label">Land</span>
                  <div className="bar-track">
                    <div className="bar-fill land" style={{ width: `${f.landing * 100}%` }}></div>
                  </div>
                  <span className="bar-value">{(f.landing * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModelTraining;
