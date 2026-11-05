/**
 * Procedural Web Audio API sound generator for tactile, satisfying UI feedback.
 * No external MP3 dependencies - zero latency and always reliable.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Satisfying, subtle soft pop sound played on clicks.
 */
export function playPopSound(pitchShift: number = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startTime = ctx.currentTime;
    const baseFreq = 480 * pitchShift;

    // Gentle upward and rapid downward frequency envelope creates the "pop" bubble/wood sound
    osc.frequency.setValueAtTime(baseFreq * 0.8, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, startTime + 0.015);
    osc.frequency.exponentialRampToValueAtTime(140, startTime + 0.08);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.16, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.1);
  } catch {
    // Graceful fallback if audio is blocked
  }
}

/**
 * Mechanical tape deck button click sound.
 */
export function playCassetteClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, startTime);
    osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.04);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.06);
  } catch {
    // Ignore audio error
  }
}

/**
 * Soft chime for chat notifications.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.06);

      gain.gain.setValueAtTime(0.001, startTime + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, startTime + idx * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.06);
      osc.stop(startTime + idx * 0.06 + 0.26);
    });
  } catch {
    // Ignore
  }
}

/**
 * Flashbang sound effect: comedic high-pitch stun ring!
 */
export function playFlashbangSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, startTime);

    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 1.25);
  } catch {
    // Ignore
  }
}
