import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`btn btn-ghost theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to white glass theme' : 'Switch to black glass theme'}
      title={isDark ? 'White glass' : 'Black glass'}
    >
      {isDark ? '○○ White' : '●● Black'}
    </button>
  );
}
