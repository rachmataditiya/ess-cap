import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { checkPwaInstallable, showPwaInstallPrompt } from '@/lib/registerServiceWorker';
import { useToast } from '@/hooks/use-toast';

interface PwaInstallButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * A button that prompts the user to install the PWA
 * Only shows up if the app is installable and not already installed
 */
export function PwaInstallButton({ 
  variant = 'default', 
  size = 'default',
  className = ''
}: PwaInstallButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkInstallable = async () => {
      const canInstall = await checkPwaInstallable();
      setIsInstallable(canInstall);
    };
    
    checkInstallable();
    
    // Store the beforeinstallprompt event so we can trigger it later
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      (window as any).deferredPrompt = e;
      setIsInstallable(true);
    });
    
    // If already installed, app-installed event fires
    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt so it can be garbage collected
      delete (window as any).deferredPrompt;
      setIsInstallable(false);
      
      toast({
        title: "Instalasi Berhasil",
        description: "Aplikasi ESS Arkana berhasil diinstal di perangkat Anda!",
        duration: 5000,
      });
    });
  }, [toast]);

  if (!isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    const installed = await showPwaInstallPrompt();
    if (!installed) {
      toast({
        title: "Instalasi Ditolak",
        description: "Anda dapat mencoba menginstal aplikasi nanti dari menu browser.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <Button 
      onClick={handleInstallClick} 
      variant={variant} 
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      <Download className="h-4 w-4" />
      <span>Instal Aplikasi</span>
    </Button>
  );
}