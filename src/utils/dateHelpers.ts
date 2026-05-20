import { format, isTomorrow, isAfter, addDays, startOfToday, parseISO, getDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getTodayStr = (): string => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
};


export interface DateGroup {
  id: string;
  label: string;
  dateDisplay: string;
  tasks: any[];
  isTomorrow: boolean;
}

export const weekdaysMap: Record<string, number> = {
  'domingo': 0,
  'segunda': 1,
  'terça': 2,
  'quarta': 3,
  'quinta': 4,
  'sexta': 5,
  'sábado': 6
};

export const getWeekdayString = (date: Date): string => {
  const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return days[date.getDay()];
};

export const getNextWeekdayDate = (weekday: string): string => {
  const targetDay = weekdaysMap[weekday.toLowerCase()];
  if (targetDay === undefined) return format(new Date(), 'yyyy-MM-dd');

  const today = new Date();
  let nextDate = addDays(today, 1);
  
  while (nextDate.getDay() !== targetDay) {
    nextDate = addDays(nextDate, 1);
  }
  
  return format(nextDate, 'yyyy-MM-dd');
};

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
