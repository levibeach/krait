// time is an illusion

const blessed = require('blessed')
const midi = require('midi')
const midiMap = require('./midimap.js')
const motion = require('./motion.js')

const midiIn = new midi.Input()
const midiOut = new midi.Output()
let midiInPort = 1
let midiOutPort = 1

const loops = new Map()
let armed = null
let recording = false
let overdub = false
let action = false
let sequence = ''
let armReset = false
let midiRate = 25 // ¯\_(ツ)_/¯
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

const debug = blessed.log({
	parent: screen,
	top: 0,
	left: 0,
	mouse: false,
	width: `100%`,
	height: `100%`,
	scrollback: 0,
	tags: true,
	style: { fg: 'black' },
	hidden: true
})

function log(msg) {
	debug.log(`${msg}`)
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
  loop.playing = true
  if (overdub) {
    overdub = false
  } else {
    loop.frame = 0
  }
  if (!loop.loopLength) {
  	log('loop has no length')
  	return
  }
  loop.interval = setInterval(() => {
    const keyframe = Math.ceil((motion.playback.length - 1) * (loop.frame / loop.loopLength))
    if (!loop.animating) {
    	loop.display.setContent(motion.playback[keyframe])
    	// loop.label.setContent(`${loop.frame}.${keyframe}`)
    }
    if (loop.data.has(loop.frame)) {
      loop.data.get(loop.frame).forEach((item) => {
      	// log(item)
        midiOut.sendMessage(item)
      })
    }
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
      log(`loop ${armed.id + 1}: ${armed.data.size} events`)
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
 		for (let i=0;i<9;i++) {
 			loops.get(i).label.setContent(
 				`{red-fg}×0${i+1}×{/red-fg}`
 			)
 		}
 	} else {
 		for (let i=0;i<9;i++) {
 			loops.get(i).label.setContent('————')
 		}
 	}
}

function updateMidi() {
	const inUpdated = midiInOptions.children.find(radio => radio.checked);
	log(`Selected: ${inUpdated ? inUpdated.content : 'None'}`);
}

function initMidiIo() {
	try {
		const options = {}
		// connect to midi ports
	  midiIn.openPort(midiInPort)
	  midiOut.openPort(midiOutPort)
		log('looking for MIDI ports…')
	  for (var i = 0; i < midiIn.getPortCount(); ++i) {
	    log(`IN ${i}: ${midiIn.getPortName(i)}`)
	  }
	  for (var i = 0; i < midiOut.getPortCount(); ++i) {
	    log(`OUT ${i}: ${midiOut.getPortName(i)}`)
	  }
	  log('ports need to be configured in the code\nmaybe someday it will be configurable')
	} catch (err) {
		log(err)
	}
}

/**
 * Duplicates a loop to another loop slot
 * but does not include any messages
 * @param {number} a The target loop
 * @param {number} b The destination loop
 */
function duplicate(a,b) {
	log(`loop ${a} → loop ${b}`)
	try {
  	a = a - 1
  	b = b - 1
		const loopA = loops.get(a)
		const loopB = loops.get(b)
		loopB.frame = 0
		loopB.locked = true
		loopB.loopLength = loopA.loopLength
		log(`loop ${loopB.id + 1}: ${loopB.loopLength}`)
		loopB.label.style.fg = 'default'
		runMotion('duplicate', loopB)
		const timer = setInterval(()=>{
			if (loopA.frame == 0) {
				startLoop(b) 
				clearInterval(timer)
			}
		}, 10)
	} catch (err) {
		log(err)
	}
}

/**
 * Multiplies the loop length by a given factor
 * @param {number} a The target loop
 * @param {number} f The factor to multiply
 */
function multiply(a,f) {
	try {
		const loop = loops.get(a - 1)
		const newLength = loop.loopLength * f
	  log(`loop ${a}: ${loop.loopLength} × ${f} = ${newLength}`)
		loop.loopLength = newLength
		runMotion('multiply', loop)
	} catch (err) {
		log(err)
	}
}

/**
 * Trims the loop length by a given factor
 * @param {number} a The target loop
 * @param {number} f The factor to divide
 */
function trim(a,f) {
	log(`loop ${a} × ${f}`)
	try {
		const loop = loops.get(a - 1)
		loop.loopLength = loop.loopLength / f
		runMotion('trim', loop)
	} catch (err) {
		log(err)
	}
}

function clean(a) {
	log(`loop ${a} cleaned`)
	const loop = loops.get(a - 1)
	loop.data = new Map()
	runMotion('clean', loop)
}

function runMotion(a, loop) {
	let k = 0
	loop.animating = true
	let anima = setInterval(() => {
		if (k > motion[a].length - 1) {
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
		switch(s) {
			case 'c':
				clean(a)
				break
			case 'd':
				duplicate(a,b)
				break
			case 'm':
				multiply(a,b)
				break
			case 't':
				trim(a,b)
				break
			default:
				// do nothing
				return
		}
 	} catch (err) {
 		log(err)
 	} finally {
		action = false
		sequence = ''
 	}
}

function init() {
	debug.setContent('░▒▓█ BOOTING KRAIT  █▓▒░')
	
  // add empty loops
  initLoops()
  
  // connect to midi and setup options
  initMidiIo()

  midiIn.on('message', (deltaTime, message) => {
    // log(`RAW: ${message}`)
    if (Object.keys(midiMap).includes(`${message[0]}`)) {
    	// log(`${message} | ${midiMap[message[0]].type}`)
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

  screen.key([1,2,3,4,5,6,7,8,9], (ch,key) => {
  	if (!action) {
	  	const lid = parseInt(ch) - 1
	  	if (armReset) {
	  		resetLoop(lid)
	  	} else {
	    	toggleArmed(lid)
	  	}
  	} else {
  		sequence += `${ch}` 
  		if (sequence.length = 2 && sequence.charAt(0) == 'c' 
  			|| sequence.length === 3) {
  			runSequence()
  		}
  	}
  })

  screen.key(['!','@','#','$','%','^','&','*','('], (ch, key) => {
    const k = +(shiftKeys[ch] - 1)
    if (!loops.has(k)) return
    const loop = loops.get(k)
    loop.playing ? stopLoop(k) : startLoop(k)
    log(`loop ${k+1} ${loop.playing ? 'restarted' : 'paused'}`)
  })

	// toggle delete action on/off
  screen.key(['tab'], (ch, key) => {
  	toggleReset()
  })

  screen.key(['c','d','m','t'], (ch, key) => {
  	action = true
  	sequence = ch
  })

  // quit on Escape, q, or Control-C.
  screen.key(['C-q', 'C-c'], () => process.exit())

  screen.key(['escape'], () => {
  	if (armed) toggleArmed(armed.id)
  	toggleReset(false)
  })

  screen.key(['`'], () => debug.toggle())

  // send sound off for all channels
  // won't work in some configurations with
  // external hardware
  screen.key([0], () => {
    log('turning off all sound')
    for (let chan = 0; chan < 16; chan++) {
      log(`turning off ${chan} sounds`)
      midiOut.sendMessage([0xB0 + chan, 123, 0])
    }
  })

  setInterval(() => {
    screen.render()
    if (!armed) return
    l = (l + 1) % motion.record.length
  }, midiRate)

  log('░▒▓█ KRAIT IS READY █▓▒░')
}

init()
