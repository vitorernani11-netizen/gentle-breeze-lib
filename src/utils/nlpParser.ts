import { addDays, nextDay, parse, isValid } from 'date-fns';

export interface NLPResult {
  date: Date | null;
  text: string;
  detectedData: { date?: Date, time?: string };
  tokens: string[]; // <-- Nova variável para guardar as palavras capturadas
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let finalDate = new Date();
  let finalTime = '';
  const tokens: string[] = [];
  let dateDetected = false;

  // 1. Limpeza de Hoje/Amanhã
  const hojeMatch = text.match(/\bhoje\b/i);
  if (hojeMatch) {
    tokens.push(hojeMatch[0]);
    text = text.replace(hojeMatch[0], '').trim();
    dateDetected = true;
  } else {
    const amanhaMatch = text.match(/\bamanhã\b/i);
    if (amanhaMatch) {
      finalDate.setDate(finalDate.getDate() + 1);
      tokens.push(amanhaMatch[0]);
      text = text.replace(amanhaMatch[0], '').trim();
      dateDetected = true;
    }
  }

  // 2. Detecção de Dias da Semana
  const daysMap: Record<string, number> = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6 };
  const dayRegex = new RegExp(`\\b(${Object.keys(daysMap).join('|')})(-feira)?\\b`, 'i');
  const dayMatch = text.match(dayRegex);
  if (dayMatch) {
    const dayIndex = daysMap[dayMatch[1].toLowerCase()];
    finalDate = nextDay(new Date(), dayIndex as any);
    tokens.push(dayMatch[0]);
    text = text.replace(dayMatch[0], '').trim();
    dateDetected = true;
  }

  // 3. Detecção de Datas
  const dateRegex = /(\d{1,2}\/\d{1,2})|dia (\d{1,2}) de (\w+)/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    if (dateMatch[1]) {
      const [d, m] = dateMatch[1].split('/');
      finalDate = new Date(2026, parseInt(m)-1, parseInt(d));
      dateDetected = true;
    } else {
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const mesIndex = meses.indexOf(dateMatch[3].toLowerCase());
      if (mesIndex > -1) {
        finalDate = new Date(2026, mesIndex, parseInt(dateMatch[2]));
        dateDetected = true;
      }
    }
    tokens.push(dateMatch[0]);
    text = text.replace(dateMatch[0], '').trim();
  }

  // 4. Detecção de Horário
  const timeRegex = /(?:as|às)?\s?(\d{1,2})[:h](\d{2})?/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, '0');
    const min = timeMatch[2] ? timeMatch[2] : '00';
    finalTime = `${hour}:${min}h`;
    tokens.push(timeMatch[0]);
    text = text.replace(timeMatch[0], '').trim();
    dateDetected = true;
  }

  return { 
    date: dateDetected ? finalDate : null, 
    text, 
    detectedData: { date: dateDetected ? finalDate : undefined, time: finalTime }, 
    tokens 
  };
};