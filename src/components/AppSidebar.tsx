import { Link, useLocation } from '@tanstack/react-router';
import { 
  Calendar, 
  Skull, 
  Layers, 
  RotateCcw, 
  Home, 
  Plus, 
  Settings,
  Menu,
  ChevronRight,
  Hash,
  GraduationCap,
  Inbox,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const location = useLocation();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('projetos')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(5);
      
      if (data) setProjects(data);
    };

    fetchProjects();
  }, []);

  const mainItems = [
    { label: 'Hoje', icon: Calendar, href: '/', color: 'text-blue-400' },
    { label: 'Entrada', icon: Inbox, href: '/tasks', color: 'text-zinc-400' },
    { label: 'Rotinas', icon: RotateCcw, href: '/routines', color: 'text-green-400' },
  ];

  const systemItems = [
    { label: 'Acadêmico', icon: GraduationCap, href: '/academic', color: 'text-purple-400' },
    { label: 'Purgatório', icon: Skull, href: '/purgatory', color: 'text-red-400' },
    { label: 'Financeiro', icon: Hash, href: '/finance', color: 'text-emerald-400' },
    { label: 'Cardápio', icon: Menu, href: '/menu', color: 'text-orange-400' },
  ];

  const closeSidebar = () => setOpen(false);

  return (
    <div className="fixed top-4 left-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-full h-12 w-12 hover:bg-zinc-800 transition-none">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] bg-zinc-950 border-r-zinc-800 p-0 transition-none flex flex-col">
          <SheetHeader className="p-6 border-b border-zinc-900">
            <SheetTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
              FOCUS <span className="text-[10px] bg-white text-black px-1.5 py-0.5 rounded font-bold">2.0</span>
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
            <div className="space-y-1">
              {mainItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-none group",
                    location.pathname === item.href 
                      ? "bg-zinc-900 text-white" 
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", location.pathname === item.href ? item.color : "text-zinc-600")} />
                  <span className="font-bold uppercase tracking-widest text-[10px] flex-1">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <div className="px-4 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Projetos</span>
                <Link to="/projects" onClick={closeSidebar}>
                  <Plus size={12} className="text-zinc-600 hover:text-white" />
                </Link>
              </div>
              <div className="space-y-1">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to="/projects"
                    onClick={closeSidebar}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-none"
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.cor || '#3f3f46' }} />
                    <span className="font-bold uppercase tracking-widest text-[10px] flex-1 truncate">{p.nome}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Sistemas</span>
              <div className="space-y-1">
                {systemItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={closeSidebar}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl transition-none",
                      location.pathname === item.href 
                        ? "bg-zinc-900 text-white" 
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 text-zinc-600" />
                    <span className="font-bold uppercase tracking-widest text-[9px] flex-1">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-zinc-900 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-800" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase tracking-tight">Nabih</span>
                <span className="text-[10px] text-zinc-500 uppercase font-medium">Hardware Ativo</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
