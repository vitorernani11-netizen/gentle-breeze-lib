import { Link, useLocation } from '@tanstack/react-router';
import { 
  Calendar, 
  Inbox, 
  Clock, 
  RotateCcw, 
  Archive,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const location = useLocation();

  const items = [
    { label: 'Hoje', icon: Calendar, href: '/', color: 'text-blue-400' },
    { label: 'Entrada', icon: Inbox, href: '/tasks', color: 'text-zinc-400' },
    { label: 'Em Breve', icon: Clock, href: '/upcoming', color: 'text-orange-400' },
    { label: 'Rotinas', icon: RotateCcw, href: '/routines', color: 'text-green-400' },
    { label: 'Cofre', icon: Archive, href: '/vault', color: 'text-purple-400' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[80] bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 px-2 pb-safe md:hidden">
      <div className="flex items-center justify-between h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90",
                isActive ? "text-white" : "text-zinc-600"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? item.color : "")} />
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
