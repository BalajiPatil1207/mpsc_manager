import React from 'react';

const NewsTicker = ({ user }) => {
  const userEmail = (user?.email || '').trim().toLowerCase();

  // Strictly only visible to balu@gmail.com - hidden for everyone else
  if (userEmail !== 'balu@gmail.com') {
    return null;
  }

  const mainQuote = "One day, everything will make sense. ❤️";

  return (
    <div className="news-ticker-container" role="region" aria-label="Daily Inspiration Bulletin">
      <div className="news-ticker-badge">
        <span className="news-ticker-live-dot" />
        <span className="news-ticker-badge-text">BREAKING</span>
      </div>

      <div className="news-ticker-content">
        <div className="news-ticker-track">
          {/* Group 1 */}
          <div className="ticker-group">
            <span className="ticker-item highlight-quote">{mainQuote}</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item">कष्ट इतक्या शांततेने करा की यश धिंगाणा घालेल! 🎯</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item highlight-quote">{mainQuote}</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item">स्वतःवर विश्वास ठेवा — प्रामाणिक प्रयत्न कधीही वाया जात नाहीत! 🌟</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item highlight-quote">{mainQuote}</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item">कठीण दिवसच खरा अधिकारी घडवतात! Keep Moving Forward! 🚀</span>
            <span className="ticker-separator">✦</span>
          </div>

          {/* Group 2 (Clone for infinite seamless marquee loop) */}
          <div className="ticker-group" aria-hidden="true">
            <span className="ticker-item highlight-quote">{mainQuote}</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item">कष्ट इतक्या शांततेने करा की यश धिंगाणा घालेल! 🎯</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item highlight-quote">{mainQuote}</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item">स्वतःवर विश्वास ठेवा — प्रामाणिक प्रयत्न कधीही वाया जात नाहीत! 🌟</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item highlight-quote">{mainQuote}</span>
            <span className="ticker-separator">✦</span>
            <span className="ticker-item">कठीण दिवसच खरा अधिकारी घडवतात! Keep Moving Forward! 🚀</span>
            <span className="ticker-separator">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;

