// time is an illusion

const blessed = require('blessed')
const midi = require('midi')
const midiIn = new midi.Input()
const midiOut = new midi.Output()
const midiMap = require('./midimap.js')

let midiInPort = 0
let midiOutPort = 0
const loops = new Map()
let armed = null
let recording = false
let overdub = false
let output = ''
let midiRate = 5 // ¯\_(ツ)_/¯
let lastKeyPressTime = 0
const doubleTapThreshold = 300
// probably a better way to do this
// but mapping the shift keys works for now…
const shiftKeys = {
  '!':1,
  '@':2,
  '#':3,
  '$':4,
  '%':5,
  '^':6,
  '&':7,
  '*':8,
  '(':9
}
const screen = blessed.screen({
  fastCSR: true
})
const logbook = blessed.log({
	parent: screen,
	bottom: 0,
	left: 0,
	mouse: false,
	width: screen.width - 2,
	height: 5,
	content: '',
})

function log(msg) {
  output += `${msg}\n`
  logbook.setText(output)
}

function recordLoop() {
  if (!armed) return
  recording = true
  armed.label.style.bg = 'red'
  if (!armed.locked) {
    armed.frame = 0
    armed.interval = setInterval(() => {
      armed.frame++
    }, midiRate)
  }
}

function stopRecord() {
  recording = false
  armed.label.style.bg = 'default'
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
  loop.playing = true
  if (overdub) {
    overdub = false
  } else {
    loop.frame = 0
  }
  loop.interval = setInterval(() => {
		loop.display.setProgress(Math.ceil((loop.frame/loop.loopLength)*100))
    if (loop.data.has(loop.frame)) {
      const midiData = loop.data.get(loop.frame)
      midiData.forEach((item) => {
        midiOut.sendMessage(item)
      })
    }
    if (loop.frame + 1 > loop.loopLength) {
      loop.frame = 0
    } else {
      loop.frame++
    }
  }, midiRate)
}

function stopLoop(lid) {
  const loop = loops.get(lid)
  loop.playing = false
  clearInterval(loop.interval)
}

function toggleArmed(lid) {
  // create a new loop if it doesn't exist
  if (!loops.has(lid)) {
    loops.set(lid,{
      id: lid,
      name: `${lid}`,
      frame: null,
      loopLength: null,
      locked: false,
      playing: false,
      interval: null,
      data: new Map(),
      label: blessed.box({
        parent: screen,
        top: lid,
        left: 0,
        width: 1,
        height: 1,
        content: `${lid}`
      }),
      display: blessed.ProgressBar({
        parent: screen,
        top: lid,
        left: 2,
        pch: '—',
        width: screen.width - 1,
        height: 1,
      })
    })
  }
  if (armed) {
    if (recording) {
      stopRecord()
      log(`loop ${armed.id}: ${armed.data.size} events`)
    }
    armed.label.style.bg = 'default'
    armed = null
  } else {
    armed = loops.get(lid)
    armed.label.style.bg = 'green'
  }
}

function init() {

  midiIn.openPort(midiInPort)
  midiOut.openPort(midiOutPort)

  log(`IN: "${midiIn.getPortName(midiInPort)}"`)
  log(`OUT: "${midiOut.getPortName(midiOutPort)}"`)

  midiIn.on('message', (deltaTime, message) => {
    // log(`m: ${message} d: ${deltaTime}`)
    if (Object.keys(midiMap).includes(`${message[0]}`)) {
      if (armed) {
        if (!recording) recordLoop()
        if (armed.data.has(armed.frame)) {
          const newArr = armed.data.get(armed.frame)
          newArr.push(message)
        } else {
          armed.data.set(armed.frame, [message])
        }
      }
    }
  })

  screen.key([1,2,3,4,5,6,7,8,9], (ch,key) => {
    toggleArmed(parseInt(ch))
  })

  screen.key(['!','@','#','$','%','^','&','*','('], (ch, key) => {
    const k = parseInt(shiftKeys[ch])
    if (!loops.has(k)) return

    const loop = loops.get(k)
    const currentTime = new Date().getTime()
    const timeDifference = currentTime - lastKeyPressTime

    if (timeDifference < doubleTapThreshold && !loop.playing) {
      loop.label.destroy()
      loop.display.destroy()
      log(`loop ${k} deleted`)
      loops.delete(k)
      return
    }
    lastKeyPressTime = currentTime
    loop.playing ? stopLoop(k) : startLoop(k)
    log(`loop ${k} ${loop.playing ? 'restarted' : 'paused'}`)
  })

  // Quit on Escape, q, or Control-C.
  screen.key(['q', 'escape', 'C-c'], () => {
    process.exit()
  })

  // sent note off for all channels
  // won't work in some configurations with
  // external hardware
  screen.key([0], () => {
    // log('turning off all sound')
    for (let chan = 0; chan < 16; chan++) {
      midiOut.sendMessage([0xB0 + chan, 123, 0])
    }
  })

  setInterval(()=> screen.render(),100)
}

init()
