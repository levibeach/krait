const fs = require('fs')
const path = require('path')

/**
 * Logger - File-based logging utility for debugging and monitoring
 *
 * Provides centralized logging functionality with automatic file management:
 * - Creates and manages .kraitlog file in the project root
 * - Truncates log file on each new session for fresh starts
 * - Timestamps all log entries for debugging purposes
 * - Handles file I/O errors gracefully
 * - Thread-safe append operations for concurrent logging
 */
class Logger {
  constructor() {
    this.logFile = path.join('./', '.kraitlog')
    const _this = this

    // Initialize log file - truncate existing content for new session
    fs.open(this.logFile, 'a', (err, fd) => {
      if (err) {
        console.error('Error opening file:', err)
        return
      }
      fs.ftruncate(fd, 0, (err) => {
        if (err) {
          console.error('Error truncating the file:', err)
        }
        fs.close(fd, (err) => {
          if (err) console.error('Error closing file:', err)
        })
      })
      _this.log('————————[ NEW SESSION ]————————')
    })
  }

  /**
   * Log a message with timestamp to the log file
   * @param {string|Error|Object} message - Message to log (will be converted to string)
   */
  log(message) {
    const timestamp = new Date().toISOString()
    const logMessage = `${timestamp} - ${message}\n`
    fs.appendFile(this.logFile, logMessage, (err) => {
      if (err) {
        console.error(`Failed to write to log file: ${err}`)
      }
    })
  }
}

module.exports = Logger
