import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/finance')({
  component: FinancePage,
});

function FinancePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    valor: '',
    descricao: '',
    conta: 'Pessoal',
    tipo: 'Saida'
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Login requirement removed as per request
      fetchRecords(session?.user?.id || 'anonymous');
      setLoading(false);
    });
  }, []);

  const fetchRecords = async (userId: string) => {
    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false });

    if (data) setRecords(data);
  };

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valor || !session) return;

    const { data, error } = await supabase
      .from('financeiro')
      .insert([{
        user_id: session.user.id,
        valor: parseFloat(form.valor),
        descricao: form.descricao,
        conta: form.conta as 'Pessoal' | 'Nabih',
        tipo: form.tipo as 'Entrada' | 'Saida',
        data: new Date().toISOString()
      }])
      .select()
      .single();

    if (data) {
      setRecords([data, ...records]);
      setForm({ ...form, valor: '', descricao: '' });
      toast.success('Registro adicionado');
    }
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from('financeiro').delete().eq('id', id);
    if (!error) {
      setRecords(records.filter(r => r.id !== id));
      toast.success('Registro removido');
    }
  };

  const balance = records.reduce((acc, curr) => {
    const val = parseFloat(curr.valor);
    return curr.tipo === 'Entrada' ? acc + val : acc - val;
  }, 0);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <div className="mt-4 p-6 bg-secondary rounded-xl">
          <p className="text-sm text-muted-foreground mb-1">Saldo Geral</p>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
            R$ {balance.toFixed(2)}
          </p>
        </div>
      </header>

      <Card className="p-4 bg-card border-border mb-6">
        <form onSubmit={addRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="bg-secondary border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={form.conta} onValueChange={(v) => setForm({ ...form, conta: v })}>
                <SelectTrigger className="bg-secondary border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pessoal">Pessoal</SelectItem>
                  <SelectItem value="Nabih">Nabih</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="bg-secondary border-none"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="bg-secondary border-none"
              placeholder="Ex: Almoço"
            />
          </div>

          <Button type="submit" className="w-full">Adicionar</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {records.map((record) => (
          <Card key={record.id} className="p-4 bg-card border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              {record.tipo === 'Entrada' ? (
                <ArrowUpCircle className="text-green-500" size={24} />
              ) : (
                <ArrowDownCircle className="text-red-400" size={24} />
              )}
              <div>
                <p className="font-medium">{record.descricao || 'Sem descrição'}</p>
                <p className="text-xs text-muted-foreground">{record.conta}</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4">
              <span className={`font-bold ${record.tipo === 'Entrada' ? 'text-green-500' : 'text-red-400'}`}>
                {record.tipo === 'Entrada' ? '+' : '-'} R$ {parseFloat(record.valor).toFixed(2)}
              </span>
              <button onClick={() => deleteRecord(record.id)} className="text-muted-foreground transition-none">
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
