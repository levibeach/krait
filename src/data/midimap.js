// MIDI Status Codes
// http://www.opensound.com/pguide/midi/midi5.html
const createMidiMap = (type, startCode) => {
  const map = {}
  for (let i = 0; i < 16; i++) {
    map[startCode + i] = { channel: i, type }
  }
  return map
}

module.exports = {
  ...createMidiMap('Note Off', 128),
  ...createMidiMap('Note On', 144),
  ...createMidiMap('Polyphonic Aftertouch', 160),
  ...createMidiMap('Control Change', 176),
  ...createMidiMap('Program Change', 192),
  ...createMidiMap('Channel Aftertouch', 208),
  ...createMidiMap('Pitch Wheel', 224),
  // System Common Messages (single codes, not per channel)
  240: { type: 'System Exclusive' },
  241: { type: 'MIDI Time Code Quarter Frame' },
  242: { type: 'Song Position Pointer' },
  243: { type: 'Song Select' },
  244: { type: 'Undefined (System Common)' },
  245: { type: 'Undefined (System Common)' },
  246: { type: 'Tune Request' },
  247: { type: 'End of SysEx' },
  // System Real-Time Messages
  248: { type: 'Timing Clock' },
  249: { type: 'Undefined (System Real-Time)' },
  250: { type: 'Start' },
  251: { type: 'Continue' },
  252: { type: 'Stop' },
  253: { type: 'Undefined (System Real-Time)' },
  254: { type: 'Active Sensing' },
  255: { type: 'System Reset' },
}
