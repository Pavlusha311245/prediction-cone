#!/usr/bin/env node
/**
 * Publishes the package to GitHub Packages.
 * GitHub Packages requires a scoped name (@owner/package), so this script
 * temporarily renames the package, publishes it, then restores the original name.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', 'package.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const originalName = pkg.name;
const scopedName = '@pavlusha311245/prediction-cone';

pkg.name = scopedName;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`\n📦 Publishing ${scopedName} to GitHub Packages...`);

try {
  execSync(
    'npm publish --registry https://npm.pkg.github.com --access public --ignore-scripts',
    { stdio: 'inherit' },
  );
  console.log(`\n✅ Successfully published to GitHub Packages`);
} finally {
  pkg.name = originalName;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

