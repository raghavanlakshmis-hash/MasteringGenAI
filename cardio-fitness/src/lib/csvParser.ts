import Papa from 'papaparse';
import { FitnessEntry } from '../types';

function normalizeDate(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseCSV(file: File): Promise<FitnessEntry[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const entries: FitnessEntry[] = (results.data as Record<string, string>[])
          .map(row => ({
            date: normalizeDate(row['Date'] || row['date'] || ''),
            weight: parseFloat(row['weight in LB'] || row['weight'] || row['Weight'] || '0'),
            move: parseFloat(row['Move'] || row['move'] || '0'),
            exercise: parseFloat(row['Exercise'] || row['exercise'] || '0'),
            stand: parseFloat(row['Stand'] || row['stand'] || '0'),
            sleep: parseFloat(row['Sleep hours'] || row['sleep'] || row['Sleep'] || '0'),
          }))
          .filter(e => e.date && !isNaN(e.weight));
        resolve(entries);
      },
      error: (err) => reject(err),
    });
  });
}
