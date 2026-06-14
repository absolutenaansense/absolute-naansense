// Biller alerts: a "tring tring" ring (Web Audio, no asset) + Chrome notification.

let audioCtx
let primed = false

function ctx() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  } catch { return null }
  return audioCtx
}

function beep(ac, start, dur, freq, vol = 0.25) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  o.connect(g); g.connect(ac.destination)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.start(start); o.stop(start + dur + 0.02)
}

// Telephone-style "tring tring" — two warbling rings.
export function playRing() {
  const ac = ctx(); if (!ac) return
  const t = ac.currentTime
  for (let r = 0; r < 2; r++) {
    const base = t + r * 0.55
    for (let i = 0; i < 7; i++) beep(ac, base + i * 0.06, 0.05, i % 2 ? 480 : 640)
  }
}

// Browsers need a user gesture before audio can play — prime on first interaction.
export function armAudio() {
  if (primed) return
  const prime = () => {
    ctx(); primed = true
    window.removeEventListener('pointerdown', prime)
    window.removeEventListener('keydown', prime)
  }
  window.addEventListener('pointerdown', prime, { once: true })
  window.addEventListener('keydown', prime, { once: true })
}

export function requestNotifyPermission() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch {}
}

export function notify(title, body, icon) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon, tag: 'naansense-order', renotify: true })
    }
  } catch {}
}
