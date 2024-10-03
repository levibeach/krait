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

1. Select a loop you by pressing the number key
2. Play something
3. Press the loop number key again

### Play/Pause

While holding `Shift` and press a number to play/pause that loop.
## Operations

There are three main operations that will allow your to manipulate loops. Their primary purpose, for now, is to manipulate the length of loops. The constraint is to keep it within 3 key strokes. Since there are only 9 loops possible, its easy to have a formula of an operation plus two modifiers: `[op][mod][mod]` where `op` is the operation and `mod` is a single digit 0-9.


### (D)uplicate

In some situations you want a clone of a loop with none of the data (i.e. an empty loop of the same length as another one). 

To do this, press `d` followed by the loop number, then the destination loop slot.

#### Examples

| Operation | Outcome                          |
| --------- | -------------------------------- |
| `d25`     | Loop 2's length is set on loop 5 |
| `d93`     | Loop 9's length is set on loop 3 |

To duplicate loop 2 to the loop 5 slot, simply type: `d25`

### (M)ultiply

This operation emerged from a need to expand a loops length by a specific factor so that when a loop is duplicated you can extend it by a desired length.

To do this, press `m` followed by the loop number, then the factor to which you want to multiply its length.

#### Examples

| Operation | Outcome                          |
| --------- | -------------------------------- |
| `m32`     | Loop 3's length is multiplied 2x |
| `m55`     | Loop 5's length is multiplied 5x |

### (C)lean

Need to get rid of the MIDI data but keep the loop length? Just type `c` followed by the loop number you want to clean out.

#### Example
| Operation | Outcome                          |
| --------- | -------------------------------- |
| `c1`     | Loop 1's MIDI data is removed     |
| `c2`     | Loop 2's MIDI data is removed     |

---

If you make something cool, toot it at me on [Mastodon](https://merveilles.town/deck/@levibeach).
