"use client";
import { useTheme } from '../theme-provider';

export default function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full border border-gray-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-white transition-colors"
      aria-label="Tema değiştir"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
