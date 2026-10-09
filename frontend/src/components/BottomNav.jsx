import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiBookOpen, FiTarget, FiFilm, FiPlusCircle } from 'react-icons/fi';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { name: 'CREATE', path: '/test-maker', icon: <FiPlusCircle size={22} /> },
    { name: 'Practice', path: '/practice', icon: <FiBookOpen size={22} /> },
    { name: 'HOME', path: '/', icon: <FiHome size={22} /> },
    { name: 'Reels', path: '/reels', icon: <FiFilm size={22} /> },
    { name: 'Mocks', path: '/mock', icon: <FiTarget size={22} /> },
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.name}
            to={item.path}
            className={`bottom-nav-item ${isActive ? 'floating-active-item' : ''}`}
          >
            <div className="bottom-nav-icon">{isActive ? React.cloneElement(item.icon, { size: 28 }) : item.icon}</div>
            <span className="bottom-nav-label" style={{ display: isActive ? 'none' : 'block' }}>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;
