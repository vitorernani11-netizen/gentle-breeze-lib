import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTaskActions = (onSuccess?: () => void) => {
  const completeTask = async (task: any) => {
    try {
      // If it's recurring, we don't just "complete" it, we move it to the next date
      if (task.repeticao && task.repeticao !== 'none') {
        const [year, month, day] = task.data_execucao.split('-').map(Number);
        const currentDate = new Date(year, month - 1, day);
        let nextDate = new Date(currentDate);

        if (task.repeticao === 'daily') nextDate.setDate(currentDate.getDate() + 1);
        if (task.repeticao === 'weekly') nextDate.setDate(currentDate.getDate() + 7);
        if (task.repeticao === 'monthly') nextDate.setMonth(currentDate.getMonth() + 1);

        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

        const { error } = await supabase
          .from('tarefas')
          .update({ 
            data_execucao: nextDateStr,
            status: 'Hoje'
          })
          .eq('id', task.id);

        if (error) throw error;
        toast.success(`Recorrência agendada para ${nextDate.toLocaleDateString('pt-BR')}`);
      } else {
        const { error } = await supabase
          .from('tarefas')
          .update({ status_concluido: true })
          .eq('id', task.id);

        if (error) throw error;
        toast.success('Tarefa concluída!');
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  const rescheduleTask = async (task: any, newDate?: string) => {
    try {
      const newCount = (task.contagem_adiamentos || 0) + 1;
      
      if (newCount >= 3) {
        const { error } = await supabase
          .from('tarefas')
          .delete()
          .eq('id', task.id);

        if (error) throw error;
        toast.error('Tarefa deletada por inércia', {
          style: { background: '#7f1d1d', color: '#fff', border: 'none' },
          description: `"${task.titulo}" atingiu o limite de 3 reagendamentos.`
        });
        if (onSuccess) onSuccess();
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const targetDate = newDate || today;
      
      const { error } = await supabase
        .from('tarefas')
        .update({ 
          data_execucao: targetDate, 
          status: targetDate === today ? 'Hoje' : 'Amanha',
          contagem_adiamentos: newCount,
          data_adiamento: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;
      toast.warning(`Reagendada para ${new Date(targetDate).toLocaleDateString('pt-BR')}. Aviso: ${newCount}/3 adiamentos.`);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao reagendar tarefa:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  const moveTask = async (id: string, status: 'Hoje' | 'Amanha') => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { error } = await supabase
        .from('tarefas')
        .update({ 
          status: status, 
          data_execucao: status === 'Hoje' ? today : tomorrowStr 
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(status === 'Hoje' ? 'Movida para Hoje' : 'Movida para Amanhã');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao salvar no hardware');
    }
  };

  return { completeTask, rescheduleTask, moveTask };
};
