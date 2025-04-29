import React from 'react';
import { cn } from '@/lib/utils';

interface RadialProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  bgColor?: string;
  progressColor?: string;
  label?: React.ReactNode;
  className?: string;
}

export function RadialProgress({
  value,
  size = 100,
  strokeWidth = 10,
  bgColor = '#f2f5f9',
  progressColor = '#4bc1bf',
  label,
  className
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  // Ensure value is between 0-100
  const safeValue = Math.min(100, Math.max(0, value));
  
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={bgColor}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={progressColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      
      {/* Optional centered label */}
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          {label}
        </div>
      )}
    </div>
  );
}