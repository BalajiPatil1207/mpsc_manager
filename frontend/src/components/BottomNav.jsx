import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiBookOpen, FiTarget, FiFilm, FiPlusCircle, FiZap, FiAward, FiX } from 'react-icons/fi';
import { launchTodayPracticeTest, launchTodayMegaTest } from '../utils/testLauncher';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isArcMenuOpen, setIsArcMenuOpen] = useState(false);

  // Close arc menu whenever route changes
  useEffect(() => {
    setIsArcMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'CREATE', path: '/test-maker', icon: <FiPlusCircle size={22} /> },
    { name: 'Practice', path: '/practice', icon: <FiBookOpen size={22} /> },
    { name: 'HOME', path: '/', icon: <FiHome size={22} /> },
    { name: 'Reels', path: '/reels', icon: <FiFilm size={22} /> },
    { name: 'Mocks', path: '/mock', icon: <FiTarget size={22} />, isMockTrigger: true },
  ];

  return (
    <>
      {/* Semi-transparent dark blur backdrop to dismiss arc menu on outside tap */}
      {isArcMenuOpen && (
        <div
          className="mock-arc-backdrop"
          onClick={() => setIsArcMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Rotating Curved Arc Speed-Dial Menu */}
      {isArcMenuOpen && (
        <div className="mock-arc-container" role="dialog" aria-label="Quick Test Launch Arc">
          {/* Subtle curved connecting SVG trail */}
          <svg className="mock-arc-svg-trail" viewBox="0 0 200 240" fill="none">
            <path
              d="M 175 230 C 170 160, 140 85, 30 35"
              stroke="url(#arcCurveGrad)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            <defs>
              <linearGradient id="arcCurveGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Option 1 (Top of Arc): 🎯 Daily Timetable Practice Test */}
          <div className="mock-arc-item item-practice">
            <button
              type="button"
              className="mock-arc-action-btn"
              onClick={() => {
                setIsArcMenuOpen(false);
                launchTodayPracticeTest(navigate);
              }}
            >
              <div className="mock-arc-badge">
                <span className="mock-arc-title">🎯 दैनिक सराव चाचणी</span>
                <span className="mock-arc-sub">आजचे वेळापत्रक विषय</span>
              </div>
              <div className="mock-arc-circle circle-practice">
                <FiZap size={22} />
              </div>
            </button>
          </div>

          {/* Option 2 (Middle of Arc): 🔥 Today's 100 Qs Mega Test */}
          <div className="mock-arc-item item-mega">
            <button
              type="button"
              className="mock-arc-action-btn"
              onClick={() => {
                setIsArcMenuOpen(false);
                launchTodayMegaTest(navigate);
              }}
            >
              <div className="mock-arc-badge">
                <span className="mock-arc-title">🔥 दैनिक मेगा टेस्ट</span>
                <span className="mock-arc-sub">आजची 100 Qs टेस्ट</span>
              </div>
              <div className="mock-arc-circle circle-mega">
                <FiAward size={22} />
              </div>
            </button>
          </div>

          {/* Option 3 (Base of Arc): 📋 Full Mock Explorer */}
          <div className="mock-arc-item item-all">
            <button
              type="button"
              className="mock-arc-action-btn"
              onClick={() => {
                setIsArcMenuOpen(false);
                navigate('/mock');
              }}
            >
              <div className="mock-arc-badge">
                <span className="mock-arc-title">📋 सर्व मॉक टेस्ट दालन</span>
                <span className="mock-arc-sub">शोध व मागील पेपर्स</span>
              </div>
              <div className="mock-arc-circle circle-all">
                <FiTarget size={22} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <div className="bottom-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.isMockTrigger) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setIsArcMenuOpen((prev) => !prev)}
                className={`bottom-nav-item bottom-nav-trigger ${isActive || isArcMenuOpen ? 'active' : ''}`}
                aria-expanded={isArcMenuOpen}
                aria-label="MPSC Test Launch Options"
              >
                <div className={`bottom-nav-icon arc-trigger-icon ${isArcMenuOpen ? 'open' : ''}`}>
                  {isArcMenuOpen ? <FiX size={24} /> : item.icon}
                </div>
                <span className="bottom-nav-label" style={{ color: isArcMenuOpen ? 'var(--accent-primary)' : undefined }}>
                  {isArcMenuOpen ? 'Close' : item.name}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`bottom-nav-item ${isActive ? 'floating-active-item' : ''}`}
            >
              <div className="bottom-nav-icon">
                {isActive ? React.cloneElement(item.icon, { size: 28 }) : item.icon}
              </div>
              <span className="bottom-nav-label" style={{ display: isActive ? 'none' : 'block' }}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default BottomNav;
