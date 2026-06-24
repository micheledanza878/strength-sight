import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex justify-center items-center',
        'animate-spin',
        className
      )}
    >
      <Loader2 className="w-5 h-5" />
    </div>
  );
};

export default LoadingSpinner;