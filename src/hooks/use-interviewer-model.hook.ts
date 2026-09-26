import { VISEME_SHAPES, VisemeCue } from '@/components/visemes';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  useModel,
  useAnimator,
  useFilamentContext,
  RenderCallback,
  Entity,
  Mat4,
} from 'react-native-filament';
import { ISharedValue, useSharedValue } from 'react-native-worklets-core';
import { InterviewerGLB } from '@/assets';

interface MorphMap {
  [key: string]: { entity: Entity; morphIdx: number }[];
}

interface TransformMap {
  [key: string]: Entity;
}

interface EntityMorphInfo {
  entity: Entity;
  count: number;
}

const MORPH_KEYS = [
  'viseme_sil',
  'viseme_PP',
  'viseme_FF',
  'viseme_TH',
  'viseme_DD',
  'viseme_kk',
  'viseme_CH',
  'viseme_SS',
  'viseme_nn',
  'viseme_RR',
  'viseme_aa',
  'viseme_E',
  'viseme_I',
  'viseme_O',
  'viseme_U',
] as const;

const TRANSFORM_KEYS = ['Head'];

// ============================================================================
// ALL TUNING KNOBS. Adjust these to change every behavior.
// ============================================================================
const TUNING = {
  // ---- EYES ----
  eye: {
    maxLook: 0.15, // max eye morph weight (0..1). Higher = eyes look further.
    yScale: 0.6, // vertical look range as a fraction of maxLook (up/down)
    speed: 10, // how fast eyes move to target (higher = snappier saccade)
    followHead: 0.7, // 0..1: how much eyes follow head direction (1 = fully)
  },

  // ---- HEAD ----
  head: {
    maxDeg: 6, // max head yaw in degrees. Lower = less turning.
    speed: 8, // how fast the head turns (higher = snappier/more decisive)
    followEyesChance: 0.5, // 0..1: fraction of "look" actions where head follows
    followDelayMin: 0.25, // seconds after eyes move before head starts to follow
    followDelayRand: 0.2, // + up to this random extra delay
    turnFraction: 1.0, // head turns to this fraction of where eyes looked (0..1)
  },

  // ---- TIMING / FREQUENCY ----
  timing: {
    // how long to HOLD looking straight before doing anything (bias to center)
    straightHoldMin: 1.5,
    straightHoldRand: 2.5,
    // hold after an eyes-only glance
    eyesOnlyHoldMin: 1.0,
    eyesOnlyHoldRand: 1.5,
    // hold after a look (eyes, maybe head)
    lookHoldMin: 1.8,
    lookHoldRand: 1.5,
    // probability the next action is "just return to straight/center"
    returnStraightChance: 0.45,
  },

  // ---- BLINK ----
  blink: {
    duration: 0.13, // one close+open (seconds)
    intervalMin: 2, // min seconds between blinks
    intervalRand: 4, // + up to this random
    doubleChance: 0.3, // chance of an immediate second blink
  },

  // ---- IDLE EYEBROW DRIFT ----
  brow: {
    innerBase: 0.08,
    innerAmp: 0.07,
    innerSpeed: 0.5,
    outerBase: 0.06,
    outerAmp: 0.06,
    outerSpeedL: 0.4,
    outerSpeedR: 0.45,
  },

  // ---- IDLE MICRO-EXPRESSION (faint resting cheek warmth, faded speaking) ----
  micro: {
    cheekBase: 0.05,
    cheekAmp: 0.03,
    cheekSpeed: 0.25,
  },

  // ---- SMILE (occasional, not constant) ----
  smile: {
    amount: 0.35, // how big the smile is (0..1 morph weight) when it happens
    riseSpeed: 3, // how fast the smile appears (higher = quicker)
    fallSpeed: 2, // how fast it relaxes back
    holdMin: 1.5, // min seconds to hold the smile
    holdRand: 2.0, // + up to this random hold
    gapMin: 4, // min seconds between smiles (not smiling)
    gapRand: 6, // + up to this random gap
    chanceWhileSpeaking: 0.5, // 0..1: also allow smiles while speaking?
    // (set 0 to only smile when idle; 1 = smiles anytime)
  },

  // ---- SPEAKING EYEBROWS (emphasis while talking) ----
  speakBrow: {
    engage: 0.05, // constant lift while speaking
    punchScale: 0.25, // how much speech intensity raises the brows
    smoothSpeed: 4, // how smoothly the emphasis tracks speech
  },

  // ---- LIP-SYNC ----
  lipSync: {
    smoothSpeed: 12, // mouth transition smoothness (higher = snappier)
  },

  // ---- LISTENING NOD (reacts to the USER's mic level) ----
  listen: {
    micThreshold: 0.02, // mic level (0..1) above which the model "listens"
    nodAmountDeg: 2, // nod size in degrees (X-axis pitch)
    nodSpeed: 0.5, // how fast the nod cycles (higher = quicker nods)
    enterSpeed: 4, // how fast it eases INTO listening pose
    exitSpeed: 5, // how fast it eases OUT when the user stops
  },
};

interface UserInterviewerModelRenderCallbackOptions {
  isPlayingSV: ISharedValue<boolean>;
  isPausedSV: ISharedValue<boolean>;
  micLevelSV: ISharedValue<number>;
  timelineSV: ISharedValue<VisemeCue[]>;
}

export const useInterviewerModel = ({
  isPlayingSV,
  isPausedSV,
  micLevelSV,
  timelineSV,
}: UserInterviewerModelRenderCallbackOptions) => {
  const [morphMap, setMorphMap] = useState<MorphMap | null>(null);
  const [transformMap, setTransformMap] = useState<TransformMap | null>(null);
  const [entityInfos, setEntityInfos] = useState<EntityMorphInfo[] | null>(
    null,
  );

  const model = useModel(InterviewerGLB);
  const animator = useAnimator(model);
  const { renderableManager, transformManager } = useFilamentContext();

  const elapsedTimeSV = useSharedValue(0);
  const speechStartTimeSV = useSharedValue(0);
  const prevIsPlayingSV = useSharedValue(false);
  const cueIndexSV = useSharedValue(0);
  const pausedAccumSV = useSharedValue(0);

  const smoothed = useMemo(
    () => Object.fromEntries(MORPH_KEYS.map(k => [k, 0])),
    [],
  );

  const blinkState = useMemo(
    () => ({
      nextBlinkAt: 1.5,
      blinking: false,
      blinkStart: 0,
      doubleQueued: false,
    }),
    [],
  );

  const gazeState = useMemo(
    () => ({
      eyeX: 0,
      eyeY: 0,
      eyeTgtX: 0,
      eyeTgtY: 0,
      headDeg: 0,
      headTgt: 0,
      phaseUntil: 1.0,
      headTurnAt: -1,
      browPunch: 0,
      // smile state machine
      smileCur: 0, // current smile weight (smoothed)
      smiling: false, // are we in a smile right now?
      smileUntil: 0, // when the current smile/gap ends
      listenAmt: 0, // 0 = not listening, 1 = fully listening (eased)
      nodPitchDeg: 0, // current head pitch (X-axis) for the nod
    }),
    [],
  );

  const headRestTransform: { current: Mat4 | null } = useMemo(() => {
    return { current: null };
  }, []);

  useEffect(() => {
    if (model.state !== 'loaded') return;
    const asset = model.asset;
    const obj: MorphMap = {};
    const transformObj: TransformMap = {};

    for (const key of TRANSFORM_KEYS) {
      const entity = asset.getFirstEntityByName(key);
      if (entity) transformObj[key] = entity;
    }

    const headEntity = transformObj['Head'];

    if (headEntity) {
      headRestTransform.current = transformManager.getTransform(headEntity);
    }

    const infos: EntityMorphInfo[] = [];
    for (const entity of asset.getEntities()) {
      const morphCount = renderableManager.getMorphTargetCount(entity);
      if (morphCount <= 0) continue;
      infos.push({ entity, count: morphCount });

      for (let i = 0; i < morphCount; i++) {
        const name = asset.getMorphTargetNameAt(entity, i);
        if (name == null) continue;
        (obj[name] ??= []).push({ entity, morphIdx: i });
      }
    }

    setTransformMap(transformObj);
    setMorphMap(obj);
    setEntityInfos(infos);
  }, [model.state]);

  const renderCallback: RenderCallback = useCallback(
    ({ timeSinceLastFrame }) => {
      'worklet';

      if (!morphMap || !transformMap || !entityInfos) return;

      const T = TUNING;
      const dt = timeSinceLastFrame;
      elapsedTimeSV.value += dt;
      const now = elapsedTimeSV.value;

      const g = gazeState;

      // ===== GAZE COORDINATION (head + eyes) =====
      if (isPlayingSV.value) {
        // Speaking: face the user.
        g.headTgt = 0;
        g.eyeTgtX = 0;
        g.eyeTgtY = 0;
        g.headTurnAt = -1;
      } else {
        // fire a pending head-follow turn
        if (g.headTurnAt > 0 && now >= g.headTurnAt) {
          const dirFrac = g.eyeTgtX / T.eye.maxLook; // -1..1
          g.headTgt = dirFrac * T.head.maxDeg * T.head.turnFraction;
          g.eyeTgtX = 0; // eyes recenter relative to the now-turned head
          g.eyeTgtY = 0;
          g.headTurnAt = -1;
        }

        if (now >= g.phaseUntil) {
          const r = Math.random();
          if (r < T.timing.returnStraightChance) {
            // RETURN TO STRAIGHT: eyes + head center. Longer hold here so the
            // model spends more time looking straight at the user.
            g.eyeTgtX = 0;
            g.eyeTgtY = 0;
            g.headTgt = 0;
            g.phaseUntil =
              now +
              T.timing.straightHoldMin +
              Math.random() * T.timing.straightHoldRand;
          } else {
            // A LOOK: eyes dart somewhere. Sometimes the head follows.
            const dir = Math.random() < 0.5 ? -1 : 1;
            g.eyeTgtX = dir * T.eye.maxLook;
            g.eyeTgtY = (Math.random() * 2 - 1) * T.eye.maxLook * T.eye.yScale;

            if (Math.random() < T.head.followEyesChance) {
              // head will follow the eyes after a short delay
              g.headTurnAt =
                now +
                T.head.followDelayMin +
                Math.random() * T.head.followDelayRand;
            } else {
              g.headTurnAt = -1; // eyes-only this time; head stays
            }
            g.phaseUntil =
              now +
              T.timing.lookHoldMin +
              Math.random() * T.timing.lookHoldRand;
          }
        }
      }

      // ===== LISTENING NOD (user is speaking -> mic level high) =====
      // Read the live mic level; if above threshold, ease INTO a listening
      // pose: look straight (yaw toward 0) and nod on the X axis.
      const micNow = micLevelSV ? micLevelSV.value : 0;
      const listening = micNow >= T.listen.micThreshold;
      const listenTarget = listening ? 1 : 0;
      const listenSpd = listening ? T.listen.enterSpeed : T.listen.exitSpeed;
      g.listenAmt += (listenTarget - g.listenAmt) * Math.min(1, dt * listenSpd);

      // While listening, pull the yaw toward straight (scaled by listenAmt).
      const effHeadTgt = g.headTgt * (1 - g.listenAmt);
      g.headDeg += (effHeadTgt - g.headDeg) * Math.min(1, dt * T.head.speed);
      g.headDeg = Math.max(-T.head.maxDeg, Math.min(T.head.maxDeg, g.headDeg));

      // Nod pitch: a sine bob on X, amplitude scaled by listenAmt so it fades
      // in/out smoothly.
      const nodPitch =
        T.listen.nodAmountDeg *
        Math.sin(now * T.listen.nodSpeed * Math.PI * 2) *
        g.listenAmt;

      const headEntity = transformMap['Head'];

      if (headEntity && headRestTransform.current) {
        // compose yaw (Y) then pitch (X) on top of the rest transform
        const yawRad = (g.headDeg * Math.PI) / 180;
        const pitchRad = (nodPitch * Math.PI) / 180;
        const composed = headRestTransform.current
          .rotate(yawRad, [0, 1, 0])
          .rotate(pitchRad, [1, 0, 0]);
        transformManager.setTransform(headEntity, composed);
        animator?.updateBoneMatrices();
      }

      // ===== BLINK =====
      let blinkWeight = 0;
      if (!blinkState.blinking && now >= blinkState.nextBlinkAt) {
        blinkState.blinking = true;
        blinkState.blinkStart = now;
      }
      if (blinkState.blinking) {
        const p = (now - blinkState.blinkStart) / T.blink.duration;
        if (p >= 1) {
          blinkState.blinking = false;
          blinkWeight = 0;
          if (blinkState.doubleQueued) {
            blinkState.doubleQueued = false;
            blinkState.blinking = true;
            blinkState.blinkStart = now;
          } else {
            blinkState.nextBlinkAt =
              now + T.blink.intervalMin + Math.random() * T.blink.intervalRand;
            blinkState.doubleQueued = Math.random() < T.blink.doubleChance;
          }
        } else {
          blinkWeight = Math.sin(p * Math.PI);
        }
      }

      // ===== LIP-SYNC timeline =====
      if (isPlayingSV.value && !prevIsPlayingSV.value) {
        speechStartTimeSV.value = elapsedTimeSV.value;
        cueIndexSV.value = 0;
        pausedAccumSV.value = 0;
      }
      prevIsPlayingSV.value = isPlayingSV.value;

      // Freeze the speech clock while paused: count this frame as paused time so
      // audioElapsed stops advancing and the current viseme holds. Idle
      // blink/gaze (driven by elapsedTimeSV) keep running untouched.
      if (isPlayingSV.value && isPausedSV.value) {
        pausedAccumSV.value += dt;
      }

      let targetViseme = 'sil';
      const cues = timelineSV.value;
      if (isPlayingSV.value && cues != null && cues.length > 0) {
        const audioElapsed =
          elapsedTimeSV.value - speechStartTimeSV.value - pausedAccumSV.value;
        while (
          cueIndexSV.value < cues.length - 1 &&
          audioElapsed >= cues[cueIndexSV.value].endSec
        ) {
          cueIndexSV.value += 1;
        }
        targetViseme = cues[cueIndexSV.value].viseme;
      }

      const targetShape = VISEME_SHAPES[targetViseme] ?? {};
      const alpha = Math.min(1, dt * T.lipSync.smoothSpeed);
      for (let i = 0; i < MORPH_KEYS.length; i++) {
        const key = MORPH_KEYS[i];
        const target = targetShape[key] ?? 0;
        smoothed[key] += (target - smoothed[key]) * alpha;
      }

      // ===== IDLE EYEBROW DRIFT =====
      const bt = elapsedTimeSV.value;
      const browInner =
        T.brow.innerBase + T.brow.innerAmp * Math.sin(bt * T.brow.innerSpeed);
      const browOuterL =
        T.brow.outerBase +
        T.brow.outerAmp * Math.sin(bt * T.brow.outerSpeedL + 0.6);
      const browOuterR =
        T.brow.outerBase +
        T.brow.outerAmp * Math.sin(bt * T.brow.outerSpeedR + 1.4);

      // ===== EYES apply (ease + follow head + cap) =====
      // While listening, look straight: pull eye targets toward 0 by listenAmt.
      const eyeTgtXeff = g.eyeTgtX * (1 - g.listenAmt);
      const eyeTgtYeff = g.eyeTgtY * (1 - g.listenAmt);
      g.eyeX += (eyeTgtXeff - g.eyeX) * Math.min(1, dt * T.eye.speed);
      g.eyeY += (eyeTgtYeff - g.eyeY) * Math.min(1, dt * T.eye.speed);

      const headFrac = g.headDeg / T.head.maxDeg; // -1..1
      const headEyeContribution = headFrac * T.eye.maxLook * T.eye.followHead;

      const cap = T.eye.maxLook;
      const effLookX = Math.max(
        -cap,
        Math.min(cap, g.eyeX + headEyeContribution),
      );
      const effLookY = Math.max(-cap, Math.min(cap, g.eyeY));

      const gLookOutLeft = Math.max(0, effLookX);
      const gLookInRight = Math.max(0, effLookX);
      const gLookInLeft = Math.max(0, -effLookX);
      const gLookOutRight = Math.max(0, -effLookX);
      const gLookUp = Math.max(0, effLookY);
      const gLookDown = Math.max(0, -effLookY);

      // ===== IDLE MICRO-EXPRESSION (faint cheek warmth) =====
      const mt = elapsedTimeSV.value;
      const speakingFade = isPlayingSV.value ? 0 : 1;
      const idleCheek =
        (T.micro.cheekBase +
          T.micro.cheekAmp * Math.sin(mt * T.micro.cheekSpeed + 0.8)) *
        speakingFade;

      // ===== SMILE (occasional) =====
      // Toggle between "smiling" (hold a smile) and "gap" (no smile) on random
      // timers. Whether smiles are allowed while speaking is gated by a knob.
      if (now >= g.smileUntil) {
        if (!g.smiling) {
          // decide whether to start a smile now
          const allow = isPlayingSV.value
            ? Math.random() < T.smile.chanceWhileSpeaking
            : true;
          if (allow) {
            g.smiling = true;
            g.smileUntil =
              now + T.smile.holdMin + Math.random() * T.smile.holdRand;
          } else {
            // stay not-smiling for a short bit, re-check later
            g.smileUntil = now + 1.0;
          }
        } else {
          // end the smile, enter a gap
          g.smiling = false;
          g.smileUntil = now + T.smile.gapMin + Math.random() * T.smile.gapRand;
        }
      }
      // ease smile weight toward target (rise vs fall speeds differ)
      const smileTarget = g.smiling ? T.smile.amount : 0;
      const smileSpd = g.smiling ? T.smile.riseSpeed : T.smile.fallSpeed;
      g.smileCur += (smileTarget - g.smileCur) * Math.min(1, dt * smileSpd);

      // ===== SPEAKING EYEBROWS =====
      let speakBrowInner = browInner;
      let speakBrowL = browOuterL;
      let speakBrowR = browOuterR;
      if (isPlayingSV.value) {
        const rawIntensity = Math.max(
          smoothed['viseme_aa'] ?? 0,
          smoothed['viseme_E'] ?? 0,
          smoothed['viseme_O'] ?? 0,
        );
        g.browPunch +=
          (rawIntensity - g.browPunch) *
          Math.min(1, dt * T.speakBrow.smoothSpeed);
        const punch = g.browPunch * T.speakBrow.punchScale;
        speakBrowInner += T.speakBrow.engage + punch;
        speakBrowL += T.speakBrow.engage * 0.85 + punch * 0.9;
        speakBrowR += T.speakBrow.engage * 0.85 + punch;
      } else {
        g.browPunch +=
          (0 - g.browPunch) * Math.min(1, dt * T.speakBrow.smoothSpeed);
      }

      // ===== ASSEMBLE + APPLY =====
      const morphWeights: Record<string, number> = {
        eyeBlinkLeft: blinkWeight,
        eyeBlinkRight: blinkWeight,
        browInnerUp: speakBrowInner,
        browOuterUpLeft: speakBrowL,
        browOuterUpRight: speakBrowR,
        eyeLookOutLeft: gLookOutLeft,
        eyeLookInRight: gLookInRight,
        eyeLookInLeft: gLookInLeft,
        eyeLookOutRight: gLookOutRight,
        eyeLookUpLeft: gLookUp,
        eyeLookUpRight: gLookUp,
        eyeLookDownLeft: gLookDown,
        eyeLookDownRight: gLookDown,
        mouthSmile: g.smileCur,
        cheekSquintLeft: idleCheek + g.smileCur * 0.4,
        cheekSquintRight: idleCheek + g.smileCur * 0.4,
      };
      for (let i = 0; i < MORPH_KEYS.length; i++) {
        morphWeights[MORPH_KEYS[i]] = smoothed[MORPH_KEYS[i]];
      }

      for (let e = 0; e < entityInfos.length; e++) {
        const info = entityInfos[e];
        const weights = new Array(info.count).fill(0);
        for (const name in morphWeights) {
          const slots = morphMap[name];
          if (!slots) continue;
          for (let s = 0; s < slots.length; s++) {
            if (slots[s].entity.id === info.entity.id) {
              weights[slots[s].morphIdx] = morphWeights[name];
            }
          }
        }
        renderableManager.setMorphWeights(info.entity, weights, 0);
      }
    },
    [morphMap, entityInfos, smoothed, blinkState, gazeState, transformMap],
  );

  return {
    model,
    renderCallback,
  };
};
