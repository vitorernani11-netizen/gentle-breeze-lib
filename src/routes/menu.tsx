import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
// Removed BottomNav import
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const Route = createFileRoute('/menu')({
  component: MenuPage,
});

interface Ingrediente {
  item: string;
  quantidade: string;
}

interface Receita {
  id: string;
  nome: string;
  descricao: string;
  ingredientes: Ingrediente[];
}

function MenuPage() {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [currentList, setCurrentList] = useState<Ingrediente[]>([]);
  const [currentRecipeName, setCurrentRecipeName] = useState('');

  const receitasIniciais = [
    {
      nome: 'Frango com Arroz e Brócolis',
      descricao: 'Clássico para dieta limpa',
      ingredientes: [
        { item: 'Frango (Peito)', quantidade: '1.4kg' },
        { item: 'Arroz Integral', quantidade: '700g' },
        { item: 'Brócolis', quantidade: '1kg' }
      ]
    },
    {
      nome: 'Patinho com Batata Doce',
      descricao: 'Energia constante e proteína magra',
      ingredientes: [
        { item: 'Carne Moída (Patinho)', quantidade: '1.4kg' },
        { item: 'Batata Doce', quantidade: '1.4kg' },
        { item: 'Vagem', quantidade: '500g' }
      ]
    },
    {
      nome: 'Tilápia com Purê de Mandioquinha',
      descricao: 'Leve e de rápida absorção',
      ingredientes: [
        { item: 'Tilápia', quantidade: '1.2kg' },
        { item: 'Mandioquinha', quantidade: '1kg' },
        { item: 'Espinafre', quantidade: '2 maços' }
      ]
    }
  ];

  useEffect(() => {
    fetchReceitas();
  }, []);

  const fetchReceitas = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      setReceitas(receitasIniciais.map((r, i) => ({ ...r, id: i.toString() })));
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('receitas')
      .select('*')
      .eq('user_id', userId);

    if (data && data.length > 0) {
      const formatted = data.map(r => ({
        id: r.id,
        nome: r.nome,
        descricao: r.descricao || '',
        ingredientes: (r.ingredientes as any[]) || []
      }));
      setReceitas(formatted);
    } else {
      const toInsert = receitasIniciais.map(r => ({ ...r, user_id: userId }));
      const { data: inserted } = await supabase.from('receitas').insert(toInsert).select();
      if (inserted) {
        setReceitas(inserted.map(r => ({
          id: r.id,
          nome: r.nome,
          descricao: r.descricao || '',
          ingredientes: (r.ingredientes as any[]) || []
        })));
      }
    }
    setLoading(false);
  };

  const handleShoppingList = (receita: Receita) => {
    setCurrentList(receita.ingredientes);
    setCurrentRecipeName(receita.nome);
    setShowShoppingList(true);
    toast.success('Lista de compras gerada!');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Cardápio</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
          Receitas Fixas (7 Marmitas)
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {receitas.map((receita) => (
          <Card key={receita.id} className="bg-zinc-900 border-zinc-800 rounded-3xl overflow-hidden flex flex-col transition-none">
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="p-3 bg-zinc-800 rounded-2xl text-white">
                  <Utensils size={24} />
                </div>
                <div className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase rounded-full">
                  7 Refeições
                </div>
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">{receita.nome}</h3>
              <p className="text-zinc-500 text-sm mb-6">{receita.descricao}</p>
              
              <div className="space-y-3 mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-2">Ingredientes exatos</h4>
                {receita.ingredientes.map((ing, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-300">{ing.item}</span>
                    <span className="text-sm font-black text-white">{ing.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-800/50 border-t border-zinc-800">
              <Button 
                onClick={() => handleShoppingList(receita)}
                className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-widest transition-none"
              >
                <ShoppingCart size={20} className="mr-2" />
                Lista de Compras
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showShoppingList} onOpenChange={setShowShoppingList}>
        <DialogContent className="w-[90%] rounded-3xl bg-zinc-950 border-zinc-800 p-8 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-white text-center">
              Lista para Mercado
            </DialogTitle>
            <p className="text-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              {currentRecipeName}
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-6">
            <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
              {currentList.map((ing, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  <div className="flex flex-col">
                    <span className="text-white font-bold">{ing.item}</span>
                    <span className="text-zinc-500 text-xs font-black uppercase">{ing.quantidade}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => setShowShoppingList(false)}
              className="w-full h-16 rounded-2xl bg-zinc-800 text-white font-black uppercase tracking-widest hover:bg-zinc-700 transition-none"
            >
              Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
