export interface NLPResult {
  date: Date | null;
  text: string; // Texto original com os termos removidos
  detectedData: { date?: Date, time?: string };
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let finalDate = new Date();
  let finalTime = '';
  let dateDetected = false;

  // 1. Detecção de Data
  const lower = text.toLowerCase();
  if (lower.includes('hoje')) {
    text = text.replace(/hoje/gi, '').trim();
    dateDetected = true;
  } else if (lower.includes('amanhã')) {
    finalDate.setDate(finalDate.getDate() + 1);
    text = text.replace(/amanhã/gi, '').trim();
    dateDetected = true;
  }

  // 2. Detecção de Horário (Regex para 13:30, 13h30, 13h)
  const timeRegex = /(\d{1,2})[:h](\d{2})?|\b(\d{1,2})h\b/i;
  const timeMatch = text.match(timeRegex);
  
  if (timeMatch) {
    finalTime = timeMatch[0];
    text = text.replace(timeMatch[0], '').trim();
    
    // Tenta ajustar a hora no finalDate se houver match
    const hours = parseInt(timeMatch[1] || timeMatch[3]);
    const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    if (!isNaN(hours)) {
      finalDate.setHours(hours, mins, 0, 0);
    }
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
