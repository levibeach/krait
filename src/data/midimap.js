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
}
