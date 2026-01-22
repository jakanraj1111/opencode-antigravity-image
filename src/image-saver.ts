import * as fs from "fs";
import * as path from "path";
import { DEFAULT_OUTPUT_DIR } from "./constants";
import type { ExtractedImage } from "./api";
import type { GeneratedImage } from "./types";

function slugify(text: string, maxLength: number = 30): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return extensions[mimeType] ?? "png";
}

export function getOutputDir(customPath?: string, worktree?: string): string {
  if (customPath) {
    const absolutePath = path.isAbsolute(customPath)
      ? customPath
      : path.resolve(worktree ?? process.cwd(), customPath);

    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    return absolutePath;
  }

  const baseDir = worktree ?? process.cwd();
  const outputDir = path.join(baseDir, DEFAULT_OUTPUT_DIR);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return outputDir;
}

export function generateFilename(
  prompt: string,
  index: number,
  mimeType: string,
  customName?: string
): string {
  const ext = getExtension(mimeType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const suffix = index > 0 ? `-${index + 1}` : "";

  if (customName) {
    return `${slugify(customName, 50)}${suffix}.${ext}`;
  }

  const slug = slugify(prompt);
  return `${slug}-${timestamp}${suffix}.${ext}`;
}

export function saveImage(
  base64Data: string,
  filename: string,
  outputDir: string
): string {
  const buffer = Buffer.from(base64Data, "base64");
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export function saveImages(
  images: ExtractedImage[],
  prompt: string,
  outputDir: string,
  customName?: string
): GeneratedImage[] {
  const savedImages: GeneratedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (!image) continue;

    const filename = generateFilename(prompt, i, image.mimeType, customName);
    const filePath = saveImage(image.data, filename, outputDir);

    savedImages.push({
      path: filePath,
      mimeType: image.mimeType,
      index: i,
    });
  }

  return savedImages;
}

export function formatImageOutput(images: GeneratedImage[]): string {
  if (images.length === 0) {
    return "No images were generated.";
  }

  const lines: string[] = [];

  lines.push(`## Generated ${images.length} Image${images.length > 1 ? "s" : ""}\n`);

  for (const image of images) {
    lines.push(`![Generated Image](${image.path})\n`);
    lines.push(`**Saved to:** \`${image.path}\`\n`);
  }

  if (images.length === 1 && images[0]) {
    lines.push(`\nTo view: \`open "${images[0].path}"\``);
  }

  return lines.join("\n");
}
