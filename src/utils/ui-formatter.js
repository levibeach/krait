const config = require('../../config.json')

/**
 * UIFormatter - Centralized UI styling and formatting utilities
 *
 * Provides consistent formatting and styling across all UI components:
 * - Template-based label formatting with configurable patterns
 * - Hierarchical style resolution with automatic fallbacks
 * - Blessed.js component property generation
 * - Integration with config.json for easy customization
 * - Static methods for use without instantiation
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
   * Get UI styles for a specific component type with automatic fallbacks
   * @param {string} type - The style type (menu, dialog, default)
   * @returns {object} - The style object with fallback to menu then default styles
   */
  static getStyles(type = 'menu') {
    return (
      config.ui.styles[type] ||
      config.ui.styles.menu ||
      config.ui.styles.default
    )
  }

  /**
   * Create standard blessed component properties with configured styles
   * @param {string} styleType - The style type (menu, dialog, default)
   * @param {object} overrides - Additional properties to override defaults
   * @returns {object} - Complete component properties object ready for blessed.js
   */
  static createStandardProps(styleType = 'menu', overrides = {}) {
    return {
      border: { type: 'line' },
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
