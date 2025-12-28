/**
 * Chart.js configuration utilities.
 *
 * Provides theme-aware chart configurations for consistent styling.
 */

/**
 * Get chart colors based on theme
 */
export function getChartColors(isDark = false) {
  return {
    text: isDark ? '#e0e0e0' : '#000000',
    textSecondary: isDark ? '#b0b0b0' : '#333333',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    accent: isDark ? '#5ba3f5' : '#4A90E2',
    accentLight: isDark ? 'rgba(91, 163, 245, 0.2)' : 'rgba(74, 144, 226, 0.2)',
    success: isDark ? '#4caf50' : '#2e7d32',
    warning: isDark ? '#ff9800' : '#ed6c02',
    error: isDark ? '#f44336' : '#d32f2f',
    background: isDark ? '#1e1e1e' : '#ffffff',
  };
}

/**
 * Get common chart options
 */
export function getCommonOptions(isDark = false) {
  const colors = getChartColors(isDark);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: colors.textSecondary },
        grid: { color: colors.grid },
      },
      y: {
        ticks: { color: colors.textSecondary },
        grid: { color: colors.grid },
      },
    },
  };
}

/**
 * Create line chart options
 */
export function createLineChartOptions(title, isDark = false) {
  const colors = getChartColors(isDark);
  const common = getCommonOptions(isDark);

  return {
    ...common,
    plugins: {
      ...common.plugins,
      title: {
        display: !!title,
        text: title,
        color: colors.text,
      },
    },
  };
}

/**
 * Create bar chart options
 */
export function createBarChartOptions(title, isDark = false) {
  const colors = getChartColors(isDark);
  const common = getCommonOptions(isDark);

  return {
    ...common,
    plugins: {
      ...common.plugins,
      title: {
        display: !!title,
        text: title,
        color: colors.text,
      },
    },
  };
}

/**
 * Create keystroke timing chart options (specialized)
 */
export function createKeystrokeChartOptions(isDark = false, onClickHandler = null) {
  const colors = getChartColors(isDark);

  return {
    responsive: true,
    maintainAspectRatio: false,
    onClick: onClickHandler,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) => {
            const idx = context[0].dataIndex;
            return `Keystroke ${idx + 1}`;
          },
          label: (context) => `${context.raw.toFixed(1)} ms`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Keystroke',
          color: colors.textSecondary,
        },
        ticks: { color: colors.textSecondary },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: 'Time (ms)',
          color: colors.textSecondary,
        },
        ticks: { color: colors.textSecondary },
        grid: { color: colors.grid },
        beginAtZero: true,
      },
    },
  };
}

/**
 * Create WPM chart options
 */
export function createWPMChartOptions(isDark = false) {
  const colors = getChartColors(isDark);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'WPM Over Time',
        color: colors.text,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Character Position',
          color: colors.textSecondary,
        },
        ticks: { color: colors.textSecondary },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: 'WPM',
          color: colors.textSecondary,
        },
        ticks: { color: colors.textSecondary },
        grid: { color: colors.grid },
        beginAtZero: true,
      },
    },
  };
}

/**
 * Get dataset colors for bar charts with threshold coloring
 */
export function getBarColors(values, threshold, isDark = false) {
  const colors = getChartColors(isDark);

  return values.map(v =>
    v > threshold ? colors.warning : colors.accent
  );
}
