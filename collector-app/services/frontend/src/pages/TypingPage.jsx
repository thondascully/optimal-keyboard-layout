/**
 * Typing page - main typing test interface.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TypingTest from '../components/TypingTest';
import ModeSelector from '../components/ModeSelector';
import { useTheme } from '../hooks/useTheme';

export function TypingPage() {
  const [mode, setMode] = useState('top200');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSessionComplete = (sessionData) => {
    if (sessionData?.session_id) {
      navigate(`/review/${sessionData.session_id}`, {
        state: { sessionData }
      });
    }
  };

  return (
    <div className="app">
      <div className="app-header-actions">
        <Link to="/stats" className="header-button" title="View Statistics & Database">
          Stats
        </Link>
        <button
          className="header-button"
          onClick={toggleTheme}
          title="Toggle Theme"
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>

      <main className="container">
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
      </main>

      <footer className="app-footer">
        <p>Press <kbd>Tab</kbd> to restart | <kbd>Esc</kbd> to cancel</p>
      </footer>
    </div>
  );
}

export default TypingPage;
