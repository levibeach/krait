const midi = require('midi')

/**
 * MidiManager - Handles MIDI input/output connections and port management
 *
 * This class manages all MIDI-related functionality including:
 * - MIDI input/output port initialization and configuration
 * - Virtual MIDI port creation for external connections
 * - Dynamic port switching with UI integration
 * - Port enumeration and selection menus
 * - MIDI device connection management
 */
class MidiManager {
  constructor() {
    this.midiIn = new midi.Input() // MIDI input instance
    this.midiOut = new midi.Output() // MIDI output instance
    this.ports = {
      // Currently selected ports
      in: 0,
      out: 0,
    }
    this.debug = null // Debug logger instance
    this.midiInSetting = null // UI component for input port selection
    this.midiOutSetting = null // UI component for output port selection
    this.menu = null // Main menu UI component
  }

  /**
   * Set up dependencies for the MIDI manager
   * @param {Logger} debug - Debug logger instance
   * @param {Object} midiInSetting - UI component for MIDI input port selection
   * @param {Object} midiOutSetting - UI component for MIDI output port selection
   * @param {Object} menu - Main menu UI component for focus management
   */
  setDependencies(debug, midiInSetting, midiOutSetting, menu) {
    this.debug = debug
    this.midiInSetting = midiInSetting
    this.midiOutSetting = midiOutSetting
    this.menu = menu
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
  changeMidiPort(dest, port) {
    switch (dest) {
      case 'in':
        const checkIn = setInterval(() => {
          if (!this.midiIn.isPortOpen()) {
            this.midiIn.openPort(port)
            this.debug.log(`MIDI in changed to port: ${port}`)
            clearInterval(checkIn)
            this.midiInSetting.hide()
            this.menu.focus()
          } else {
            this.midiIn.closePort()
          }
        }, 100)
        break
      case 'out':
        const checkOut = setInterval(() => {
          if (!this.midiOut.isPortOpen()) {
            this.midiOut.openPort(port)
            this.debug.log(`MIDI out changed to port: ${port}`)
            clearInterval(checkOut)
            this.midiOutSetting.hide()
            this.menu.focus()
          } else {
            this.midiOut.closePort()
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
  initMidiIo() {
    this.midiIn.openVirtualPort('KRAIT:IN')
    this.midiOut.openVirtualPort('KRAIT:OUT')

    try {
      for (let i = 0; i < this.midiIn.getPortCount(); i++) {
        const portName = this.midiIn.getPortName(i)
        this.midiInSetting.addItem(`${i}: ${portName}`)
      }
      for (let i = 0; i < this.midiOut.getPortCount(); i++) {
        const portName = this.midiOut.getPortName(i)
        this.midiOutSetting.addItem(`${i}: ${portName}`)
      }
      this.midiIn.openPort(this.ports.in)
      this.midiOut.openPort(this.ports.out)
      this.midiInSetting.on('select', (item, index) =>
        this.changeMidiPort('in', index)
      )
      this.midiOutSetting.on('select', (item, index) =>
        this.changeMidiPort('out', index)
      )
    } catch (err) {
      this.debug.log(err)
    }
  }

  /**
   * Send comprehensive sound off for all channels
   * Uses multiple methods to ensure external hardware synths respond properly
   */
  sendAllSoundOff() {
    this.debug.log('Sending MIDI - stopping all sounds')

    for (let chan = 0; chan < 16; chan++) {
      // Method 1: Send explicit note off for all notes (most reliable for hardware)
      for (let note = 0; note < 128; note++) {
        this.midiOut.sendMessage([0x80 + chan, note, 0]) // Note Off
      }

      // Method 2: Send All Notes Off (CC 123)
      this.midiOut.sendMessage([0xb0 + chan, 123, 0])

      // Method 3: Send All Sound Off (CC 120) - more aggressive
      this.midiOut.sendMessage([0xb0 + chan, 120, 0])

      // Method 4: Reset All Controllers (CC 121) - clears sustain pedal, etc.
      this.midiOut.sendMessage([0xb0 + chan, 121, 0])

      // Method 5: Turn off sustain pedal specifically (CC 64)
      this.midiOut.sendMessage([0xb0 + chan, 64, 0])
    }
  }

  // Getters for external access
  get input() {
    return this.midiIn
  }

  get output() {
    return this.midiOut
  }
}

module.exports = MidiManager
