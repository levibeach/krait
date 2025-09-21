# Version Bumping Demo

## Current Status

📦 Current version: 0.4.1
🏷️ Latest git tags: v0.3.0, v0.4.0

## Examples

### Simple Version Bump (no git operations)

```bash
# Updates files only
npm run bump:patch     # 0.4.1 -> 0.4.2
npm run bump:minor     # 0.4.1 -> 0.5.0
npm run bump:major     # 0.4.1 -> 1.0.0
```

### Preview Changes (safe to run)

```bash
# See what would happen without making changes
node scripts/bump-version.js patch --dry-run
node scripts/bump-version.js minor --commit --push --dry-run
```

### Full Release Workflow

```bash
# For a patch release with commit and push
npm run release:patch

# This is equivalent to:
# 1. Update package.json: 0.4.1 -> 0.4.2
# 2. Update src/main.js @version: 0.4.1 -> 0.4.2
# 3. Commit changes: "Bump version to 0.4.2"
# 4. Create git tag: v0.4.2
# 5. Push commit and tag to remote
```

### Manual Control

```bash
# Bump version and create tag but don't commit
node scripts/bump-version.js patch

# Bump version and commit but don't push
node scripts/bump-version.js minor --commit

# Bump version but skip tag creation
node scripts/bump-version.js patch --no-tag
```

## Safety Features

- ✅ Prevents bumping if working directory is dirty
- ✅ Prevents creating duplicate git tags
- ✅ Dry run mode for testing
- ✅ Clear error messages and status reporting
