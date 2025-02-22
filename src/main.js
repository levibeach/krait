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
  $: 4,
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
  label: 'Menu',
  width: 20,
  height: 'shrink',
  items: ['MIDI In', 'MIDI Out', 'Close', 'Quit'],
})

const midiInSetting = blessed.list({
  ...menuProps,
  label: 'MIDI In',
  left: 20,
  top: 0,
  width: 30,
  height: 'shrink',
  items: [],
})
const midiOutSetting = blessed.list({
  ...menuProps,
  label: 'MIDI Out',
  left: 20,
  top: 0,
  width: 30,
  height: 'shrink',
  items: [],
})

function throttle(func, limit) {
  let inThrottle
  return function () {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

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

function stopLoop(lid) {
  const loop = loops.get(lid)
  loop.playing = false
  clearInterval(loop.interval)
}

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

function initLoops() {
  for (let i = 0; i < 9; i++) {
    setLoop(i)
  }
}

function resetLoop(lid) {
  if (!loops.has(lid)) return
  const loop = loops.get(lid)
  stopLoop(lid)
  loop.label.destroy()
  loop.display.destroy()
  setLoop(lid)
}

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
      case 'm':
        multiply(a, b)
        break
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

function showFocus(el) {
  el.show()
  el.focus()
}

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

  screen.key(['c', 'd', 'm', 't'], (ch, key) => {
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
    }
  })

  screen.key(['`'], () => inputDisplay.toggle())

  // send sound off for all channels
  // won't work in some configurations with
  // external hardware
  screen.key([0], () => {
    for (let chan = 0; chan < 16; chan++) {
      debug.log(`turning off ${chan} sounds`)
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
