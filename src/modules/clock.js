const { performance } = require('perf_hooks')

/**
 * TransportClock - Shared pulse clock for loop recording and playback
 *
 * Runs a single transport for the whole app so loops stay phase-locked.
 * Timing is expressed in pulses, similar to a lightweight MIDI clock.
 */
class TransportClock {
  constructor(options = {}) {
    this.bpm = options.bpm || 120
    this.pulsesPerQuarter = options.pulsesPerQuarter || 24
    this.listeners = new Set()
    this.interval = null
    this.pulse = 0
    this.lastTickTime = 0
  }

  get tickMs() {
    return 60000 / (this.bpm * this.pulsesPerQuarter)
  }

  start() {
    if (this.interval) return

    this.pulse = 0
    this.lastTickTime = performance.now()
    this.interval = setInterval(() => this.tick(), this.tickMs)
  }

  setBpm(bpm) {
    this.bpm = bpm

    if (!this.interval) return

    clearInterval(this.interval)
    this.interval = setInterval(() => this.tick(), this.tickMs)
  }

  stop() {
    if (!this.interval) return

    clearInterval(this.interval)
    this.interval = null
  }

  tick() {
    this.pulse += 1
    this.lastTickTime = performance.now()

    this.listeners.forEach((listener) => {
      listener(this.pulse, this.lastTickTime)
    })
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getCurrentPulse() {
    return this.pulse
  }

  getAbsolutePulsePosition() {
    const elapsed = performance.now() - this.lastTickTime
    const fractionalPulse = Math.min(Math.max(elapsed / this.tickMs, 0), 0.999)

    return this.pulse + fractionalPulse
  }
}

module.exports = TransportClock
