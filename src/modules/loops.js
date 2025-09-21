const blessed = require('blessed')
const motion = require('../data/motion.js')
const fs = require('fs')
const path = require('path')
const config = require('../../config.json')

/**
 * LoopManager - Manages MIDI loop recording, playback, and manipulation
 *
 * This class handles the core functionality of Krait's looping system including:
 * - Recording MIDI input into loops
 * - Playing back recorded loops with timing synchronization
 * - Managing loop states (armed, recording, playing, overdubbing)
 * - Loop manipulation operations (duplicate, multiply, trim, clean)
 * - Save/load operations for persistent loop storage
 * - UI integration for visual feedback and animations
 */
class LoopManager {
  constructor() {
    this.loops = new Map() // Storage for all loop instances
    this.armed = null // Currently armed loop ready for recording
    this.recording = false // Global recording state flag
    this.overdub = false // Overdubbing mode flag
    this.playbackLength = motion.playback.length - 1 // Max frames for visual animation
    this.midiRate = 25 // Timing rate in milliseconds
    this.debug = null // Debug logger instance
    this.midi = null // MIDI manager instance
    this.loopList = null // UI loop list component
    this.l = 0 // Global motion counter for animations
  }

  /**
   * Set up dependencies for the loop manager
   * @param {Logger} debug - Debug logger instance
   * @param {MidiManager} midi - MIDI input/output manager
   * @param {Object} loopList - UI component for displaying loops
   */
  setDependencies(debug, midi, loopList) {
    this.debug = debug
    this.midi = midi
    this.loopList = loopList
  }

  /**
   * Update the global motion counter used for animations
   * @param {number} l - Motion counter value (0 to motion.record.length)
   */
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
        this.midi.output.sendMessage(item)
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
   * Toggles all loops on/off. If any loops are playing, stops all loops.
   * If no loops are playing, starts all loops that have content.
   */
  toggleAllLoops() {
    let anyPlaying = false

    // Check if any loops are currently playing
    for (let i = 0; i < 9; i++) {
      const loop = this.loops.get(i)
      if (loop && loop.playing) {
        anyPlaying = true
        break
      }
    }

    if (anyPlaying) {
      // Stop all playing loops
      for (let i = 0; i < 9; i++) {
        const loop = this.loops.get(i)
        if (loop && loop.playing) {
          this.stopLoop(i)
        }
      }
      // Send additional MIDI panic for safety when stopping all loops
      // this.midi.sendAllSoundOff()
      // this.debug.log('All loops stopped with MIDI panic')
    } else {
      // Start all loops that have content
      let startedCount = 0
      for (let i = 0; i < 9; i++) {
        const loop = this.loops.get(i)
        if (loop && loop.loopLength && !loop.playing) {
          this.startLoop(i)
          startedCount++
        }
      }
      if (startedCount > 0) {
        this.debug.log(`Started ${startedCount} loops`)
      } else {
        this.debug.log('No loops to start')
      }
    }
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

  /**
   * Saves a loop to disk with a user-provided name
   * @param {number} loopNumber - The loop number (1-9) to save
   * @param {Function} promptCallback - Callback function to prompt user for filename
   */
  async saveLoop(loopNumber, promptCallback) {
    try {
      const loopIndex = loopNumber - 1
      const loop = this.loops.get(loopIndex)

      if (!loop || !loop.loopLength) {
        this.debug.log(`Loop ${loopNumber} is empty or has no length`)
        return
      }

      // Prompt user for filename
      const filename = await promptCallback('Enter filename for saved loop:')
      if (!filename || filename.trim() === '') {
        this.debug.log('Save cancelled - no filename provided')
        return
      }

      // Ensure save directory exists
      const saveDir = path.resolve(config.saveDirectory)
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true })
      }

      // Prepare loop data for saving
      const loopData = {
        id: loop.id,
        loopLength: loop.loopLength,
        locked: loop.locked,
        channels: loop.channels,
        data: Array.from(loop.data.entries()), // Convert Map to array for JSON
        metadata: {
          savedAt: new Date().toISOString(),
          version: '1.0',
          midiRate: this.midiRate,
        },
      }

      // Save to file
      const filepath = path.join(saveDir, `${filename}.json`)
      fs.writeFileSync(filepath, JSON.stringify(loopData, null, 2))

      this.debug.log(`Loop ${loopNumber} saved as "${filename}.json"`)
      this.debug.log(`Location: ${filepath}`)
    } catch (err) {
      this.debug.log(`Error saving loop ${loopNumber}: ${err.message}`)
    }
  }

  /**
   * Get list of available saved loop files
   * @returns {Array<string>} - Array of saved loop filenames (without .json extension)
   */
  getSavedLoops() {
    try {
      const saveDir = path.resolve(config.saveDirectory)
      if (!fs.existsSync(saveDir)) {
        return []
      }

      const files = fs.readdirSync(saveDir)
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''))
        .sort()
    } catch (err) {
      this.debug.log(`Error reading saved loops: ${err.message}`)
      return []
    }
  }

  /**
   * Load a saved loop into a specific loop slot
   * @param {number} loopNumber - The loop slot (1-9) to load into
   * @param {Function} selectCallback - Callback function to let user select which saved loop to load
   */
  async loadLoop(loopNumber, selectCallback) {
    try {
      const loopIndex = loopNumber - 1
      const targetLoop = this.loops.get(loopIndex)

      if (!targetLoop) {
        this.debug.log(`Invalid loop slot: ${loopNumber}`)
        return
      }

      // Get available saved loops
      const savedLoops = this.getSavedLoops()
      if (savedLoops.length === 0) {
        this.debug.log('No saved loops found')
        return
      }

      // Let user select which loop to load
      const selectedFile = await selectCallback('', savedLoops)
      if (!selectedFile) {
        this.debug.log('Load cancelled - no file selected')
        return
      }

      // Load the selected file
      const saveDir = path.resolve(config.saveDirectory)
      const filepath = path.join(saveDir, `${selectedFile}.json`)

      if (!fs.existsSync(filepath)) {
        this.debug.log(`File not found: ${selectedFile}.json`)
        return
      }

      const loopData = JSON.parse(fs.readFileSync(filepath, 'utf8'))

      // Stop current loop if playing
      if (targetLoop.playing) {
        this.stopLoop(loopIndex)
      }

      // Clear existing data
      targetLoop.data.clear()

      // Load the saved data
      targetLoop.loopLength = loopData.loopLength
      targetLoop.locked = loopData.locked
      targetLoop.channels = loopData.channels || []
      targetLoop.frame = 0
      targetLoop.playing = false
      targetLoop.animating = false

      // Convert array back to Map
      if (loopData.data && Array.isArray(loopData.data)) {
        loopData.data.forEach(([frame, events]) => {
          targetLoop.data.set(frame, events)
        })
      }

      // Update visual state
      targetLoop.label.style.fg = 'default'
      this.runMotion('load', targetLoop)

      this.debug.log(`Loop ${loopNumber} loaded from "${selectedFile}.json"`)
      this.debug.log(
        `Data: ${targetLoop.data.size} frames, length: ${targetLoop.loopLength}`
      )
    } catch (err) {
      this.debug.log(`Error loading loop ${loopNumber}: ${err.message}`)
    }
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
