const config = require('../../config.json')

/**
 * UI formatting utilities
 */
class UIFormatter {
  /**
   * Format a label using the configured format template
   * @param {string} text - The text to format
   * @param {string} type - The format type (menu, dialog, setting)
   * @returns {string} - The formatted label
   */
  static formatLabel(text, type = 'menu') {
    const format = config.ui.labelFormats[type] || config.ui.labelFormats.menu
    return format.replace('{text}', text)
  }

  /**
   * Get UI styles for a specific component type
   * @param {string} type - The style type (menu, dialog)
   * @returns {object} - The style object
   */
  static getStyles(type = 'menu') {
    return config.ui.styles[type] || config.ui.styles.menu
  }

  /**
   * Create standard blessed component properties with configured styles
   * @param {string} styleType - The style type (menu, dialog)
   * @param {object} overrides - Additional properties to override defaults
   * @returns {object} - Component properties object
   */
  static createStandardProps(styleType = 'menu', overrides = {}) {
    return {
      border: {
        type: 'line',
      },
      style: this.getStyles(styleType),
      keys: true,
      mouse: true,
      interactive: true,
      hidden: true,
      ...overrides,
    }
  }
}

module.exports = UIFormatter
