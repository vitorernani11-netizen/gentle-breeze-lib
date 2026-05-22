import { addDays, nextDay, setHours, setMinutes, startOfToday } from 'date-fns';

export interface NLPResult {
  date: Date | null;
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'date' | 'time' | null;
}

export const parseNLP = (input: string): NLPResult | null => {
  if (!input) return null;
  
  const lower = input.toLowerCase();
  
  // Define patterns for detection
  // Order matters: more specific patterns first
  const patterns = [
    { regex: /\bhoje\b/gi, offset: 0, type: 'date' as const },
    { regex: /\bamanh[ãa]\b/gi, offset: 1, type: 'date' as const },
    { regex: /\bsegunda(?:-feira)?\b/gi, day: 1, type: 'date' as const },
    { regex: /\bter[çc]a(?:-feira)?\b/gi, day: 2, type: 'date' as const },
    { regex: /\bquarta(?:-feira)?\b/gi, day: 3, type: 'date' as const },
    { regex: /\bquinta(?:-feira)?\b/gi, day: 4, type: 'date' as const },
    { regex: /\bsexta(?:-feira)?\b/gi, day: 5, type: 'date' as const },
    { regex: /\bs[áa]bado\b/gi, day: 6, type: 'date' as const },
    { regex: /\bdomingo\b/gi, day: 0, type: 'date' as const },
    { regex: /\bdia\s+(\d{1,2})\b/gi, isDia: true, type: 'date' as const },
    { regex: /\b(\d{1,2})[:h](\d{2})?\b/gi, isTime: true, type: 'time' as const },
  ];

  for (const p of patterns) {
    p.regex.lastIndex = 0;
    const match = p.regex.exec(input);
    
    if (match) {
      let date: Date | null = null;
      
      if (p.offset !== undefined) {
        date = addDays(startOfToday(), p.offset);
      } else if (p.day !== undefined) {
        date = nextDay(startOfToday(), p.day as any);
      } else if (p.isDia) {
        const day = parseInt(match[1]);
        const now = new Date();
        date = new Date(now.getFullYear(), now.getMonth(), day);
        if (date < now) {
          date.setMonth(date.getMonth() + 1);
        }
      } else if (p.isTime) {
        const hours = parseInt(match[1]);
        const mins = match[2] ? parseInt(match[2]) : 0;
        if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
          date = setHours(setMinutes(startOfToday(), mins), hours);
        }
      }

      return {
        date,
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: p.type
      };
    }
  }

  return null;
};
