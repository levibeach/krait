/**
 * Sequencer - Handles advanced loop operations and command sequences
 *
 * This class manages complex operations that operate on loops, including:
 * - Loop manipulation commands (duplicate, multiply, trim, clean)
 * - Save and load operations with user interaction
 * - Sequence parsing and execution
 * - Reset operations for clearing loop states
 * - Coordination between UI prompts and loop management
 */
class Sequencer {
  constructor() {
    this.action = false // Flag indicating if a sequence is in progress
    this.sequence = '' // Current command sequence being built
    this.armReset = false // Flag for reset mode (clear all loops)
    this.debug = null // Debug logger instance
    this.loopManager = null // Loop manager instance
    this.ui = null // UI manager instance
  }

  /**
   * Set up dependencies for the sequencer
   * @param {Logger} debug - Debug logger instance
   * @param {LoopManager} loopManager - Loop management instance
   * @param {UIManager} ui - User interface manager instance
   */
  setDependencies(debug, loopManager, ui) {
    this.debug = debug
    this.loopManager = loopManager
    this.ui = ui
  }

  /**
   * Toggles the armReset state or sets it to a specific value.
   * Updates the label content of each loop based on the armReset state:
   * - If armed, sets each label to a red "×0N×" format (where N is the loop index + 1).
   * - If not armed, sets each label to a placeholder "————".
   *
   * @param {boolean} [val] - Optional. If provided, sets armReset to this value; otherwise, toggles armReset.
   */
  toggleReset(val) {
    this.armReset = typeof val != 'undefined' ? val : !this.armReset
    if (this.armReset) {
      for (let i = 0; i < 9; i++) {
        this.loopManager.currentLoops
          .get(i)
          .label.setContent(`{red-fg}×0${i + 1}×{/red-fg}`)
      }
    } else {
      for (let i = 0; i < 9; i++) {
        this.loopManager.currentLoops.get(i).label.setContent('————')
      }
    }
  }

  /**
   * Executes an action based on the first character of the global `sequence` string.
   * The action is determined by the character ('c', 'd', 'l', 'm', 's', 't'), and may call
   * one of the following functions: clean, duplicate, multiply, or trim, passing numeric
   * arguments parsed from the sequence string.
   * Handles errors by logging them and resets the global `action` and `sequence` variables.
   *
   * @throws {Error} Logs any error encountered during execution.
   */
  runSequence() {
    try {
      const s = this.sequence.charAt(0)
      const a = +this.sequence.charAt(1)
      const b = +this.sequence.charAt(2)
      switch (s) {
        case 'c':
          this.loopManager.clean(a)
          break
        case 'd':
          this.loopManager.duplicate(a, b)
          break
        case 'l':
          // Load a saved loop into a loop slot
          this.loadLoop(a)
          break
        case 'm':
          this.loopManager.multiply(a, b)
          break
        case 's':
          // Save a loop to disk
          this.saveLoop(a)
          break
        case 't':
          this.loopManager.trim(a, b)
          break
        default:
          // Do nothing.
          return
      }
    } catch (err) {
      this.debug.log(err)
    } finally {
      this.action = false
      this.sequence = ''
    }
  }

  /**
   * Start an action sequence with the given character
   * @param {string} ch - The action character (c, d, l, m, s, t)
   */
  startAction(ch) {
    this.action = true
    this.sequence = ch
  }

  /**
   * Add a character to the current sequence
   * @param {string} ch - Character to add
   */
  addToSequence(ch) {
    this.sequence += ch
    const s = this.sequence.charAt(0)
    if (
      (this.sequence.length === 2 && s === 'c') ||
      (this.sequence.length === 3 && ['d', 'm', 't'].includes(s)) ||
      (this.sequence.length === 2 && ['s', 'l'].includes(s))
    ) {
      this.runSequence()
    }
  }

  /**
   * Reset the sequencer state
   */
  reset() {
    this.action = false
    this.sequence = ''
    this.toggleReset(false)
  }

  /**
   * Save a loop with user input for filename
   * @param {number} loopNumber - The loop number to save (1-9)
   */
  async saveLoop(loopNumber) {
    try {
      const promptCallback = (message) =>
        this.ui.simpleInput(message, 'Save Loop')
      await this.loopManager.saveLoop(loopNumber, promptCallback)
    } catch (err) {
      this.debug.log(`Error in save operation: ${err.message}`)
    }
  }

  /**
   * Load a saved loop with user selection dialog
   * @param {number} loopNumber - The loop number to load into (1-9)
   */
  async loadLoop(loopNumber) {
    try {
      const selectCallback = (message, options) =>
        this.ui.select(message, options, 'Load Loop')
      await this.loopManager.loadLoop(loopNumber, selectCallback)
    } catch (err) {
      this.debug.log(`Error in load operation: ${err.message}`)
    }
  }

  // Getters for external access
  get isActive() {
    return this.action
  }

  get isArmReset() {
    return this.armReset
  }

  get currentSequence() {
    return this.sequence
  }
}

module.exports = Sequencer
