import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, setHours, setMinutes, startOfToday } from 'date-fns';

export interface NLPMatch {
  detected: boolean;
  match: string;
  index: number;
  duration: number; // length of the match
  type: 'date' | 'time' | 'recurrence';
}

export interface NLPResult {
  text: string;
  dueDate: Date | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  recorrencia_semanal: string | null;
  reminderTime: string | null;
  detectedPatterns: string[];
  matches: NLPMatch[];
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let dueDate: Date | null = null;
  let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';
  let recorrencia_semanal: string | null = null;
  let reminderTime: string | null = null;
  const detectedPatterns: string[] = [];
  const matches: NLPMatch[] = [];

  const patterns = [
    // Recurrence
    { regex: /todo dia (\d{1,2})/gi, recurrence: 'monthly', type: 'recurrence' as const },
    { regex: /todo dia/gi, recurrence: 'daily', type: 'recurrence' as const },
    { regex: /toda segunda/gi, recurrence: 'weekly', daySetter: nextMonday, weekday: 'segunda', type: 'recurrence' as const },
    { regex: /toda terça/gi, recurrence: 'weekly', daySetter: nextTuesday, weekday: 'terça', type: 'recurrence' as const },
    { regex: /toda quarta/gi, recurrence: 'weekly', daySetter: nextWednesday, weekday: 'quarta', type: 'recurrence' as const },
    { regex: /toda quinta/gi, recurrence: 'weekly', daySetter: nextThursday, weekday: 'quinta', type: 'recurrence' as const },
    { regex: /toda sexta/gi, recurrence: 'weekly', daySetter: nextFriday, weekday: 'sexta', type: 'recurrence' as const },
    { regex: /todo sábado/gi, recurrence: 'weekly', daySetter: nextSaturday, weekday: 'sábado', type: 'recurrence' as const },
    { regex: /todo domingo/gi, recurrence: 'weekly', daySetter: nextSunday, weekday: 'domingo', type: 'recurrence' as const },
    
    // Relative dates
    { regex: /\bhoje\b/gi, dateOffset: 0, type: 'date' as const },
    { regex: /\bamandhã\b/gi, dateOffset: 1, type: 'date' as const }, // typo common
    { regex: /\bamanhã\b/gi, dateOffset: 1, type: 'date' as const },
    { regex: /\bsegunda\b/gi, daySetter: nextMonday, type: 'date' as const },
    { regex: /\bterça\b/gi, daySetter: nextTuesday, type: 'date' as const },
    { regex: /\bquarta\b/gi, daySetter: nextWednesday, type: 'date' as const },
    { regex: /\bquinta\b/gi, daySetter: nextThursday, type: 'date' as const },
    { regex: /\bsexta\b/gi, daySetter: nextFriday, type: 'date' as const },
    { regex: /\bsábado\b/gi, daySetter: nextSaturday, type: 'date' as const },
    { regex: /\bdomingo\b/gi, daySetter: nextSunday, type: 'date' as const },
    { regex: /\bdia (\d{1,2})\b/gi, type: 'date' as const },
    
    // Time
    { regex: /(?:às|as|at|@)\s*(\d{1,2})h(\d{2})?/gi, isTime: true, type: 'time' as const },
    { regex: /(?:às|as|at|@)\s*(\d{1,2}):(\d{2})/gi, isTime: true, type: 'time' as const },
    { regex: /\b(\d{1,2})h(\d{2})?\b/gi, isTime: true, type: 'time' as const },
    { regex: /\b(\d{1,2}):(\d{2})\b/gi, isTime: true, type: 'time' as const },
    { regex: /\bmeio dia\b/gi, isTime: true, specialTime: '12:00', type: 'time' as const },
    { regex: /\bmeia noite\b/gi, isTime: true, specialTime: '00:00', type: 'time' as const },
  ];

  patterns.forEach(p => {
    let match;
    p.regex.lastIndex = 0;
    while ((match = p.regex.exec(input)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;
      
      detectedPatterns.push(matchText);
      matches.push({
        detected: true,
        match: matchText,
        index: matchIndex,
        duration: matchText.length,
        type: p.type as any
      });
      
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
      
      // Handle "dia 25"
      if (p.regex.source.includes('dia (\\d{1,2})') && !p.recurrence && !dueDate) {
        const day = parseInt(match[1]);
        const targetDate = new Date();
        targetDate.setDate(day);
        if (targetDate < new Date()) {
          targetDate.setMonth(targetDate.getMonth() + 1);
        }
        dueDate = targetDate;
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

  // Keep matches sorted by index for easier UI rendering if needed
  matches.sort((a, b) => a.index - b.index);

  detectedPatterns.forEach(pattern => {
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapedPattern, 'gi'), '').trim();
  });

  text = text.replace(/\s\s+/g, ' ').trim();

  if (detectedPatterns.length > 0) {
    console.log('[NLP:Detect]', { rawText: input, parsedDate: dueDate, reminderTime, recurrence, recorrencia_semanal, text, matches });
  }

  return {
    text: text || input,
    dueDate,
    recurrence,
    recorrencia_semanal,
    reminderTime,
    detectedPatterns,
    matches
  };
};
