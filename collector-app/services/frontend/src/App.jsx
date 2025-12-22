import { useState } from 'react'
import TypingTest from './components/TypingTest'
import SessionReview from './components/SessionReview'
import './App.css'

function App() {
  const [mode, setMode] = useState('top200')
  const [currentSession, setCurrentSession] = useState(null)
  const [showReview, setShowReview] = useState(false)

  const handleSessionComplete = (sessionData) => {
    setCurrentSession(sessionData)
    setShowReview(true)
  }

  const handleStartNew = () => {
    setShowReview(false)
    setCurrentSession(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>FlowCollector</h1>
        <p className="subtitle">Biomechanical Typing Data Collection</p>
      </header>

      <main className="container">
        {!showReview ? (
          <>
            <div className="card mode-selector fade-in">
              <h2>Select Mode</h2>
              <div className="mode-buttons">
                <button 
                  className={mode === 'top200' ? 'active' : ''}
                  onClick={() => setMode('top200')}
                >
                  Top 200 Words
                </button>
                <button 
                  className={mode === 'trigraphs' ? 'active' : ''}
                  onClick={() => setMode('trigraphs')}
                >
                  Trigraphs
                </button>
                <button 
                  className={mode === 'nonsense' ? 'active' : ''}
                  onClick={() => setMode('nonsense')}
                >
                  Nonsense
                </button>
                <button 
                  className={mode === 'calibration' ? 'active' : ''}
                  onClick={() => setMode('calibration')}
                >
                  Calibration
                </button>
              </div>
              <p className="mode-description">
                {mode === 'top200' && 'Practice the most common English words'}
                {mode === 'trigraphs' && 'Focus on common three-letter patterns'}
                {mode === 'nonsense' && 'Pronounceable nonsense to break muscle memory'}
                {mode === 'calibration' && 'Random sequences for pure biomechanical data'}
              </p>
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

      <footer className="app-footer">
        <p>Press <kbd>Tab</kbd> to restart • <kbd>Esc</kbd> to cancel</p>
      </footer>
    </div>
  )
}

export default App