import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ReminderManager, type Reminder } from './ReminderManager';

import {
  Calendar,
  Clock,
  Flag,
  Save,
  X
} from 'lucide-react';

import { persistToHardware, hasUnsavedChanges } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Record<string, any>) => void;
}

const PRIORITIES = [
  { value: 'P1', label: 'P1', color: 'text-red-500 border-red-500' },
  { value: 'P2', label: 'P2', color: 'text-orange-500 border-orange-500' },
  { value: 'P3', label: 'P3', color: 'text-blue-500 border-blue-500' },
  { value: 'P4', label: 'P4', color: 'text-zinc-500 border-zinc-700' },
];

export function TaskDetailModal({ task, open, onClose, onUpdate }: TaskDetailModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<string>('P4');
  const [dataExecucao, setDataExecucao] = useState('');
  const [lembrete, setLembrete] = useState('');
  const [lembretesState, setLembretesState] = useState<Reminder[]>([]);
  const [subTasks, setSubTasks] = useState<any[]>([]);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubTitulo, setNewSubTitulo] = useState('');
  
  const [isDirty, setIsDirty] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (task && open) {
      initRef.current = false;
      setTitulo(task.titulo || '');
      setDescricao(task.descricao || '');
      setPrioridade(task.prioridade || 'P4');
      setDataExecucao(task.data_execucao || '');
      let t = task.hora_vencimento || task.lembrete || '';
      if (t.includes('T')) t = t.split('T')[1];
      setLembrete(t.substring(0, 5));
      setLembretesState(task.lembretes || []);
      setSubTasks(task.sub_tasks || []);
      // mark as initialized after state apply
      setTimeout(() => { initRef.current = true; }, 0);
    }
    if (!open) initRef.current = false;

    const handleStorageUpdate = () => {
      setIsDirty(hasUnsavedChanges());
    };

    window.addEventListener('storage_update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage_update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [task, open]);

  const triggerSave = (updates: Record<string, any>) => {
    if (!task?.id) return;
    const tarefaAtualizada = {
      ...task,
      ...updates
    };
    onUpdate(task.id, tarefaAtualizada);
  };

  const forceGlobalSync = () => {
    setTimeout(() => {
      try {
        persistToHardware();
        window.dispatchEvent(new Event('storage_update'));
        if (typeof (window as any).onRefresh === 'function') {
          (window as any).onRefresh();
        }
      } catch (e) {}
    }, 100);
  };

  // Debounced save for text fields
  useEffect(() => {
    if (!open || !task?.id || !initRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSave({ titulo, descricao });
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, descricao]);

  if (!task) return null;

  const handlePriority = (p: string) => {
    setPrioridade(p);
    triggerSave({ prioridade: p });
    forceGlobalSync(); // Botão é de clique único, pode sincronizar na hora
  };

  const handleDate = (v: string) => {
    setDataExecucao(v);
    triggerSave({ data_execucao: v, data_vencimento: v });
  };

  const handleLembrete = (v: string) => {
    setLembrete(v);
    triggerSave({ hora_vencimento: v || null });
  };

  const handleClearSchedule = () => {
    setDataExecucao('');
    setLembrete('');
    triggerSave({ data_execucao: null, data_vencimento: null, hora_vencimento: null });
    forceGlobalSync();
  };

  const currentPriority = PRIORITIES.find((p) => p.value === prioridade) || PRIORITIES[3];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-3xl w-full sm:w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 bg-black border-0 sm:border-2 border-white rounded-none sm:rounded-3xl overflow-hidden gap-0 flex flex-col z-[200]"
        onInteractOutside={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
            <span>Entrada / Detalhes</span>
          </div>
        </div>


        {/* Body: Single Column Todoist-Style Linear Flow */}
        <div className="flex flex-col overflow-y-auto flex-grow min-h-0 p-6 sm:p-8 space-y-6 w-full">

          {/* 1. Bloco Isolado do Título (Limite de 3 Linhas) */}
          <div className="w-full block relative">
            <textarea
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 110) + 'px';
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
                }
              }}
              placeholder="Título da tarefa"
              rows={1}
              className="w-full bg-transparent border-none text-2xl md:text-3xl font-black uppercase tracking-tighter text-white p-0 focus:outline-none focus:ring-0 placeholder:text-zinc-800 break-words resize-none block"
              style={{
                minHeight: '40px',
                maxHeight: '110px',
                height: '40px',
                lineHeight: '36px',
                overflowY: 'auto',
              }}
            />
          </div>

          {/* 2. Descrição Colapsável */}
          <div className="w-full block min-h-[40px]">
            {isEditingDesc ? (
              <div className="space-y-3 block">
                <Textarea
                  autoFocus
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value);
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 180) + 'px';
                    }
                  }}
                  placeholder="Descrição da tarefa..."
                  className="w-full border border-zinc-800 bg-zinc-900/50 rounded-xl text-sm text-zinc-300 p-4 focus-visible:ring-1 focus-visible:ring-[#00ff41]/50 resize-none leading-relaxed placeholder:text-zinc-700 [overflow-wrap:anywhere] break-all whitespace-pre-wrap block"
                  style={{ minHeight: '120px', maxHeight: '180px', overflowY: 'auto' }}
                />
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className="cursor-pointer group rounded-xl hover:bg-zinc-900/20 p-2 -ml-2 transition-all block"
              >
                {descricao ? (
                  <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] break-all">
                    {descricao}
                  </p>
                ) : (
                  <p className="text-zinc-600 text-sm italic">Adicionar descrição...</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Metadados (Data, Hora, Prioridade) - Linha única nativa */}
          <div className="flex flex-wrap items-center gap-3 py-4 border-y border-zinc-900/60 w-full">
            {/* Data */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl px-3 py-2 text-sm font-bold text-white shrink-0">
              <Calendar size={14} className="text-zinc-500" />
              <input
                type="date"
                value={dataExecucao}
                onChange={(e) => handleDate(e.target.value)}
                onBlur={forceGlobalSync}
                className="bg-transparent border-0 text-sm font-bold text-white focus:outline-none w-auto min-w-[110px]"
              />
            </div>

            {/* Hora */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl px-3 py-2 text-sm font-bold text-white shrink-0">
              <Clock size={14} className="text-zinc-500" />
              <input
                type="time"
                value={lembrete || ''}
                onChange={(e) => handleLembrete(e.target.value)}
                onBlur={forceGlobalSync}
                className="bg-transparent border-0 text-sm font-bold text-white focus:outline-none w-auto min-w-[70px]"
              />
            </div>

            {/* Prioridade */}
            <button
              type="button"
              onClick={() => {
                const priorities = ['P4', 'P1', 'P2', 'P3'];
                const currentIndex = priorities.indexOf(prioridade);
                const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                handlePriority(nextPriority);
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 border rounded-xl transition-all active:scale-95 font-black text-xs uppercase bg-zinc-900/30 border-zinc-800 hover:border-current shrink-0',
                currentPriority.color
              )}
            >
              <Flag size={14} />
              {prioridade}
            </button>
          </div>

          {/* 4. Sub-tarefas (Estilo Todoist Linear) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-600">Sub-tarefas</h4>
            
            {/* Lista de Sub-tarefas existentes com recuo */}
            {subTasks.length > 0 && (
              <div className="space-y-1.5 ml-2 border-l border-zinc-900 pl-4 mb-3">
                {subTasks.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between group py-1 border-b border-zinc-950">
                    <div className="flex items-center gap-3 min-w-0 flex-grow">
                      <button
                        onClick={() => {
                          const updated = subTasks.map(s => s.id === sub.id ? { ...s, status_concluido: !s.status_concluido } : s);
                          setSubTasks(updated);
                          triggerSave({ sub_tasks: updated });
                          forceGlobalSync();
                        }}
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0",
                          sub.status_concluido 
                            ? "bg-[#00ff41] border-[#00ff41] text-black" 
                            : "border-zinc-800 hover:border-[#00ff41]"
                        )}
                      >
                        {sub.status_concluido && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                      <span className={cn(
                        "text-sm font-medium truncate pr-4 uppercase tracking-tight",
                        sub.status_concluido ? "line-through text-zinc-600 italic" : "text-zinc-300"
                      )}>
                        {sub.titulo}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = subTasks.filter(s => s.id !== sub.id);
                        setSubTasks(updated);
                        triggerSave({ sub_tasks: updated });
                        forceGlobalSync();
                      }}
                      className="text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-wider pr-1 shrink-0"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário Inline para Criar Sub-tarefa */}
            {isAddingSub ? (
              <div className="space-y-3 ml-2 border-l border-zinc-800 pl-4 animate-in fade-in slide-in-from-top-1">
                <Input
                  autoFocus
                  value={newSubTitulo}
                  onChange={(e) => setNewSubTitulo(e.target.value)}
                  placeholder="O que precisa ser feito?"
                  className="bg-zinc-900/40 border-zinc-800 rounded-xl text-sm text-white h-10 focus-visible:ring-1 focus-visible:ring-[#00ff41]/50 placeholder:text-zinc-700 uppercase font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubTitulo.trim()) {
                      const newSub = { id: Math.random().toString(36).substring(2, 11), titulo: newSubTitulo.trim(), status_concluido: false };
                      const updated = [...subTasks, newSub];
                      setSubTasks(updated);
                      triggerSave({ sub_tasks: updated });
                      setNewSubTitulo('');
                      setIsAddingSub(false);
                      forceGlobalSync();
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingSub(false);
                      setNewSubTitulo('');
                    }}
                    className="text-zinc-500 hover:text-white text-xs font-bold uppercase"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!newSubTitulo.trim()}
                    onClick={() => {
                      const newSub = { id: Math.random().toString(36).substring(2, 11), titulo: newSubTitulo.trim(), status_concluido: false };
                      const updated = [...subTasks, newSub];
                      setSubTasks(updated);
                      triggerSave({ sub_tasks: updated });
                      setNewSubTitulo('');
                      setIsAddingSub(false);
                      forceGlobalSync();
                    }}
                    className="bg-[#00ff41] hover:bg-[#00ff41]/80 text-black text-xs font-black uppercase rounded-lg px-3"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsAddingSub(true)}
                className="w-full justify-start border border-dashed border-zinc-900 text-zinc-500 hover:text-white hover:border-zinc-800 hover:bg-zinc-950/30 rounded-xl py-5 transition-all text-xs font-bold uppercase"
              >
                + Adicionar sub-tarefa
              </Button>
            )}
          </div>
          
          {/* 5. Lembretes Push */}
          <div className="pt-2">
            <ReminderManager 
              reminders={lembretesState} 
              onUpdate={(newReminders) => {
                setLembretesState(newReminders);
                triggerSave({ lembretes: newReminders });
                if (newReminders.length > (lembretesState.length || 0)) {
                  if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-900 px-6 py-4 flex items-center justify-end bg-black shrink-0">
          <button
            onClick={() => {
              // Persiste qualquer alteração pendente e força sync
              if (task?.id) {
                triggerSave({
                  titulo,
                  descricao,
                  prioridade,
                  data_execucao: dataExecucao || null,
                  data_vencimento: dataExecucao || null,
                  hora_vencimento: lembrete || null,
                  lembretes: lembretesState,
                  sub_tasks: subTasks,
                });
              }
              persistToHardware();
              setIsDirty(false);
              setIsEditingDesc(false);
              try {
                window.dispatchEvent(new Event('storage_update'));
                if (typeof (window as any).onRefresh === 'function') {
                  (window as any).onRefresh();
                }
              } catch (e) {}
              onClose();
            }}
            className="w-full sm:w-auto bg-[#00ff41] text-black font-black px-8 py-4 rounded-2xl border-b-4 border-black shadow-2xl active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic"
          >
            <Save size={20} strokeWidth={3} />
            Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">
        {icon}
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}