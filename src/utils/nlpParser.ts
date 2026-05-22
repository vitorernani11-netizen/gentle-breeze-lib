import { addDays, nextDay, parse, isValid } from 'date-fns';

export interface NLPResult {
  date: Date | null;
  text: string;
  detectedData: { date?: Date, time?: string };
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let finalDate = new Date();
  let finalTime = '';
  let dateDetected = false;

  // 1. Detecção de "Hoje" e "Amanhã"
  const lower = text.toLowerCase();
  if (lower.includes('hoje')) {
    text = text.replace(/hoje/gi, '').trim();
    dateDetected = true;
  } else if (lower.includes('amanhã')) {
    finalDate = addDays(new Date(), 1);
    text = text.replace(/amanhã/gi, '').trim();
    dateDetected = true;
  }

  // 2. Detecção de Dias da Semana (ex: segunda-feira, segunda)
  const daysMap: Record<string, number> = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6 };
  const dayRegex = new RegExp(`\\b(${Object.keys(daysMap).join('|')})(-feira)?\\b`, 'i');
  const dayMatch = text.match(dayRegex);
  if (dayMatch) {
    const dayIndex = daysMap[dayMatch[1].toLowerCase()];
    finalDate = nextDay(new Date(), dayIndex as any);
    text = text.replace(dayMatch[0], '').trim();
    dateDetected = true;
  }

  // 3. Detecção de Datas (ex: 25/05, 25 de maio)
  // Captura DD/MM ou "dia XX de [mês]"
  const dateRegex = /(\d{1,2}\/\d{1,2})|dia (\d{1,2}) de (\w+)/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    if (dateMatch[1]) { // Formato 25/05
      const [d, m] = dateMatch[1].split('/');
      finalDate = new Date(2026, parseInt(m)-1, parseInt(d));
      dateDetected = true;
    } else { // Formato "dia 25 de maio"
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const mesIndex = meses.indexOf(dateMatch[3].toLowerCase());
      if (mesIndex > -1) {
        finalDate = new Date(2026, mesIndex, parseInt(dateMatch[2]));
        dateDetected = true;
      }
    }
    text = text.replace(dateMatch[0], '').trim();
  }

  // 4. Detecção de Horário (mantendo sua lógica anterior)
  const timeRegex = /(?:as|às)?\s?(\d{1,2})[:h](\d{2})?/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, '0');
    const min = timeMatch[2] ? timeMatch[2] : '00';
    finalTime = `${hour}:${min}h`;
    finalDate.setHours(parseInt(hour), parseInt(min), 0, 0);
    text = text.replace(timeMatch[0], '').trim();
  }

  return { 
    date: dateDetected || finalTime ? finalDate : null, 
    text: text.replace(/\s\s+/g, ' ').trim(), 
    detectedData: { 
      date: dateDetected ? finalDate : undefined, 
      time: finalTime || undefined 
    } 
  };
};