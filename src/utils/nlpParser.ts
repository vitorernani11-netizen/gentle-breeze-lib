import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, setHours, setMinutes, startOfToday } from 'date-fns';

export interface NLPResult {
  text: string;
  dueDate: Date | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderTime: string | null;
  detectedPatterns: string[];
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let dueDate: Date | null = null;
  let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';
  let reminderTime: string | null = null;
  const detectedPatterns: string[] = [];

  const now = new Date();

  const patterns = [
    // Recurrence
    { regex: /todo dia (\d{1,2})/gi, recurrence: 'monthly' },
    { regex: /todo dia/gi, recurrence: 'daily' },
    { regex: /toda segunda/gi, recurrence: 'weekly', daySetter: nextMonday },
    { regex: /toda terça/gi, recurrence: 'weekly', daySetter: nextTuesday },
    { regex: /toda quarta/gi, recurrence: 'weekly', daySetter: nextWednesday },
    { regex: /toda quinta/gi, recurrence: 'weekly', daySetter: nextThursday },
    { regex: /toda sexta/gi, recurrence: 'weekly', daySetter: nextFriday },
    { regex: /todo sábado/gi, recurrence: 'weekly', daySetter: nextSaturday },
    { regex: /todo domingo/gi, recurrence: 'weekly', daySetter: nextSunday },
    
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
    // Reset regex index for safety
    p.regex.lastIndex = 0;
    while ((match = p.regex.exec(input)) !== null) {
      detectedPatterns.push(match[0]);
      
      if (p.recurrence) {
        recurrence = p.recurrence as any;
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

  // Clean text from detected patterns
  detectedPatterns.forEach(pattern => {
    // Escape pattern for regex use just in case
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapedPattern, 'gi'), '').trim();
  });

  // Ensure double spaces are removed
  text = text.replace(/\s\s+/g, ' ').trim();

  if (detectedPatterns.length > 0) {
    console.log('[NLP:Detect]', { rawText: input, parsedDate: dueDate, reminderTime, recurrence, text });
  }

  return {
    text: text || input,
    dueDate,
    recurrence,
    reminderTime,
    detectedPatterns
  };
};
