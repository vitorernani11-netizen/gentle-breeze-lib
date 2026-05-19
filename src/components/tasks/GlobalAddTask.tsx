import React, { useState } from 'react';
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

const PROJECTS_KEY = 'hardware_humano_projects';

export const GlobalAddTask: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'choice' | 'action' | 'memory'>('choice');
  const [memoryData, setMemoryData] = useState({ titulo: '', conteudo: '', projeto_id: '', categoria: 'notes' });
  const { addTask } = useTaskActions();
  const { addVaultItem } = useVaultActions();
  
  const projects = loadFromLocal(PROJECTS_KEY) || [];

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
    prioridade: number;
    lembrete: string | null;
    reminders: any[];
    descricao?: string;
    hora_vencimento?: string | null;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const status = taskData.vencimento === today ? 'Hoje' : 'Entrada';

    const task = addTask({
      titulo: taskData.titulo,
      descricao: taskData.descricao || '',
      repeticao: taskData.recorrencia || 'none',
      data_execucao: taskData.vencimento,
      prioridade: taskData.prioridade || 4,
      status: status,
      lembrete: taskData.lembrete,
      reminders: taskData.reminders || [],
      hora_vencimento: taskData.hora_vencimento
    });

    if (task) {
      toast.success(`Tarefa em ${status}`, {
        className: 'bg-black border-2 border-[#00ff41] text-[#00ff41] font-mono'
      });
      handleClose();
    }
  };

  const handleAddMemory = () => {
    if (!memoryData.titulo) return;
    
    const item = addVaultItem({
      titulo: memoryData.titulo,
      conteudo: memoryData.conteudo,
      projeto_id: memoryData.projeto_id === 'none' ? null : memoryData.projeto_id,
      categoria: memoryData.categoria
    });

    if (item) {
      toast.success('Memória arquivada no Cofre');
      handleClose();
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black border-2 shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:scale-110 hover:bg-[#ff00ff] transition-all z-[90] flex items-center justify-center p-0 text-gray-50 border-slate-700"
        aria-label="Adicionar nova tarefa ou memória"
      >
        <Plus size={32} strokeWidth={3} />
      </Button>

      {isOpen && mode === 'choice' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setMode('action')}
              className="group relative h-64 border-4 border-white bg-black p-8 flex flex-col items-center justify-center gap-6 hover:bg-[#00ff41] hover:text-black transition-all active:scale-95"
            >
              <Zap size={64} className="group-hover:animate-bounce" />
              <div className="text-center">
                <span className="block text-2xl font-black uppercase tracking-tighter">⚡ Ação</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Tarefa / Rotina</span>
              </div>
            </button>

            <button 
              onClick={() => setMode('memory')}
              className="group relative h-64 border-4 border-white bg-black p-8 flex flex-col items-center justify-center gap-6 hover:bg-[#ff00ff] hover:text-black transition-all active:scale-95"
            >
              <Brain size={64} className="group-hover:animate-pulse" />
              <div className="text-center">
                <span className="block text-2xl font-black uppercase tracking-tighter">🧠 Memória</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Anotação / Lista</span>
              </div>
            </button>

            <button 
              onClick={handleClose}
              className="sm:col-span-2 mt-4 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 hover:text-white flex items-center justify-center gap-2"
            >
              <X size={14} /> Cancelar
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
                    value={memoryData.projeto_id || 'none'} 
                    onValueChange={(v) => setMemoryData({ ...memoryData, projeto_id: v })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-10 rounded-none font-bold text-[10px] uppercase">
                      <SelectValue placeholder="Selecione o Projeto" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 rounded-none">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {projects.map((p: any) => (
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
                disabled={!memoryData.titulo}
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