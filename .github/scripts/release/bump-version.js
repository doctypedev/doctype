const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Helper to run shell commands
const run = (cmd, cwd = process.cwd()) => {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    // If stdio is inherited, we might not capture error, but usually we want to throw
    console.error(`Command failed: ${cmd}`);
    console.error(e.stderr || e.message);
    throw e;
  }
};

module.exports = async ({ github, context, core, releaseTypeInput }) => {
  try {
    let type = releaseTypeInput;

    // 1. Detect Release Type if not provided via input
    if (!type) {
      console.log('Detecting release type from PR labels...');
      const { data: prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha
      });
      
      const labels = prs[0]?.labels.map(l => l.name) || [];
      if (labels.includes('merge: major')) type = 'major';
      else if (labels.includes('merge: minor')) type = 'minor';
      else if (labels.includes('merge: patch')) type = 'patch';
    }

    if (!type) {
      console.log('No release type detected. Skipping publish.');
      return; // Exit without setting output
    }

    console.log(`Release type detected: ${type}`);
    core.setOutput('type', type);

    // 2. Configure Git
    run('git config user.name "github-actions[bot]"');
    run('git config user.email "github-actions[bot]@users.noreply.github.com"');

    // 3. Capture Old Version
    const oldVersion = require('../../../package.json').version;
    console.log(`Old Version: ${oldVersion}`);
    core.setOutput('OLD_VERSION', oldVersion);

    // 4. Bump version in root package.json (no git tag yet)
    run(`npm version ${type} --no-git-tag-version`);
    
    // 5. Get New Version
    const newVersion = require('../../../package.json').version;
    const newTag = `v${newVersion}`;
    console.log(`New Version: ${newVersion}, Tag: ${newTag}`);
    core.setOutput('NEW_TAG', newTag);

    // 6. Bump version in rust-core package.json
    const rustCorePath = path.resolve(process.cwd(), 'src/rust-core');
    run(`npm version ${newVersion} --no-git-tag-version`, rustCorePath);

    // 7. Update optional dependency in root package.json
    run(`npm pkg set optionalDependencies.@doctypedev/core=${newVersion}`);

    // 8. Commit and Tag
    run('git add package.json src/rust-core/package.json');
    run(`git commit -m "chore(release): ${newTag}"`);
    run(`git tag ${newTag}`);
    
    // 9. Push
    run('git push origin HEAD');
    run(`git push origin ${newTag}`);

  } catch (error) {
    core.setFailed(error.message);
  }
};
