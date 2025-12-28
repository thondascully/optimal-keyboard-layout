import { useState, useEffect } from 'react'
import './ModeSelector.css'

const MODES = [
  { 
    id: 'top200', 
    label: 'Top 200', 
  },
  { 
    id: 'trigraphs', 
    label: 'Trigraphs'
  },
  { 
    id: 'nonsense', 
    label: 'Nonsense'
  },
  { 
    id: 'calibration', 
    label: 'Calibration'
  },
  { 
    id: 'trigraph_test', 
    label: 'Trigraph Test'
  },
]

const MODE_INFO = {
  top200: {
    description: 'Most common English words',
    whenToUse: 'Use this for general typing practice and building muscle memory for common words.',
    dataNeed: 'Good for baseline data, but you need other modes for comprehensive analysis.',
    recommendation: 'Use regularly, but also collect data from other modes for complete coverage.'
  },
  trigraphs: {
    description: 'Three-letter patterns',
    whenToUse: 'Use when you need data on specific letter combinations (trigraphs) that may be rare in common words.',
    dataNeed: 'Essential for analyzing three-letter transition patterns that don\'t appear frequently in normal text.',
    recommendation: 'Use periodically to fill gaps in trigraph data.'
  },
  nonsense: {
    description: 'Pronounceable nonsense words',
    whenToUse: 'Use to break muscle memory patterns and test pure biomechanical performance without word familiarity bias.',
    dataNeed: 'Important for unbiased biomechanical data, as it removes the advantage of knowing the word.',
    recommendation: 'Use when you have enough top200 data to compare against.'
  },
  calibration: {
    description: 'Random sequences',
    whenToUse: 'Use for pure biomechanical calibration data with no linguistic patterns.',
    dataNeed: 'Critical for understanding raw finger movement patterns without any word context.',
    recommendation: 'Use occasionally to establish baseline biomechanical performance.'
  },
  trigraph_test: {
    description: 'One trigraph at a time with test and real runs',
    whenToUse: 'Use to test specific trigraph performance with preparation time. Shows one trigraph, gives you a practice run, then records a real run.',
    dataNeed: 'Useful for testing how preparation affects typing speed on specific letter combinations.',
    recommendation: 'Use to identify fast vs slow trigraphs and understand biomechanical differences.'
  }
}

function ModeSelector({ mode, onModeChange }) {
  const [stats, setStats] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err))
  }, [])

  const getModeDataCount = (modeId) => {
    if (!stats?.sessions_by_mode) return 0
    return stats.sessions_by_mode[modeId] || 0
  }

  const getDataGuidance = () => {
    if (!stats) return null
    
    const modeCounts = MODES.map(m => ({
      mode: m.id,
      count: getModeDataCount(m.id)
    }))
    
    const maxCount = Math.max(...modeCounts.map(m => m.count))
    const minCount = Math.min(...modeCounts.map(m => m.count))
    
    const needsData = modeCounts.filter(m => m.count < maxCount * 0.3 || m.count === 0)
    
    return {
      needsData,
      recommendation: needsData.length > 0 
        ? `Consider collecting more data for: ${needsData.map(m => MODES.find(mm => mm.id === m.mode)?.label).join(', ')}`
        : 'You have good data coverage across all modes!'
    }
  }

  const guidance = getDataGuidance()

  return (
    <div className="mode-selector-compact">
      {MODES.map(m => (
        <button
          key={m.id}
          className={`mode-button-compact ${mode === m.id ? 'active' : ''}`}
          onClick={() => onModeChange(m.id)}
          title={MODE_INFO[m.id].description}
        >
          {m.label}
            <span className="mode-count">{getModeDataCount(m.id)}</span>
        </button>
      ))}
      {showInfo && (
        <div className="mode-info-panel">
          <div className="mode-info-header">
            <h4>Mode Guide</h4>
            <button onClick={() => setShowInfo(false)} className="close-info">×</button>
          </div>
          {guidance && (
            <div className="data-guidance">
              <strong>Data Coverage:</strong> {guidance.recommendation}
            </div>
          )}
          <div className="mode-info-list">
            {MODES.map(m => {
              const info = MODE_INFO[m.id]
              const count = getModeDataCount(m.id)
              return (
                <div key={m.id} className="mode-info-item">
                  <div className="mode-info-title">
                    <strong>{m.label}</strong>
                    {count > 0 && <span className="count-badge">{count} sessions</span>}
                  </div>
                  <p className="mode-info-desc">{info.description}</p>
                  <p className="mode-info-when"><strong>When to use:</strong> {info.whenToUse}</p>
                  <p className="mode-info-need"><strong>Data need:</strong> {info.dataNeed}</p>
                  <p className="mode-info-rec"><strong>Recommendation:</strong> {info.recommendation}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModeSelector

