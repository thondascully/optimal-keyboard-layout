/**
 * Deviation Tab - Actionable finger deviation analysis.
 */

import { useState } from 'react';
import { useDeviation } from '../../hooks/useDeviation';
import './DeviationTab.css';

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
  const [activeView, setActiveView] = useState('insights');

  if (loading) {
    return (
      <div className="deviation-tab">
        <div className="card"><p>Loading deviation data...</p></div>
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

  const getDeviationSeverity = (rate) => {
    if (rate >= 50) return { class: 'high', label: 'High', desc: 'Consider reassigning' };
    if (rate >= 25) return { class: 'medium', label: 'Medium', desc: 'Worth noting' };
    if (rate >= 10) return { class: 'low', label: 'Low', desc: 'Minor adaptation' };
    return { class: 'minimal', label: 'Minimal', desc: 'Consistent typing' };
  };

  // Find most significant deviations for insights
  const sortedSummary = [...(summary || [])].sort((a, b) => b.deviation_rate - a.deviation_rate);
  const significantDeviations = sortedSummary.filter(s => s.deviation_rate >= 10);
  const topDeviation = sortedSummary[0];

  // Find most common deviation pattern
  const topPattern = patterns?.patterns?.[0];

  return (
    <div className="deviation-tab">
      {/* Quick Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value">{totalDeviations || 0}</div>
          <div className="stat-label">Deviations</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(overwritableLetters || []).length}</div>
          <div className="stat-label">Dynamic Keys</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{significantDeviations.length}</div>
          <div className="stat-label">Need Review</div>
        </div>
        <div className={`stat-box ${topDeviation?.deviation_rate >= 25 ? 'alert' : ''}`}>
          <div className="stat-value">{topDeviation?.deviation_rate || 0}%</div>
          <div className="stat-label">Highest Rate</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button className={activeView === 'insights' ? 'active' : ''} onClick={() => setActiveView('insights')}>
          Insights
        </button>
        <button className={activeView === 'letters' ? 'active' : ''} onClick={() => setActiveView('letters')}>
          By Letter
        </button>
        <button className={activeView === 'patterns' ? 'active' : ''} onClick={() => setActiveView('patterns')}>
          Patterns
        </button>
        <button className={activeView === 'words' ? 'active' : ''} onClick={() => setActiveView('words')}>
          Words
        </button>
      </div>

      {/* Insights View - Actionable */}
      {activeView === 'insights' && (
        <div className="insights-section">
          <div className="what-this-means">
            <h4>What This Data Means</h4>
            <p>
              Deviations occur when you type certain letters ({(overwritableLetters || []).join(', ')}) with a finger
              different from what QWERTY expects. These letters are "dynamic" - their optimal finger assignment
              may vary based on surrounding keys.
            </p>
          </div>

          {significantDeviations.length > 0 ? (
            <div className="action-cards">
              <div className="action-card">
                <div className="action-header">
                  <h4>Key Findings</h4>
                </div>
                <div className="findings-list">
                  {significantDeviations.slice(0, 3).map((item) => {
                    const severity = getDeviationSeverity(item.deviation_rate);
                    return (
                      <div key={item.letter} className={`finding-item severity-${severity.class}`}>
                        <div className="finding-letter">{item.letter.toUpperCase()}</div>
                        <div className="finding-details">
                          <div className="finding-main">
                            <strong>{item.deviation_rate}%</strong> deviation rate ({item.deviated}/{item.total})
                          </div>
                          <div className="finding-context">
                            Expected: {FINGER_LABELS[item.expected_finger]} |
                            Status: {severity.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="action-card recommendation">
                <div className="action-header">
                  <h4>What To Do</h4>
                </div>
                <div className="recommendations">
                  {topDeviation && topDeviation.deviation_rate >= 25 && (
                    <div className="rec-item">
                      <span className="rec-num">1</span>
                      <div className="rec-content">
                        <strong>Consider reassigning '{topDeviation.letter.toUpperCase()}'</strong>
                        <span>Your {topDeviation.deviation_rate}% deviation rate suggests this key might work better with a different finger</span>
                      </div>
                    </div>
                  )}
                  <div className="rec-item">
                    <span className="rec-num">{topDeviation?.deviation_rate >= 25 ? '2' : '1'}</span>
                    <div className="rec-content">
                      <strong>Collect more data</strong>
                      <span>More typing samples will reveal consistent patterns vs random variations</span>
                    </div>
                  </div>
                  <div className="rec-item">
                    <span className="rec-num">{topDeviation?.deviation_rate >= 25 ? '3' : '2'}</span>
                    <div className="rec-content">
                      <strong>Check Patterns tab</strong>
                      <span>See which previous keys trigger different finger usage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-issues">
              <span className="check-icon">OK</span>
              <h4>Consistent Typing Detected</h4>
              <p>Your finger usage is consistent with expected assignments. No significant deviations to report.</p>
            </div>
          )}

          {topPattern && (
            <div className="top-pattern-card">
              <h4>Most Common Pattern</h4>
              <div className="pattern-display">
                <span className="prev-key">{topPattern.prev_key === 'START' ? '[start]' : topPattern.prev_key}</span>
                <span className="arrow">then</span>
                <span className="target-key">{topPattern.letter.toUpperCase()}</span>
              </div>
              <p className="pattern-explanation">
                After typing '{topPattern.prev_key === 'START' ? 'nothing' : topPattern.prev_key}',
                you type '{topPattern.letter}' with {
                  Object.entries(topPattern.finger_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([f, c]) => `${FINGER_LABELS[f]} (${c}x)`)
                    .join(', ')
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Letters View */}
      {activeView === 'letters' && (
        <div className="letters-section">
          <h4>Deviation by Letter</h4>
          <div className="letters-grid">
            {sortedSummary.map((item) => {
              const severity = getDeviationSeverity(item.deviation_rate);
              return (
                <div key={item.letter} className={`letter-card severity-${severity.class}`}>
                  <div className="letter-main">
                    <span className="letter">{item.letter.toUpperCase()}</span>
                    <span className="rate">{item.deviation_rate}%</span>
                  </div>
                  <div className="letter-detail">
                    <span>{item.deviated} of {item.total} deviated</span>
                  </div>
                  <div className="letter-expected">
                    Expected: {FINGER_LABELS[item.expected_finger]}
                  </div>
                  <div className="letter-bar">
                    <div className="bar-fill" style={{ width: `${item.deviation_rate}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Patterns View */}
      {activeView === 'patterns' && patterns && (
        <div className="patterns-section">
          <h4>Context-Dependent Patterns</h4>
          <p className="section-desc">
            Shows how your finger choice changes based on the previous key typed.
          </p>
          {patterns.patterns.length > 0 ? (
            <div className="patterns-list">
              {patterns.patterns.slice(0, 20).map((pattern, idx) => (
                <div key={idx} className="pattern-row">
                  <div className="pattern-context">
                    <span className="ctx-prev">{pattern.prev_key === 'START' ? '[start]' : pattern.prev_key}</span>
                    <span className="ctx-arrow">-&gt;</span>
                    <span className="ctx-target">{pattern.letter.toUpperCase()}</span>
                  </div>
                  <div className="pattern-expected">
                    <span className="label">Expected:</span>
                    <span className="value">{FINGER_LABELS[pattern.expected_finger]}</span>
                  </div>
                  <div className="pattern-actual">
                    {Object.entries(pattern.finger_counts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([finger, count]) => (
                        <span
                          key={finger}
                          className={`finger-chip ${finger === pattern.expected_finger ? 'expected' : 'deviated'}`}
                        >
                          {FINGER_LABELS[finger]}: {count}
                        </span>
                      ))}
                  </div>
                  <div className="pattern-total">{pattern.total}x</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No patterns detected yet.</p>
          )}
        </div>
      )}

      {/* Words View */}
      {activeView === 'words' && (
        <div className="words-section">
          <h4>Words with Deviations</h4>
          <p className="section-desc">
            Highlighted letters show where you used a different finger than expected.
          </p>
          {words.length > 0 ? (
            <div className="words-grid">
              {words.slice(0, 30).map((item, idx) => (
                <div key={idx} className="word-card">
                  <div className="word-text">
                    {item.highlighted.map((char, charIdx) => (
                      <span key={charIdx} className={char.deviated ? 'deviated' : ''}>
                        {char.char}
                      </span>
                    ))}
                  </div>
                  <div className="word-meta">
                    <span className="word-count">{item.count}x</span>
                    {item.deviation_details && Object.entries(item.deviation_details).slice(0, 2).map(([letter, info]) => (
                      <span key={letter} className="word-deviation">
                        {letter}: {FINGER_LABELS[info.expected]} -&gt; {FINGER_LABELS[info.actual]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No word deviations found yet.</p>
          )}
        </div>
      )}

      {/* Refresh */}
      <div className="refresh-section">
        <button className="refresh-btn" onClick={() => fetchDeviations()}>Refresh Data</button>
      </div>
    </div>
  );
}

export default DeviationTab;
