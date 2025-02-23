const fs = require('fs')
const path = require('path')

class Logger {
  constructor() {
    this.logFile = path.join('./', '.kraitlog')
    const _this = this
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
