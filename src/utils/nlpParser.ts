
export interface NLPResult {
  text: string;
  dueDate: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderTime: string | null;
  detectedPatterns: string[];
}

export const parseNLP = (input: string): NLPResult => {
  let text = input;
  let dueDate: string | null = null;
  let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';
  let reminderTime: string | null = null;
  const detectedPatterns: string[] = [];

  const patterns = [
    { regex: /todo dia/gi, recurrence: 'daily', label: 'todo dia' },
    { regex: /toda segunda/gi, recurrence: 'weekly', label: 'toda segunda' },
    { regex: /amanhã/gi, dateOffset: 1, label: 'amanhã' },
    { regex: /hoje/gi, dateOffset: 0, label: 'hoje' },
    { regex: /às (\d{1,2})h/gi, time: true, label: 'às' },
    { regex: /todo dia (\d{1,2})/gi, recurrence: 'monthly', label: 'todo dia' },
  ];

  const now = new Date();

  // Basic NLP logic
  patterns.forEach(p => {
    const match = p.regex.exec(input);
    if (match) {
      detectedPatterns.push(match[0]);
      if (p.recurrence) {
        recurrence = p.recurrence as any;
      }
      if (p.dateOffset !== undefined) {
        const d = new Date();
        d.setDate(now.getDate() + p.dateOffset);
        dueDate = d.toISOString().split('T')[0];
      }
      if (p.time) {
        const hour = parseInt(match[1]);
        reminderTime = `${String(hour).padStart(2, '0')}:00`;
      }
    }
  });

  // Remove patterns from text for the clean title
  detectedPatterns.forEach(pattern => {
    text = text.replace(pattern, '').trim();
  });

  return {
    text: text || input,
    dueDate,
    recurrence,
    reminderTime,
    detectedPatterns
  };
};
