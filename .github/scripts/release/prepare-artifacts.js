const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const run = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', stdio: 'inherit' });

const SUBDIRS = [
  'win32-x64-msvc',
  'darwin-arm64',
  'darwin-x64',
  'linux-x64-musl'
];

module.exports = async () => {
  const rustCoreDir = path.resolve(process.cwd(), 'src/rust-core');
  const npmDir = path.join(rustCoreDir, 'npm');

  console.log('Preparing artifacts directory structure...');
  
  // 1. Create subdirectories manually
  if (!fs.existsSync(npmDir)) fs.mkdirSync(npmDir);
  
  SUBDIRS.forEach(subdir => {
    const p = path.join(npmDir, subdir);
    if (!fs.existsSync(p)) fs.mkdirSync(p);
  });

  // 2. Run napi artifacts
  console.log('Running napi artifacts...');
  try {
    run('npm run artifacts', rustCoreDir);
  } catch (e) {
    console.error('Error running napi artifacts:', e);
    process.exit(1);
  }

  // 3. Generate package.json for each platform
  console.log('Generating package.json for platform binaries...');
  const version = require(path.join(rustCoreDir, 'package.json')).version;
  
  const platforms = fs.readdirSync(npmDir);
  
  platforms.forEach(platform => {
    const dir = path.join(npmDir, platform);
    if (!fs.statSync(dir).isDirectory()) return;
    
    const files = fs.readdirSync(dir);
    const binary = files.find(f => f.endsWith('.node'));
    
    if (binary) {
      const pkgJson = {
        name: `@doctypedev/core-${platform}`,
        version: version,
        os: [platform.split('-')[0].replace('win32', 'win').replace('darwin', 'darwin').replace('linux', 'linux')],
        cpu: [platform.includes('arm64') ? 'arm64' : 'x64'],
        main: binary,
        files: [binary]
      };
      
      // Fix OS name for Windows
      if (pkgJson.os[0] === 'win') pkgJson.os[0] = 'win32';
      
      const pkgJsonPath = path.join(dir, 'package.json');
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
      console.log(`Generated package.json for ${platform} at ${pkgJsonPath}`);
    } else {
        console.warn(`No binary found in ${platform}, skipping package.json generation.`);
    }
  });
};
