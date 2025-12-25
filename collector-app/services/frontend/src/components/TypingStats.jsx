import './TypingStats.css'

function TypingStats({ currentIndex, totalLength, mode }) {
  if (currentIndex === 0) return null

  return (
    <div className="typing-stats-compact">
      <span className="stat-item">{currentIndex} / {totalLength}</span>
      <span className="stat-divider">•</span>
      <span className="stat-item">{mode}</span>
    </div>
  )
}

export default TypingStats

