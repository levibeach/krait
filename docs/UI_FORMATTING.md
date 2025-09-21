# UI Configuration and Formatting

## Overview

Krait uses a centralized UI configuration system that allows you to customize label formatting and styles across all UI components. This system provides consistency while allowing easy customization of the terminal interface appearance.

## Configuration Location

All UI formatting is controlled through the `config.json` file in the root directory. The current configuration structure is:

```json
{
  "ui": {
    "labelFormats": {
      "menu": " {text} ",
      "dialog": " {text} ",
      "setting": " {text} "
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
          "selected": {
            "fg": "black",
            "bg": "white"
          },
          "border": {
            "fg": "white"
          }
        },
        "fg": "white"
      },
      "default": {
        "focus": {
          "fg": "black",
          "bg": "white"
        }
      }
    }
  }
}
```

## Label Formatting

### Format Templates

Label formats use a simple template system where `{text}` is replaced with the actual text content:

- `" {text} "` → `" Menu "` (current default)
- `"[ {text} ]"` → `"[ Menu ]"`
- `":: {text} ::"` → `":: Menu ::"`
- `"{text}"` → `"Menu"` (minimal formatting)

### Format Types

The system supports three distinct format types:

- **menu**: Main application menus and navigation elements
- **dialog**: Dialog box titles, prompts, and confirmations
- **setting**: Settings menu labels (MIDI In/Out configuration)

Each type can have its own formatting template, allowing for visual distinction between different UI elements.

## Styling System

Styles follow the blessed.js style format and can be customized for different component types. The style system includes:

### Available Style Types

- **menu**: Main menus, lists, and navigation components
- **dialog**: Dialog boxes, prompts, and confirmation windows
- **default**: Fallback styles used when specific styles aren't defined

### Style Properties

Each style type can define:

- **focus**: Appearance when the component has focus
  - **selected**: Style for selected items within focused components
  - **border**: Border color and style when focused
  - **fg**: Foreground (text) color when focused
- **fg**: Default foreground color for the component

### Color Options

Standard blessed.js colors are supported:

- Basic colors: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
- Additional colors available depending on terminal support

## Usage in Code

### UIManager Methods

The UIManager class provides several methods for consistent formatting throughout the application:

```javascript
// Format a label with specific type
const label = ui.formatLabel('Menu Text', 'menu')

// Get styles for a component type with fallbacks
const styles = ui.getStyles('dialog') // Falls back to menu, then default

// Create standard menu properties with custom overrides
const menuProps = ui.createMenuProps({
  width: 30,
  height: 10,
})
```

### Standalone Utility

For use outside of the UIManager (though UIManager is preferred):

```javascript
const UIFormatter = require('./utils/ui-formatter.js')

// Format label
const label = UIFormatter.formatLabel('Text', 'menu')

// Get styles with automatic fallbacks
const styles = UIFormatter.getStyles('dialog')

// Create standard component properties
const props = UIFormatter.createStandardProps('menu', {
  width: '50%',
})
```

## Configuration Examples

### Changing Label Style

To change from the current `" Menu "` format to bracketed style:

```json
{
  "ui": {
    "labelFormats": {
      "menu": "[ {text} ]",
      "dialog": "[ {text} ]",
      "setting": "[ {text} ]"
    }
  }
}
```

### Customizing Colors

To change menu colors to a blue theme:

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
          "fg": "blue"
        }
      }
    }
  }
}
```

### Adding Dialog Styling

To enhance dialog appearance:

```json
{
  "ui": {
    "styles": {
      "dialog": {
        "focus": {
          "selected": {
            "fg": "black",
            "bg": "yellow"
          },
          "border": {
            "fg": "yellow"
          }
        },
        "fg": "yellow"
      }
    }
  }
}
```

## Benefits

- **Consistency**: All UI elements use the same formatting rules and style system
- **Maintainability**: Change formatting and colors in one central location
- **Customization**: Easy to modify appearance without touching source code
- **Reusability**: Formatting methods can be used throughout the application
- **Fallback system**: Automatic fallbacks ensure components always have valid styles
- **Separation of concerns**: UI appearance is separated from functionality

## Implementation Details

### Style Resolution

The system uses a hierarchical fallback approach:

1. Try to use the requested style type (e.g., 'dialog')
2. Fall back to 'menu' styles if the requested type doesn't exist
3. Fall back to 'default' styles as a final fallback
4. Use blessed.js defaults if no custom styles are found

### Component Integration

- All UI components automatically use the centralized styling system
- The UIManager coordinates style application across all interface elements
- Changes to config.json take effect on application restart
- The system integrates seamlessly with blessed.js component properties

### Performance Considerations

- Styles are loaded once at startup from config.json
- No runtime performance impact from the formatting system
- Configuration is cached in memory for fast access during UI operations
