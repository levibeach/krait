// time is an illusion

const blessed = require('blessed')
const midi = require('midi')
const midiMap = require('./midimap.js')

const midiIn = new midi.Input()
const midiOut = new midi.Output()

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

const lp = [
  '█{black-fg}···········{/black-fg}',
  '▓█{black-fg}··········{/black-fg}',
  '▒▓█{black-fg}·········{/black-fg}',
  '░▒▓█{black-fg}········{/black-fg}',
  '{black-fg}·{/black-fg}░▒▓{black-fg}···{/black-fg}█{black-fg}····{/black-fg}',
  '{black-fg}··{/black-fg}░▒{black-fg}··{/black-fg}█▓{black-fg}····{/black-fg}',
  '{black-fg}···{/black-fg}░{black-fg}·{/black-fg}█▓▒{black-fg}····{/black-fg}',
  '{black-fg}····{/black-fg}█▓▒░{black-fg}····{/black-fg}',
  '{black-fg}····{/black-fg}▓▒░{black-fg}·{/black-fg}█{black-fg}···{/black-fg}',
  '{black-fg}····{/black-fg}▒░{black-fg}··{/black-fg}▓█{black-fg}··{/black-fg}',
  '{black-fg}····{/black-fg}░{black-fg}···{/black-fg}▒▓█{black-fg}·{/black-fg}',
  '{black-fg}········{/black-fg}░▒▓█',
  '{black-fg}·········{/black-fg}░▒▓',
  '{black-fg}··········{/black-fg}░▒',
  '{black-fg}···········{/black-fg}░',
  '{black-fg}············{/black-fg}',
]
const recl = [
  '█▓▒░',
  '▓█▓▒',
  '▒▓█▓',
  '░▒▓█',
  '▒░▒▓',
  '▓▒░▒',
]
let l = 0

const screen = blessed.screen({
  fastCSR: true
})

const loopList = blessed.box({
  top: 'center',
  left: 'center',
  width: 44,
  height: 5
})

// const logbook = blessed.log({
// 	parent: screen,
// 	bottom: 0,
// 	left: 0,
// 	mouse: false,
// 	width: screen.width - 2,
// 	height: 5,
// 	content: '',
// })

// function log(msg) {
//   output += `${msg}\n`
//   logbook.setText(output)
// }

function recordLoop() {
  if (!armed) return
  recording = true
  armed.label.style.fg = 'red'
  if (!armed.locked) {
    armed.frame = 0
    armed.interval = setInterval(() => {
      armed.label.setContent(recl[l])
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
  loop.playing = true
  if (overdub) {
    overdub = false
  } else {
    loop.frame = 0
  }
  loop.interval = setInterval(() => {
    if (!loop.loopLength) return
    const keyframe = Math.ceil(16 * (loop.frame / loop.loopLength))
    loop.display.setContent(lp[keyframe - 1])
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
  if (armed) {
    if (recording) {
      stopRecord()
      // log(`loop ${armed.id}: ${armed.data.size} events`)
    }
    armed.label.style.fg = !armed.loopLength ? 'black' : 'default'
    armed = null
  } else {
    armed = loops.get(lid)
    armed.label.style.fg = 'yellow'
  }
}

function setLoop(i) {
  loops.set(i,{
    id: i,
    name: `${i}`,
    frame: null,
    loopLength: null,
    locked: false,
    playing: false,
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
        fg: 'black'
      },
      content: `————`
    }),
    display: blessed.box({
      parent: loopList,
      top: 0,
      left: i * 5,
      tags: true,
      width: 4,
      height: 3,
      content: `{black-fg}············{/black-fg}`
    })
  })
}

function initLoops() {
  for (let i=0; i < 9; i++) {
    setLoop(i)
  }
  screen.append(loopList)
}

function init() {
  // add empty loops
  initLoops()

  // connect to midi ports
  midiIn.openPort(midiInPort)
  midiOut.openPort(midiOutPort)
  // log(`I:${midiIn.getPortName(midiInPort)} / O ${midiOut.getPortName(midiOutPort)}`)

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
    toggleArmed(parseInt(ch) - 1)
  })

  screen.key(['!','@','#','$','%','^','&','*','('], (ch, key) => {
    const k = parseInt(shiftKeys[ch] - 1)
    if (!loops.has(k)) return

    const loop = loops.get(k)
    const currentTime = new Date().getTime()
    const timeDifference = currentTime - lastKeyPressTime

    if (timeDifference < doubleTapThreshold) {
    	stopLoop(k)
    	loop.data.
      loop.label.destroy()
      loop.display.destroy()
      setLoop(k)
      // log(`loop ${k} deleted`)
      return
    }
    lastKeyPressTime = currentTime
    loop.playing ? stopLoop(k) : startLoop(k)
    // log(`loop ${k} ${loop.playing ? 'restarted' : 'paused'}`)
  })

  // quit on Escape, q, or Control-C.
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

  setInterval(() => {
    screen.render()
    if (!armed) return
    l = (l + 1) % recl.length
  }, 100)
}

init()
