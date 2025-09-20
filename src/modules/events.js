const midiMap = require('../data/midimap.js')

class EventManager {
  constructor() {
    this.shiftKeys = {
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

    this.ui = null
    this.midi = null
    this.loops = null
    this.sequencer = null
    this.debug = null
  }

  setDependencies(ui, midi, loops, sequencer, debug) {
    this.ui = ui
    this.midi = midi
    this.loops = loops
    this.sequencer = sequencer
    this.debug = debug
  }

  /**
   * Set up all event listeners for the application
   */
  setupEventListeners() {
    this.setupMenuEvents()
    this.setupMidiEvents()
    this.setupKeyboardEvents()
  }

  /**
   * Setup menu-related event listeners
   */
  setupMenuEvents() {
    this.ui.mainMenu.on('select', (item, index) => {
      switch (item.getText()) {
        case 'MIDI In':
          this.ui.showFocus(this.ui.midiInMenu)
          break
        case 'MIDI Out':
          this.ui.showFocus(this.ui.midiOutMenu)
          break
        case 'Quit':
          process.exit()
        default:
          this.ui.mainMenu.hide()
      }
    })
  }

  /**
   * Setup MIDI input event listeners
   */
  setupMidiEvents() {
    this.midi.input.on('message', (deltaTime, message) => {
      if (Object.keys(midiMap).includes(`${message[0]}`)) {
        this.ui.logger.log(`${message} | ${midiMap[message[0]].type}`)

        if (this.loops.armedLoop) {
          if (!this.loops.isRecording) {
            this.loops.recordLoop()
          }
          // Add MIDI data to the current frame
          this.loops.addMidiData(this.loops.armedLoop.frame, message)
        }
      }
    })
  }

  /**
   * Setup all keyboard event listeners
   */
  setupKeyboardEvents() {
    // Number keys (1-9) for loop control
    this.ui.mainScreen.key([1, 2, 3, 4, 5, 6, 7, 8, 9], (ch, key) => {
      if (!this.sequencer.isActive) {
        const lid = parseInt(ch) - 1
        if (this.sequencer.isArmReset) {
          this.loops.resetLoop(lid)
        } else {
          this.loops.toggleArmed(lid)
        }
      } else {
        this.sequencer.addToSequence(ch)
      }
    })

    // Shift + number keys for start/stop loops
    this.ui.mainScreen.key(
      ['!', '@', '#', '$', '%', '^', '&', '*', '('],
      (ch, key) => {
        const k = +(this.shiftKeys[ch] - 1)
        if (!this.loops.currentLoops.has(k)) return
        const loop = this.loops.currentLoops.get(k)
        loop.playing ? this.loops.stopLoop(k) : this.loops.startLoop(k)
      }
    )

    // Tab for reset mode toggle
    this.ui.mainScreen.key(['tab'], (ch, key) => {
      this.sequencer.toggleReset()
    })

    // Action keys for sequences
    this.ui.mainScreen.key(['c', 'd', 'l', 'm', 's', 't'], (ch, key) => {
      this.sequencer.startAction(ch)
    })

    // Menu toggle
    this.ui.mainScreen.key(['C-d'], (ch, key) => {
      this.ui.mainMenu.toggle()
      this.ui.mainMenu.focus()
    })

    // Quit shortcuts
    this.ui.mainScreen.key(['C-q', 'C-c'], () => process.exit())

    // Escape key handling
    this.ui.mainScreen.key(['escape'], () => {
      if (!this.ui.mainMenu.hidden) {
        if (!this.ui.midiInMenu.hidden || !this.ui.midiOutMenu.hidden) {
          this.ui.midiInMenu.hide()
          this.ui.midiOutMenu.hide()
          this.ui.mainMenu.focus()
        } else {
          this.ui.mainMenu.hide()
        }
      } else {
        if (this.loops.armedLoop) {
          this.loops.toggleArmed(this.loops.armedLoop.id)
        }
        this.sequencer.reset()
      }
    })

    // Input display toggle
    this.ui.mainScreen.key(['`'], () => this.ui.logger.toggle())

    // Sound off (panic button)
    this.ui.mainScreen.key([0], () => {
      this.midi.sendAllSoundOff()
    })
  }
}

module.exports = EventManager
