import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("MahaPrep OS Uncaught Error Boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSafeMode = () => {
    try {
      localStorage.setItem('guest_user', 'true');
      sessionStorage.setItem('intro_played', 'true');
    } catch (e) {}
    window.location.href = '/';
  };

  handleClearCache = () => {
    try {
      localStorage.removeItem('user_daily_tasks');
      localStorage.removeItem('last_task_date');
      localStorage.removeItem('user_daily_tasks_group');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #05050a 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '28px 20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(249, 115, 22, 0.18)',
              border: '2px solid #f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px'
            }}>
              ⚠️
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px', color: '#f8fafc' }}>
              काहीतरी तांत्रिक अडचण आली आहे
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 20px' }}>
              MahaPrep OS सुरक्षित ठेवण्यासाठी ही स्क्रीन दाखवली आहे. काळजी करू नका, तुमचा डेटा सुरक्षित आहे.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={this.handleSafeMode}
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                ⚡ सुरक्षितपणे ॲप सुरू करा (Safe Mode)
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  padding: '11px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                🔄 पुन्हा लोड करा (Reload)
              </button>

              <button
                onClick={this.handleClearCache}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#fca5a5',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🧹 कॅश साफ करून सुरू करा (Clear Cache)
              </button>
            </div>

            {this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left', fontSize: '0.75rem', color: '#94a3b8' }}>
                <summary style={{ cursor: 'pointer', padding: '4px 0' }}>तांत्रिक तपशील (Error Details)</summary>
                <div style={{
                  marginTop: '8px',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  color: '#f87171'
                }}>
                  {this.state.error.toString()}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
