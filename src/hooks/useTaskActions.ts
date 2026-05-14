import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTaskActions = (onSuccess?: () => void) => {
  const completeTask = async (task: any) => {
    // If it's recurring, we don't just "complete" it, we move it to the next date
    if (task.repeticao && task.repeticao !== 'none') {
      const currentDate = new Date(task.data_execucao);
      let nextDate = new Date(currentDate);

      if (task.repeticao === 'daily') nextDate.setDate(currentDate.getDate() + 1);
      if (task.repeticao === 'weekly') nextDate.setDate(currentDate.getDate() + 7);
      if (task.repeticao === 'monthly') nextDate.setMonth(currentDate.getMonth() + 1);

      const nextDateStr = nextDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('tarefas')
        .update({ 
          data_execucao: nextDateStr,
          status: 'Hoje' // Garante que a próxima recorrência seja marcada para Hoje na data devida
        })
        .eq('id', task.id);

      if (!error) {
        toast.success(`Recorrência agendada para ${nextDate.toLocaleDateString('pt-BR')}`);
        if (onSuccess) onSuccess();
      } else {
        toast.error('Erro ao processar recorrência');
      }
    } else {
      const { error } = await supabase
        .from('tarefas')
        .update({ status_concluido: true })
        .eq('id', task.id);

      if (!error) {
        toast.success('Tarefa concluída!');
        if (onSuccess) onSuccess();
      } else {
        toast.error('Erro ao concluir tarefa');
      }
    }
  };

  const rescheduleTask = async (task: any, newDate?: string) => {
    const newCount = (task.contagem_adiamentos || 0) + 1;
    
    if (newCount >= 3) {
      // Hard delete after 3 postponements
      const { error } = await supabase
        .from('tarefas')
        .update({ 
          deletado_por_inercia: true,
          status_concluido: true // Mark as finished but flagged as inertia
        })
        .eq('id', task.id);

      if (!error) {
        toast.error(`Tarefa "${task.titulo}" eliminada por inércia.`, {
          style: { background: '#7f1d1d', color: '#fff', border: 'none' }
        });
        if (onSuccess) onSuccess();
      }
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const targetDate = newDate || today;

    const { error } = await supabase
      .from('tarefas')
      .update({ 
        data_execucao: targetDate, 
        status: targetDate === today ? 'Hoje' : 'Agendada',
        contagem_adiamentos: newCount,
        data_adiamento: new Date().toISOString()
      })
      .eq('id', task.id);

    if (!error) {
      toast.warning(`Reagendada para ${new Date(targetDate).toLocaleDateString('pt-BR')}. Aviso: ${newCount}/3 adiamentos.`);
      if (onSuccess) onSuccess();
    }
  };

  const moveTask = async (id: string, status: 'Hoje' | 'Amanha') => {
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

    if (!error) {
      toast.success(status === 'Hoje' ? 'Movida para Hoje' : 'Movida para Amanhã');
      if (onSuccess) onSuccess();
    }
  };

  return { completeTask, rescheduleTask, moveTask };
};
