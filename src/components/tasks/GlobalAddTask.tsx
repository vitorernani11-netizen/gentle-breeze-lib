import React, { useState, useEffect } from 'react';
import { Reminder } from './ReminderManager';
import { Plus, Zap, Brain, X, ChevronRight, ClipboardList, Book, Lightbulb, Folder, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddTaskOverlay } from './AddTaskOverlay';
import { useTaskActions } from '@/hooks/useTaskActions';
import { useVaultActions } from '@/hooks/useVaultActions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { loadFromLocal } from '@/lib/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const VAULT_KEY = 'hardware_humano_vault';

const CORE_PROJECTS = [
  { id: 'pessoal', nome: 'GESTÃO / PESSOAL' },
  { id: 'faculdade', nome: 'FACULDADE' },
  { id: 'riolax', nome: 'RIOLAX' },
  { id: 'esfiharia', nome: 'ESFIHARIA' },
  { id: 'youtube', nome: 'YOUTUBE DARK' }
];

export const GlobalAddTask: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [mode, setMode] = useState<'choice' | 'action' | 'memory'>('choice');
  const [memoryData, setMemoryData] = useState({ titulo: '', conteudo: '', projeto_id: '', categoria: 'notes' });
  const { addTask } = useTaskActions();
  const { addVaultItem } = useVaultActions();
  
  const projects = loadFromLocal('hardware_humano_projects') || [];

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], [data-state="open"], .fixed.inset-0');
      // Filtramos para ver se existe algum modal aberto que NÃO seja o de criação
      // Se houver qualquer overlay ou diálogo aberto, escondemos o FAB.
      setIsOtherModalOpen(dialogs.length > 0);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setMode('choice');
    setMemoryData({ titulo: '', conteudo: '', projeto_id: '', categoria: 'notes' });
  };

  const handleClose = () => {
    setIsOpen(false);
    setMode('choice');
  };

  const handleAddTask = (taskData: {
    titulo: string;
    vencimento: string;
    recorrencia: string;
    prioridade: string;
    lembrete: string | null;
    lembretes: Reminder[];
    reminders: any[];
    descricao?: string;
    hora_vencimento?: string | null;
    recorrencia_tipo?: string | null;
    recorrencia_dias?: string[] | null;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const status = 'Entrada';

    const task = addTask({
      titulo: taskData.titulo,
      descricao: taskData.descricao || '',
      repeticao: taskData.recorrencia || 'none',
      data_execucao: taskData.vencimento,
      prioridade: taskData.prioridade || 'P4',
      status: status,
      lembrete: taskData.lembrete,
      lembretes: taskData.lembretes || [],
      reminders: taskData.reminders || [],
      hora_vencimento: taskData.hora_vencimento,
      recorrencia_tipo: taskData.recorrencia_tipo || null,
      recorrencia_dias: taskData.recorrencia_dias || null,
    });

    if (task) {
      toast.success(`Tarefa em ${status}`, {
        className: 'bg-black border-2 border-[#00ff41] text-[#00ff41] font-mono'
      });
      handleClose();
    }
  };

  const handleAddMemory = () => {
    if (!memoryData.titulo || !memoryData.projeto_id) {
      if (!memoryData.projeto_id) toast.error('Selecione uma pasta de destino');
      return;
    }
    
    const item = addVaultItem({
      titulo: memoryData.titulo,
      conteudo: memoryData.conteudo,
      projeto_id: memoryData.projeto_id,
      categoria: memoryData.categoria
    });

    if (item) {
      toast.success('Memória arquivada no Cofre');
      handleClose();
    }
  };

  return (
    <>
      {!isOpen && !isOtherModalOpen && (
        <Button
          id="global-add-task-button"
          onClick={handleOpen}
          className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-white text-black border-4 border-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-90 transition-all z-40 flex items-center justify-center p-0"
          aria-label="Adicionar nova tarefa ou memória"
        >
          <Plus size={40} strokeWidth={4} />
        </Button>
      )}

      {isOpen && mode === 'choice' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg flex flex-col gap-6">
            <button 
              onClick={() => setMode('action')}
              className="group relative h-48 rounded-3xl border-2 border-white/10 bg-zinc-900/50 p-8 flex items-center gap-6 hover:bg-[#00ff41] hover:text-black transition-all active:scale-95 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#00ff41]/10 flex items-center justify-center group-hover:bg-black/10">
                <Zap size={48} className="text-[#00ff41] group-hover:text-black" />
              </div>
              <div className="text-left">
                <span className="block text-3xl font-black uppercase tracking-tighter">⚡ Ação</span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Tarefa / Rotina</span>
              </div>
            </button>

            <button 
              onClick={() => setMode('memory')}
              className="group relative h-48 rounded-3xl border-2 border-white/10 bg-zinc-900/50 p-8 flex items-center gap-6 hover:bg-[#ff00ff] hover:text-black transition-all active:scale-95 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#ff00ff]/10 flex items-center justify-center group-hover:bg-black/10">
                <Brain size={48} className="text-[#ff00ff] group-hover:text-black" />
              </div>
              <div className="text-left">
                <span className="block text-3xl font-black uppercase tracking-tighter">🧠 Memória</span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Anotação / Lista</span>
              </div>
            </button>

            <button 
              onClick={handleClose}
              className="mt-4 text-xs font-black uppercase tracking-[0.4em] text-zinc-500 hover:text-white flex items-center justify-center gap-3 py-4"
            >
              <X size={18} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {isOpen && mode === 'memory' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-zinc-950 border-4 border-white p-6 shadow-[0_0_50px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff00ff]">Nova Memória</span>
              <button onClick={() => setMode('choice')} className="text-zinc-500 hover:text-white flex items-center gap-1 font-black text-[10px] uppercase">
                <ArrowLeft size={14} /> Voltar
              </button>
            </div>

            <div className="space-y-4">
              <Input
                autoFocus
                value={memoryData.titulo}
                onChange={(e) => setMemoryData({ ...memoryData, titulo: e.target.value })}
                placeholder="TÍTULO DA ANOTAÇÃO"
                className="bg-transparent border-none text-2xl font-black placeholder:text-zinc-800 focus-visible:ring-0 p-0 h-auto uppercase tracking-tighter"
              />
              
              <Textarea
                value={memoryData.conteudo}
                onChange={(e) => setMemoryData({ ...memoryData, conteudo: e.target.value })}
                placeholder="CONTEÚDO / DETALHES..."
                className="bg-zinc-900/50 border-2 border-zinc-900 text-sm font-bold placeholder:text-zinc-700 focus:border-[#ff00ff] p-4 min-h-[150px] resize-none transition-all rounded-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 ml-1">Projeto</label>
                  <Select 
                    value={memoryData.projeto_id} 
                    onValueChange={(v) => setMemoryData({ ...memoryData, projeto_id: v })}
                  >
                    <SelectTrigger className={cn(
                      "bg-zinc-900 border-zinc-800 h-10 rounded-none font-bold text-[10px] uppercase transition-colors",
                      !memoryData.projeto_id && "text-zinc-600 border-dashed"
                    )}>
                      <SelectValue placeholder="Escolher Pasta de Destino" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none z-[9999]">
                      {CORE_PROJECTS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 ml-1">Categoria</label>
                  <div className="flex gap-1">
                    {[
                      { id: 'notes', icon: ClipboardList, color: '#3b82f6' },
                      { id: 'lists', icon: Folder, color: '#eab308' },
                      { id: 'reading', icon: Book, color: '#22c55e' },
                      { id: 'ideas', icon: Lightbulb, color: '#a855f7' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setMemoryData({ ...memoryData, categoria: cat.id })}
                        className={cn(
                          "flex-1 h-10 border-2 flex items-center justify-center transition-all",
                          memoryData.categoria === cat.id ? "bg-white text-black border-white" : "border-zinc-900 text-zinc-600 hover:border-zinc-700"
                        )}
                        title={cat.id}
                      >
                        <cat.icon size={16} style={{ color: memoryData.categoria === cat.id ? 'black' : cat.color }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleAddMemory}
                disabled={!memoryData.titulo || !memoryData.projeto_id}
                className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-sm transition-all rounded-none disabled:opacity-20 mt-4"
              >
                Arquivar no Cofre
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddTaskOverlay
        open={isOpen && mode === 'action'}
        onClose={handleClose}
        onAddTask={handleAddTask}
      />
    </>
  );
};