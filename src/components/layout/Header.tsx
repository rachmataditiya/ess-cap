import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Set up scroll listener
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsVisible(scrollPosition > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Set up Capacitor header only on native platforms
    const setupHeader = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.show();
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        } catch (error) {
          console.error('Error setting up header:', error);
        }
      }
    };

    setupHeader();
  }, []);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="glass w-full py-2 px-4 border-b border-soft-gray/20 backdrop-blur-lg bg-white/90 shadow-lg">
        <div className="flex items-center justify-between max-w-screen-lg mx-auto">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate hover:text-navy hover:bg-soft-gray/20"
              >
                <span className="material-icons-round">arrow_back</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="material-icons-round text-teal">work</span>
              <h1 className="text-lg font-semibold text-navy">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate hover:text-navy hover:bg-soft-gray/20">
              <span className="material-icons-round">notifications</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 