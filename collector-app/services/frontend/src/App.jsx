import { useState, useEffect } from 'react'
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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

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
            className="header-button"
            onClick={() => setShowStats(true)}
            title="View Statistics & Database"
          >
            Stats
          </button>
          <button 
            className="header-button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Toggle Theme"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      )}
      <main className="container">
        {!showReview ? (
          <>
            <div className="mode-selector-container">
              <ModeSelector 
                mode={mode} 
                onModeChange={setMode}
              />
            </div>
            <TypingTest 
              mode={mode}
              onSessionComplete={handleSessionComplete}
            />
          </>
        ) : (
          currentSession ? (
            <SessionReview 
              sessionData={currentSession}
              onStartNew={handleStartNew}
            />
          ) : (
            <div className="card">
              <p>No session data available</p>
              <button onClick={handleStartNew}>Start New Session</button>
            </div>
          )
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