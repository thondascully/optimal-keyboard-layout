import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './SessionReview.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function SessionReview({ sessionData, onStartNew }) {
  const stats = useMemo(() => {
    if (!sessionData || !sessionData.keystrokes) return null

    const durations = sessionData.keystrokes
      .filter(k => k.duration > 0)
      .map(k => k.duration)

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)

    // Detect outliers (potential distractions)
    const threshold = avgDuration * 3
    const outliers = sessionData.keystrokes.filter(k => k.duration > threshold)

    // Calculate WPM (rough estimate)
    const minutes = sessionData.totalTime / 60000
    const words = sessionData.text.split(' ').length
    const wpm = Math.round(words / minutes)

    return {
      avgDuration: avgDuration.toFixed(2),
      maxDuration: maxDuration.toFixed(2),
      minDuration: minDuration.toFixed(2),
      outliers: outliers.length,
      wpm,
      totalKeystrokes: sessionData.keystrokes.length,
      totalTime: (sessionData.totalTime / 1000).toFixed(2)
    }
  }, [sessionData])

  const chartData = useMemo(() => {
    if (!sessionData || !sessionData.keystrokes) return null

    const labels = sessionData.keystrokes.map((_, i) => i)
    const durations = sessionData.keystrokes.map(k => k.duration || 0)

    return {
      labels,
      datasets: [
        {
          label: 'Inter-Key Latency (ms)',
          data: durations,
          borderColor: 'rgb(226, 183, 20)',
          backgroundColor: 'rgba(226, 183, 20, 0.1)',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    }
  }, [sessionData])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#d1d0c5'
        }
      },
      title: {
        display: true,
        text: 'Keystroke Timing Analysis',
        color: '#e2b714',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const ks = sessionData.keystrokes[context.dataIndex]
            return [
              `Duration: ${context.parsed.y.toFixed(2)}ms`,
              `Key: "${ks.key}"`,
              `Previous: "${ks.prev_key || 'START'}"`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Keystroke Index',
          color: '#d1d0c5'
        },
        ticks: {
          color: '#646669'
        },
        grid: {
          color: 'rgba(100, 102, 105, 0.2)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Duration (ms)',
          color: '#d1d0c5'
        },
        ticks: {
          color: '#646669'
        },
        grid: {
          color: 'rgba(100, 102, 105, 0.2)'
        }
      }
    }
  }

  if (!sessionData || !stats) {
    return (
      <div className="card">
        <p>No session data available</p>
        <button onClick={onStartNew}>Start New Session</button>
      </div>
    )
  }

  return (
    <div className="session-review fade-in">
      <div className="card">
        <h2>Session Complete!</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Time</div>
            <div className="stat-value">{stats.totalTime}s</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Keystrokes</div>
            <div className="stat-value">{stats.totalKeystrokes}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Est. WPM</div>
            <div className="stat-value">{stats.wpm}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Avg Latency</div>
            <div className="stat-value">{stats.avgDuration}ms</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Min Latency</div>
            <div className="stat-value">{stats.minDuration}ms</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Max Latency</div>
            <div className="stat-value">{stats.maxDuration}ms</div>
          </div>
        </div>

        {stats.outliers > 0 && (
          <div className="warning">
            ⚠️ Detected {stats.outliers} potential distraction(s) (unusually long pauses)
          </div>
        )}
      </div>

      <div className="card chart-container">
        <div style={{ height: '400px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="card actions">
        <button onClick={onStartNew} className="primary">
          Start New Session
        </button>
        {sessionData.session_id && (
          <p className="session-id">Session ID: {sessionData.session_id}</p>
        )}
      </div>
    </div>
  )
}

export default SessionReview