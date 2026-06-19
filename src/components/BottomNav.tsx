import { Home, Dumbbell, Activity, History, Apple, Settings as SettingsIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/workout', icon: Dumbbell, label: 'Schede' },
  { path: '/diet', icon: Apple, label: 'Dieta' },
  { path: '/history', icon: History, label: 'Storico' },
  { path: '/body', icon: Activity, label: 'Corpo' },
  { path: '/settings', icon: SettingsIcon, label: 'Impostazioni' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (
    location.pathname.startsWith('/session') ||
    location.pathname.startsWith('/edit-plan') ||
    location.pathname.startsWith('/edit-day') ||
    location.pathname.startsWith('/create-plan')
  ) return null;

  return (
    <div className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50 pointer-events-none'>
      {/* Gradient fade */}
      <div className='absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/90 via-white/70 to-transparent pointer-events-auto' />
      <div className='relative flex justify-center bg-white shadow-md rounded-t-3xl pointer-events-auto'>
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={cn(
              'w-12 h-12 flex items-center justify-center text-gray-500',
              location.pathname === tab.path
                ? 'text-blue-500 bg-blue-100/50'
                : 'hover:text-gray-700 hover:bg-gray-100/50',
            )}
            onClick={() => navigate(tab.path)}
          >
            <tab.icon className='w-5 h-5' />
            <span className='mt-2 block text-xs font-medium'>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}