"use client";
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass rounded-xl p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-400">
              Bir şeyler yanlış gitti
            </h2>
            <p className="text-sm text-soft-dynamic mb-6">
              Uygulama beklenmedik bir hatayla karşılaştı. Sayfayı yeniden yükleyerek tekrar deneyebilirsiniz.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-2 rounded-md"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

export default ErrorBoundary;
