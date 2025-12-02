const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', stdio: 'inherit' });

const TRIED_PACKAGES = [];

function mapTargetToPlatform(target) {
  if (target === 'x86_64-apple-darwin') return 'darwin-x64';
  if (target === 'aarch64-apple-darwin') return 'darwin-arm64';
  if (target === 'x86_64-pc-windows-msvc') return 'win32-x64-msvc';
  if (target === 'x86_64-unknown-linux-musl') return 'linux-x64-musl';
  return null;
}

module.exports = async ({ core, target, oldVersion, coreChanged }) => {
  try {
    console.log(`Target: ${target}`);
    console.log(`Old Version: ${oldVersion}`);
    console.log(`Core Changed: ${coreChanged}`);

    if (coreChanged === 'true') {
      console.log('Core code has changed. Rebuild required.');
      core.setOutput('skip', 'false');
      return;
    }

    const platform = mapTargetToPlatform(target);
    if (!platform) {
      console.log(`Unknown platform mapping for target ${target}. Rebuild required.`);
      core.setOutput('skip', 'false');
      return;
    }

    const packageName = `@doctypedev/core-${platform}`;
    const fullPackageName = `${packageName}@${oldVersion}`;
    console.log(`Attempting to reuse binary from: ${fullPackageName}`);

    const tempDir = path.resolve(process.cwd(), 'reuse_temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    try {
      // Attempt npm pack
      run(`npm pack ${fullPackageName}`, tempDir);
      console.log('Package downloaded successfully.');

      // Extract
      const tgzFile = fs.readdirSync(tempDir).find(f => f.endsWith('.tgz'));
      if (!tgzFile) throw new Error('No tgz file found');

      run(`tar -xf ${tgzFile}`, tempDir);

      // Find .node binary
      const packageDir = path.join(tempDir, 'package');
      // Sometimes binary is in root of package, sometimes nested? usually root for these
      // Search recursively or just check known locations?
      // Based on our publish script, it's in the root of the package files.
      
      // find file ending in .node
      const findNodeFile = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
              const fullPath = path.join(dir, file);
              if (fs.statSync(fullPath).isDirectory()) {
                   const found = findNodeFile(fullPath);
                   if (found) return found;
              } else if (file.endsWith('.node')) {
                  return fullPath;
              }
          }
          return null;
      }

      const binaryPath = findNodeFile(packageDir);

      if (binaryPath) {
        console.log(`Found binary at: ${binaryPath}`);
        const destDir = path.resolve(process.cwd(), 'src/rust-core');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        
        const destFile = path.join(destDir, path.basename(binaryPath));
        fs.copyFileSync(binaryPath, destFile);
        console.log(`Restored binary to: ${destFile}`);
        
        core.setOutput('skip', 'true');
      } else {
        console.log('No .node binary found inside package. Rebuild required.');
        core.setOutput('skip', 'false');
      }

    } catch (e) {
      console.log(`Failed to reuse package (${e.message}). Rebuild required.`);
      core.setOutput('skip', 'false');
    } finally {
        // cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

  } catch (error) {
    console.error('Error in check-reuse script:', error);
    // Safety fallback
    core.setOutput('skip', 'false');
  }
};
