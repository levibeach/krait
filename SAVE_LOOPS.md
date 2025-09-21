# Loop Save/Load Functionality

## Overview

Krait provides comprehensive save and load functionality for recorded loops, allowing you to persist your musical patterns to disk and reload them later. This feature is essential for building a library of loops and creating complex compositions.

## Saving Loops

To save a loop to disk:

1. Press **`s`** to start a save sequence
2. Press the number (1-9) of the loop you want to save
3. A prompt will appear asking for a filename
4. Enter the desired filename (without extension - `.json` will be added automatically)
5. Press Enter to save the loop

## Loading Loops

To load a previously saved loop:

1. Press **`l`** to start a load sequence
2. Press the number (1-9) of the loop slot to load into
3. A selection dialog will appear with available saved loops
4. Use arrow keys to navigate and Enter to select a loop
5. Press Escape to cancel the operation

The selected loop will replace whatever was previously in the target slot.

## Examples

### Saving a Loop

1. Press **`s`** then **`3`** to save loop 3
2. When prompted, enter "my-bass-loop"
3. The loop will be saved as `my-bass-loop.json` in the saves directory

### Loading a Loop

1. Press **`l`** then **`2`** to load into loop slot 2
2. Navigate through the list of available saved loops using arrow keys
3. Press Enter to select and load the highlighted loop
4. The selected loop will replace whatever was in slot 2

## Save Location

Loops are saved to the directory specified in `config.json` under `saveDirectory`. The default location is `./saves/`.

The save directory will be created automatically if it doesn't exist when you first save a loop.

## File Format

Saved loops are stored as JSON files containing:

- **Loop metadata**: ID, length, save timestamp
- **MIDI data**: Complete frame-by-frame MIDI information
- **Timing information**: MIDI rate and frame timing
- **Loop state**: Playing status and configuration details

### Example Save File Structure

````json
## File Format

Saved loops are stored as JSON files containing:

- **Loop metadata**: ID, length, save timestamp
- **MIDI channels**: Array of MIDI channels used in recording (0-15, in order of first occurrence)
- **MIDI data**: Complete frame-by-frame MIDI information
- **Timing information**: MIDI rate and frame timing
- **Loop state**: Playing status and configuration details

### Example Save File Structure

```json
{
  "id": 3,
  "loopLength": 96,
  "locked": true,
  "channels": [0, 9],
  "data": [
    [0, [[144, 60, 127]]],
    [24, [[128, 60, 0], [153, 36, 100]]]
  ],
  "metadata": {
    "version": "1.0",
    "savedAt": "2025-09-21T15:30:00.000Z",
    "midiRate": 25
  }
}
````

**Note**: The `channels` array tracks which MIDI channels (0-15) were used during recording, listed in the order they first appeared. This helps identify the instruments or voices that were recorded in the loop.

```

## Implementation Details

### Saving Requirements

- Only loops that have recorded content and a defined length can be saved
- The save directory will be created automatically if it doesn't exist
- Each saved loop includes all MIDI events recorded during that loop's session
- Filenames cannot be empty - the save operation will be cancelled if no filename is provided

### Loading Behavior

- Loading will stop any currently playing loop in the target slot
- All existing data in the target slot will be completely replaced
- Loaded loops maintain their original timing, length, and MIDI data
- A visual "load" animation will play to indicate successful loading
- Loading can be cancelled at any time by pressing Escape

### Error Handling

- Invalid save operations are logged to the debug log
- Missing save directory is automatically created
- Empty or invalid filenames result in operation cancellation
- Load errors are logged with descriptive error messages

## Technical Notes

- Save/load operations are handled asynchronously to prevent UI blocking
- The sequencer module coordinates between the UI and loop manager for save/load operations
- All save/load activities are logged to `.kraitlog` for debugging purposes
- The file format is designed to be forward-compatible with future versions of Krait
```
