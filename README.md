# KRAIT

![Kapture 2024-09-03 at 08 51 09](https://github.com/user-attachments/assets/6e8f19eb-0b9c-40b4-bba7-880c18ae3a54)

Krait is a command line MIDI looper application that records, plays, and manipulates MIDI messages in real-time. Version 0.4.1 includes advanced sequencing operations, save/load functionality, and a customizable terminal user interface.

## Install & Run

To get Krait running in the terminal, first make sure you have Node.js and NPM installed.

```bash
git clone https://github.com/levibeach/krait.git
cd krait
npm install
npm run start
# OR
node ./src/main.js
```

### Additional Scripts

- `npm run hotdev` - Start with auto-reload during development
- `npm run debug` - Tail the debug log file (.kraitlog)

## Usage

### Basic Loop Operations

#### Arming & Recording

The core workflow for creating loops:

1. Select a loop by pressing any number key **1-9**.
2. The loop you selected will highlight indicating that it is ready to record (armed).
3. As soon as a MIDI signal is detected from the MIDI input, it will start recording messages to the loop.
4. When you want to stop recording, press the same number key again.

After you stop recording, the loop will immediately start playing so that there is virtually no pause when looping in a live session.

#### Overdubbing

To add to an existing loop:

1. Select a loop by pressing the number key
2. Play something (MIDI will be layered onto the existing loop)
3. Press the loop number key again to stop overdubbing

#### Play/Pause

While holding **Shift** and press a number (1-9) to play/pause that loop independently.

### Save & Load Operations

#### Saving Loops

To save a loop to disk:

1. Press **`s`** to start a save sequence
2. Press the number (1-9) of the loop you want to save
3. A prompt will appear asking for a filename
4. Enter the desired filename (without extension)
5. Press Enter to save

#### Loading Loops

To load a previously saved loop:

1. Press **`l`** to start a load sequence
2. Press the number (1-9) of the loop slot to load into
3. A selection dialog will appear with available saved loops
4. Use arrow keys to navigate and Enter to select
5. Press Escape to cancel

Loops are saved to the `./saves/` directory as JSON files.

### Advanced Operations

There are several operations that allow you to manipulate loops. Their primary purpose is to manipulate the length and content of loops. The constraint is to keep operations within 3 keystrokes. Since there are only 9 loops possible, the formula is: **`[operation][source][target/factor]`** where `operation` is the operation character and the following digits specify source and target loops or modification factors.

#### (D)uplicate

Create an empty loop with the same length as another loop. This is useful for creating layers of loops at the same length.

**Usage:** Press **`d`** followed by the source loop number, then the destination loop slot.

| Operation | Outcome                          |
| :-------- | :------------------------------- |
| `d25`     | Loop 2's length is set on loop 5 |
| `d93`     | Loop 9's length is set on loop 3 |

#### (M)ultiply

Expand a loop's length by a specific factor. Useful for extending loops to create longer variations.

**Usage:** Press **`m`** followed by the loop number, then the multiplication factor.

| Operation | Outcome                          |
| :-------- | :------------------------------- |
| `m32`     | Loop 3's length is multiplied 2x |
| `m55`     | Loop 5's length is multiplied 5x |

#### (T)rim

Reduce the length of a loop by a division factor.

**Usage:** Press **`t`** followed by the loop number, then the division factor.

| Operation | Outcome                         |
| :-------- | :------------------------------ |
| `t42`     | Loop 4's length is cut in half  |
| `t63`     | Loop 6's length is cut to a 3rd |

#### (C)lean

Remove all MIDI data from a loop while keeping its length. Useful for clearing content while preserving timing.

**Usage:** Press **`c`** followed by the loop number.

| Operation | Outcome                       |
| --------- | :---------------------------- |
| `c1`      | Loop 1's MIDI data is removed |
| `c2`      | Loop 2's MIDI data is removed |

### Interface Features

#### Input Display

Press **`~`** to toggle the input display, which shows a running log of all incoming MIDI data streaming in the background.

#### MIDI Configuration

Use the main menu to:

- Configure MIDI input ports
- Configure MIDI output ports
- Navigate between different interface components

#### Debug Mode

Krait automatically logs all activity to `.kraitlog`. Use `npm run debug` to monitor the log in real-time.

## Configuration

Krait uses a `config.json` file for customization:

- **saveDirectory**: Where loop files are saved (default: "./saves")
- **midiRate**: Timing rate in milliseconds (default: 25)
- **defaultPorts**: Default MIDI input/output ports
- **ui**: User interface styling and label formatting

## Architecture

Krait is built with a modular architecture:

- **main.js**: Application entry point and initialization
- **modules/**: Core functionality modules
  - **ui.js**: User interface management
  - **midi.js**: MIDI input/output handling
  - **loops.js**: Loop recording, playback, and management
  - **sequencer.js**: Advanced operations and sequencing
  - **events.js**: Event handling and keyboard mappings
- **data/**: Static data and animations
- **utils/**: Utility functions and formatters

## Development

### Version Management

Krait uses semantic versioning with automated bumping and git tagging:

```bash
# Check current version
npm run version

# Bump version (updates files, no commit)
npm run bump:patch   # 0.4.1 -> 0.4.2
npm run bump:minor   # 0.4.1 -> 0.5.0
npm run bump:major   # 0.4.1 -> 1.0.0

# Full release (bump, commit, tag, push)
npm run release:patch
npm run release:minor
npm run release:major
```

See [docs/VERSIONING.md](docs/VERSIONING.md) for detailed information.

---

**NOTE:** This app is provided without any guarentee of actually working on yours or anyone else's machine. It's a continuous work-in-progress, so if you find a bug let me know.

Also, if you make something cool, toot it at me on [Mastodon](https://merveilles.town/deck/@levibeach).
