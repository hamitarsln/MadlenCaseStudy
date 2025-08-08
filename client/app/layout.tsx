import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../components/theme-provider';
import ErrorBoundary from '../components/error-boundary';

export const metadata = {
  title: 'Madlen AI İngilizce Öğretmeni',
  description: 'Gençler için kişiselleştirilmiş AI destekli İngilizce öğrenme',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
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
