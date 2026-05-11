/**
 * Rasterizes `Bran Assets/Flaicon.svg` into favicons and Electron `build/` icons.
 * Copies `Bran Assets/Logotipó.svg` to `apps/web/public/logo-buildev.svg`.
 *
 * Usage (from `openpencil/`): `bun run icons:generate`
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import png2icons from 'png2icons';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgFlaicon = join(root, 'Bran Assets', 'Flaicon.svg');
const svgLogo = join(root, 'Bran Assets', 'Logotipó.svg');

async function main() {
  if (!existsSync(svgFlaicon)) {
    console.error('Missing:', svgFlaicon);
    process.exit(1);
  }

  const svg = readFileSync(svgFlaicon);
  const pub = join(root, 'apps', 'web', 'public');
  const desktopBuild = join(root, 'apps', 'desktop', 'build');
  mkdirSync(pub, { recursive: true });
  mkdirSync(desktopBuild, { recursive: true });

  writeFileSync(join(pub, 'favicon.svg'), svg);

  const png512 = await sharp(svg).resize(512, 512).png().toBuffer();
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngsForIco = await Promise.all(sizes.map(async (s) => sharp(svg).resize(s, s).png().toBuffer()));
  pngsForIco.push(png512);

  const icoBuf = await pngToIco(pngsForIco);
  writeFileSync(join(pub, 'favicon.ico'), icoBuf);
  writeFileSync(join(desktopBuild, 'icon.ico'), icoBuf);

  writeFileSync(join(desktopBuild, 'icon.png'), png512);

  const icns = png2icons.createICNS(png512, png2icons.BILINEAR, 0);
  writeFileSync(join(desktopBuild, 'icon.icns'), icns);

  if (existsSync(svgLogo)) {
    copyFileSync(svgLogo, join(pub, 'logo-buildev.svg'));
  }

  console.log('[icons:generate] favicon.svg, favicon.ico, logo-buildev.svg, apps/desktop/build/icon.*');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
