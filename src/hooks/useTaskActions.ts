import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { toast } from 'sonner';

const TASKS_KEY = 'hardware_humano_data'; // Unificando conforme instrução de persistência local

export const useTaskActions = (onSuccess?: () => void) => {
  const completeTask = (task: any) => {
    if (!task?.id) {
      toast.error('Erro de integridade: ID da tarefa não encontrado.');
      return;
    }

    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.map((t: any) => {
        if (t.id === task.id) {
          if (task.repeticao && task.repeticao !== 'none') {
            try {
              if (!t.data_execucao || typeof t.data_execucao !== 'string') {
                throw new Error('Data de execução ausente ou inválida');
              }
              const dateString = String(t.data_execucao || '');
              const [year, month, day] = dateString.includes('-') ? dateString.split('-').map(Number) : [NaN, NaN, NaN];
              const currentDate = new Date(year, month - 1, day);
              
              if (isNaN(currentDate.getTime())) throw new Error('Data inválida');

              let nextDate = new Date(currentDate);
              if (task.repeticao === 'daily') nextDate.setDate(currentDate.getDate() + 1);
              if (task.repeticao === 'weekly') nextDate.setDate(currentDate.getDate() + 7);
              if (task.repeticao === 'monthly') nextDate.setMonth(currentDate.getMonth() + 1);

              const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
              
              toast.success(`Recorrência: ${nextDate.toLocaleDateString('pt-BR')}`);
              return { ...t, data_execucao: nextDateStr, status: t.status };
            } catch (dateError) {
              console.error('Erro no cálculo de recorrência:', dateError);
              toast.error('Erro ao calcular próxima data. Resetando para hoje.');
              return { ...t, data_execucao: new Date().toISOString().split('T')[0], status: 'Hoje' };
            }
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
      toast.error('Falha crítica ao atualizar tarefa no hardware.');
    }
  };

  const rescheduleTask = (task: any, newDate?: string) => {
    if (!task?.id) {
      toast.error('Identificador de tarefa inválido.');
      return;
    }

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
        toast.warning(`Reagendada (${newCount}/3 adiamentos)`);
      }

      saveToLocal(TASKS_KEY, updatedTasks);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao reagendar tarefa:', error);
      toast.error('Erro ao registrar reagendamento no hardware.');
    }
  };

  const moveTask = (id: string, status: 'Hoje' | 'Amanha') => {
    if (!id) return;

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
      toast.success(status === 'Hoje' ? 'Mover: Hoje' : 'Mover: Amanhã');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Falha na movimentação do pipeline.');
    }
  };

  const updateTriagemStage = (id: string, stage: number) => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.map((t: any) => 
        t.id === id ? { ...t, triagem_stage: stage } : t
      );
      saveToLocal(TASKS_KEY, updatedTasks);
      toast.success(`Pipeline: Estágio ${stage} ativado`);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Erro ao atualizar pipeline');
    }
  };

  const restoreTask = (id: string) => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.map((t: any) => 
        t.id === id ? { ...t, status_concluido: false } : t
      );
      saveToLocal(TASKS_KEY, updatedTasks);
      toast.success('Tarefa restaurada');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Erro ao restaurar tarefa');
    }
  };

  const deletePermanent = (id: string) => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.filter((t: any) => t.id !== id);
      saveToLocal(TASKS_KEY, updatedTasks);
      toast.success('Registro incinerado');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Erro ao incinerar registro');
    }
  };

  return { completeTask, rescheduleTask, moveTask, updateTriagemStage, restoreTask, deletePermanent };
};
