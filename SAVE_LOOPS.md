# Loop Save/Load Functionality

## Saving Loops

To save a loop to disk:

1. Press `s` to start a save sequence
2. Press the number (1-9) of the loop you want to save
3. A prompt will appear asking for a filename
4. Enter the desired filename (without extension)
5. Press Enter to save

## Loading Loops

To load a previously saved loop:

1. Press `l` to start a load sequence
2. Press the number (1-9) of the loop slot to load into
3. A selection dialog will appear with available saved loops
4. Use arrow keys to navigate and Enter to select
5. Press Escape to cancel

## Examples

### Saving

- Press `s` then `3` to save loop 3
- When prompted, enter "my-bass-loop"
- The loop will be saved as `my-bass-loop.json`

### Loading

- Press `l` then `2` to load into loop slot 2
- Select from the list of available saved loops
- The selected loop will replace whatever was in slot 2

## Save Location

Loops are saved to the directory specified in `config.json` under `saveDirectory`. By default, this is `./saved-loops/`.

## File Format

Saved loops are stored as JSON files containing:

- Loop ID and length
- MIDI data for each frame
- Metadata (save timestamp, version, MIDI rate)
- Loop state information

## Notes

### Saving

- Only loops that have recorded content and a defined length can be saved
- The save directory will be created automatically if it doesn't exist
- Each saved loop includes all MIDI events recorded in that loop

### Loading

- Loading will stop any currently playing loop in the target slot
- All existing data in the target slot will be replaced
- Loaded loops maintain their original timing and MIDI data
- A visual "load" animation will play to indicate successful loading
