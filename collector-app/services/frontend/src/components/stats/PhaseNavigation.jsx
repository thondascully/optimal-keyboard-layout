/**
 * PhaseNavigation - Two-level tab navigation with phase grouping.
 * Groups tabs into: Collection, Validation, Model, Optimization, Results
 */

import { useState, useEffect } from 'react';
import './PhaseNavigation.css';

// Tab configuration
export const PHASES = {
  collection: {
    id: 'collection',
    label: 'Collection',
    color: '#4A90E2',
    tabs: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'coverage', label: 'Coverage' },
      { id: 'patterns', label: 'Patterns' },
      { id: 'quality', label: 'Data Quality' },
    ],
  },
  validation: {
    id: 'validation',
    label: 'Validation',
    color: '#FF9800',
    tabs: [
      { id: 'week0', label: 'Week 0', demo: true },
    ],
  },
  model: {
    id: 'model',
    label: 'Model',
    color: '#9C27B0',
    tabs: [
      { id: 'features', label: 'Features' },
      { id: 'training', label: 'Training', demo: true },
      { id: 'costmatrix', label: 'Cost Matrix', demo: true },
    ],
  },
  optimization: {
    id: 'optimization',
    label: 'Optimization',
    color: '#FF5722',
    tabs: [
      { id: 'optimizer', label: 'Optimizer', demo: true },
      { id: 'comparison', label: 'Comparison', demo: true },
    ],
  },
  results: {
    id: 'results',
    label: 'Results',
    color: '#4CAF50',
    tabs: [
      { id: 'final', label: 'Final Analysis', demo: true },
    ],
  },
};

const PHASE_ORDER = ['collection', 'validation', 'model', 'optimization', 'results'];

// Get initial state from localStorage or defaults
function getInitialState() {
  try {
    const saved = localStorage.getItem('statsNavigation');
    if (saved) {
      const { phase, tab } = JSON.parse(saved);
      if (PHASES[phase] && PHASES[phase].tabs.find(t => t.id === tab)) {
        return { phase, tab };
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return { phase: 'collection', tab: 'dashboard' };
}

export function PhaseNavigation({ activePhase, activeTab, onNavigate }) {
  const currentPhase = PHASES[activePhase];

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('statsNavigation', JSON.stringify({ phase: activePhase, tab: activeTab }));
  }, [activePhase, activeTab]);

  return (
    <div className="phase-navigation">
      {/* Phase buttons */}
      <div className="phase-buttons">
        {PHASE_ORDER.map((phaseId) => {
          const phase = PHASES[phaseId];
          const isActive = phaseId === activePhase;

          return (
            <button
              key={phaseId}
              className={`phase-button ${isActive ? 'active' : ''}`}
              style={{
                '--phase-color': phase.color,
              }}
              onClick={() => onNavigate(phaseId, phase.tabs[0].id)}
            >
              {phase.label}
            </button>
          );
        })}
      </div>

      {/* Tab buttons for current phase */}
      <div
        className="tab-buttons"
        style={{ '--phase-color': currentPhase?.color }}
      >
        {currentPhase?.tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${tab.id === activeTab ? 'active' : ''}`}
            onClick={() => onNavigate(activePhase, tab.id)}
          >
            {tab.label}
            {tab.demo && <span className="demo-badge">Demo</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Hook for managing navigation state
export function usePhaseNavigation() {
  const [state, setState] = useState(getInitialState);

  const navigate = (phase, tab) => {
    setState({ phase, tab });
  };

  return {
    activePhase: state.phase,
    activeTab: state.tab,
    navigate,
    currentPhaseInfo: PHASES[state.phase],
  };
}

export default PhaseNavigation;
