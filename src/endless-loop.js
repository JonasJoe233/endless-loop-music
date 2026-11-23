/**
 * endless-loop.js — synced looping stems + pointer pitch bend + scene crossfades.
 * No dependencies, no build step. MIT.
 *
 *   import { createEndlessLoop } from './endless-loop.js';
 *   const loop = await createEndlessLoop({ stems: [{ url: 'pad.mp3' }, { url: 'drums.mp3' }] });
 *   button.onclick = () => loop.start();   // browsers need a user gesture before audio
 *   loop.followPointer();                  // mouse Y bends pitch, like nays.tech
 *   loop.setScene([1, 0]);                 // crossfade stems, the beat never restarts
 */

const clamp01 = x => Math.min(1, Math.max(0, x));

/**
 * nays.tech curve: a dead zone in the middle, smoothstep to ±range at the edges.
 * pos is 0 (top) … 1 (bottom). Returns cents.
 */
export function bendCurve(pos, { range = 200, deadZone = 0.32 } = {}) {
  const n = 0.5 - pos, a = Math.abs(n), half = deadZone / 2;
  if (a <= half) return 0;
  const t = clamp01((a - half) / (0.5 - half));
  return Math.sign(n) * t * t * (3 - 2 * t) * range;
}

/**
 * Fold everything after loopSeconds back onto the start (reverb tails, note releases),
 * then cut the buffer to exactly one loop. Export stems from your DAW with a tail and
 * let this make the seam inaudible.
 */
export function wrapTail(ctx, buffer, loopSeconds) {
  const L = Math.round(loopSeconds * buffer.sampleRate);
  if (L >= buffer.length) return buffer;
  const out = ctx.createBuffer(buffer.numberOfChannels, L, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch), dst = out.getChannelData(ch);
    dst.set(src.subarray(0, L));
    for (let i = L; i < src.length; i++) dst[(i - L) % L] += src[i];
  }
  return out;
}

/**
 * @param {object} opts
 * @param {Array<{url?: string, buffer?: AudioBuffer, gain?: number, loopSeconds?: number}>} opts.stems
 * @param {number} [opts.rate=1]        fixed playback rate. Balatro uses 0.7 for all music.
 * @param {number} [opts.volume=0.6]    master volume
 * @param {number} [opts.range=200]     max pointer bend in cents
 * @param {number} [opts.deadZone=0.32] share of the screen height with no bend
 * @param {number} [opts.fade=0.33]     crossfade time constant in seconds (Balatro: 1/3)
 */
export async function createEndlessLoop(opts) {
  const { stems, rate = 1, volume = 0.6, range = 200, deadZone = 0.32, fade = 0.33 } = opts;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const buffers = await Promise.all(stems.map(async s => {
    let b = s.buffer;
    if (!b) b = await ctx.decodeAudioData(await (await fetch(s.url)).arrayBuffer());
    return s.loopSeconds ? wrapTail(ctx, b, s.loopSeconds) : b;
  }));

  let voices = [], playing = false, cents = 0, baseRate = rate, detach = null;
  const gains = stems.map(s => s.gain ?? 1);

  function start() {
    if (playing) return ctx.resume();
    const at = ctx.currentTime + 0.1;            // one shared start time = sample-accurate sync
    voices = buffers.map((buffer, i) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer; src.loop = true;
      src.playbackRate.value = baseRate; src.detune.value = cents;
      const g = ctx.createGain(); g.gain.value = gains[i];
      src.connect(g).connect(master);
      src.start(at);
      return { src, g };
    });
    playing = true;
    return ctx.resume();
  }

  /** Crossfade to new per-stem gains. Only volumes move; nothing restarts. */
  function setScene(next) {
    next.forEach((v, i) => { gains[i] = v; voices[i]?.g.gain.setTargetAtTime(v, ctx.currentTime, fade); });
  }

  /** Pitch bend in cents, smoothed. Pitch and speed move together, like tape. */
  function setBend(c, smooth = 0.05) {
    cents = c;
    voices.forEach(v => v.src.detune.setTargetAtTime(c, ctx.currentTime, smooth));
  }

  /** Base rate, e.g. 0.7 for Balatro's slowed sound, 0.5 for a game-over tape stop. */
  function setRate(r, smooth = 1) {
    baseRate = r;
    voices.forEach(v => v.src.playbackRate.setTargetAtTime(r, ctx.currentTime, smooth));
  }

  /** Map pointer Y to pitch through the dead-zone curve. Returns an unsubscribe function. */
  function followPointer(target = window) {
    detach?.();
    const onMove = e => setBend(bendCurve(e.clientY / innerHeight, { range, deadZone }), 0.15);
    target.addEventListener('pointermove', onMove, { passive: true });
    detach = () => target.removeEventListener('pointermove', onMove);
    return detach;
  }

  // Pause with the tab: background tabs should not keep playing.
  const onVis = () => { if (playing) document.hidden ? ctx.suspend() : ctx.resume(); };
  document.addEventListener('visibilitychange', onVis);

  function mute(on) { master.gain.setTargetAtTime(on ? 0 : volume, ctx.currentTime, 0.1); }

  function destroy() {
    detach?.();
    document.removeEventListener('visibilitychange', onVis);
    voices.forEach(v => v.src.stop());
    return ctx.close();
  }

  return { ctx, start, setScene, setBend, setRate, followPointer, mute, destroy,
    get cents() { return cents; }, get playing() { return playing; } };
}
