import React, { useState } from 'react';
import Feed from './components/Feed';
import InterestManager from './components/InterestManager';
import WeeklyUpdate from './components/WeeklyUpdate';
import { Sparkles, Calendar, Home } from 'lucide-react';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container" style={{ padding: '2rem', color: '#f87171' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

import { ToastProvider } from './context/ToastContext';

function App() {
  const [category, setCategory] = useState('all');
  const [view, setView] = useState('feed'); // 'feed' | 'interests' | 'weekly-update'

  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === 'feed') {
      setCategory('all');
    }
  };

  return (
    <ToastProvider>
      <div className="app">
        <div className="sticky-header">
          <div
            onClick={() => handleViewChange('feed')}
            className="nav-brand"
            title="Go to Home"
          >
            <Home size={20} />
            <h1>Pharma Pulse</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleViewChange('weekly-update')}
              className={`nav-btn ${view === 'weekly-update' ? 'active' : ''}`}
              style={{ background: view === 'weekly-update' ? 'var(--primary-gradient)' : '', color: view === 'weekly-update' ? 'white' : '' }}
            >
              <Calendar size={16} /> Weekly Update
            </button>
            <button
              onClick={() => handleViewChange('interests')}
              className={`nav-btn ${view === 'interests' ? 'active' : ''}`}
            >
              <Sparkles size={16} /> Interests
            </button>
            <button
              onClick={() => {
                handleViewChange('feed');
                setCategory('recommendations');
              }}
              className={`nav-btn ${category === 'recommendations' && view === 'feed' ? 'active' : ''}`}
            >
              💡 For You
            </button>
            <select
              value={category === 'recommendations' || view === 'interests' ? '' : category}
              onChange={(e) => {
                handleViewChange('feed');
                setCategory(e.target.value);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #d0d7de',
                backgroundColor: '#f6f8fa',
                color: '#24292f',
                fontSize: '14px'
              }}
            >
              <option value="all">All Feeds</option>
              <option value="marketing">Marketing Only</option>
            </select>
          </div>
        </div>

        <ErrorBoundary>
          {view === 'interests' ? (
            <InterestManager onBack={() => handleViewChange('feed')} />
          ) : view === 'weekly-update' ? (
            <WeeklyUpdate onBack={() => handleViewChange('feed')} />
          ) : (
            <Feed category={category} setCategory={setCategory} />
          )}
        </ErrorBoundary>
      </div>
    </ToastProvider>
  );
}

export default App;
