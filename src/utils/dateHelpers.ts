import { format, isTomorrow, isAfter, addDays, startOfToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DateGroup {
  id: string;
  label: string;
  dateDisplay: string;
  tasks: any[];
  isTomorrow: boolean;
}

export const groupTasksByDate = (tasks: any[]): DateGroup[] => {
  const groups: Record<string, DateGroup> = {};
  const today = startOfToday();

  tasks.forEach((task) => {
    if (!task.data_execucao) return;
    
    const taskDate = parseISO(task.data_execucao);
    const dateKey = task.data_execucao; // YYYY-MM-DD

    if (!groups[dateKey]) {
      let label = '';
      let dateDisplay = '';
      const tomorrow = addDays(today, 1);
      const nextWeek = addDays(today, 7);

      if (isTomorrow(taskDate)) {
        label = 'AMANHÃ';
        dateDisplay = format(taskDate, 'dd MMM', { locale: ptBR }).toUpperCase();
      } else if (isAfter(taskDate, today) && !isAfter(taskDate, nextWeek)) {
        label = format(taskDate, 'EEEE', { locale: ptBR }).toUpperCase();
        dateDisplay = format(taskDate, 'dd MMM', { locale: ptBR }).toUpperCase();
      } else {
        label = format(taskDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
        dateDisplay = format(taskDate, 'dd MMM', { locale: ptBR }).toUpperCase();
      }

      groups[dateKey] = {
        id: dateKey,
        label,
        dateDisplay,
        tasks: [],
        isTomorrow: isTomorrow(taskDate),
      };
    }

    groups[dateKey].tasks.push(task);
  });

  // Sort groups by date key
  return Object.values(groups).sort((a, b) => a.id.localeCompare(b.id));
};
