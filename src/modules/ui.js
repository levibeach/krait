const blessed = require('blessed')
const config = require('../../config.json')

class UIManager {
  constructor() {
    this.screen = null
    this.inputDisplay = null
    this.loopList = null
    this.menu = null
    this.midiInSetting = null
    this.midiOutSetting = null
    this.inputBlocked = false // Track if input should be blocked
    this.initializeUI()
  }

  /**
   * Format a label using the configured format template
   * @param {string} text - The text to format
   * @param {string} type - The format type (menu, dialog, setting)
   * @returns {string} - The formatted label
   */
  formatLabel(text, type = 'menu') {
    const format = config.ui.labelFormats[type] || config.ui.labelFormats.menu
    return format.replace('{text}', text)
  }

  /**
   * Get UI styles for a specific component type
   * @param {string} type - The style type (menu, dialog)
   * @returns {object} - The style object
   */
  getStyles(type = 'menu') {
    return config.ui.styles[type] || config.ui.styles.menu
  }

  /**
   * Create standard menu properties with configured styles
   * @param {object} overrides - Additional properties to override defaults
   * @returns {object} - Menu properties object
   */
  createMenuProps(overrides = {}) {
    return {
      parent: this.screen,
      border: {
        type: 'line',
      },
      style: this.getStyles('menu'),
      keys: true,
      mouse: true,
      interactive: true,
      hidden: true,
      ...overrides,
    }
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

    this.menu = blessed.list({
      ...this.createMenuProps(),
      label: this.formatLabel('Menu'),
      width: 20,
      height: 'shrink',
      items: ['MIDI In', 'MIDI Out', 'Close Menu', 'Quit'],
    })

    this.midiInSetting = blessed.list({
      ...this.createMenuProps({
        left: 20,
        top: 0,
        width: 30,
        height: 'shrink',
      }),
      label: this.formatLabel('MIDI In', 'setting'),
      items: [],
    })

    this.midiOutSetting = blessed.list({
      ...this.createMenuProps({
        left: 20,
        top: 0,
        width: 30,
        height: 'shrink',
      }),
      label: this.formatLabel('MIDI Out', 'setting'),
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
   * Block input events from other handlers
   */
  blockInput() {
    this.inputBlocked = true
  }

  /**
   * Unblock input events for other handlers
   */
  unblockInput() {
    this.inputBlocked = false
  }

  /**
   * Check if input is currently blocked
   * @returns {boolean} - True if input is blocked
   */
  isInputBlocked() {
    return this.inputBlocked
  }

  /**
   * Shows a prompt dialog for user input
   * @param {string} message - The prompt message
   * @param {string} title - The dialog title (default: 'Input')
   * @returns {Promise<string>} - The user's input
   */
  prompt(message, title = 'Input') {
    return new Promise((resolve) => {
      this.blockInput() // Block other keyboard events

      const dialogStyles = this.getStyles('dialog')
      const promptBox = blessed.prompt({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 7,
        label: this.formatLabel(title, 'dialog'),
        tags: true,
        border: {
          type: 'line',
        },
        style: dialogStyles,
      })
      promptBox.input(message, '', (err, value) => {
        promptBox.destroy()
        this.unblockInput() // Unblock keyboard events
        this.screen.render()
        resolve(value || '')
      })

      this.screen.render()
    })
  }

  /**
   * Shows a simple text input box without buttons
   * @param {string} message - The input message/placeholder
   * @param {string} title - The input title (default: 'Input')
   * @returns {Promise<string>} - The user's input or empty string if cancelled
   */
  simpleInput(message, title = 'Input') {
    return new Promise((resolve) => {
      this.blockInput() // Block other keyboard events
      let inputText = ''

      const inputBox = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 3,
        label: this.formatLabel(title, 'dialog'),
        tags: true,
        border: {
          type: 'line',
        },
        style: this.getStyles('dialog'),
        keys: true,
        content: inputText,
      })

      // Handle key events manually
      inputBox.key(['enter'], () => {
        inputBox.destroy()
        this.unblockInput() // Unblock keyboard events
        this.screen.render()
        resolve(inputText.trim() || '')
      })

      inputBox.key(['escape'], () => {
        inputBox.destroy()
        this.unblockInput() // Unblock keyboard events
        this.screen.render()
        resolve('')
      })

      inputBox.key(['backspace'], () => {
        inputText = inputText.slice(0, -1)
        inputBox.setContent(inputText + '_')
        this.screen.render()
      })

      // Handle character input
      inputBox.on('keypress', (ch, key) => {
        if (key && !key.ctrl && !key.meta) {
          // Allow letters, numbers, spaces, hyphens, plus signs, and periods
          if (
            (key.name && key.name.length === 1) || // single characters (letters)
            (ch && /[0-9\s\-\+\.]/.test(ch)) || // numbers, spaces, -, +, .
            key.name === 'space' // explicit space key
          ) {
            if (key.name === 'space') {
              inputText += ' '
            } else {
              inputText += ch
            }
            inputBox.setContent(inputText + '_')
            this.screen.render()
          }
        }
      })

      inputBox.show()
      inputBox.focus()
      inputBox.setContent('_') // Show cursor
      this.screen.render()
    })
  }

  /**
   * Shows a selection dialog with a list of options
   * @param {string} message - The selection message
   * @param {Array<string>} options - Array of options to choose from
   * @param {string} title - The dialog title (default: 'Select')
   * @returns {Promise<string>} - The selected option or empty string if cancelled
   */
  select(message, options = [], title = 'Select') {
    return new Promise((resolve) => {
      if (options.length === 0) {
        resolve('')
        return
      }

      this.blockInput() // Block other keyboard events

      const selectBox = blessed.list({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 60,
        height: Math.min(options.length + 4, 15),
        label: this.formatLabel(title, 'dialog'),
        tags: true,
        border: {
          type: 'line',
        },
        style: this.getStyles('dialog'),
        keys: true,
        mouse: true,
        items: options,
        scrollable: true,
        alwaysScroll: true,
      })

      // Add instructions
      // const instructions = blessed.text({
      //   parent: selectBox,
      //   top: 0,
      //   left: 1,
      //   width: '100%-2',
      //   height: 1,
      //   content: message,
      //   style: { fg: 'cyan' },
      // })

      selectBox.on('select', (item, index) => {
        const selected = item.getText()
        selectBox.destroy()
        this.unblockInput() // Unblock keyboard events
        this.screen.render()
        resolve(selected)
      })

      selectBox.key(['escape', 'q'], () => {
        selectBox.destroy()
        this.unblockInput() // Unblock keyboard events
        this.screen.render()
        resolve('')
      })

      selectBox.focus()
      this.screen.render()
    })
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
