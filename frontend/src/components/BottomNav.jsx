import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiBookOpen, FiTarget, FiFilm } from 'react-icons/fi';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: <FiHome size={22} /> },
    { name: 'Practice', path: '/practice', icon: <FiBookOpen size={22} /> },
    { name: 'Mocks', path: '/mock', icon: <FiTarget size={22} /> },
    { name: 'Reels', path: '/reels', icon: <FiFilm size={22} /> },
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon">{item.icon}</div>
          <span className="bottom-nav-label">{item.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default BottomNav;
