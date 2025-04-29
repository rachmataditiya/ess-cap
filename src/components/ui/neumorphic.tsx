import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FlatCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NeumorphicCard({ children, className, onClick }: FlatCardProps) {
  return (
    <div 
      className={cn(
        "modern-card rounded-xl shadow-sm bg-white", 
        className,
        onClick && "cursor-pointer transition-all hover:translate-y-[-2px]"
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface FlatButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  active?: boolean;
}

export function NeumorphicButton({ 
  children, 
  className, 
  active = false,
  disabled = false,
  ...props 
}: FlatButtonProps) {
  return (
    <button 
      className={cn(
        "rounded-xl transition-all shadow-sm",
        active && "bg-slate-50",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:translate-y-[-2px]",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}