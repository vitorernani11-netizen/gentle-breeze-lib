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
    // Regra de Blindagem: Se não possuir data_execucao válida ou data_vencimento
    const rawDate = task.data_execucao || task.data_vencimento;
    if (!rawDate) {
      const dateKey = 'indefinida';
      if (!groups[dateKey]) {
        groups[dateKey] = {
          id: dateKey,
          label: 'DATA INDEFINIDA',
          dateDisplay: '',
          tasks: [],
          isTomorrow: false,
        };
      }
      groups[dateKey].tasks.push(task);
      return;
    }
    
    const taskDate = parseISO(rawDate);
    const dateKey = rawDate.split('T')[0];

    if (!groups[dateKey]) {
      let label = '';
      const tomorrow = addDays(today, 1);
      const nextWeek = addDays(today, 7);

      if (isTomorrow(taskDate)) {
        label = 'AMANHÃ';
      } else if (isAfter(taskDate, today) && !isAfter(taskDate, nextWeek)) {
        label = format(taskDate, 'EEEE', { locale: ptBR }).toUpperCase();
      } else {
        // Use a lógica solicitada: d 'de' MMMM
        label = format(taskDate, "d 'de' MMMM", { locale: ptBR }).toUpperCase();
      }

      groups[dateKey] = {
        id: dateKey,
        label,
        dateDisplay: format(taskDate, 'dd MMM', { locale: ptBR }).toUpperCase(),
        tasks: [],
        isTomorrow: isTomorrow(taskDate),
      };
    }

    groups[dateKey].tasks.push(task);
  });

  return Object.values(groups).sort((a, b) => {
    if (a.id === 'indefinida') return 1;
    if (b.id === 'indefinida') return -1;
    return a.id.localeCompare(b.id);
  });
};
