import { useState } from 'react'
import TypingTest from './components/TypingTest'
import SessionReview from './components/SessionReview'
import ModeSelector from './components/ModeSelector'
import StatsView from './components/StatsView'
import './App.css'

function App() {
  const [mode, setMode] = useState('top200')
  const [currentSession, setCurrentSession] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const handleSessionComplete = (sessionData) => {
    setCurrentSession(sessionData)
    setShowReview(true)
  }

  const handleStartNew = () => {
    setShowReview(false)
    setCurrentSession(null)
  }

  if (showStats) {
    return <StatsView onClose={() => setShowStats(false)} />
  }

  return (
    <div className="app">
      {!showReview && (
        <div className="app-header-actions">
          <button 
            className="stats-button"
            onClick={() => setShowStats(true)}
            title="View Statistics & Database"
          >
            📊 Stats
          </button>
        </div>
      )}
      <main className="container">
        {!showReview ? (
          <>
            <div className="mode-selector-container">
              <ModeSelector mode={mode} onModeChange={setMode} />
            </div>
            <TypingTest 
              mode={mode}
              onSessionComplete={handleSessionComplete}
            />
          </>
        ) : (
          <SessionReview 
            sessionData={currentSession}
            onStartNew={handleStartNew}
          />
        )}
      </main>

      {!showReview && (
        <footer className="app-footer">
          <p>Press <kbd>Tab</kbd> to restart • <kbd>Esc</kbd> to cancel</p>
        </footer>
      )}
    </div>
  )
}

export default App