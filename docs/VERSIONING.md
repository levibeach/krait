# Version Management

Krait uses semantic versioning (semver) with automated version bumping and git tagging.

## Current Version

To check the current version:

```bash
npm run version
# or
node scripts/bump-version.js --current
```

## Version Bumping

### Manual Version Updates

Update version numbers without committing:

```bash
# Patch version (0.4.1 -> 0.4.2)
npm run bump:patch

# Minor version (0.4.1 -> 0.5.0)
npm run bump:minor

# Major version (0.4.1 -> 1.0.0)
npm run bump:major
```

### Full Release Process

Bump version, commit changes, create git tag, and push to remote:

```bash
# Patch release
npm run release:patch

# Minor release
npm run release:minor

# Major release
npm run release:major
```

## Advanced Usage

The version bumper script supports additional options:

```bash
# Dry run to see what would happen
node scripts/bump-version.js patch --dry-run

# Bump and commit but don't push
node scripts/bump-version.js minor --commit

# Bump version but skip git tag creation
node scripts/bump-version.js patch --no-tag

# Bump, commit, tag, and push everything
node scripts/bump-version.js minor --commit --push
```

## What Gets Updated

When bumping versions, the following files are automatically updated:

1. **package.json** - The main version field
2. **src/main.js** - The @version tag in the JSDoc comment

## Git Integration

- **Tags**: Creates annotated git tags in the format `v{version}` (e.g., `v0.4.2`)
- **Commits**: Optional automatic commit with message "Bump version to {version}"
- **Remote Push**: Optional push of commits and tags to remote repository

## Version Strategy

- **Patch** (0.0.X): Bug fixes, small improvements, documentation updates
- **Minor** (0.X.0): New features, significant enhancements, API additions
- **Major** (X.0.0): Breaking changes, major architectural changes

## Safety Features

- **Clean Working Directory**: Prevents version bumping if there are uncommitted changes
- **Dry Run Mode**: Preview changes before applying them
- **Duplicate Tag Detection**: Prevents creating tags that already exist
- **Error Handling**: Graceful error reporting for git operations
