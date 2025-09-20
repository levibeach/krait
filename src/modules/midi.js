const midi = require('midi')

class MidiManager {
  constructor() {
    this.midiIn = new midi.Input()
    this.midiOut = new midi.Output()
    this.ports = {
      in: 0,
      out: 0,
    }
    this.debug = null
    this.midiInSetting = null
    this.midiOutSetting = null
    this.menu = null
  }

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
   * Send sound off for all channels
   * Won't work in some configurations with external hardware
   */
  sendAllSoundOff() {
    for (let chan = 0; chan < 16; chan++) {
      this.debug.log(`turning off ${chan} sounds`)
      // send 'note off' for all notes (0-127) on this channel
      for (let note = 0; note < 128; note++) {
        this.midiOut.sendMessage([0x80 + chan, note, 0])
      }
      // send 'all notes off' control change
      this.midiOut.sendMessage([0xb0 + chan, 123, 0])
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
