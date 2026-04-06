'use client';

import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('catalapp-theme');
    const prefersDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (prefersDark) {
      document.documentElement.classList.add('dark');
      setDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDark(false);
    }

    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);

    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('catalapp-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('catalapp-theme', 'light');
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Activar mode clar' : 'Activar mode fosc'}
      className="w-9 h-9 rounded-full bg-[#F5F5F5] dark:bg-[#333] flex items-center justify-center text-lg transition-colors duration-200 hover:opacity-80 cursor-pointer"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
