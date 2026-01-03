/**
 * DataQuality - Merged tab for outlier management, annotations, and deviations.
 * Combines functionality from DataViewerTab and DeviationTab.
 */

import { useState, useEffect } from 'react';
import { useDeviation } from '../../../hooks';
import { MetricCard, ProgressGauge } from '../../common';
import './DataQuality.css';

// Finger labels
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

function DataQuality() {
  const { deviations, patterns, loading, error, summary, words, totalDeviations } = useDeviation();
  const [activeSection, setActiveSection] = useState('overview');
  const [keystrokesData, setKeystrokesData] = useState(null);
  const [loadingKeystrokes, setLoadingKeystrokes] = useState(false);

  // Load keystrokes data on demand
  const loadKeystrokesData = async () => {
    setLoadingKeystrokes(true);
    try {
      const response = await fetch('/api/keystrokes/data?limit=5000');
      if (response.ok) {
        const data = await response.json();
        setKeystrokesData(data);
      }
    } catch (err) {
      console.error('Failed to load keystrokes:', err);
    } finally {
      setLoadingKeystrokes(false);
    }
  };

  // Calculate quality metrics
  const annotationRate = keystrokesData
    ? ((keystrokesData.keystrokes?.filter(k => k.finger).length || 0) / (keystrokesData.keystrokes?.length || 1)) * 100
    : null;

  const deviationRate = summary?.total_keystrokes
    ? (totalDeviations / summary.total_keystrokes) * 100
    : 0;

  // Quality score (0-100)
  const qualityScore = Math.round(
    100 - (deviationRate * 2) // Lower deviation rate = higher quality
  );

  if (loading) {
    return (
      <div className="data-quality">
        <div className="card">
          <p>Loading quality data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-quality">
      {/* Section Toggle */}
      <div className="section-toggle">
        <button
          className={activeSection === 'overview' ? 'active' : ''}
          onClick={() => setActiveSection('overview')}
        >
          Overview
        </button>
        <button
          className={activeSection === 'deviations' ? 'active' : ''}
          onClick={() => setActiveSection('deviations')}
        >
          Finger Deviations
        </button>
        <button
          className={activeSection === 'keystrokes' ? 'active' : ''}
          onClick={() => {
            setActiveSection('keystrokes');
            if (!keystrokesData) loadKeystrokesData();
          }}
        >
          Keystroke Data
        </button>
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <>
          <div className="quality-hero">
            <div className="quality-gauge">
              <ProgressGauge
                value={qualityScore}
                size="large"
                label="Quality Score"
              />
            </div>
            <div className="quality-metrics">
              <MetricCard
                label="Total Keystrokes"
                value={(summary?.total_keystrokes || 0).toLocaleString()}
                variant="default"
              />
              <MetricCard
                label="Deviation Rate"
                value={`${deviationRate.toFixed(1)}%`}
                variant={deviationRate < 5 ? 'success' : deviationRate < 15 ? 'warning' : 'error'}
              />
              <MetricCard
                label="Total Deviations"
                value={totalDeviations || 0}
                variant={totalDeviations === 0 ? 'success' : 'warning'}
              />
            </div>
          </div>

          {/* Deviation Summary by Letter */}
          {summary?.by_letter && Object.keys(summary.by_letter).length > 0 && (
            <div className="card">
              <h3>Deviation Summary by Letter</h3>
              <div className="letter-summary">
                {Object.entries(summary.by_letter).map(([letter, data]) => (
                  <div key={letter} className="letter-stat">
                    <span className="letter-key">{letter.toUpperCase()}</span>
                    <div className="letter-details">
                      <span className="letter-count">{data.deviations} / {data.total}</span>
                      <span className="letter-rate">({data.rate}%)</span>
                    </div>
                    <div className="letter-bar">
                      <div
                        className="letter-bar-fill"
                        style={{ width: `${data.rate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Tips */}
          <div className="card quality-tips">
            <h3>Data Quality Tips</h3>
            <ul>
              <li>
                <strong>Consistent finger usage:</strong> Try to use the same finger for each key consistently.
              </li>
              <li>
                <strong>Avoid outliers:</strong> Very fast or slow keystrokes may indicate typos or distractions.
              </li>
              <li>
                <strong>Complete annotations:</strong> Ensure all keystrokes have finger/hand data.
              </li>
              <li>
                <strong>Use appropriate modes:</strong> Trigraph Test mode is best for coverage.
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Deviations Section */}
      {activeSection === 'deviations' && (
        <>
          {words && words.length > 0 ? (
            <div className="card">
              <h3>Words with Finger Deviations</h3>
              <p className="section-desc">
                These words contain letters where you used a different finger than expected.
              </p>
              <div className="deviation-words">
                {words.slice(0, 20).map((item, idx) => (
                  <div key={idx} className="deviation-word-card">
                    <div className="word-header">
                      <span className="word-text">
                        {item.word.split('').map((char, charIdx) => (
                          <span
                            key={charIdx}
                            className={item.deviation_positions?.includes(charIdx) ? 'deviated' : ''}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                      <span className="deviation-count">{item.deviation_count}x</span>
                    </div>
                    {item.deviation_details && Object.keys(item.deviation_details).length > 0 && (
                      <div className="deviation-details">
                        {Object.entries(item.deviation_details).map(([letter, info]) => (
                          <div key={letter} className="detail-row">
                            <span className="detail-letter">{letter.toUpperCase()}:</span>
                            <span className="detail-expected">{FINGER_LABELS[info.expected] || info.expected}</span>
                            <span className="detail-arrow">→</span>
                            <span className="detail-actual">{FINGER_LABELS[info.actual] || info.actual}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {words.length > 20 && (
                <p className="more-items">...and {words.length - 20} more words</p>
              )}
            </div>
          ) : (
            <div className="card empty-state">
              <p>No finger deviations detected. Great job!</p>
            </div>
          )}

          {/* Deviation Patterns */}
          {patterns && patterns.length > 0 && (
            <div className="card">
              <h3>Deviation Patterns</h3>
              <p className="section-desc">
                Common patterns in finger deviations by previous key context.
              </p>
              <div className="pattern-table">
                <div className="pattern-header">
                  <span>Previous Key</span>
                  <span>Deviation Count</span>
                  <span>Common Letters</span>
                </div>
                {patterns.slice(0, 10).map((pattern, idx) => (
                  <div key={idx} className="pattern-row">
                    <span className="pattern-key">{pattern.prev_key || '(start)'}</span>
                    <span className="pattern-count">{pattern.count}</span>
                    <span className="pattern-letters">{pattern.common_letters?.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Keystrokes Section */}
      {activeSection === 'keystrokes' && (
        <>
          {loadingKeystrokes ? (
            <div className="card">
              <p>Loading keystroke data...</p>
            </div>
          ) : keystrokesData ? (
            <>
              <div className="card">
                <h3>Keystroke Statistics</h3>
                <div className="keystroke-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Keystrokes:</span>
                    <span className="stat-value">{keystrokesData.keystrokes?.length || 0}</span>
                  </div>
                  {keystrokesData.by_finger && (
                    <div className="finger-breakdown">
                      <h4>By Finger</h4>
                      <div className="finger-bars">
                        {Object.entries(keystrokesData.by_finger).map(([finger, count]) => (
                          <div key={finger} className="finger-bar-item">
                            <span className="finger-label">{FINGER_LABELS[finger] || finger}</span>
                            <div className="finger-bar">
                              <div
                                className="finger-bar-fill"
                                style={{
                                  width: `${(count / (keystrokesData.keystrokes?.length || 1)) * 100}%`
                                }}
                              ></div>
                            </div>
                            <span className="finger-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {keystrokesData.by_key && (
                <div className="card">
                  <h3>Most Common Keys</h3>
                  <div className="key-grid">
                    {Object.entries(keystrokesData.by_key)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 20)
                      .map(([key, count]) => (
                        <div key={key} className="key-item">
                          <span className="key-char">{key === ' ' ? 'SPACE' : key}</span>
                          <span className="key-count">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <p>Click "Keystroke Data" tab to load data.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataQuality;
