const blessed = require('blessed')

/**
 * SequencePreview - Manages the sequence input display and animation
 * Displays typed sequences in the bottom right corner with:
 * - Gray text while typing
 * - Black text on green background when completed
 * - White block wipe animation on clearance
 */
class SequencePreview {
  constructor(screen) {
    this.screen = screen
    this.sequencePreviewText = ''
    this.sequencePreviewTimer = null

    this.box = blessed.box({
      parent: this.screen,
      bottom: 0,
      right: 0,
      width: 'shrink',
      height: 1,
      tags: true,
      hidden: true,
      style: {
        fg: 'gray',
      },
      padding: 0,
    })
  }

  setSequence(sequence) {
    this.sequencePreviewText = String(sequence || '')

    if (this.sequencePreviewTimer) {
      clearTimeout(this.sequencePreviewTimer)
      this.sequencePreviewTimer = null
    }

    this.box.setContent(this.sequencePreviewText.toUpperCase())
    this.box.style.fg = 'gray'
    this.box.show()
    this.screen.render()
  }

  complete() {
    if (!this.sequencePreviewText) return

    if (this.sequencePreviewTimer) {
      clearTimeout(this.sequencePreviewTimer)
    }

    this.box.style.fg = 'black'
    this.box.style.bg = 'green'
    this.screen.render()

    this.sequencePreviewTimer = setTimeout(() => {
      this.clear()
    }, 2000)
  }

  clear() {
    this.sequencePreviewText = ''

    if (this.sequencePreviewTimer) {
      clearTimeout(this.sequencePreviewTimer)
      this.sequencePreviewTimer = null
    }

    this.animateWipe()
  }

  animateWipe() {
    const text = this.box.content || ''
    const blocks = ['█', '▓', '▒', '░']

    this.box.style.bg = 'default'

    const duration = 600
    const totalSteps = text.length * blocks.length + blocks.length
    const stepDuration = duration / totalSteps
    let step = 0

    const wipeFrame = () => {
      if (step >= totalSteps) {
        this.box.style.fg = 'gray'
        this.box.style.bg = 'default'
        this.box.hide()
        this.box.setContent('')
        this.screen.render()
        return
      }

      let newContent = ''

      for (let i = 0; i < text.length; i += 1) {
        const charStep = step - i

        if (charStep < 0) {
          newContent += text[i]
        } else if (charStep < blocks.length) {
          newContent += `{white-fg}${blocks[charStep]}{/white-fg}`
        } else {
          newContent += ' '
        }
      }

      this.box.setContent(newContent)
      this.screen.render()
      step += 1
      this.sequencePreviewTimer = setTimeout(wipeFrame, stepDuration)
    }

    wipeFrame()
  }
}

module.exports = SequencePreview
