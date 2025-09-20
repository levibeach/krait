const blessed = require('blessed')

class UIManager {
  constructor() {
    this.screen = null
    this.inputDisplay = null
    this.loopList = null
    this.menu = null
    this.midiInSetting = null
    this.midiOutSetting = null
    this.initializeUI()
  }

  initializeUI() {
    this.screen = blessed.screen({
      fastCSR: true,
    })

    this.inputDisplay = blessed.log({
      parent: this.screen,
      top: 0,
      left: 0,
      mouse: false,
      width: `100%`,
      height: `100%`,
      scrollback: this.screen.height,
      tags: true,
      style: { fg: 'black' },
      hidden: true,
    })

    this.loopList = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 44,
      height: 5,
    })

    const menuProps = {
      parent: this.screen,
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

    this.menu = blessed.list({
      ...menuProps,
      label: '[ Menu ]',
      width: 20,
      height: 'shrink',
      items: ['MIDI In', 'MIDI Out', 'Close Menu', 'Quit'],
    })

    this.midiInSetting = blessed.list({
      ...menuProps,
      label: '[ MIDI In ]',
      left: 20,
      top: 0,
      width: 30,
      height: 'shrink',
      items: [],
    })

    this.midiOutSetting = blessed.list({
      ...menuProps,
      label: '[ MIDI Out ]',
      left: 20,
      top: 0,
      width: 30,
      height: 'shrink',
      items: [],
    })
  }

  /**
   * Displays the given blessed element and sets focus to it.
   *
   * @param {blessed.Widgets.Node} el - The blessed element to show and focus.
   */
  showFocus(el) {
    el.show()
    el.focus()
  }

  /**
   * Start the main render loop
   * @param {number} interval - Render interval in milliseconds
   */
  startRenderLoop(interval = 25) {
    setInterval(() => {
      this.screen.render()
    }, interval)
  }

  // Getters for external access
  get mainScreen() {
    return this.screen
  }

  get logger() {
    return this.inputDisplay
  }

  get loopContainer() {
    return this.loopList
  }

  get mainMenu() {
    return this.menu
  }

  get midiInMenu() {
    return this.midiInSetting
  }

  get midiOutMenu() {
    return this.midiOutSetting
  }
}

module.exports = UIManager
