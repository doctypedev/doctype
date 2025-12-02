const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const run = (cmd, cwd) => {
    console.log(`[${cwd}] ${cmd}`);
    execSync(cmd, { cwd, encoding: 'utf8', stdio: 'inherit' });
};

module.exports = async () => {
  const rustCoreDir = path.resolve(process.cwd(), 'src/rust-core');
  const npmDir = path.join(rustCoreDir, 'npm');

  // 1. Publish subpackages
  if (fs.existsSync(npmDir)) {
    const subdirs = fs.readdirSync(npmDir);
    
    for (const dirName of subdirs) {
      const dirPath = path.join(npmDir, dirName);
      if (fs.statSync(dirPath).isDirectory()) {
        console.log(`Processing subpackage: ${dirName}`);
        
        if (!fs.existsSync(path.join(dirPath, 'package.json'))) {
          console.error(`Error: No package.json found in ${dirName}`);
          process.exit(1);
        }
        
        try {
            console.log(`Publishing @doctypedev/core-${dirName}...`);
            run('npm publish --access public --provenance', dirPath);
        } catch (e) {
            console.error(`Failed to publish ${dirName}:`, e.message);
            // Optional: deciding whether to fail hard or continue
            process.exit(1); 
        }
      }
    }
  } else {
      console.log('No npm/ directory found, skipping subpackages.');
  }

  // 2. Publish main package
  console.log('Publishing main @doctypedev/core package...');
  try {
    run('npm publish --access public --provenance', rustCoreDir);
  } catch (e) {
      console.error('Failed to publish main package:', e.message);
      process.exit(1);
  }
};
