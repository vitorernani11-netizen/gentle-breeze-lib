import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, setHours, setMinutes, startOfToday } from 'date-fns';

export interface NLPResult {
  text: string;
  dueDate: Date | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recorrencia_semanal: string | null;
  reminderTime: string | null;
  detectedPatterns: string[];
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let dueDate: Date | null = null;
  let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';
  let recorrencia_semanal: string | null = null;
  let reminderTime: string | null = null;
  const detectedPatterns: string[] = [];

  const now = new Date();

  const patterns = [
    // Recurrence
    { regex: /todo dia (\d{1,2})/gi, recurrence: 'monthly' },
    { regex: /todo dia/gi, recurrence: 'daily' },
    { regex: /toda segunda/gi, recurrence: 'weekly', daySetter: nextMonday, weekday: 'segunda' },
    { regex: /toda terça/gi, recurrence: 'weekly', daySetter: nextTuesday, weekday: 'terça' },
    { regex: /toda quarta/gi, recurrence: 'weekly', daySetter: nextWednesday, weekday: 'quarta' },
    { regex: /toda quinta/gi, recurrence: 'weekly', daySetter: nextThursday, weekday: 'quinta' },
    { regex: /toda sexta/gi, recurrence: 'weekly', daySetter: nextFriday, weekday: 'sexta' },
    { regex: /todo sábado/gi, recurrence: 'weekly', daySetter: nextSaturday, weekday: 'sábado' },
    { regex: /todo domingo/gi, recurrence: 'weekly', daySetter: nextSunday, weekday: 'domingo' },
    
    // Relative dates
    { regex: /\bhoje\b/gi, dateOffset: 0 },
    { regex: /\bamandhã\b/gi, dateOffset: 1 }, // typo common
    { regex: /\bamanhã\b/gi, dateOffset: 1 },
    
    // Time
    { regex: /(?:às|as|at|@)\s*(\d{1,2})h(\d{2})?/gi, isTime: true },
    { regex: /(?:às|as|at|@)\s*(\d{1,2}):(\d{2})/gi, isTime: true },
    { regex: /\b(\d{1,2})h(\d{2})?\b/gi, isTime: true },
    { regex: /\bmeio dia\b/gi, isTime: true, specialTime: '12:00' },
    { regex: /\bmeia noite\b/gi, isTime: true, specialTime: '00:00' },
  ];

  patterns.forEach(p => {
    let match;
    p.regex.lastIndex = 0;
    while ((match = p.regex.exec(input)) !== null) {
      detectedPatterns.push(match[0]);
      
      if (p.recurrence) {
        recurrence = p.recurrence as any;
      }
      
      if (p.weekday) {
        recorrencia_semanal = p.weekday;
      }

      if (p.dateOffset !== undefined && !dueDate) {
        dueDate = addDays(startOfToday(), p.dateOffset);
      }

      if (p.daySetter && !dueDate) {
        dueDate = p.daySetter(new Date());
      }

      if (p.isTime && !reminderTime) {
        if (p.specialTime) {
          reminderTime = p.specialTime;
        } else {
          const hour = parseInt(match[1]);
          const minutes = match[2] || '00';
          reminderTime = `${String(hour).padStart(2, '0')}:${minutes}`;
        }
      }
    }
  });

  detectedPatterns.forEach(pattern => {
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapedPattern, 'gi'), '').trim();
  });

  text = text.replace(/\s\s+/g, ' ').trim();

  if (detectedPatterns.length > 0) {
    console.log('[NLP:Detect]', { rawText: input, parsedDate: dueDate, reminderTime, recurrence, recorrencia_semanal, text });
  }

  return {
    text: text || input,
    dueDate,
    recurrence,
    recorrencia_semanal,
    reminderTime,
    detectedPatterns
  };
};
