/**
 * Deviation Tab - Displays finger deviation analysis.
 *
 * Shows words where the user typed overwritable letters (e, b, u, i, y)
 * with a different finger than expected, highlighting the deviated letters.
 */

import { useState } from 'react';
import { useDeviation } from '../../hooks/useDeviation';
import './DeviationTab.css';

// Finger display names
const FINGER_NAMES = {
  'left_pinky': 'Left Pinky',
  'left_ring': 'Left Ring',
  'left_middle': 'Left Middle',
  'left_index': 'Left Index',
  'right_index': 'Right Index',
  'right_middle': 'Right Middle',
  'right_ring': 'Right Ring',
  'right_pinky': 'Right Pinky',
  'right_thumb': 'Right Thumb',
};

// Short finger labels
const FINGER_LABELS = {
  'left_pinky': 'L.Pk',
  'left_ring': 'L.Rg',
  'left_middle': 'L.Md',
  'left_index': 'L.Ix',
  'right_index': 'R.Ix',
  'right_middle': 'R.Md',
  'right_ring': 'R.Rg',
  'right_pinky': 'R.Pk',
  'right_thumb': 'R.Th',
};

function DeviationTab() {
  const { deviations, patterns, loading, error, fetchDeviations, summary, words, totalDeviations, overwritableLetters } = useDeviation();
  const [activeView, setActiveView] = useState('summary'); // 'summary', 'words', 'patterns'

  if (loading) {
    return (
      <div className="deviation-tab">
        <div className="card">
          <p>Loading deviation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deviation-tab">
        <div className="card">
          <p className="error">Error: {error}</p>
          <button onClick={() => fetchDeviations()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!deviations) {
    return (
      <div className="deviation-tab">
        <div className="card">
          <p>No deviation data available.</p>
          <button onClick={() => fetchDeviations()}>Load Deviations</button>
        </div>
      </div>
    );
  }

  const getDeviationRateClass = (rate) => {
    if (rate >= 50) return 'rate-high';
    if (rate >= 25) return 'rate-medium';
    if (rate >= 10) return 'rate-low';
    return 'rate-minimal';
  };

  return (
    <div className="deviation-tab">
      {/* Header with total stats */}
      <div className="card deviation-header">
        <h3>Finger Deviation Analysis</h3>
        <p className="deviation-subtitle">
          Tracks when you type the dynamic letters (<strong>{overwritableLetters.join(', ')}</strong>) with a different finger than expected.
          This reveals your typing adaptations and habits.
        </p>
        <div className="deviation-total">
          <span className="total-count">{totalDeviations}</span>
          <span className="total-label">total deviations detected</span>
        </div>
      </div>

      {/* View toggle */}
      <div className="view-toggle">
        <button
          className={activeView === 'summary' ? 'active' : ''}
          onClick={() => setActiveView('summary')}
        >
          By Letter
        </button>
        <button
          className={activeView === 'words' ? 'active' : ''}
          onClick={() => setActiveView('words')}
        >
          By Word
        </button>
        <button
          className={activeView === 'patterns' ? 'active' : ''}
          onClick={() => setActiveView('patterns')}
        >
          Patterns
        </button>
      </div>

      {/* Summary view - by letter */}
      {activeView === 'summary' && (
        <div className="card deviation-summary">
          <h4>Deviation Rate by Letter</h4>
          <div className="letter-grid">
            {summary.map((item) => (
              <div key={item.letter} className="letter-card">
                <div className="letter-header">
                  <span className="letter">{item.letter.toUpperCase()}</span>
                  <span className={`deviation-rate ${getDeviationRateClass(item.deviation_rate)}`}>
                    {item.deviation_rate}%
                  </span>
                </div>
                <div className="letter-stats">
                  <div className="stat-row">
                    <span className="stat-label">Expected:</span>
                    <span className="stat-value">{FINGER_NAMES[item.expected_finger]}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Total typed:</span>
                    <span className="stat-value">{item.total}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Deviated:</span>
                    <span className="stat-value deviated">{item.deviated}</span>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar ${getDeviationRateClass(item.deviation_rate)}`}
                    style={{ width: `${item.deviation_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Words view */}
      {activeView === 'words' && (
        <div className="card deviation-words">
          <h4>Words with Deviations</h4>
          <p className="words-subtitle">
            Words where you typed a dynamic letter with a different finger.
            <span className="highlight-legend"> Highlighted </span> letters are the ones that deviated.
          </p>
          <div className="words-grid">
            {words.map((item, idx) => (
              <div key={idx} className="word-card">
                {/* Expected vs Used header */}
                {item.deviation_details && Object.keys(item.deviation_details).length > 0 && (
                  <div className="deviation-finger-info">
                    {Object.entries(item.deviation_details).map(([letter, info]) => (
                      <div key={letter} className="finger-comparison">
                        <span className="comparison-letter">{letter.toUpperCase()}:</span>
                        <span className="comparison-expected">{FINGER_LABELS[info.expected] || info.expected}</span>
                        <span className="comparison-arrow">→</span>
                        <span className="comparison-actual">{FINGER_LABELS[info.actual] || info.actual}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="word-display">
                  {item.highlighted.map((char, charIdx) => (
                    <span
                      key={charIdx}
                      className={char.deviated ? 'char-deviated' : 'char-normal'}
                    >
                      {char.char}
                    </span>
                  ))}
                </div>
                <div className="word-meta">
                  <span className="word-count">{item.count}x</span>
                </div>
              </div>
            ))}
          </div>
          {words.length === 0 && (
            <p className="no-data">No word deviations found yet. Keep typing!</p>
          )}
        </div>
      )}

      {/* Patterns view */}
      {activeView === 'patterns' && patterns && (
        <div className="card deviation-patterns">
          <h4>Deviation Patterns</h4>
          <p className="patterns-subtitle">
            Shows which previous key triggers you to use a different finger.
            This reveals context-dependent typing habits.
          </p>
          <div className="patterns-table">
            <div className="patterns-header">
              <span className="col-context">Context</span>
              <span className="col-expected">Expected</span>
              <span className="col-actual">Actual Usage</span>
              <span className="col-count">Count</span>
            </div>
            {patterns.patterns.slice(0, 30).map((pattern, idx) => (
              <div key={idx} className="pattern-row">
                <span className="col-context">
                  <span className="prev-key">{pattern.prev_key === 'START' ? 'START' : pattern.prev_key}</span>
                  <span className="arrow">→</span>
                  <span className="target-key">{pattern.letter.toUpperCase()}</span>
                </span>
                <span className="col-expected">
                  {FINGER_LABELS[pattern.expected_finger]}
                </span>
                <span className="col-actual">
                  {Object.entries(pattern.finger_counts).map(([finger, count]) => (
                    <span
                      key={finger}
                      className={`finger-badge ${finger === pattern.expected_finger ? 'expected' : 'deviated'}`}
                    >
                      {FINGER_LABELS[finger]}: {count}
                    </span>
                  ))}
                </span>
                <span className="col-count">{pattern.total}</span>
              </div>
            ))}
          </div>
          {patterns.patterns.length === 0 && (
            <p className="no-data">No patterns detected yet. Keep typing!</p>
          )}
        </div>
      )}

      {/* Refresh button */}
      <div className="card refresh-section">
        <button className="refresh-button" onClick={() => fetchDeviations()}>
          Refresh Data
        </button>
      </div>
    </div>
  );
}

export default DeviationTab;
