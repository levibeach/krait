const blessed = require('blessed')
const config = require('../../config.json')

/**
 * UIManager - Manages all user interface components and dialogs for Krait
 * Handles screen setup, dialog management, and input blocking for clean UX
 */
class UIManager {
  /**
   * Initialize the UI manager with screen and component setup
   * Automatically initializes all UI components and sets up input blocking
   */
  constructor() {
    this.screen = null
    this.inputDisplay = null
    this.loopList = null
    this.menu = null
    this.midiInSetting = null
    this.midiOutSetting = null
    this.inputBlocked = false // Track if input should be blocked for dialogs
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
   * @param {string} type - The style type (menu, dialog, default)
   * @returns {object} - The style object from config, with fallbacks to menu then default styles
   */
  getStyles(type = 'menu') {
    return (
      config.ui.styles[type] ||
      config.ui.styles.menu ||
      config.ui.styles.default
    )
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
   * Block input events from other keyboard handlers
   * Used to prevent interference when dialogs are active
   */
  blockInput() {
    this.inputBlocked = true
  }

  /**
   * Unblock input events for other keyboard handlers
   * Restores normal keyboard functionality after dialogs close
   */
  unblockInput() {
    this.inputBlocked = false
  }

  /**
   * Check if input is currently blocked by an active dialog
   * @returns {boolean} - True if input is blocked, false otherwise
   */
  isInputBlocked() {
    return this.inputBlocked
  }

  /**
   * Shows a prompt dialog for user input with OK/Cancel buttons
   * Blocks other keyboard events while active
   * @param {string} message - The prompt message to display
   * @param {string} title - The dialog title (default: 'Input')
   * @returns {Promise<string>} - The user's input or empty string if cancelled
   */
  prompt(message, title = 'Input') {
    return new Promise((resolve) => {
      this.blockInput() // Block other keyboard events

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
        style: this.getStyles('default'),
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
   * Supports letters, numbers, spaces, hyphens, plus signs, and periods
   * Blocks other keyboard events while active
   * @param {string} message - The input message/placeholder (currently unused)
   * @param {string} title - The input title (default: 'Input')
   * @returns {Promise<string>} - The user's input (trimmed) or empty string if cancelled
   * @description
   * Key controls:
   * - Enter: Save input and close
   * - Escape: Cancel and close
   * - Backspace: Delete last character
   * - Alphanumeric + space, -, +, .: Add to input
   */
  simpleInput(message, title = 'Input') {
    return new Promise((resolve) => {
      this.blockInput() // Block other keyboard events
      let inputText = ''

      // Use a simplified style object to avoid nested property issues
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
   * Blocks other keyboard events while active
   * @param {string} message - The selection message (currently unused)
   * @param {Array<string>} options - Array of options to choose from
   * @param {string} title - The dialog title (default: 'Select')
   * @returns {Promise<string>} - The selected option or empty string if cancelled/no options
   * @description
   * Key controls:
   * - Up/Down arrows: Navigate options
   * - Enter: Select highlighted option
   * - Escape/q: Cancel selection
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
   * Start the main render loop for continuous screen updates
   * @param {number} interval - Render interval in milliseconds (default: 25ms = 40fps)
   */
  startRenderLoop(interval = 25) {
    setInterval(() => {
      this.screen.render()
    }, interval)
  }

  // Getters for external module access to UI components

  /** @returns {blessed.Screen} - The main blessed screen instance */
  get mainScreen() {
    return this.screen
  }

  /** @returns {blessed.Log} - The input/debug log display component */
  get logger() {
    return this.inputDisplay
  }

  /** @returns {blessed.Box} - The main loop container for loop displays */
  get loopContainer() {
    return this.loopList
  }

  /** @returns {blessed.List} - The main application menu */
  get mainMenu() {
    return this.menu
  }

  /** @returns {blessed.List} - The MIDI input device selection menu */
  get midiInMenu() {
    return this.midiInSetting
  }

  /** @returns {blessed.List} - The MIDI output device selection menu */
  get midiOutMenu() {
    return this.midiOutSetting
  }
}

module.exports = UIManager
