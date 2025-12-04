
import React, { useState } from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { Button } from './Button';

interface KioskLandingPageProps {
  onStart: (lang: Language) => void;
}

// Icons for the services list
const ServiceIcons = {
  Box: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  ),
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  Mail: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  ),
  Hand: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
  )
};

export const KioskLandingPage: React.FC<KioskLandingPageProps> = ({ onStart }) => {
  const [selectedLang, setSelectedLang] = useState<Language>(SUPPORTED_LANGUAGES[0]); // Default based on sorted list (PT)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Icons array to match the services
  const icons = [ServiceIcons.Box, ServiceIcons.Home, ServiceIcons.FileText, ServiceIcons.Mail, ServiceIcons.User];

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* --- TOP HEADER --- */}
      <header className="h-20 bg-[#FFCC00] flex items-center justify-between px-8 relative z-20 shadow-sm">
        {/* Title Only - No Icon */}
        <h1 className="text-xl md:text-2xl font-bold text-black">PostBranch PegaLab</h1>

        {/* Language Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-transparent hover:bg-black/5 px-4 py-2 rounded-lg transition-colors font-medium text-lg focus:outline-none"
          >
            <ServiceIcons.Globe />
            <span>{selectedLang.name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 max-h-[60vh] overflow-y-auto z-50">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-3 transition-colors"
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className={`font-medium ${selectedLang.code === lang.code ? 'text-black' : 'text-gray-600'}`}>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* LEFT COLUMN: Content */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-center p-8 md:p-16 lg:p-24 z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-12 leading-tight">
            {selectedLang.kiosk.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 mb-16">
            {selectedLang.kiosk.services.map((service, index) => {
              const Icon = icons[index % icons.length];
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="shrink-0"><Icon /></div>
                  <span className="font-semibold text-lg">{service}</span>
                </div>
              );
            })}
          </div>

          <Button 
            onClick={() => onStart(selectedLang)} 
            variant="post-yellow" 
            size="xl"
            className="!px-12 !py-6 !text-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all !rounded-lg w-full md:w-auto md:mx-auto"
          >
            {selectedLang.kiosk.buttonText}
            <div className="ml-3 animate-pulse"><ServiceIcons.Hand /></div>
          </Button>
        </div>

        {/* RIGHT COLUMN: Image */}
        <div className="hidden md:block w-1/2 relative bg-gray-100 overflow-hidden">
             {/* Abstract Office Representation since we can't fetch external images reliably without CORS/Hotlink issues */}
             <div className="absolute inset-0 bg-gray-200">
                {/* Fallback pattern or gradient */}
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300 relative">
                     {/* Simulated 'Person at counter' composition */}
                     <div className="absolute right-0 bottom-0 w-3/4 h-5/6 bg-cover bg-center shadow-2xl rounded-tl-[100px] overflow-hidden border-t-8 border-l-8 border-white" 
                          style={{ 
                              backgroundImage: 'url("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80")',
                              filter: 'saturate(0.8)'
                          }}>
                     </div>
                     <div className="absolute top-20 left-20 w-32 h-32 bg-[#FFCC00] rounded-full opacity-20 blur-3xl"></div>
                </div>
             </div>
             {/* Overlay Text/UI element if needed, e.g. a simulated screen UI */}
             <div className="absolute top-1/4 left-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border-l-4 border-[#FFCC00] max-w-xs transform -rotate-2">
                 <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
                 </div>
                 <div className="space-y-2 opacity-60">
                     <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                     <div className="h-2 bg-gray-300 rounded w-full"></div>
                     <div className="h-2 bg-gray-300 rounded w-1/2"></div>
                 </div>
             </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-[#FFCC00] py-4 px-8 flex items-center justify-center gap-3">
        <div className="bg-black text-[#FFCC00] rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-serif italic font-bold">i</div>
        <p className="font-medium text-black text-sm md:text-base text-center">
          {selectedLang.kiosk.footerText}
        </p>
      </footer>

    </div>
  );
};
