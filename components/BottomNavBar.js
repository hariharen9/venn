import React from 'react';

const navItems = [
  { id: 'topics', label: 'Home', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto mb-0.5">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  )},
  { id: 'subreddits', label: 'Reddit', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto mb-0.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path>
    </svg>
  )},
  { id: 'packages', label: 'Packages', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto mb-0.5">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  )},
  { id: 'feeds', label: 'Feeds', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto mb-0.5">
      <path d="M4 11a9 9 0 0 1 9 9"></path>
      <path d="M4 4a16 16 0 0 1 16 16"></path>
      <circle cx="5" cy="19" r="1.5"></circle>
    </svg>
  )}
];

export default function BottomNavBar({ activeTab, setActiveTab }) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-bg/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] z-40">
      <div className="flex justify-around items-center h-14 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 h-full bg-transparent border-none outline-none ${activeTab === item.id ? 'text-accent' : 'text-dim'}`}
          >
            <div className={`transition-transform duration-200 ${activeTab === item.id ? '-translate-y-0.5' : ''}`}>
              {item.icon}
              <span className="text-[9px] uppercase tracking-wider block" style={{ fontFamily: 'var(--font-display)' }}>
                {item.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
