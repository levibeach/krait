#!/usr/bin/env node

/**
 * Version Bumping Utility for Krait
 *
 * Handles version bumping across the project:
 * - Updates package.json version
 * - Updates version references in source files
 * - Creates git tags
 * - Optionally commits changes
 *
 * Usage:
 *   node scripts/bump-version.js patch   # 0.4.1 -> 0.4.2
 *   node scripts/bump-version.js minor   # 0.4.1 -> 0.5.0
 *   node scripts/bump-version.js major   # 0.4.1 -> 1.0.0
 *   node scripts/bump-version.js --current  # Show current version
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class VersionBumper {
  constructor() {
    this.packagePath = path.join(__dirname, '..', 'package.json')
    this.mainPath = path.join(__dirname, '..', 'src', 'main.js')
  }

  /**
   * Get the current version from package.json
   * @returns {string} Current version
   */
  getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'))
    return packageJson.version
  }

  /**
   * Parse a semantic version string into components
   * @param {string} version - Version string (e.g., "1.2.3")
   * @returns {Object} Version components {major, minor, patch}
   */
  parseVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number)
    return { major, minor, patch }
  }

  /**
   * Bump version based on type
   * @param {string} currentVersion - Current version string
   * @param {string} bumpType - Type of bump: 'patch', 'minor', 'major'
   * @returns {string} New version string
   */
  bumpVersion(currentVersion, bumpType) {
    const { major, minor, patch } = this.parseVersion(currentVersion)

    switch (bumpType) {
      case 'patch':
        return `${major}.${minor}.${patch + 1}`
      case 'minor':
        return `${major}.${minor + 1}.0`
      case 'major':
        return `${major + 1}.0.0`
      default:
        throw new Error(
          `Invalid bump type: ${bumpType}. Use 'patch', 'minor', or 'major'.`
        )
    }
  }

  /**
   * Update package.json with new version
   * @param {string} newVersion - New version string
   */
  updatePackageJson(newVersion) {
    const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'))
    packageJson.version = newVersion
    fs.writeFileSync(
      this.packagePath,
      JSON.stringify(packageJson, null, 2) + '\n'
    )
    console.log(`✅ Updated package.json: ${newVersion}`)
  }

  /**
   * Update version reference in main.js JSDoc comment
   * @param {string} newVersion - New version string
   */
  updateMainJs(newVersion) {
    let content = fs.readFileSync(this.mainPath, 'utf8')

    // Update @version tag in JSDoc comment
    const versionRegex = /(@version\s+)[\d.]+/
    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `$1${newVersion}`)
      fs.writeFileSync(this.mainPath, content)
      console.log(`✅ Updated main.js @version: ${newVersion}`)
    } else {
      console.log(`⚠️  No @version tag found in main.js`)
    }
  }

  /**
   * Check if git working directory is clean
   * @returns {boolean} True if working directory is clean
   */
  isGitClean() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' })
      return status.trim() === ''
    } catch (err) {
      console.error('❌ Error checking git status:', err.message)
      return false
    }
  }

  /**
   * Create git tag for the new version
   * @param {string} version - Version to tag
   * @param {boolean} push - Whether to push the tag to remote
   */
  createGitTag(version, push = false) {
    const tag = `v${version}`

    try {
      // Check if tag already exists
      try {
        execSync(`git rev-parse ${tag}`, { stdio: 'ignore' })
        console.log(`⚠️  Tag ${tag} already exists`)
        return false
      } catch {
        // Tag doesn't exist, which is what we want
      }

      // Create the tag
      execSync(`git tag -a ${tag} -m "Release version ${version}"`)
      console.log(`✅ Created git tag: ${tag}`)

      if (push) {
        execSync(`git push origin ${tag}`)
        console.log(`✅ Pushed tag to remote: ${tag}`)
      }

      return true
    } catch (err) {
      console.error(`❌ Error creating git tag: ${err.message}`)
      return false
    }
  }

  /**
   * Commit version changes
   * @param {string} version - New version
   * @param {boolean} push - Whether to push to remote
   */
  commitChanges(version, push = false) {
    try {
      execSync('git add package.json src/main.js')
      execSync(`git commit -m "Bump version to ${version}"`)
      console.log(`✅ Committed version bump: ${version}`)

      if (push) {
        execSync('git push')
        console.log(`✅ Pushed commit to remote`)
      }

      return true
    } catch (err) {
      console.error(`❌ Error committing changes: ${err.message}`)
      return false
    }
  }

  /**
   * Run the version bump process
   * @param {string} bumpType - Type of version bump
   * @param {Object} options - Options for the bump process
   */
  run(bumpType, options = {}) {
    const { commit = false, tag = true, push = false, dryRun = false } = options

    console.log('🚀 Krait Version Bumper\n')

    const currentVersion = this.getCurrentVersion()
    console.log(`📦 Current version: ${currentVersion}`)

    if (bumpType === '--current') {
      return
    }

    const newVersion = this.bumpVersion(currentVersion, bumpType)
    console.log(`🔢 New version: ${newVersion}`)

    if (dryRun) {
      console.log('\n🔍 DRY RUN - No changes will be made:')
      console.log(`  - Would update package.json to ${newVersion}`)
      console.log(`  - Would update main.js @version to ${newVersion}`)
      if (tag) console.log(`  - Would create git tag v${newVersion}`)
      if (commit) console.log(`  - Would commit changes`)
      if (push) console.log(`  - Would push to remote`)
      return
    }

    // Check git status if we're going to commit or tag
    if ((commit || tag) && !this.isGitClean()) {
      console.error(
        '❌ Git working directory is not clean. Please commit or stash your changes first.'
      )
      process.exit(1)
    }

    console.log('\n📝 Updating files...')

    // Update version in files
    this.updatePackageJson(newVersion)
    this.updateMainJs(newVersion)

    // Handle git operations
    if (commit) {
      console.log('\n📝 Committing changes...')
      this.commitChanges(newVersion, push)
    }

    if (tag) {
      console.log('\n🏷️  Creating git tag...')
      this.createGitTag(newVersion, push)
    }

    console.log(`\n✨ Version bump complete: ${currentVersion} → ${newVersion}`)

    if (!commit && (tag || push)) {
      console.log(
        '\n💡 Note: Files were updated but not committed. Run git add/commit manually if needed.'
      )
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Krait Version Bumper

Usage:
  node scripts/bump-version.js <bump-type> [options]

Bump Types:
  patch     Increment patch version (0.4.1 -> 0.4.2)
  minor     Increment minor version (0.4.1 -> 0.5.0)
  major     Increment major version (0.4.1 -> 1.0.0)
  --current Show current version

Options:
  --commit    Commit the version changes
  --no-tag    Skip creating git tag
  --push      Push commits and tags to remote
  --dry-run   Show what would be done without making changes

Examples:
  node scripts/bump-version.js patch
  node scripts/bump-version.js minor --commit --push
  node scripts/bump-version.js major --dry-run
  node scripts/bump-version.js --current
`)
    process.exit(0)
  }

  const bumpType = args[0]
  const options = {
    commit: args.includes('--commit'),
    tag: !args.includes('--no-tag'),
    push: args.includes('--push'),
    dryRun: args.includes('--dry-run'),
  }

  const bumper = new VersionBumper()

  try {
    bumper.run(bumpType, options)
  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
    process.exit(1)
  }
}

module.exports = VersionBumper
