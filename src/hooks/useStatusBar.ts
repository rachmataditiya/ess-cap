import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';

export function useStatusBar() {
  useEffect(() => {
    const initializeStatusBar = async () => {
      try {
        // Set status bar style
        await StatusBar.setStyle({ style: Style.Dark });
        
        // Show status bar
        await StatusBar.show();
        
        // Set background color
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      } catch (error) {
        console.error('Error initializing status bar:', error);
      }
    };

    initializeStatusBar();
  }, []);

  const setStatusBarStyle = async (style: Style) => {
    try {
      await StatusBar.setStyle({ style });
    } catch (error) {
      console.error('Error setting status bar style:', error);
    }
  };

  const setStatusBarBackground = async (color: string) => {
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.error('Error setting status bar background:', error);
    }
  };

  const hideStatusBar = async () => {
    try {
      await StatusBar.hide();
    } catch (error) {
      console.error('Error hiding status bar:', error);
    }
  };

  const showStatusBar = async () => {
    try {
      await StatusBar.show();
    } catch (error) {
      console.error('Error showing status bar:', error);
    }
  };

  return {
    setStatusBarStyle,
    setStatusBarBackground,
    hideStatusBar,
    showStatusBar
  };
} 