let context = null;
let master = null;
let muted = false;
let windSource = null;

function ensureAudio() {
  if (context) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  context = new AudioContextClass();
  master = context.createGain();
  master.gain.value = 0.35;
  master.connect(context.destination);
  startWindLoop();
}

function makeNoise(duration) {
  const length = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function startWindLoop() {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = makeNoise(2);
  source.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 240;
  gain.gain.value = 0.035;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
  windSource = source;
}

function tone(frequency, duration, waveform = 'sine', volume = 0.18) {
  if (!context || muted) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function noisePop(duration, cutoff, volume) {
  if (!context || muted) return;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = makeNoise(duration);
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
}

export function initAudio(state) {
  state.audio = {
    unlock() {
      ensureAudio();
      if (context?.state === 'suspended') context.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    shot(weaponId) {
      const pitch = {
        carbine: 900,
        longrifle: 420,
        smg: 1250,
        shotgun: 270,
        pistol: 700
      }[weaponId] || 700;
      tone(pitch, 0.08, 'square', 0.12);
      noisePop(0.11, pitch * 2.1, 0.16);
    },
    reload() {
      tone(550, 0.05, 'square', 0.08);
      setTimeout(() => tone(320, 0.06, 'square', 0.08), 180);
    },
    hit(headshot = false) {
      tone(headshot ? 1450 : 180, headshot ? 0.12 : 0.09, headshot ? 'sine' : 'triangle');
    },
    grenade() {
      tone(125, 0.4, 'sawtooth', 0.25);
      noisePop(0.5, 500, 0.24);
    },
    beep() {
      tone(880, 0.12, 'sine', 0.08);
    },
    roundStart() {
      tone(440, 0.55, 'triangle', 0.15);
      setTimeout(() => tone(660, 0.7, 'triangle', 0.15), 180);
    },
    purchase() {
      tone(1100, 0.08, 'sine', 0.1);
      setTimeout(() => tone(1450, 0.1, 'sine', 0.1), 70);
    },
    footstep() {
      noisePop(0.035, 300, 0.025);
    },
    get wind() {
      return windSource;
    }
  };
}
