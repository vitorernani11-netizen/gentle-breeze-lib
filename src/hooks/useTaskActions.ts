import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { toast } from 'sonner';

const TASKS_KEY = 'hardware_humano_tasks';

export const useTaskActions = (onSuccess?: () => void) => {
  const completeTask = (task: any) => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.map((t: any) => {
        if (t.id === task.id) {
          if (task.repeticao && task.repeticao !== 'none') {
            const [year, month, day] = t.data_execucao.split('-').map(Number);
            const currentDate = new Date(year, month - 1, day);
            let nextDate = new Date(currentDate);

            if (task.repeticao === 'daily') nextDate.setDate(currentDate.getDate() + 1);
            if (task.repeticao === 'weekly') nextDate.setDate(currentDate.getDate() + 7);
            if (task.repeticao === 'monthly') nextDate.setMonth(currentDate.getMonth() + 1);

            const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
            
            toast.success(`Recorrência agendada para ${nextDate.toLocaleDateString('pt-BR')}`);
            return { ...t, data_execucao: nextDateStr, status: 'Hoje' };
          } else {
            toast.success('Tarefa concluída!');
            return { ...t, status_concluido: true };
          }
        }
        return t;
      });

      saveToLocal(TASKS_KEY, updatedTasks);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  const rescheduleTask = (task: any, newDate?: string) => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const newCount = (task.contagem_adiamentos || 0) + 1;
      
      let updatedTasks;
      if (newCount >= 3) {
        updatedTasks = allTasks.filter((t: any) => t.id !== task.id);
        toast.error('Tarefa deletada por inércia', {
          style: { background: '#7f1d1d', color: '#fff', border: 'none' },
          description: `"${task.titulo}" atingiu o limite de 3 reagendamentos.`
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        const targetDate = newDate || today;
        
        updatedTasks = allTasks.map((t: any) => {
          if (t.id === task.id) {
            return {
              ...t,
              data_execucao: targetDate,
              status: targetDate === today ? 'Hoje' : 'Amanha',
              contagem_adiamentos: newCount,
              data_adiamento: new Date().toISOString()
            };
          }
          return t;
        });
        toast.warning(`Reagendada para ${new Date(targetDate).toLocaleDateString('pt-BR')}. Aviso: ${newCount}/3 adiamentos.`);
      }

      saveToLocal(TASKS_KEY, updatedTasks);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao reagendar tarefa:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  const moveTask = (id: string, status: 'Hoje' | 'Amanha') => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const updatedTasks = allTasks.map((t: any) => {
        if (t.id === id) {
          return {
            ...t,
            status: status,
            data_execucao: status === 'Hoje' ? today : tomorrowStr
          };
        }
        return t;
      });

      saveToLocal(TASKS_KEY, updatedTasks);
      toast.success(status === 'Hoje' ? 'Movida para Hoje' : 'Movida para Amanhã');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  return { completeTask, rescheduleTask, moveTask };
};
