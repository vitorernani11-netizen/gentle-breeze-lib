import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate({ to: '/login' });
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
    toast.success('Logout realizado');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
      </header>

      <Card className="p-6 bg-card border-border flex flex-col items-center text-center space-y-4">
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
          <User size={40} className="text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{user.email?.split('@')[0]}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </Card>

      <div className="mt-6">
        <Button 
          variant="destructive" 
          className="w-full flex items-center justify-center gap-2"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          Sair da Conta
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
