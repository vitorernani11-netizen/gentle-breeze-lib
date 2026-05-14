import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, User, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [user] = useState<any>({ email: 'unico@usuario.app' });

  const handleLogout = () => {
    navigate({ to: '/login' });
    toast.success('Modo Local: Sessão resetada');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10 text-center">
        <div className="w-24 h-24 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-white/5">
          <User size={40} className="text-zinc-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">
          {user.email?.split('@')[0]}
        </h1>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Plano Focus Pro</p>
      </header>

      <div className="space-y-4">
        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] flex items-center justify-between transition-none">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 rounded-2xl text-zinc-500">
              <Shield size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-tight">Privacidade</span>
              <span className="text-[10px] text-zinc-600 font-bold uppercase">Criptografia Local Ativa</span>
            </div>
          </div>
          <Zap size={16} className="text-zinc-800" />
        </Card>

        <Card className="p-6 bg-zinc-950 border-zinc-900 rounded-[2rem] flex items-center justify-between transition-none">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 rounded-2xl text-zinc-500">
              <User size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-tight">Email</span>
              <span className="text-[10px] text-zinc-600 font-bold uppercase truncate max-w-[150px]">{user.email}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Logout removido para modo 100% local */}
    </div>
  );
}
