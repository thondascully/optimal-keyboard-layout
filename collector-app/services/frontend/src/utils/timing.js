export function calculateStats(durations) {
    if (!durations || durations.length === 0) {
      return null
    }
  
    const sorted = [...durations].sort((a, b) => a - b)
    const sum = durations.reduce((a, b) => a + b, 0)
    const mean = sum / durations.length
  
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  
    const squaredDiffs = durations.map(d => Math.pow(d - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / durations.length
    const stdDev = Math.sqrt(variance)
  
    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: durations.length
    }
  }

  export function detectOutliers(durations, threshold = 1.5) {
    if (!durations || durations.length < 4) {
      return []
    }
  
    const sorted = [...durations].sort((a, b) => a - b)
    const q1Index = Math.floor(sorted.length * 0.25)
    const q3Index = Math.floor(sorted.length * 0.75)
    
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    const iqr = q3 - q1
    
    const lowerBound = q1 - threshold * iqr
    const upperBound = q3 + threshold * iqr
  
    return durations
      .map((d, i) => ({ value: d, index: i }))
      .filter(({ value }) => value < lowerBound || value > upperBound)
  }
  
  export function calculateWPM(text, totalTimeMs) {
    const words = text.trim().split(/\s+/).length
    const minutes = totalTimeMs / 60000
    return Math.round(words / minutes)
  }
  
  export function formatDuration(ms) {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`
    }
    return `${(ms / 1000).toFixed(2)}s`
  }