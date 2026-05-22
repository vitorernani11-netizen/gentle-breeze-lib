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

  // 1. Limpeza de Data
  if (text.toLowerCase().includes('hoje')) {
    text = text.replace(/hoje/gi, '').trim();
    dateDetected = true;
  } else if (text.toLowerCase().includes('amanhã')) {
    finalDate.setDate(finalDate.getDate() + 1);
    text = text.replace(/amanhã/gi, '').trim();
    dateDetected = true;
  }

  // 2. Detecção e Normalização de Horário
  // Captura o padrão, mas agora isolamos os dígitos para formatar depois
  const timeRegex = /(?:as|às)?\s?(\d{1,2})[:h](\d{2})?/i;
  const timeMatch = text.match(timeRegex);
  
  if (timeMatch) {
    // timeMatch[1] é a hora, timeMatch[2] são os minutos (ou undefined se for só "13h")
    const hour = timeMatch[1].padStart(2, '0');
    const min = timeMatch[2] ? timeMatch[2] : '00';
    
    finalTime = `${hour}:${min}h`; // Formato desejado: 15:00h
    
    // Atualiza a hora no objeto finalDate
    finalDate.setHours(parseInt(hour), parseInt(min), 0, 0);
    
    // Remove o bloco detectado do título
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