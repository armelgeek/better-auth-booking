#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
  console.log(`🔧 Running: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Failed to run: ${command}`);
    process.exit(1);
  }
}

function checkFiles() {
  const requiredFiles = ['dist/index.cjs', 'dist/index.mjs', 'dist/index.d.ts', 'README.md', 'LICENSE'];
  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    console.error('❌ Missing required files:', missing);
    process.exit(1);
  }
  
  console.log('✅ All required files present');
}

function checkNpmAuth() {
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    console.log('✅ NPM authentication verified');
  } catch (error) {
    console.error('❌ Not logged in to NPM. Please run: npm login');
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Preparing to publish @armelgeek/better-auth-booking...\n');

  // Check NPM authentication
  checkNpmAuth();

  // Build the project
  console.log('📦 Building project...');
  run('npm run build');

  // Type check
  console.log('🔍 Type checking...');
  run('npm run typecheck');

  // Check required files
  console.log('📋 Checking required files...');
  checkFiles();

  // Test package contents
  console.log('🔍 Testing package contents...');
  run('npm pack --dry-run');

  console.log('\n✅ Pre-publication checks passed!');
  console.log('\n📝 To publish:');
  console.log('  • For beta: npm run publish:beta');
  console.log('  • For stable: npm run publish:stable');
  console.log('  • Or manually: npm publish');

  console.log('\n🎉 Package is ready for publication!');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Publication preparation failed:', error);
    process.exit(1);
  });
}
