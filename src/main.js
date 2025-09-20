#!/usr/bin/env node

// time is an illusion
const blessed = require('blessed')
const midi = require('midi')
const midiMap = require('./data/midimap.js')
const motion = require('./data/motion.js')
const Logger = require('./utils/logger.js')
const debug = new Logger()

const midiIn = new midi.Input()
const midiOut = new midi.Output()
const ports = {
  in: 0,
  out: 0,
}

const playbackLength = motion.playback.length - 1
const loops = new Map()
let armed = null
let recording = false
let overdub = false
let action = false
let sequence = ''
let armReset = false
let midiRate = 25
const shiftKeys = {
  '!': 1,
  '@': 2,
  '#': 3,
  // prettier-ignore
  '$': 4,
  '%': 5,
  '^': 6,
  '&': 7,
  '*': 8,
  '(': 9,
}

let l = 0

const screen = blessed.screen({
  fastCSR: true,
})

const inputDisplay = blessed.log({
  parent: screen,
  top: 0,
  left: 0,
  mouse: false,
  width: `100%`,
  height: `100%`,
  scrollback: screen.height,
  tags: true,
  style: { fg: 'black' },
  hidden: true,
})

const loopList = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: 44,
  height: 5,
})

const menuProps = {
  parent: screen,
  border: {
    type: 'line',
  },
  style: {
    focus: {
      selected: {
        fg: 'black',
        bg: 'white',
      },
      border: {
        fg: 'white',
      },
      fg: 'white',
    },
  },
  keys: true,
  mouse: true,
  interactive: true,
  hidden: true,
}

const menu = blessed.list({
  ...menuProps,
  label: '[ Menu ]',
  width: 20,
  height: 'shrink',
  items: ['MIDI In', 'MIDI Out', 'Close Menu', 'Quit'],
})

const midiInSetting = blessed.list({
  ...menuProps,
  label: '[ MIDI In ]',
  left: 20,
  top: 0,
  width: 30,
  height: 'shrink',
  items: [],
})
const midiOutSetting = blessed.list({
  ...menuProps,
  label: '[ MIDI Out ]',
  left: 20,
  top: 0,
  width: 30,
  height: 'shrink',
  items: [],
})

/**
 * Starts the recording loop if the system is armed.
 * Sets the recording state to true and updates the label color to red.
 * If the armed object is not locked, resets the frame counter and starts an interval
 * that updates the label content with motion data at a specified MIDI rate.
 */
function recordLoop() {
  if (!armed) return
  recording = true
  armed.label.style.fg = 'red'
  if (!armed.locked) {
    armed.frame = 0
    armed.interval = setInterval(() => {
      armed.label.setContent(motion.record[l])
      armed.frame++
    }, midiRate)
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
function stopRecord() {
  recording = false
  armed.label.setContent(`————`)
  if (!armed.loopLength) {
    armed.loopLength = armed.frame
    armed.locked = true
  } else {
    overdub = true
  }
  // clear the recording interval
  clearInterval(armed.interval)
  startLoop(armed.id)
}

/**
 * Starts playback of a loop identified by its ID.
 * Sets the loop as playing, initializes its frame, and begins sending MIDI messages at a regular interval.
 * Updates the display content based on the current frame and handles overdubbing logic.
 * If the loop has no length, logs a debug message and exits.
 *
 * @param {string|number} lid - The unique identifier for the loop to start.
 */
function startLoop(lid) {
  const loop = loops.get(lid)
  if (!loop) return

  loop.playing = true
  loop.frame = overdub ? loop.frame : 0
  overdub = false

  if (!loop.loopLength) {
    debug.log('loop has no length')
    return
  }

  loop.interval = setInterval(() => {
    const frameRatio = loop.frame / loop.loopLength
    const keyframe = Math.ceil(playbackLength * frameRatio)

    if (!loop.animating) {
      loop.display.setContent(motion.playback[keyframe])
    }

    loop.data.get(loop.frame)?.forEach((item) => {
      midiOut.sendMessage(item)
    })

    loop.frame = (loop.frame + 1) % loop.loopLength
  }, midiRate)
}

/**
 * Stops the playback loop associated with the given loop ID.
 * Sets the loop's playing state to false and clears its interval timer.
 *
 * @param {string|number} lid - The unique identifier of the loop to stop.
 */
function stopLoop(lid) {
  const loop = loops.get(lid)
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
function toggleArmed(lid) {
  if (armed) {
    if (recording) {
      stopRecord()
      debug.log(`loop ${armed.id + 1}: ${armed.data.size} events`)
    }

    armed.label.style.fg = !armed.loopLength ? 'black' : 'default'

    armed = null
  } else {
    armed = loops.get(lid)
    armed.label.style.fg = 'yellow'
  }
}

/**
 * Initializes and stores a loop object with UI components and state properties at the given index.
 *
 * @param {number} i - The index at which to create and store the loop object.
 * @returns {void}
 */
function setLoop(i) {
  loops.set(i, {
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
      parent: loopList,
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
      parent: loopList,
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
function initLoops() {
  for (let i = 0; i < 9; i++) {
    setLoop(i)
  }
}

/**
 * Resets the loop with the specified ID by stopping it, destroying its label and display,
 * and reinitializing it.
 *
 * @param {string|number} lid - The unique identifier of the loop to reset.
 */
function resetLoop(lid) {
  if (!loops.has(lid)) return
  const loop = loops.get(lid)
  stopLoop(lid)
  loop.label.destroy()
  loop.display.destroy()
  setLoop(lid)
}

/**
 * Toggles the armReset state or sets it to a specific value.
 * Updates the label content of each loop based on the armReset state:
 * - If armed, sets each label to a red "×0N×" format (where N is the loop index + 1).
 * - If not armed, sets each label to a placeholder "————".
 *
 * @param {boolean} [val] - Optional. If provided, sets armReset to this value; otherwise, toggles armReset.
 */
function toggleReset(val) {
  armReset = typeof val != 'undefined' ? val : !armReset
  if (armReset) {
    for (let i = 0; i < 9; i++) {
      loops.get(i).label.setContent(`{red-fg}×0${i + 1}×{/red-fg}`)
    }
  } else {
    for (let i = 0; i < 9; i++) {
      loops.get(i).label.setContent('————')
    }
  }
}

/**
 * Duplicates a loop to another loop slot
 * Does not include any MIDI messages in the new loop
 * @param {number} a The target loop
 * @param {number} b The destination loop
 */
function duplicate(a, b) {
  debug.log(`loop ${a} → loop ${b}`)
  try {
    a = a - 1
    b = b - 1
    const loopA = loops.get(a)
    const loopB = loops.get(b)
    loopB.frame = 0
    loopB.locked = true
    loopB.loopLength = loopA.loopLength
    loopB.label.style.fg = 'default'
    runMotion('duplicate', loopB)

    debug.log(
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
        startLoop(b)
        clearInterval(timer)
      }
    }, 10)
  } catch (err) {
    debug.log(err)
  }
}

/**
 * Multiplies the loop length by a given factor
 * @param {number} a The target loop
 * @param {number} f The factor to multiply
 */
function multiply(a, f) {
  try {
    const loop = loops.get(a - 1)
    const newLength = loop.loopLength * f
    loop.loopLength = newLength
    runMotion('multiply', loop)

    debug.log(
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
    debug.log(err)
  }
}

/**
 * Trims the loop length by a given factor
 * @param {number} a The target loop
 * @param {number} f The factor to divide
 */
function trim(a, f) {
  debug.log(`loop ${a} / ${f}`)
  try {
    const loop = loops.get(a - 1)
    const newLength = loop.loopLength / f
    loop.loopLength = newLength
    runMotion('trim', loop)

    debug.log(
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
    debug.log(err)
  }
}

/**
 * Cleans out all events in a given loop
 * @param {number} a The target loop
 */
function clean(a) {
  debug.log(`loop ${a} cleaned`)
  const loop = loops.get(a - 1)
  loop.data = new Map()
  runMotion('clean', loop)
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
function runMotion(a, loop) {
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
 * Executes an action based on the first character of the global `sequence` string.
 * The action is determined by the character ('c', 'd', 'l', 'm', 's', 't'), and may call
 * one of the following functions: clean, duplicate, multiply, or trim, passing numeric
 * arguments parsed from the sequence string.
 * Handles errors by logging them and resets the global `action` and `sequence` variables.
 *
 * @throws {Error} Logs any error encountered during execution.
 */
function runSequence() {
  try {
    const s = sequence.charAt(0)
    const a = +sequence.charAt(1)
    const b = +sequence.charAt(2)
    switch (s) {
      case 'c':
        clean(a)
        break
      case 'd':
        duplicate(a, b)
        break
      case 'l':
      // TODO: Create ability to load a saved sequence into a loop slot
      case 'm':
        multiply(a, b)
        break
      case 's':
      // TODO: Create ability to save a sequence to disk
      case 't':
        trim(a, b)
        break
      default:
        // do nothing
        return
    }
  } catch (err) {
    debug.log(err)
  } finally {
    action = false
    sequence = ''
  }
}

/**
 * Changes the MIDI port for either input or output.
 *
 * Depending on the `dest` parameter ('in' or 'out'), this function attempts to open the specified MIDI port.
 * If the port is not open, it opens the port, logs the change, hides the relevant setting UI, and focuses the menu.
 * If the port is already open, it closes the port and retries until it can open the new port.
 *
 * @param {'in'|'out'} dest - Specifies whether to change the MIDI input ('in') or output ('out') port.
 * @param {number} port - The port number to switch to.
 */
function changeMidiPort(dest, port) {
  switch (dest) {
    case 'in':
      const checkIn = setInterval(() => {
        if (!midiIn.isPortOpen()) {
          midiIn.openPort(port)
          debug.log(`MIDI in changed to port: ${port}`)
          clearInterval(checkIn)
          midiInSetting.hide()
          menu.focus()
        } else {
          midiIn.closePort()
        }
      }, 100)
      break
    case 'out':
      const checkOut = setInterval(() => {
        if (!midiOut.isPortOpen()) {
          midiOut.openPort(port)
          debug.log(`MIDI out changed to port: ${port}`)
          clearInterval(checkOut)
          midiOutSetting.hide()
          menu.focus()
        } else {
          midiOut.closePort()
        }
      }, 100)
      break
    default:
    // do nothing i guess...
  }
}

/**
 * Initializes MIDI input and output ports for the application.
 * - Opens virtual MIDI ports named 'KRAIT:IN' and 'KRAIT:OUT'.
 * - Populates MIDI input and output port selection settings with available ports.
 * - Opens the selected MIDI input and output ports.
 * - Sets up event listeners to handle port selection changes.
 * - Logs any errors encountered during initialization.
 */
function initMidiIo() {
  midiIn.openVirtualPort('KRAIT:IN')
  midiOut.openVirtualPort('KRAIT:OUT')

  try {
    for (let i = 0; i < midiIn.getPortCount(); i++) {
      const portName = midiIn.getPortName(i)
      midiInSetting.addItem(`${i}: ${portName}`)
    }
    for (let i = 0; i < midiOut.getPortCount(); i++) {
      const portName = midiOut.getPortName(i)
      midiOutSetting.addItem(`${i}: ${portName}`)
    }
    midiIn.openPort(ports.in)
    midiOut.openPort(ports.out)
    midiInSetting.on('select', (item, index) => changeMidiPort('in', index))
    midiOutSetting.on('select', (item, index) => changeMidiPort('out', index))
  } catch (err) {
    debug.log(err)
  }
}

/**
 * Displays the given blessed element and sets focus to it.
 *
 * @param {blessed.Widgets.Node} el - The blessed element to show and focus.
 */
function showFocus(el) {
  el.show()
  el.focus()
}

/**
 * Initializes the main application logic for Krait.
 *
 * - Sets up empty loops and MIDI input/output connections.
 * - Handles menu selection events for MIDI settings and quitting the app.
 * - Listens for MIDI input messages, logs them, and records data if armed.
 * - Configures key bindings for loop control, actions, menu toggling, and quitting.
 * - Manages UI focus and visibility for menu and MIDI settings.
 * - Provides a shortcut to toggle the input display.
 * - Sends 'sound off' messages to all MIDI channels when requested.
 * - Periodically renders the screen and updates motion recording if armed.
 * - Logs a ready message to the input display.
 */
function init() {
  // add empty loops
  initLoops()

  // connect to midi and setup options
  initMidiIo()

  menu.on('select', function (item, index) {
    switch (item.getText()) {
      case 'MIDI In':
        showFocus(midiInSetting)
        break
      case 'MIDI Out':
        showFocus(midiOutSetting)
        break
      case 'Quit':
        process.exit()
      default:
        menu.hide()
    }
  })

  midiIn.on('message', (deltaTime, message) => {
    if (Object.keys(midiMap).includes(`${message[0]}`)) {
      inputDisplay.log(`${message} | ${midiMap[message[0]].type}`)
      if (armed) {
        if (!recording) recordLoop()
        // when a data point already exists
        // we can add our new data to it
        // otherwise, create a new data point
        if (armed.data.has(armed.frame)) {
          armed.data.get(armed.frame).push(message)
        } else {
          armed.data.set(armed.frame, [message])
        }
      }
    }
  })

  // THE BRAIN
  screen.key([1, 2, 3, 4, 5, 6, 7, 8, 9], (ch, key) => {
    if (!action) {
      const lid = parseInt(ch) - 1
      if (armReset) {
        resetLoop(lid)
      } else {
        toggleArmed(lid)
      }
    } else {
      sequence += `${ch}`
      if (
        (sequence.length =
          (2 && sequence.charAt(0) == 'c') || sequence.length === 3)
      ) {
        runSequence()
      }
    }
  })

  // stop/start loops
  screen.key(['!', '@', '#', '$', '%', '^', '&', '*', '('], (ch, key) => {
    const k = +(shiftKeys[ch] - 1)
    if (!loops.has(k)) return
    const loop = loops.get(k)
    loop.playing ? stopLoop(k) : startLoop(k)
  })

  // toggle delete action on/off
  screen.key(['tab'], (ch, key) => {
    toggleReset()
  })

  screen.key(['c', 'd', 'l', 'm', 's', 't'], (ch, key) => {
    action = true
    sequence = ch
  })

  screen.key(['C-d'], (ch, key) => {
    menu.toggle()
    menu.focus()
  })

  // quit on Escape, q, or Control-C.
  screen.key(['C-q', 'C-c'], () => process.exit())

  screen.key(['escape'], () => {
    if (!menu.hidden) {
      if (!midiInSetting.hidden || !midiOutSetting.hidden) {
        midiInSetting.hide()
        midiOutSetting.hide()
        menu.focus()
      } else {
        menu.hide()
      }
    } else {
      if (armed) toggleArmed(armed.id)
      toggleReset(false)
      action = false
    }
  })

  screen.key(['`'], () => inputDisplay.toggle())

  // send sound off for all channels
  // won't work in some configurations with
  // external hardware
  screen.key([0], () => {
    for (let chan = 0; chan < 16; chan++) {
      debug.log(`turning off ${chan} sounds`)
      // send 'note off' for all notes (0-127) on this channel
      for (let note = 0; note < 128; note++) {
        midiOut.sendMessage([0x80 + chan, note, 0])
      }
      // send 'all notes off' control change
      midiOut.sendMessage([0xb0 + chan, 123, 0])
    }
  })

  setInterval(() => {
    screen.render()
    if (!armed) return
    l = (l + 1) % motion.record.length
  }, midiRate)

  inputDisplay.log('░▒▓█ KRAIT IS READY █▓▒░')
}

init()
