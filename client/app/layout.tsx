import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../components/theme-provider';

export const metadata = {
  title: 'Madlen AI English Tutor',
  description: 'Personalized AI-powered English learning for teens',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-dark text-white font-sans antialiased min-h-screen selection:bg-primary-400 selection:text-black">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
