import React, { useState } from 'react';
import { Plus, Zap, Brain, X, ChevronRight, ClipboardList, Book, Lightbulb, Folder } from 'lucide-react';
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
  const { addTask } = useTaskActions();

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
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black border-2 shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:scale-110 hover:bg-[#ff00ff] transition-all z-[90] flex items-center justify-center p-0 text-gray-50 border-slate-700"
        aria-label="Adicionar nova tarefa"
      >
        <Plus size={32} strokeWidth={3} />
      </Button>

      <AddTaskOverlay
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onAddTask={handleAddTask}
      />
    </>
  );
};