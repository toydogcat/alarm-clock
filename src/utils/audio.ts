// Web Audio API Synthesizer to guarantee offline-capable, cross-origin/CORS-safe, 
// and 100% reliable physical buzz, ringtone, and chime alarms.

let audioCtx: AudioContext | null = null;
let currentOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
let alarmIntervalId: any = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopSound() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  currentOscillators.forEach(({ osc, gain }) => {
    try {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    } catch (e) {
      // already stopped or disconnected
    }
  });
  currentOscillators = [];
}

export function startSound(type: 'buzzer' | 'ringtone' | 'chime' | 'silent', volumeLevel: number = 0.8) {
  stopSound();
  if (type === 'silent') return;

  const ctx = getAudioContext();
  let time = ctx.currentTime;

  if (type === 'buzzer') {
    // Standard high-pitched periodic bleep
    const playBeep = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now); // Double A4 freq for cutting buzz
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volumeLevel, now + 0.02);
      gain.gain.setValueAtTime(volumeLevel, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.24);
      
      currentOscillators.push({ osc, gain });
      // Keep cleaning dead references
      if (currentOscillators.length > 20) {
        currentOscillators.shift();
      }
    };
    
    // Trigger immediately and then interval
    playBeep();
    alarmIntervalId = setInterval(playBeep, 400); // fast recurring beeps
  } 
  else if (type === 'ringtone') {
    // Retro phone call trill
    const playRing = () => {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Classical US ring or fast electronic chirp
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);
      
      // Trill modulation using frequency sweep
      osc1.frequency.linearRampToValueAtTime(480, now + 0.4);
      osc2.frequency.linearRampToValueAtTime(440, now + 0.4);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volumeLevel, now + 0.05);
      gain.gain.setValueAtTime(volumeLevel, now + 0.7);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.8);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
      
      currentOscillators.push({ osc: osc1, gain });
      currentOscillators.push({ osc: osc2, gain });
      if (currentOscillators.length > 20) {
        currentOscillators.splice(0, 2);
      }
    };
    
    playRing();
    alarmIntervalId = setInterval(playRing, 2000); // traditional ring timing (0.8s hold, 1.2s rest)
  } 
  else if (type === 'chime') {
    // Gentle melodic cascade
    const playChime = () => {
      const now = ctx.currentTime;
      const c = [523.25, 659.25, 783.99, 880.00, 1046.50]; // C5, E5, G5, A5, C6 pentatonic code
      
      c.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        
        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(volumeLevel * 0.7, now + idx * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 1.3);
        
        currentOscillators.push({ osc, gain });
      });
      
      if (currentOscillators.length > 20) {
        currentOscillators.splice(0, 5);
      }
    };
    
    playChime();
    alarmIntervalId = setInterval(playChime, 3500); // gentle rhythm
  }
}

export function testSound(type: 'buzzer' | 'ringtone' | 'chime' | 'silent', volumeLevel: number = 0.8) {
  if (type === 'silent') return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  if (type === 'buzzer') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volumeLevel, now + 0.02);
    gain.gain.setValueAtTime(volumeLevel, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } else if (type === 'ringtone') {
    const osc1 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.linearRampToValueAtTime(550, now + 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volumeLevel, now + 0.02);
    gain.gain.setValueAtTime(volumeLevel, now + 0.4);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);
  } else if (type === 'chime') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volumeLevel * 0.8, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  }
}
