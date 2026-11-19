import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(projectRoot, 'public');
const outputPath = join(publicDir, 'chromium-pack.tar');

function findChromiumBinDirectory() {
  const entryPath = fileURLToPath(import.meta.resolve('@sparticuz/chromium'));
  let currentDirectory = dirname(entryPath);

  while (currentDirectory !== dirname(currentDirectory)) {
    const binDirectory = join(currentDirectory, 'bin');
    if (existsSync(join(binDirectory, 'chromium.br'))) {
      return binDirectory;
    }
    currentDirectory = dirname(currentDirectory);
  }

  throw new Error('Could not locate @sparticuz/chromium binary files');
}

mkdirSync(publicDir, { recursive: true });
const binDirectory = findChromiumBinDirectory();

execFileSync('tar', ['-cf', outputPath, '-C', binDirectory, '.'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

console.log(`Created Vercel Chromium pack: ${outputPath}`);
