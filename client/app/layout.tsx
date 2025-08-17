import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../components/theme-provider';
import ErrorBoundary from '../components/error-boundary';
import ThemeToggleButton from '../components/ui/theme-toggle-button';

export const metadata = {
  title: 'Madlen AI İngilizce Öğretmeni',
  description: 'Gençler için kişiselleştirilmiş AI destekli İngilizce öğrenme',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen selection:bg-primary-400 selection:text-black transition-colors bg-[var(--bg)] text-[var(--text)]">
        <ErrorBoundary>
          <ThemeProvider>
            <div className="fixed top-3 right-3 z-50">
              <ThemeToggleButton />
            </div>
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
