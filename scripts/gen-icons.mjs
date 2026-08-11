/**
 * Renders static/icon.svg into the PNG sizes the manifest and iOS need.
 * Run with `bun run icons` after editing the SVG — not part of the build.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'static/icon.svg'));
const out = resolve(root, 'static');
await mkdir(out, { recursive: true });

/** Plain icons, edge to edge. */
for (const size of [192, 512]) {
	await writeFile(
		resolve(out, `icon-${size}.png`),
		await sharp(source, { density: 512 }).resize(size, size).png().toBuffer()
	);
}

/** Apple ignores maskable icons and crops nothing, so this one is edge to edge too. */
await writeFile(
	resolve(out, 'apple-touch-icon.png'),
	await sharp(source, { density: 512 }).resize(180, 180).png().toBuffer()
);

/**
 * Maskable icons get cropped to a platform-defined shape; the spec's safe zone is
 * the middle 80%, so the artwork is inset by 10% on each side over a solid ground.
 */
const MASK = 512;
const inner = Math.round(MASK * 0.8);
await writeFile(
	resolve(out, 'icon-512-maskable.png'),
	await sharp({
		create: {
			width: MASK,
			height: MASK,
			channels: 4,
			background: { r: 17, g: 17, b: 17, alpha: 1 }
		}
	})
		.composite([
			{
				input: await sharp(source, { density: 512 }).resize(inner, inner).png().toBuffer(),
				top: Math.round((MASK - inner) / 2),
				left: Math.round((MASK - inner) / 2)
			}
		])
		.png()
		.toBuffer()
);

console.log('Icons written to static/');
