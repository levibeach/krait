#!/usr/bin/env node

// time is an illusion
const motion = require('./data/motion.js')
const Logger = require('./utils/logger.js')

// Import our modular components
const UIManager = require('./modules/ui.js')
const MidiManager = require('./modules/midi.js')
const LoopManager = require('./modules/loops.js')
const Sequencer = require('./modules/sequencer.js')
const EventManager = require('./modules/events.js')

// Initialize global systems
const debug = new Logger()
let l = 0 // motion counter
const rate = 25

/**
 * Initializes the main application logic for Krait.
 *
 * - Sets up all module instances and their dependencies
 * - Initializes loops and MIDI connections
 * - Sets up event handlers for UI, MIDI, and keyboard input
 * - Starts the main render and motion update loops
 * - Logs a ready message to the input display
 */
function init() {
  // Create module instances
  const ui = new UIManager()
  const midi = new MidiManager()
  const loops = new LoopManager()
  const sequencer = new Sequencer()
  const events = new EventManager()

  // Set up dependencies between modules
  midi.setDependencies(debug, ui.midiInMenu, ui.midiOutMenu, ui.mainMenu)
  loops.setDependencies(debug, midi.output, ui.loopContainer)
  sequencer.setDependencies(debug, loops, ui)
  events.setDependencies(ui, midi, loops, sequencer, debug)

  // Initialize systems
  loops.initLoops()
  midi.initMidiIo()
  events.setupEventListeners()

  // Start the main update loops
  ui.startRenderLoop(rate)

  setInterval(() => {
    loops.setMotionCounter(l)
    if (!loops.armedLoop) return
    l = (l + 1) % motion.record.length
  }, rate)

  ui.logger.log('░▒▓█ KRAIT IS READY █▓▒░')
}

init()
