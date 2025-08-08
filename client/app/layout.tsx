import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../components/theme-provider';
import ErrorBoundary from '../components/error-boundary';

export const metadata = {
  title: 'Madlen AI English Tutor',
  description: 'Personalized AI-powered English learning for teens',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen selection:bg-primary-400 selection:text-black transition-colors">
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
