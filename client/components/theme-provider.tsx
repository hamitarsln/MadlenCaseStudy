"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';

const ThemeCtx = createContext<{theme:'dark'|'light'; toggle: ()=>void}>({ theme:'dark', toggle: ()=>{} });
export const useTheme = ()=> useContext(ThemeCtx);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  useEffect(()=>{
    const saved = localStorage.getItem('madlen-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved as any);
  },[]);
  useEffect(()=>{
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('madlen-theme', theme);
  },[theme]);
  return (
    <ThemeCtx.Provider value={{ theme, toggle: ()=> setTheme(t=> t==='dark'?'light':'dark') }}>
      {children}
      <div className="fixed z-50 top-4 right-4">
        <button aria-label="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="btn-outline w-10 h-10 rounded-full flex items-center justify-center">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </ThemeCtx.Provider>
  );
};

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('glass rounded-xl p-5 fade-in', className)} {...props} />;
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={clsx('font-display text-3xl md:text-4xl gradient-text tracking-tight', className)}>{children}</h1>;
}
