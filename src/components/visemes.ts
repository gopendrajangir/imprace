// visemes.ts

// Fill this in with the value logged as "hopLength ~= X" when you ran
// KITTEN_TTS_DEBUG=1 earlier. Sample rate is fixed (kSampleRate in C++).
export const HOP_LENGTH = 300; // <-- REPLACE with your logged value
export const SAMPLE_RATE = 24000;
export const SECONDS_PER_FRAME = HOP_LENGTH / SAMPLE_RATE;

export interface VisemeCue {
  viseme: string;
  startSec: number;
  endSec: number;
}

// IPA symbol -> one of ~13 viseme buckets. This covers the common misaki/
// espeak-ng IPA symbol set. Any symbol not listed falls back to 'sil' —
// check your KTTS_LOG output for unmapped symbols and extend this table
// as you find gaps (rare diphthongs, stress marks, etc. are usually safe
// to leave as 'sil' since they carry no independent mouth shape).
const IPA_TO_VISEME: Record<string, string> = {
  // bilabial closure
  p: 'PP',
  b: 'PP',
  m: 'PP',
  // labiodental
  f: 'FF',
  v: 'FF',
  // dental
  θ: 'TH',
  ð: 'TH',
  // alveolar stops/liquids/nasals
  t: 'DD',
  d: 'DD',
  n: 'DD',
  l: 'DD',
  ɾ: 'DD',
  // velar
  k: 'kk',
  g: 'kk',
  ŋ: 'kk',
  // postalveolar affricates/fricatives
  tʃ: 'CH',
  dʒ: 'CH',
  ʃ: 'CH',
  ʒ: 'CH',
  j: 'CH',
  // sibilants
  s: 'SS',
  z: 'SS',
  // rhotic
  r: 'RR',
  ɹ: 'RR',
  ɝ: 'RR',
  ɚ: 'RR',
  // open vowels
  ɑ: 'aa',
  a: 'aa',
  æ: 'aa',
  ʌ: 'aa',
  ɐ: 'aa',
  // mid front vowels / schwa
  e: 'E',
  ɛ: 'E',
  ə: 'E',
  ɜ: 'E',
  // high front vowels
  i: 'ih',
  ɪ: 'ih',
  // mid-back rounded
  o: 'oh',
  ɔ: 'oh',
  oʊ: 'oh',
  // high back rounded / w
  u: 'ou',
  ʊ: 'ou',
  w: 'ou',
  // silence / pause / punctuation
  ' ': 'sil',
  '.': 'sil',
  ',': 'sil',
  '!': 'sil',
  '?': 'sil',
  ';': 'sil',
  ':': 'sil',
  $: 'sil',
};

export function ipaToViseme(symbol: string): string {
  return IPA_TO_VISEME[symbol] ?? 'sil';
}

// Target blendshape weights per viseme bucket. Only keys your model
// actually has morph targets for will be applied — see MORPH_KEYS in
// ModelViewer, which filters against morphMap at runtime.
export const VISEME_SHAPES: { [key: string]: { [key: string]: number } } = {
  sil: { viseme_sil: 1.0 }, // or {} for neutral
  PP: { viseme_PP: 1.0 },
  FF: { viseme_FF: 1.0 },
  TH: { viseme_TH: 1.0 },
  DD: { viseme_DD: 1.0 },
  kk: { viseme_kk: 1.0 },
  CH: { viseme_CH: 1.0 },
  SS: { viseme_SS: 1.0 },
  RR: { viseme_RR: 1.0 },
  aa: { viseme_aa: 1.0 },
  E: { viseme_E: 1.0 },
  ih: { viseme_I: 1.0 }, // your 'ih' bucket → viseme_I
  oh: { viseme_O: 1.0 }, // your 'oh' bucket → viseme_O
  ou: { viseme_U: 1.0 }, // your 'ou' bucket → viseme_U
};

export function buildVisemeTimeline(
  phonemes: string[],
  durationFrames: number[],
  actualAudioSec: number, // ← pass soundDuration here
): VisemeCue[] {
  const totalFrames = durationFrames.reduce((acc, f) => acc + f, 0);

  const secPerFrame = actualAudioSec / totalFrames;

  const cues: VisemeCue[] = [];
  let t = 0;

  for (let i = 0; i < phonemes.length; i++) {
    const frames = durationFrames[i];
    const duration = secPerFrame * frames;

    cues.push({
      viseme: ipaToViseme(phonemes[i]),
      startSec: t,
      endSec: t + duration,
    });
    t += duration;
  }

  return cues;
}
