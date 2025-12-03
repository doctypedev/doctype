#!/usr/bin/env node
/**
 * Sync version from main package.json to all platform-specific packages
 */

const fs = require('fs');
const path = require('path');

// Read core package.json version (source of truth for native packages)
const corePackagePath = path.join(__dirname, '../../../packages/core/package.json');
const corePackage = JSON.parse(fs.readFileSync(corePackagePath, 'utf8'));
const version = corePackage.version;

console.log(`📦 Syncing native packages to version: ${version}`);

// Find all npm platform packages
const npmDir = path.join(__dirname, '../npm');
const platforms = fs.readdirSync(npmDir);

let updated = 0;

for (const platform of platforms) {
  const platformDir = path.join(npmDir, platform);
  const packageJsonPath = path.join(platformDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.version !== version) {
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated ${platform}: ${version}`);
    updated++;
  } else {
    console.log(`⏭️  ${platform}: already at ${version}`);
  }
}

console.log(`\n✨ Updated ${updated} package(s)`);
