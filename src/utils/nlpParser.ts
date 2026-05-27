import { addDays, nextDay } from 'date-fns';

export interface NLPResult {
  date: Date | null;
  text: string;
  detectedData: { date?: Date, time?: string };
  tokens: string[];
}

export const parseNLP = (input: string): NLPResult => {
  let finalDate: Date | null = null;
  let finalTime = '';
  let dateToken = '';
  let timeToken = '';

  // 1. Extrair TODAS as datas na string (vence a última ocorrência)
  const dateRegex = /\b(hoje|amanhã|domingo|segunda|terça|quarta|quinta|sexta|sábado)(?:-feira)?\b|\b\d{1,2}\/\d{1,2}\b|\bdia \d{1,2} de (?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi;
  const dateMatches = [...input.matchAll(dateRegex)];
  
  if (dateMatches.length > 0) {
    // Todoist Rule: A ÚLTIMA data digitada sobrescreve as anteriores
    dateToken = dateMatches[dateMatches.length - 1][0];
    const lowerToken = dateToken.toLowerCase();
    finalDate = new Date();

    if (lowerToken.includes('hoje')) {
      // hoje (mantém o date instanciado)
    } else if (lowerToken.includes('amanhã')) {
      finalDate = addDays(new Date(), 1);
    } else if (lowerToken.match(/\b(domingo|segunda|terça|quarta|quinta|sexta|sábado)/)) {
      const daysMap: Record<string, number> = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6 };
      const dayName = lowerToken.replace('-feira', '').trim();
      finalDate = nextDay(new Date(), daysMap[dayName] as any);
    } else if (lowerToken.includes('/')) {
      const [d, m] = lowerToken.split('/');
      finalDate = new Date(new Date().getFullYear(), parseInt(m) - 1, parseInt(d));
    } else if (lowerToken.includes('dia')) {
      const dateParts = lowerToken.match(/dia (\d{1,2}) de (\w+)/);
      if (dateParts) {
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const mesIndex = meses.indexOf(dateParts[2].toLowerCase());
        if (mesIndex > -1) finalDate = new Date(new Date().getFullYear(), mesIndex, parseInt(dateParts[1]));
      }
    }
  }

  // 2. Extrair TODOS os horários na string (vence a última ocorrência)
  const timeRegex = /(?:as|às)?\s?(\d{1,2})[:h](\d{2})?/gi;
  const timeMatches = [...input.matchAll(timeRegex)];
  
  if (timeMatches.length > 0) {
    // Todoist Rule: O ÚLTIMO horário digitado sobrescreve os anteriores
    timeToken = timeMatches[timeMatches.length - 1][0];
    const extractTime = timeToken.match(/(\d{1,2})[:h](\d{2})?/i);
    if (extractTime) {
      const hour = extractTime[1].padStart(2, '0');
      const min = extractTime[2] ? extractTime[2] : '00';
      finalTime = `${hour}:${min}`;
    }
  }

  if (timeToken && !finalDate) {
    finalDate = new Date(); // Horário sem data assume "hoje"
  }

  if (finalDate && finalTime) {
    const [h, m] = finalTime.split(':');
    finalDate.setHours(parseInt(h), parseInt(m), 0, 0);
  }

  // 3. Renderização: Apenas a data final e hora final são enviadas para brilhar verde neon!
  const tokens: string[] = [];
  if (dateToken) tokens.push(dateToken);
  if (timeToken) tokens.push(timeToken);

  // 4. Limpeza: O título perde APENAS as palavras que venceram. O que perdeu fica como texto puro.
  let text = input;
  if (timeToken) {
    const lastIndex = text.lastIndexOf(timeToken);
    if (lastIndex !== -1) {
      text = text.substring(0, lastIndex) + text.substring(lastIndex + timeToken.length);
    }
  }
  if (dateToken) {
    const lastIndex = text.lastIndexOf(dateToken);
    if (lastIndex !== -1) {
      text = text.substring(0, lastIndex) + text.substring(lastIndex + dateToken.length);
    }
  }

  return {
    date: finalDate,
    text: text.replace(/\s\s+/g, ' ').trim(),
    detectedData: {
      date: finalDate || undefined,
      time: finalTime || undefined
    },
    tokens
  };
};