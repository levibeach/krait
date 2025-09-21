#!/usr/bin/env node

/**
 * KRAIT - Command Line MIDI Looper
 *
 * Main application entry point for Krait, a real-time MIDI loop recording
 * and playback system. Initializes all core modules and starts the main
 * application loop.
 *
 * Features:
 * - Real-time MIDI loop recording and playback
 * - 9 simultaneous loop tracks with independent control
 * - Advanced loop manipulation (duplicate, multiply, trim, clean)
 * - Save/load functionality for persistent loop storage
 * - Customizable terminal user interface
 * - Debug logging and monitoring capabilities
 *
 * Architecture:
 * - Modular component design with dependency injection
 * - Event-driven communication between components
 * - Blessed.js for terminal user interface
 * - Node.js MIDI library for hardware integration
 *
 * @version 0.4.2
 * @author Levi Beach
 */

// Import animation and motion data
const motion = require('./data/motion.js')
const Logger = require('./utils/logger.js')

// Import core application modules
const UIManager = require('./modules/ui.js')
const MidiManager = require('./modules/midi.js')
const LoopManager = require('./modules/loops.js')
const Sequencer = require('./modules/sequencer.js')
const EventManager = require('./modules/events.js')

// Initialize global application state
const debug = new Logger() // Debug logging system
let l = 0 // Global motion counter for animations
const rate = 25 // Update rate in milliseconds (40 FPS)

/**
 * Initialize and start the Krait application
 *
 * Sets up the complete application system including:
 * 1. Module instantiation and dependency injection
 * 2. MIDI and loop system initialization
 * 3. Event handler setup for all user interactions
 * 4. Main render and animation loops
 * 5. Ready state indication
 *
 * The initialization follows a specific order to ensure all dependencies
 * are properly established before starting the main application loops.
 */
function init() {
  // Instantiate all core modules
  const ui = new UIManager()
  const midi = new MidiManager()
  const loops = new LoopManager()
  const sequencer = new Sequencer()
  const events = new EventManager()

  // Establish inter-module dependencies
  midi.setDependencies(debug, ui.midiInMenu, ui.midiOutMenu, ui.mainMenu)
  loops.setDependencies(debug, midi, ui.loopContainer)
  sequencer.setDependencies(debug, loops, ui)
  events.setDependencies(ui, midi, loops, sequencer, debug)

  // Initialize core systems
  loops.initLoops() // Set up loop storage and UI components
  midi.initMidiIo() // Initialize MIDI ports and connections
  events.setupEventListeners() // Set up all event handling

  // Start main application loops
  ui.startRenderLoop(rate) // Begin UI render cycle

  // Start motion counter loop for animations and timing
  setInterval(() => {
    loops.setMotionCounter(l)
    if (!loops.armedLoop) return // Skip if no loop is armed for recording
    l = (l + 1) % motion.record.length
  }, rate)

  // Signal application ready state
  ui.logger.log('░▒▓█ KRAIT IS READY █▓▒░')
}

// Start the application
init()
