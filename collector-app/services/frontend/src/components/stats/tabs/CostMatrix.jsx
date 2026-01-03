/**
 * CostMatrix - 26x26 bigram cost predictions.
 * Uses mock data until ML backend is implemented.
 */

import { useState } from 'react';
import { DemoModeIndicator, MetricCard, DataMatrix } from '../../common';
import { mockCostMatrix } from '../../../data/mockData';
import './CostMatrix.css';

const COST_COLOR_SCALE = [
  { threshold: 0, color: '#4caf50' },    // Fast - green
  { threshold: 25, color: '#8bc34a' },
  { threshold: 50, color: '#ffeb3b' },
  { threshold: 75, color: '#ff9800' },
  { threshold: 90, color: '#f44336' },   // Slow - red
];

function CostMatrix() {
  const data = mockCostMatrix;
  const [selectedCell, setSelectedCell] = useState(null);

  const handleCellClick = (cellInfo) => {
    const from = data.letters[cellInfo.row];
    const to = data.letters[cellInfo.col];
    setSelectedCell({
      bigram: `${from}${to}`,
      cost: cellInfo.value,
      from,
      to,
    });
  };

  return (
    <div className="cost-matrix-tab">
      <DemoModeIndicator
        message="Demo Mode - Showing sample cost predictions. Requires trained PITF model."
      />

      {/* Stats Summary */}
      <div className="cost-stats">
        <MetricCard
          label="Fastest Bigram"
          value={`${data.topCheapBigrams[0].bigram}`}
          detail={`${data.topCheapBigrams[0].cost}ms`}
          variant="success"
        />
        <MetricCard
          label="Slowest Bigram"
          value={`${data.topExpensiveBigrams[0].bigram}`}
          detail={`${data.topExpensiveBigrams[0].cost}ms`}
          variant="error"
        />
        <MetricCard
          label="Average Cost"
          value={`${data.statistics.avgCost}ms`}
          variant="primary"
        />
        <MetricCard
          label="QWERTY WPM"
          value={data.qwertyBaseline.predictedWpm}
          detail={`Error: ${data.qwertyBaseline.errorPercent}%`}
          variant="default"
        />
      </div>

      {/* Cost Matrix */}
      <div className="card">
        <DataMatrix
          data={data.matrix}
          rowLabels={data.letters}
          colLabels={data.letters}
          colorScale={COST_COLOR_SCALE}
          minValue={data.statistics.minCost}
          maxValue={data.statistics.maxCost}
          cellFormatter={(v) => v ? Math.round(v) : '-'}
          onCellClick={handleCellClick}
          title="Bigram Cost Matrix (26×26)"
          subtitle="Rows = first letter, Columns = second letter. Color: Green = fast, Red = slow."
          size="small"
        />
      </div>

      {/* Selected Cell Detail */}
      {selectedCell && (
        <div className="card selected-detail">
          <h3>Selected: "{selectedCell.bigram}"</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Predicted Cost:</span>
              <span className="detail-value">{selectedCell.cost}ms</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">First Key:</span>
              <span className="detail-value">{selectedCell.from}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Second Key:</span>
              <span className="detail-value">{selectedCell.to}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top/Bottom Bigrams */}
      <div className="bigram-lists">
        <div className="card">
          <h3>Fastest Bigrams</h3>
          <div className="bigram-list">
            {data.topCheapBigrams.map((bg, idx) => (
              <div key={idx} className="bigram-item fast">
                <span className="bigram-text">{bg.bigram}</span>
                <span className="bigram-cost">{bg.cost}ms</span>
                <span className="bigram-freq">{(bg.frequency * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Slowest Bigrams</h3>
          <div className="bigram-list">
            {data.topExpensiveBigrams.map((bg, idx) => (
              <div key={idx} className="bigram-item slow">
                <span className="bigram-text">{bg.bigram}</span>
                <span className="bigram-cost">{bg.cost}ms</span>
                <span className="bigram-freq">{(bg.frequency * 100).toFixed(3)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sanity Checks */}
      <div className="card">
        <h3>Sanity Checks</h3>
        <div className="sanity-checks">
          {Object.entries(data.sanityChecks).map(([key, check]) => (
            <div key={key} className={`check-item ${check.passed ? 'pass' : 'fail'}`}>
              <span className="check-icon">{check.passed ? '✓' : '✗'}</span>
              <span className="check-name">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="check-status">{check.passed ? 'PASS' : 'FAIL'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CostMatrix;
