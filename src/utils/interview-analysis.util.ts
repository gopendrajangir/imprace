// TODO: point this at your Nitro/native module that exposes analyzeAndScore().

import { NitroLocalLLM } from 'react-native-akki-ai';

export type ScoreKey =
  | 'communication'
  | 'technicalKnowledge'
  | 'problemSolving'
  | 'confidence';

export const SCORE_LABELS: Record<ScoreKey, string> = {
  communication: 'Communication',
  technicalKnowledge: 'Technical knowledge',
  problemSolving: 'Problem solving',
  confidence: 'Confidence',
};

export type InterviewAnalysis = {
  /** 0-100, computed from the breakdown. Null if fewer than 3 sub-scores parsed. */
  overallScore: number | null;
  /** Each 0-10. A key is missing if the model didn't produce it. */
  breakdown: Partial<Record<ScoreKey, number>>;
  summary: string;
  strengths: string[];
  weaknesses: string[];
};

type Section = 'summary' | 'strengths' | 'weaknesses';

const SCORE_ALIASES: [RegExp, ScoreKey][] = [
  [/^communication$/i, 'communication'],
  [/^technical(?:[\s_-]*knowledge)?$/i, 'technicalKnowledge'],
  [/^problem[\s_-]*solving$/i, 'problemSolving'],
  [/^confidence$/i, 'confidence'],
];

const SECTION_ALIASES: [RegExp, Section][] = [
  [/^summary$/i, 'summary'],
  [/^strengths?$/i, 'strengths'],
  [
    /^(weaknesses|improvements?|areas? to improve|what to work on)$/i,
    'weaknesses',
  ],
];

// "KEY: value", "**KEY:** value", "### KEY" or "KEY". Bullets start with "-",
// so they never match, and prose lines without a colon don't either.
const KEY_LINE =
  /^\s*[#*_]*\s*([A-Za-z][A-Za-z _-]{2,30}?)\s*[#*_]*\s*(?::\s*[#*_]*\s*(.*))?$/;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

const strip = (s: string) => s.replace(/\*\*/g, '').trim();

/** "7", "7/10", "<7>" -> 7. Echoed placeholders like "0-10" -> null. */
function parseScore(s: string): number | null {
  if (/0\s*-\s*10/.test(s)) return null;
  const m = s.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  return Math.min(10, Math.max(0, Math.round(parseFloat(m[0]))));
}

/**
 * Line-by-line parser. Text before the first recognised key ("Sure, here you
 * go") and anything unrecognised is ignored, and a missing section only
 * leaves that part empty.
 */
export function parseAnalysis(raw: string): InterviewAnalysis {
  const summary: string[] = [];
  const lists: Record<'strengths' | 'weaknesses', string[]> = {
    strengths: [],
    weaknesses: [],
  };
  const breakdown: Partial<Record<ScoreKey, number>> = {};
  let current: Section | null = null;
  let bulletOpen = false; // true right after a bullet, until a blank line

  const add = (section: Section, text: string) => {
    const clean = strip(text);
    if (!clean) return;
    if (section === 'summary') summary.push(clean);
    else lists[section].push(clean);
  };

  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const m = line.match(KEY_LINE);
    if (m) {
      const key = m[1].trim();
      const rest = (m[2] ?? '').trim();

      const scoreKey = SCORE_ALIASES.find(([re]) => re.test(key))?.[1];
      if (scoreKey) {
        const n = parseScore(rest);
        if (n !== null) breakdown[scoreKey] = n;
        current = null;
        bulletOpen = false;
        continue;
      }

      const section = SECTION_ALIASES.find(([re]) => re.test(key))?.[1];
      if (section) {
        current = section;
        bulletOpen = false;
        add(section, rest); // "SUMMARY: text on the same line"
        continue;
      }
    }

    if (!line.trim()) {
      bulletOpen = false;
      continue;
    }
    if (!current) continue;

    if (current === 'summary') {
      add('summary', line);
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      add(current, bullet[1]);
      bulletOpen = true;
    } else if (bulletOpen) {
      // continuation of a wrapped bullet (no blank line in between)
      const list = lists[current];
      if (list.length > 0) list[list.length - 1] += ' ' + strip(line);
    }
  }

  const scores = Object.values(breakdown) as number[];
  const overallScore =
    scores.length >= 3
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10)
      : null;

  const result: InterviewAnalysis = {
    overallScore,
    breakdown,
    summary: summary.join(' ').trim(),
    strengths: lists.strengths,
    weaknesses: lists.weaknesses,
  };

  const empty =
    !result.summary &&
    result.strengths.length === 0 &&
    result.weaknesses.length === 0 &&
    scores.length === 0;
  if (empty) throw new Error('Model output did not match the expected format');

  return result;
}

/**
 * Single attempt: the sampler is greedy (topK = 1), so a retry would return
 * the same text. Engine errors (not initialised, empty transcript) also
 * propagate straight to the screen's error state.
 */
export async function analyzeInterview(): Promise<InterviewAnalysis> {
  const raw = await NitroLocalLLM.analyzeAndScore();
  try {
    return parseAnalysis(raw);
  } catch (err) {
    console.log('Analysis parse failed. Raw model output:\n', raw);
    throw err;
  }
}
