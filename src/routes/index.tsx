import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState({
    horas_sono: '',
    marmitas_prontas: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate({ to: '/login' });
      } else {
        fetchTodayCheckin(session.user.id);
      }
      setLoading(false);
    });
  }, [navigate]);

  const fetchTodayCheckin = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('checkin_diario')
      .select('*')
      .eq('user_id', userId)
      .eq('data', today)
      .single();

    if (data) {
      setCheckin({
        horas_sono: data.horas_sono?.toString() || '',
        marmitas_prontas: !!data.marmitas_prontas,
      });
    }
  };

  const handleSave = async () => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('checkin_diario')
      .upsert({
        user_id: session.user.id,
        data: today,
        horas_sono: checkin.horas_sono ? parseFloat(checkin.horas_sono) : null,
        marmitas_prontas: checkin.marmitas_prontas,
      }, { onConflict: 'user_id,data' });

    if (error) {
      toast.error('Erro ao salvar check-in');
    } else {
      toast.success('Check-in salvo com sucesso!');
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Check-in Diário</h1>
        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
      </header>

      <div className="space-y-6">
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sono">Horas de Sono</Label>
              <Input
                id="sono"
                type="number"
                placeholder="0.0"
                value={checkin.horas_sono}
                onChange={(e) => setCheckin({ ...checkin, horas_sono: e.target.value })}
                className="bg-secondary border-none"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="marmitas">Marmitas Prontas</Label>
              <Switch
                id="marmitas"
                checked={checkin.marmitas_prontas}
                onCheckedChange={(checked) => setCheckin({ ...checkin, marmitas_prontas: checked })}
              />
            </div>

            <Button onClick={handleSave} className="w-full mt-4" variant="default">
              Salvar Check-in
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
