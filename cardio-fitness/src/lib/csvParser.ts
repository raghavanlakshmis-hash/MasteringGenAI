import Papa from 'papaparse';
import { FitnessEntry } from '../types';

function normalizeDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();

  // M/D/YYYY or MM/DD/YYYY — the format Apple Health / common spreadsheets export
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD — already normalised
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // Fallback for other locale-specific strings
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
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
