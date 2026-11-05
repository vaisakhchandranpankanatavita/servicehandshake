import { cpSync, mkdirSync, rmSync } from 'node:fs';

/* Assemble the static site Vercel serves: the app shell, built assets (incl. route chunks) and optimised images. */
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });
cpSync('shell.html', 'dist/index.html');
cpSync('assets/build', 'dist/assets/build', { recursive: true });
cpSync('assets/img', 'dist/assets/img', { recursive: true, filter: (src) => !/\.(png|jpe?g)$/i.test(src) });
