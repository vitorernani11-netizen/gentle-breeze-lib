import { addDays, nextDay } from 'date-fns';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'weekdays';

export interface Recurrence {
  type: RecurrenceType;
  weekdays?: string[]; // ex: ['quarta','sábado']
}

export interface NLPResult {
  date: Date | null;
  text: string;
  detectedData: { date?: Date, time?: string };
  tokens: string[];
  dateToken: string;
  timeToken: string;
  recurrence: Recurrence | null;
  recurrenceToken: string;
}

const WEEKDAY_NORMALIZE: Record<string, string> = {
  'domingo': 'domingo',
  'segunda': 'segunda',
  'terça': 'terça', 'terca': 'terça',
  'quarta': 'quarta',
  'quinta': 'quinta',
  'sexta': 'sexta',
  'sábado': 'sábado', 'sabado': 'sábado',
};

const WEEKDAY_TO_NUM: Record<string, number> = {
  'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3,
  'quinta': 4, 'sexta': 5, 'sábado': 6,
};

const getNextDateForWeekdays = (weekdays: string[], baseDate: Date, advance = false): Date => {
  const nums = weekdays.map(w => WEEKDAY_TO_NUM[w]).filter(n => n !== undefined);
  if (nums.length === 0) return baseDate;
  const start = advance ? addDays(baseDate, 1) : baseDate;
  for (let i = 0; i < 14; i++) {
    const candidate = addDays(start, i);
    if (nums.includes(candidate.getDay())) return candidate;
  }
  return start;
};

const parseRecurrence = (input: string): { recurrence: Recurrence | null, token: string } => {
  // Patterns simples (sem dias específicos)
  const simplePatterns: Array<{ re: RegExp, rec: Recurrence }> = [
    { re: /\b(todos os dias|todo[s]? dia|diariamente|diário|diaria|diária)\b/i, rec: { type: 'daily' } },
    { re: /\b(toda[s]? (?:as )?semanas?|semanalmente|semanal)\b/i, rec: { type: 'weekly' } },
    { re: /\b(todo[s]? (?:os )?m[eê]s(?:es)?|mensalmente|mensal)\b/i, rec: { type: 'monthly' } },
    { re: /\bdias [úu]teis\b/i, rec: { type: 'weekdays', weekdays: ['segunda','terça','quarta','quinta','sexta'] } },
    { re: /\b(fim de semana|fins de semana|finais de semana)\b/i, rec: { type: 'weekdays', weekdays: ['sábado','domingo'] } },
  ];

  for (const { re, rec } of simplePatterns) {
    const m = input.match(re);
    if (m) return { recurrence: rec, token: m[0] };
  }

  const dayWord = '(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)s?(?:-feira)?';
  const multiRe = new RegExp(
    `\\btodas?\\s+(?:as\\s+|os\\s+)?(${dayWord}(?:\\s*(?:,|\\se\\s)\\s*${dayWord})*)\\b`,
    'i'
  );
  const mm = input.match(multiRe);
  if (mm) {
    const piece = mm[1].toLowerCase();
    const parts = piece.split(/\s*,\s*|\s+e\s+/).map(p => p.replace(/-feira/g, '').replace(/s$/, '').trim());
    const weekdays = parts
      .map(p => WEEKDAY_NORMALIZE[p])
      .filter(Boolean);
    if (weekdays.length > 0) {
      const seen = new Set<string>();
      const uniq = weekdays.filter(w => (seen.has(w) ? false : (seen.add(w), true)));
      return { recurrence: { type: 'weekdays', weekdays: uniq }, token: mm[0] };
    }
  }

  return { recurrence: null, token: '' };
};

export const computeRecurrenceDate = (
  rec: Recurrence,
  baseDate: Date = new Date(),
  advance = false,
): Date => {
  switch (rec.type) {
    case 'daily':
      return advance ? addDays(baseDate, 1) : new Date(baseDate);
    case 'weekly':
      return advance ? addDays(baseDate, 7) : new Date(baseDate);
    case 'monthly': {
      const d = new Date(baseDate);
      if (advance) d.setMonth(d.getMonth() + 1);
      return d;
    }
    case 'weekdays':
      return getNextDateForWeekdays(rec.weekdays || [], baseDate, advance);
  }
};

export const parseNLP = (input: string): NLPResult => {
  let finalDate: Date | null = null;
  let finalTime = '';
  let dateToken = '';
  let timeToken = '';

  // 0. Extrair recorrência primeiro — para não confundir com data
  const { recurrence, token: recurrenceToken } = parseRecurrence(input);

  // 1. Datas
  const dateRegex = /\b(hoje|amanhã|domingo|segunda|terça|quarta|quinta|sexta|sábado)(?:-feira)?\b|\b\d{1,2}\/\d{1,2}\b|\bdia \d{1,2} de (?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi;

  // Remove o trecho de recorrência do input só para detecção de data — evita capturar "quarta" dentro de "toda quarta"
  const inputSemRecorrencia = recurrenceToken
    ? input.replace(recurrenceToken, ' '.repeat(recurrenceToken.length))
    : input;

  const dateMatches = [...inputSemRecorrencia.matchAll(dateRegex)];

  if (dateMatches.length > 0) {
    dateToken = dateMatches[dateMatches.length - 1][0];
    const lowerToken = dateToken.toLowerCase();
    finalDate = new Date();

    if (lowerToken.includes('hoje')) {
      // mantém
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
  } else if (recurrence) {
    // Sem data explícita, mas com recorrência → primeira ocorrência
    finalDate = computeRecurrenceDate(recurrence, new Date(), false);
  }

  // 2. Horários
  const timeRegex = /(?:as|às)?\s?(\d{1,2})[:h](\d{2})?/gi;
  const timeMatches = [...input.matchAll(timeRegex)];

  if (timeMatches.length > 0) {
    timeToken = timeMatches[timeMatches.length - 1][0];
    const extractTime = timeToken.match(/(\d{1,2})[:h](\d{2})?/i);
    if (extractTime) {
      const hour = extractTime[1].padStart(2, '0');
      const min = extractTime[2] ? extractTime[2] : '00';
      finalTime = `${hour}:${min}`;
    }
  }

  if (timeToken && !finalDate) {
    finalDate = new Date();
  }

  if (finalDate && finalTime) {
    const [h, m] = finalTime.split(':');
    finalDate.setHours(parseInt(h), parseInt(m), 0, 0);
    if (!dateToken && !recurrence && finalDate.getTime() < Date.now()) {
      finalDate = addDays(finalDate, 1);
    }
  }

  // 3. Tokens para highlight
  const tokens: string[] = [];
  if (recurrenceToken) tokens.push(recurrenceToken);
  if (dateToken) tokens.push(dateToken);
  if (timeToken) tokens.push(timeToken);

  // 4. Limpeza do título
  let text = input;
  const stripLast = (t: string) => {
    if (!t) return;
    const idx = text.lastIndexOf(t);
    if (idx !== -1) text = text.substring(0, idx) + text.substring(idx + t.length);
  };
  stripLast(timeToken);
  stripLast(dateToken);
  stripLast(recurrenceToken);

  return {
    date: finalDate,
    text: text.replace(/\s\s+/g, ' ').trim(),
    detectedData: {
      date: finalDate || undefined,
      time: finalTime || undefined
    },
    tokens,
    dateToken,
    timeToken,
    recurrence,
    recurrenceToken,
  };
};
