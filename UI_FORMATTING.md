# UI Configuration and Formatting

## Overview

The Krait application now uses a centralized UI configuration system that allows you to customize label formatting and styles across all UI components.

## Configuration

All UI formatting is controlled through the `config.json` file in the root directory:

```json
{
  "ui": {
    "labelFormats": {
      "menu": "[ {text} ]",
      "dialog": "[ {text} ]",
      "setting": "[ {text} ]"
    },
    "styles": {
      "menu": {
        "focus": {
          "selected": {
            "fg": "black",
            "bg": "white"
          },
          "border": {
            "fg": "white"
          },
          "fg": "white"
        }
      },
      "dialog": {
        "focus": {
          "border": {
            "fg": "yellow"
          }
        }
      }
    }
  }
}
```

## Label Formatting

### Format Templates

Label formats use a simple template system where `{text}` is replaced with the actual text:

- `"[ {text} ]"` → `"[ Menu ]"`
- `":: {text} ::"` → `":: Menu ::"`
- `"{text}"` → `"Menu"`

### Format Types

- **menu**: Main menu labels
- **dialog**: Dialog box titles (prompts, confirmations)
- **setting**: Settings menu labels (MIDI In/Out)

## Styling

Styles follow the blessed.js style format and can be customized for different component types:

- **menu**: Main menus and lists
- **dialog**: Dialog boxes and prompts

## Usage in Code

### UIManager Methods

The UIManager provides several methods for consistent formatting:

```javascript
// Format a label
const label = ui.formatLabel('Menu Text', 'menu')

// Get styles for a component
const styles = ui.getStyles('dialog')

// Create standard menu properties
const menuProps = ui.createMenuProps({ width: 30 })
```

### Standalone Utility

For use outside of UIManager:

```javascript
const UIFormatter = require('./utils/ui-formatter.js')

const label = UIFormatter.formatLabel('Text', 'menu')
const styles = UIFormatter.getStyles('dialog')
```

## Examples

### Changing Label Style

To change from `[ Menu ]` to `:: Menu ::`:

```json
{
  "ui": {
    "labelFormats": {
      "menu": ":: {text} ::",
      "dialog": ":: {text} ::",
      "setting": ":: {text} ::"
    }
  }
}
```

### Customizing Colors

To change menu colors:

```json
{
  "ui": {
    "styles": {
      "menu": {
        "focus": {
          "selected": {
            "fg": "white",
            "bg": "blue"
          },
          "border": {
            "fg": "cyan"
          },
          "fg": "green"
        }
      }
    }
  }
}
```

## Benefits

- **Consistency**: All UI elements use the same formatting rules
- **Maintainability**: Change formatting in one place
- **Customization**: Easy to modify appearance without code changes
- **Reusability**: Formatting methods can be used throughout the application
