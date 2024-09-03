# KRAIT

<img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Red-headed_Krait.jpg" alt="Red-headed krait snake" width="400"/>


Krait is a small command line application that records and plays MIDI messages.

**WARNING:** This is a work-in-progress and was created fairly quickly so use at your own risk.

## Install & Run

To get Krait running in the terminal, first makes ure you you have a Node and NPM installed.

```bash
git clone https://github.com/levibeach/krait.git
cd krait
npm install
npm run start
# OR
node index
```

## Usages

![Kapture 2024-09-03 at 08 51 09](https://github.com/user-attachments/assets/6e8f19eb-0b9c-40b4-bba7-880c18ae3a54)

### Arming & Recording

The idea is to quickly arm and record loops:

1. Select a loop by pressing any number key 1-9.
2. The loop you selected will highlight indicating that it is ready to record (armed).
2. As soon as a MIDI signal is detected from the MIDI in it will start recording messages to the loop.
3. When you want to stop the recording, just press the same number key again.

After you have stopped recording the loop will immediately start playing so that there is virtually no pause when looping in a live session.

### Overdubbing

If you want to add to an existing loop:

1. Select a loop you by pressing the number key.
2. Play something!
3. Press the loop number key again.

### Pausing, Replaying, & Deleting

While holding `Shift`:
- Press a number once to pause/replay that loop.
- Double-press a number while it is playing to delete that loop.




