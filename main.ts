// Assemble a portable make.fun entry from the files beside this script.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// Ensure the destination exists before copying the playable game.
mkdirSync(outputRoot, { recursive: true });
cpSync(join(projectRoot, 'game'), join(outputRoot, 'game'), { recursive: true });

// Always create the screenshot destination, copying source images when present.
const screenshotOutput = join(outputRoot, 'screenshots');
mkdirSync(screenshotOutput, { recursive: true });
const screenshotSource = join(projectRoot, 'screenshots');
if (existsSync(screenshotSource)) {
  cpSync(screenshotSource, screenshotOutput, { recursive: true });
}

// Record the submitted tree with the scorer's required dossier limits.
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
