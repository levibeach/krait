const midiMap = require('../data/midimap.js')

/**
 * EventManager - Handles all event coordination and keyboard input mapping
 *
 * This class manages event handling across the application including:
 * - Keyboard input processing and command mapping
 * - MIDI event handling and loop integration
 * - UI event coordination (menus, dialogs, focus management)
 * - Shift key combinations for special operations
 * - Command sequence building and execution
 * - Event delegation between different system components
 */
class EventManager {
  constructor() {
    // Shift key character mappings for loop operations
    this.shiftKeys = {
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

    // System component references
    this.ui = null // UI manager instance
    this.midi = null // MIDI manager instance
    this.loops = null // Loop manager instance
    this.sequencer = null // Sequencer instance
    this.debug = null // Debug logger instance
  }

  /**
   * Set up dependencies for the event manager
   * @param {UIManager} ui - User interface manager instance
   * @param {MidiManager} midi - MIDI input/output manager instance
   * @param {LoopManager} loops - Loop management instance
   * @param {Sequencer} sequencer - Sequencer for advanced operations
   * @param {Logger} debug - Debug logger instance
   */
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
      if (this.ui.isInputBlocked()) return // Block if input dialog is active

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

    // Number keys (0) for sound off and sequence building
    this.ui.mainScreen.key([0], (ch, key) => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active

      if (!this.sequencer.isActive) {
        // Sound off (panic button) when not in a sequence
        this.midi.sendAllSoundOff()
      } else {
        // Add to sequence when in active sequence
        this.sequencer.addToSequence(ch)
      }
    })

    // Hexadecimal letters (a-f) for channel sequence building
    this.ui.mainScreen.key(['a', 'b', 'c', 'd', 'e', 'f'], (ch, key) => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active

      if (this.sequencer.isActive) {
        // Add to sequence for channel numbers (a=10, b=11, etc.)
        this.sequencer.addToSequence(ch)
      }
      // If not in a sequence, these letters don't do anything
    })

    // Shift + number keys for start/stop loops
    this.ui.mainScreen.key(
      ['!', '@', '#', '$', '%', '^', '&', '*', '('],
      (ch, key) => {
        if (this.ui.isInputBlocked()) return // Block if input dialog is active

        const k = +(this.shiftKeys[ch] - 1)
        if (!this.loops.currentLoops.has(k)) return
        const loop = this.loops.currentLoops.get(k)
        loop.playing ? this.loops.stopLoop(k) : this.loops.startLoop(k)
      }
    )

    // Tab for reset mode toggle
    this.ui.mainScreen.key(['tab'], (ch, key) => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active
      this.sequencer.toggleReset()
    })

    // Action keys for sequences
    this.ui.mainScreen.key(['c', 'd', 'l', 'm', 's', 't', 'x'], (ch, key) => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active

      // If a sequence is already in progress, add to it instead of starting new action
      if (this.sequencer.isActive) {
        this.sequencer.addToSequence(ch)
      } else {
        this.sequencer.startAction(ch)
      }
    })

    // Menu toggle
    this.ui.mainScreen.key(['C-d'], (ch, key) => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active
      this.ui.mainMenu.toggle()
      this.ui.mainMenu.focus()
    })

    // Quit shortcuts
    this.ui.mainScreen.key(['C-q', 'C-c'], () => process.exit())

    // Escape key handling
    this.ui.mainScreen.key(['escape'], () => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active

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
    this.ui.mainScreen.key(['`'], () => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active
      this.ui.logger.toggle()
    })

    // Spacebar to start/stop all loops
    this.ui.mainScreen.key(['space'], () => {
      if (this.ui.isInputBlocked()) return // Block if input dialog is active
      this.loops.toggleAllLoops()
    })
  }
}

module.exports = EventManager
