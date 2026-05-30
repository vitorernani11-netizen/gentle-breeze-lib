import { saveToLocal, loadFromLocal } from '@/lib/storage';
import { toast } from 'sonner';
import { getWeekdayString, getNextWeekdayDate, getTodayStr } from '@/utils/dateHelpers';
import { computeRecurrenceDate, Recurrence } from '@/utils/nlpParser';
import { format } from 'date-fns';

const TASKS_KEY = 'hardware_humano_data';

export const useTaskActions = (onSuccess?: () => void) => {
  const completeTask = (task: any) => {
    if (!task?.id) {
      toast.error('Erro de integridade: ID da tarefa não encontrado.');
      return;
    }

    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const updatedTasks = allTasks.map((t: any) => {
        if (t.id === task.id) {
          // 1) Novo modelo: recorrencia_tipo + recorrencia_dias
          if (t.recorrencia_tipo) {
            const rec: Recurrence = {
              type: t.recorrencia_tipo,
              weekdays: t.recorrencia_dias || undefined,
            };
            // Baseline = data atual da tarefa (parse local sem timezone shift)
            let baseline = new Date();
            if (t.data_execucao && typeof t.data_execucao === 'string') {
              const [y, mo, d] = t.data_execucao.split('T')[0].split('-').map(Number);
              if (y && mo && d) baseline = new Date(y, mo - 1, d);
            }
            const nextDate = computeRecurrenceDate(rec, baseline, true);
            const nextStr = format(nextDate, 'yyyy-MM-dd');
            toast.success(`Rotina: próxima execução ${format(nextDate, 'dd/MM')}`);
            return {
              ...t,
              data_execucao: nextStr,
              ultimo_processamento: todayStr,
              status_concluido: false,
            };
          }

          // 2) Legado: recorrencia_semanal (string única)
          if (t.recorrencia_semanal) {
            const nextDate = getNextWeekdayDate(t.recorrencia_semanal);
            toast.success(`Rotina agendada para: ${nextDate}`);
            return {
              ...t,
              data_execucao: nextDate,
              ultimo_processamento: todayStr,
              status_concluido: false,
            };
          }

          
          // Lógica de Repetição Antiga (Mantendo por compatibilidade)
          if (t.repeticao && t.repeticao !== 'none') {
            try {
              if (!t.data_execucao || typeof t.data_execucao !== 'string') {
                throw new Error('Data de execução ausente ou inválida');
              }
              const dateString = String(t.data_execucao || '');
              const [year, month, day] = dateString.includes('-') ? dateString.split('-').map(Number) : [NaN, NaN, NaN];
              const currentDate = new Date(year, month - 1, day);
              
              if (isNaN(currentDate.getTime())) throw new Error('Data inválida');

              let nextDate = new Date(currentDate);
              if (t.repeticao === 'daily') nextDate.setDate(currentDate.getDate() + 1);
              if (t.repeticao === 'weekly') nextDate.setDate(currentDate.getDate() + 7);
              if (t.repeticao === 'monthly') nextDate.setMonth(currentDate.getMonth() + 1);

              const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
              
              toast.success(`Recorrência: ${nextDate.toLocaleDateString('pt-BR')}`);
              return { ...t, data_execucao: nextDateStr, status: t.status };
            } catch (dateError) {
              console.error('Erro no cálculo de recorrência:', dateError);
              toast.error('Erro ao calcular próxima data. Resetando para hoje.');
              return { ...t, data_execucao: todayStr, status: 'Hoje' };
            }
          } else {
            toast.success('Tarefa concluída!');
            return { ...t, status_concluido: true };
          }
        }
        return t;
      });

      saveToLocal(TASKS_KEY, updatedTasks);
      window.dispatchEvent(new Event('storage'));
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
        const today = getTodayStr();
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
      window.dispatchEvent(new Event('storage'));
      console.log('[Task:Reschedule]', { 
        taskId: task.id, 
        oldDate: task.data_execucao, 
        newDate: newDate || getTodayStr() 
      });
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
      const today = getTodayStr();
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
      window.dispatchEvent(new Event('storage'));
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
        t.id === id ? { ...t, fase_pipeline: stage } : t
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

  const updateTask = (taskId: string, updates: Record<string, any>) => {
    if (!taskId) return;
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const updatedTasks = allTasks.map((t: any) =>
        t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      );
      saveToLocal(TASKS_KEY, updatedTasks);
      window.dispatchEvent(new Event('storage'));
      console.log('[Task:Update]', { taskId, updates });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Falha ao salvar alterações no hardware.');
    }
  };

  const addTask = (taskData: any) => {
    // Sync Check: Validação de campos obrigatórios (data é opcional — tarefas sem data vão para Entrada)
    if (!taskData.titulo) {
      toast.error('Erro de integridade: Título obrigatório.');
      return null;
    }

    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const newTask = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_concluido: false,
        fase_pipeline: taskData.fase_pipeline || 1,
        user_id: 'local-user',
        tags: [],
        titulo: taskData.titulo,
        descricao: taskData.descricao || '',
        prioridade: taskData.prioridade || 'P4',
        data_execucao: taskData.data_execucao || null,
        repeticao: taskData.repeticao || 'none',
        recorrencia_semanal: taskData.recorrencia_semanal || null,
        recorrencia_tipo: taskData.recorrencia_tipo || null,
        recorrencia_dias: taskData.recorrencia_dias || null,
        ultimo_processamento: null,
        lembrete: taskData.lembrete || null,
        lembretes: taskData.lembretes || [],
        reminders: taskData.reminders || [],
        hora_vencimento: taskData.hora_vencimento || null,
        status: taskData.status || 'Entrada'
      };
      
      const updatedTasks = [newTask, ...allTasks];
      saveToLocal(TASKS_KEY, updatedTasks);
      window.dispatchEvent(new Event('storage'));
      console.log('[Hardware:Sync]', updatedTasks.length);
      if (onSuccess) onSuccess();
      return newTask;
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error('Erro ao salvar nova tarefa.');
      return null;
    }
  };

  const checkAndRouteRecurringTasks = () => {
    try {
      const allTasks = loadFromLocal(TASKS_KEY) || [];
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const currentWeekday = getWeekdayString(today);
      let changed = false;

      const updatedTasks = allTasks.map((task: any) => {
        if (task.recorrencia_semanal === currentWeekday && task.ultimo_processamento !== todayStr) {
          console.log('[Task:RecurringInit]', { taskId: task.id, title: task.titulo });
          changed = true;
          return {
            ...task,
            data_execucao: todayStr,
            fase_pipeline: 1, // Volta para Entrada
            ultimo_processamento: todayStr,
            status_concluido: false
          };
        }
        return task;
      });

      if (changed) {
        saveToLocal(TASKS_KEY, updatedTasks);
        window.dispatchEvent(new Event('storage'));
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Erro no processamento de rotinas:', error);
    }
  };

  return { 
    completeTask, 
    rescheduleTask, 
    moveTask, 
    updateTriagemStage, 
    restoreTask, 
    deletePermanent, 
    updateTask, 
    addTask,
    checkAndRouteRecurringTasks
  };
};
