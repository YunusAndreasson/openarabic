import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
// ذكرناه has TWO suffixes: نا (we) + ه (it) — but the system only detects one
const a = analyzeArabicWord('ذكرناه', 'we mentioned it');
process.stderr.write(`With "we mentioned it": suffix=${a.suffix?.arabicMatch || 'NONE'} pref=[${a.prefixes.map(p=>p.arabicMatch)}] rem=${a.remainingArabic} has=${a.hasComponents}\n`);
// Try with just "we mentioned"
const b = analyzeArabicWord('ذكرناه', 'we mentioned');
process.stderr.write(`With "we mentioned": suffix=${b.suffix?.arabicMatch || 'NONE'} has=${b.hasComponents}\n`);
// The issue: suffix detection uses endsWith. ذكرناه ends with ه, NOT نا.
// نا can't match because ه comes after it. The system needs compound suffix ناه.
test('check', () => { require('/tmp/check-suffix.ts'); });
