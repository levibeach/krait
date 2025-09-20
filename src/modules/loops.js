const blessed = require('blessed')
const motion = require('../data/motion.js')

class LoopManager {
  constructor() {
    this.loops = new Map()
    this.armed = null
    this.recording = false
    this.overdub = false
    this.playbackLength = motion.playback.length - 1
    this.midiRate = 25
    this.debug = null
    this.midiOut = null
    this.loopList = null
    this.l = 0 // motion counter
  }

  setDependencies(debug, midiOut, loopList) {
    this.debug = debug
    this.midiOut = midiOut
    this.loopList = loopList
  }

  setMotionCounter(l) {
    this.l = l
  }

  /**
   * Starts the recording loop if the system is armed.
   * Sets the recording state to true and updates the label color to red.
   * If the armed object is not locked, resets the frame counter and starts an interval
   * that updates the label content with motion data at a specified MIDI rate.
   */
  recordLoop() {
    if (!this.armed) return
    this.recording = true
    this.armed.label.style.fg = 'red'
    if (!this.armed.locked) {
      this.armed.frame = 0
      this.armed.interval = setInterval(() => {
        this.armed.label.setContent(motion.record[this.l])
        this.armed.frame++
      }, this.midiRate)
    }
  }

  /**
   * Stops the current recording session.
   * - Sets the recording flag to false.
   * - Updates the armed label to indicate recording has stopped.
   * - If no loop length is set, assigns the current frame as the loop length and locks the loop.
   * - If a loop length exists, enables overdubbing.
   * - Clears the recording interval timer.
   * - Starts playback of the recorded loop.
   */
  stopRecord() {
    this.recording = false
    this.armed.label.setContent(`————`)
    if (!this.armed.loopLength) {
      this.armed.loopLength = this.armed.frame
      this.armed.locked = true
    } else {
      this.overdub = true
    }
    // clear the recording interval
    clearInterval(this.armed.interval)
    this.startLoop(this.armed.id)
  }

  /**
   * Starts playback of a loop identified by its ID.
   * Sets the loop as playing, initializes its frame, and begins sending MIDI messages at a regular interval.
   * Updates the display content based on the current frame and handles overdubbing logic.
   * If the loop has no length, logs a debug message and exits.
   *
   * @param {string|number} lid - The unique identifier for the loop to start.
   */
  startLoop(lid) {
    const loop = this.loops.get(lid)
    if (!loop) return

    loop.playing = true
    loop.frame = this.overdub ? loop.frame : 0
    this.overdub = false

    if (!loop.loopLength) {
      this.debug.log('loop has no length')
      return
    }

    loop.interval = setInterval(() => {
      const frameRatio = loop.frame / loop.loopLength
      const keyframe = Math.ceil(this.playbackLength * frameRatio)

      if (!loop.animating) {
        loop.display.setContent(motion.playback[keyframe])
      }

      loop.data.get(loop.frame)?.forEach((item) => {
        this.midiOut.sendMessage(item)
      })

      loop.frame = (loop.frame + 1) % loop.loopLength
    }, this.midiRate)
  }

  /**
   * Stops the playback loop associated with the given loop ID.
   * Sets the loop's playing state to false and clears its interval timer.
   *
   * @param {string|number} lid - The unique identifier of the loop to stop.
   */
  stopLoop(lid) {
    const loop = this.loops.get(lid)
    loop.playing = false
    clearInterval(loop.interval)
  }

  /**
   * Toggles the armed state of a loop identified by the given lid.
   * If a loop is currently armed, it will stop recording (if active), log the event count,
   * reset the label color, and disarm the loop.
   * If no loop is armed, it will arm the loop with the specified lid and set its label color to yellow.
   *
   * @param {number|string} lid - The identifier of the loop to arm or disarm.
   */
  toggleArmed(lid) {
    if (this.armed) {
      if (this.recording) {
        this.stopRecord()
        this.debug.log(
          `loop ${this.armed.id + 1}: ${this.armed.data.size} events`
        )
      }

      this.armed.label.style.fg = !this.armed.loopLength ? 'black' : 'default'

      this.armed = null
    } else {
      this.armed = this.loops.get(lid)
      this.armed.label.style.fg = 'yellow'
    }
  }

  /**
   * Initializes and stores a loop object with UI components and state properties at the given index.
   *
   * @param {number} i - The index at which to create and store the loop object.
   * @returns {void}
   */
  setLoop(i) {
    this.loops.set(i, {
      id: i,
      frame: null,
      loopLength: null,
      locked: false,
      playing: false,
      animating: false,
      interval: null,
      channels: [],
      data: new Map(),
      label: blessed.box({
        parent: this.loopList,
        top: 3,
        left: i * 5,
        width: 4,
        ch: '—',
        tags: true,
        height: 1,
        style: {
          fg: 'black',
        },
        content: `————`,
      }),
      display: blessed.box({
        parent: this.loopList,
        top: 0,
        left: i * 5,
        tags: true,
        width: 4,
        height: 3,
        content: `{black-fg}············{/black-fg}`,
      }),
    })
  }

  /**
   * Initializes loop iterations by calling setLoop for each index from 0 to 8.
   * Useful for setting up multiple loop instances or configurations.
   */
  initLoops() {
    for (let i = 0; i < 9; i++) {
      this.setLoop(i)
    }
  }

  /**
   * Resets the loop with the specified ID by stopping it, destroying its label and display,
   * and reinitializing it.
   *
   * @param {string|number} lid - The unique identifier of the loop to reset.
   */
  resetLoop(lid) {
    if (!this.loops.has(lid)) return
    const loop = this.loops.get(lid)
    this.stopLoop(lid)
    loop.label.destroy()
    loop.display.destroy()
    this.setLoop(lid)
  }

  /**
   * Duplicates a loop to another loop slot
   * Does not include any MIDI messages in the new loop
   * @param {number} a The target loop
   * @param {number} b The destination loop
   */
  duplicate(a, b) {
    this.debug.log(`loop ${a} → loop ${b}`)
    try {
      a = a - 1
      b = b - 1
      const loopA = this.loops.get(a)
      const loopB = this.loops.get(b)
      loopB.frame = 0
      loopB.locked = true
      loopB.loopLength = loopA.loopLength
      loopB.label.style.fg = 'default'
      this.runMotion('duplicate', loopB)

      this.debug.log(
        JSON.stringify(
          {
            id: loopB.id,
            frame: loopB.frame,
            loopLength: loopB.loopLength,
            locked: loopB.locked,
            data: Array.from(loopB.data).length,
          },
          null,
          2
        )
      )

      const timer = setInterval(() => {
        if (loopA.frame == 0) {
          this.startLoop(b)
          clearInterval(timer)
        }
      }, 10)
    } catch (err) {
      this.debug.log(err)
    }
  }

  /**
   * Multiplies the loop length by a given factor
   * @param {number} a The target loop
   * @param {number} f The factor to multiply
   */
  multiply(a, f) {
    try {
      const loop = this.loops.get(a - 1)
      const newLength = loop.loopLength * f
      loop.loopLength = newLength
      this.runMotion('multiply', loop)

      this.debug.log(
        JSON.stringify(
          {
            id: loop.id,
            frame: loop.frame,
            loopLength: loop.loopLength,
            locked: loop.locked,
            data: Array.from(loop.data).length,
          },
          null,
          2
        )
      )
    } catch (err) {
      this.debug.log(err)
    }
  }

  /**
   * Trims the loop length by a given factor
   * @param {number} a The target loop
   * @param {number} f The factor to divide
   */
  trim(a, f) {
    this.debug.log(`loop ${a} / ${f}`)
    try {
      const loop = this.loops.get(a - 1)
      const newLength = loop.loopLength / f
      loop.loopLength = newLength
      this.runMotion('trim', loop)

      this.debug.log(
        JSON.stringify(
          {
            id: loop.id,
            frame: loop.frame,
            loopLength: loop.loopLength,
            locked: loop.locked,
            data: Array.from(loop.data).length,
          },
          null,
          2
        )
      )
    } catch (err) {
      this.debug.log(err)
    }
  }

  /**
   * Cleans out all events in a given loop
   * @param {number} a The target loop
   */
  clean(a) {
    this.debug.log(`loop ${a} cleaned`)
    const loop = this.loops.get(a - 1)
    loop.data = new Map()
    this.runMotion('clean', loop)
  }

  /**
   * Animates a sequence of frames from the `motion` object for a given key `a`.
   * Updates the `loop.display` content at regular intervals (100ms) and sets
   * `loop.animating` to indicate animation state.
   * Animation stops when all frames have been displayed.
   *
   * @param {string} a - The key to select the animation frames from the `motion` object.
   * @param {Object} loop - The loop object containing animation state and display handler.
   * @param {boolean} loop.animating - Indicates whether the animation is currently running.
   * @param {Object} loop.display - The display object with a `setContent` method to update content.
   */
  runMotion(a, loop) {
    let k = 0
    loop.animating = true
    const anima = setInterval(() => {
      if (k >= motion[a].length) {
        loop.animating = false
        clearInterval(anima)
      } else {
        loop.display.setContent(motion[a][k])
        k++
      }
    }, 100)
  }

  // Getters for external access
  get currentLoops() {
    return this.loops
  }

  get armedLoop() {
    return this.armed
  }

  get isRecording() {
    return this.recording
  }

  addMidiData(frame, message) {
    if (!this.armed) return

    if (this.armed.data.has(frame)) {
      this.armed.data.get(frame).push(message)
    } else {
      this.armed.data.set(frame, [message])
    }
  }
}

module.exports = LoopManager
