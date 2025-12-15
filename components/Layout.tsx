import React from 'react';
import { UserSettings } from '../types';
import { FONTS } from '../constants';
import { Home, Gamepad2, List, Settings as SettingsIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  settings: UserSettings;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, settings, activeTab, onTabChange }) => {
  const fontConfig = FONTS.find(f => f.value === settings.font) || FONTS[0];
  
  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  }[settings.fontSize];

  return (
    <div className={`h-screen bg-slate-50 text-slate-900 flex flex-col ${fontConfig.className} ${fontSizeClass} overflow-hidden`}>
      {/* Header */}
      <header className="flex-none bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              W
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">Word Nerd</h1>
          </div>
          <div className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            {settings.difficulty}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 overflow-y-auto overflow-x-hidden relative no-scrollbar">
        {children}
      </main>

      {/* Watermark */}
      <div className="fixed bottom-20 right-4 pointer-events-none opacity-25 z-50 font-bold text-slate-500 text-xs tracking-widest select-none">
        SalamancaTech
      </div>

      {/* Bottom Navigation */}
      <nav className="flex-none bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="max-w-3xl mx-auto flex justify-around items-center h-16">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => onTabChange('home')} 
            icon={<Home size={24} />} 
            label="Home" 
          />
          <NavButton 
            active={activeTab === 'games'} 
            onClick={() => onTabChange('games')} 
            icon={<Gamepad2 size={24} />} 
            label="Play" 
          />
          <NavButton 
            active={activeTab === 'lists'} 
            onClick={() => onTabChange('lists')} 
            icon={<List size={24} />} 
            label="Lists" 
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => onTabChange('settings')} 
            icon={<SettingsIcon size={24} />} 
            label="Settings" 
          />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 transform ${
      active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);