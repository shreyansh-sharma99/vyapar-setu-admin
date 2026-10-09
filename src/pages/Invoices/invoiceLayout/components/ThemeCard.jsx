import React from 'react';

export const THEMES = [
  {
    id: 'classic',
    title: 'Classic',
    description: 'A traditional bordered layout — the one most accountants expect.',
  },
  {
    id: 'modern',
    title: 'Modern',
    description: 'Clean, generous whitespace, colour used sparingly.',
  },
  {
    id: 'minimal',
    title: 'Minimal',
    description: 'Just the numbers. No borders, minimal ink.',
  },
  {
    id: 'gst_detailed',
    title: 'GST Detailed',
    description: 'Every tax field broken out, Tally-style — for a GST auditor.',
  },
  {
    id: 'thermal_58',
    title: 'Thermal 58mm',
    description: 'Counter-printer width. Short lines, no wasted paper.',
  },
  {
    id: 'thermal_80',
    title: 'Thermal 80mm',
    description: 'Wider counter-printer roll — fits a few more characters per line.',
  },
];

export default function ThemeCard({ theme, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none text-left ${isSelected
        ? 'border-2  !border-blue-600 bg-white dark:bg-gray-800 dark:border-blue-500 shadow-xs'
        : 'border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-gray-800/40'
        }`}
    >
      <h4 className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white mb-1">
        {theme.title}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
        {theme.description}
      </p>
    </div>
  );
}
