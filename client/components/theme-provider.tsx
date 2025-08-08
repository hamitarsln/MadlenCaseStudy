"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import clsx from 'clsx';

const ThemeCtx = createContext<{theme:'dark'|'light'; toggle: ()=>void}>({ theme:'dark', toggle: ()=>{} });
export const useTheme = ()=> useContext(ThemeCtx);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  useEffect(()=>{
    const saved = typeof window !== 'undefined' ? localStorage.getItem('madlen-theme') : null;
    if (saved === 'light' || saved === 'dark') setTheme(saved as any);
  },[]);
  useEffect(()=>{
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('madlen-theme', theme);
  },[theme]);
  const noop = () => {};
  return (
    <ThemeCtx.Provider value={{ theme, toggle: noop }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('glass rounded-xl p-5 fade-in', className)} {...props} />;
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={clsx('font-display text-3xl md:text-4xl gradient-text tracking-tight', className)}>{children}</h1>;
}
