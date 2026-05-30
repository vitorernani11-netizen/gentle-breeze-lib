import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RotateCcw, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { saveToLocal, loadFromLocal } from '@/lib/storage';

const ROUTINES_KEY = 'hardware_humano_routines';
const COMPLETIONS_KEY = 'hardware_humano_completions';

export const Route = createFileRoute('/routines')({
  component: Routines,
});

function Routines() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [completions, setCompletions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal de criação
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newItems, setNewItems] = useState<string[]>(['']);

  // Confirmação de exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const today = new Date().toISOString().split('T')[0];
    const routinesData = loadFromLocal(ROUTINES_KEY) || [];
    const completionsHistory = loadFromLocal(COMPLETIONS_KEY) || [];
    const todayCompletions = completionsHistory.filter((c: any) => c.data === today);

    setRoutines(routinesData);

    const completionsMap: Record<string, string[]> = {};
    todayCompletions.forEach((c: any) => {
      completionsMap[c.rotina_id] = c.itens_concluidos || [];
    });
    setCompletions(completionsMap);
    setLoading(false);
  };

  const toggleItem = (routineId: string, itemId: string) => {
    const currentCompleted = completions[routineId] || [];
    const isCompleted = currentCompleted.includes(itemId);

    const newCompleted = isCompleted
      ? currentCompleted.filter((id) => id !== itemId)
      : [...currentCompleted, itemId];

    const today = new Date().toISOString().split('T')[0];
    const history = loadFromLocal(COMPLETIONS_KEY) || [];
    const index = history.findIndex((c: any) => c.rotina_id === routineId && c.data === today);

    const data = {
      rotina_id: routineId,
      data: today,
      itens_concluidos: newCompleted,
    };

    if (index > -1) history[index] = data;
    else history.push(data);

    saveToLocal(COMPLETIONS_KEY, history);
    setCompletions({ ...completions, [routineId]: newCompleted });

    if (!isCompleted && newCompleted.length === routines.find((r) => r.id === routineId)?.itens?.length) {
      toast.success('Rotina concluída! 🚀');
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewItems(['']);
  };

  const handleCreateRoutine = () => {
    const title = newTitle.trim();
    const items = newItems.map((i) => i.trim()).filter(Boolean);

    if (!title) {
      toast.error('Dê um nome para a rotina');
      return;
    }
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    const newRoutine = {
      id: Date.now().toString(),
      titulo: title,
      itens: items.map((label) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label,
      })),
    };

    const updated = [...routines, newRoutine];
    saveToLocal(ROUTINES_KEY, updated);
    setRoutines(updated);
    toast.success('Rotina criada');
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleDeleteRoutine = (id: string) => {
    const updated = routines.filter((r) => r.id !== id);
    saveToLocal(ROUTINES_KEY, updated);
    setRoutines(updated);

    // Limpar completions de hoje vinculadas
    const history = loadFromLocal(COMPLETIONS_KEY) || [];
    const cleaned = history.filter((c: any) => c.rotina_id !== id);
    saveToLocal(COMPLETIONS_KEY, cleaned);

    const newCompletions = { ...completions };
    delete newCompletions[id];
    setCompletions(newCompletions);

    setDeleteId(null);
    toast.success('Rotina removida');
  };

  const createDefaultRoutines = () => {
    const defaults = [
      {
        id: '1',
        titulo: 'Rotina Matinal',
        itens: [
          { id: '1', label: 'Beber 500ml de água' },
          { id: '2', label: '10 min de meditação' },
          { id: '3', label: 'Arrumar a cama' },
          { id: '4', label: 'Banho gelado' },
        ],
      },
      {
        id: '2',
        titulo: 'Antes de Dormir',
        itens: [
          { id: '5', label: 'Planejar o dia seguinte' },
          { id: '6', label: 'Ler 10 páginas' },
          { id: '7', label: 'Higiene do sono' },
        ],
      },
    ];

    saveToLocal(ROUTINES_KEY, defaults);
    setRoutines(defaults);
    toast.success('Rotinas iniciais criadas!');
  };

  if (loading) return null;

  const routineBeingDeleted = routines.find((r) => r.id === deleteId);

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 pb-20">
      <header className="mb-10 flex justify-between items-end gap-3">
        <div>
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <RotateCcw size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sistemas</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Rotinas</h1>
        </div>
        <div className="flex gap-2">
          {routines.length === 0 && (
            <Button
              onClick={createDefaultRoutines}
              variant="outline"
              className="rounded-xl border-zinc-800 text-[10px] font-black uppercase h-10 transition-none"
            >
              Padrões
            </Button>
          )}
          <Button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-green-500 hover:bg-green-400 text-black text-[10px] font-black uppercase h-10 px-4 gap-1.5 transition-none"
          >
            <Plus size={16} strokeWidth={3} />
            Nova
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        {routines.map((routine) => {
          const total = routine.itens?.length || 0;
          const completed = completions[routine.id]?.length || 0;
          const progress = total > 0 ? (completed / total) * 100 : 0;

          return (
            <Card
              key={routine.id}
              className="p-0 bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden transition-none"
            >
              <div className="p-6 pb-4">
                <div className="flex justify-between items-center mb-4 gap-3">
                  <h3 className="text-xl font-black uppercase tracking-tight flex-1 min-w-0 break-words">
                    {routine.titulo}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                      <span className="text-xs font-black">
                        {completed}/{total}
                      </span>
                    </div>
                    <button
                      onClick={() => setDeleteId(routine.id)}
                      aria-label="Remover rotina"
                      className="h-10 w-10 rounded-full bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/40 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Progress value={progress} className="h-2 bg-zinc-900" />
              </div>

              <div className="bg-zinc-900/30 px-6 py-4 space-y-4">
                {routine.itens?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 group">
                    <div
                      onClick={() => toggleItem(routine.id, item.id)}
                      className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                        completions[routine.id]?.includes(item.id)
                          ? 'bg-green-500 border-green-500'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      {completions[routine.id]?.includes(item.id) && (
                        <CheckCircle2 size={14} className="text-black" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold transition-all break-words ${
                        completions[routine.id]?.includes(item.id)
                          ? 'text-zinc-600 line-through'
                          : 'text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        {routines.length === 0 && (
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full text-center py-24 bg-zinc-950 rounded-3xl border border-dashed border-zinc-900 hover:border-green-500/40 transition-colors"
          >
            <Plus className="mx-auto mb-4 text-zinc-700" size={40} />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">
              Criar primeira rotina
            </p>
          </button>
        )}
      </div>

      {/* Modal: Criar Rotina */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetCreateForm();
        }}
      >
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              Nova rotina
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Título
              </label>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Rotina matinal"
                className="bg-zinc-900/40 border-zinc-800 rounded-xl h-11 text-sm font-bold text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-green-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Itens
              </label>
              <div className="space-y-2">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const arr = [...newItems];
                        arr[idx] = e.target.value;
                        setNewItems(arr);
                      }}
                      placeholder={`Item ${idx + 1}`}
                      className="bg-zinc-900/40 border-zinc-800 rounded-xl h-10 text-sm text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-green-500/50"
                    />
                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        className="h-10 w-10 rounded-xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/40 flex items-center justify-center text-zinc-500 hover:text-red-400 shrink-0"
                        aria-label="Remover item"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNewItems([...newItems, ''])}
                className="text-[10px] font-black uppercase tracking-widest text-green-500 hover:text-green-400 flex items-center gap-1 mt-1"
              >
                <Plus size={12} strokeWidth={3} /> Adicionar item
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
              className="text-zinc-400 hover:text-white text-xs font-black uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRoutine}
              className="bg-green-500 hover:bg-green-400 text-black text-xs font-black uppercase rounded-xl px-4"
            >
              Criar rotina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight">
              Remover rotina?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              {routineBeingDeleted?.titulo
                ? `"${routineBeingDeleted.titulo}" será excluída permanentemente, junto com os check-ins de hoje.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white text-xs font-black uppercase rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteRoutine(deleteId)}
              className="bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase rounded-xl"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
