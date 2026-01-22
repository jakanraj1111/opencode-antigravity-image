import { loadAccounts, selectAccount, markAccountUsed } from "./src/accounts";
import { refreshAccessToken, buildContents, generateImages, extractImages } from "./src/api";
import { getOutputDir, saveImages, formatImageOutput } from "./src/image-saver";
import { DEFAULT_MODEL, DEFAULT_ASPECT_RATIO } from "./src/constants";
import type { SupportedModel, AspectRatio } from "./src/constants";

async function testImageGeneration() {
  console.log("🚀 Testing opencode-antigravity-image plugin...\n");

  console.log("1. Loading accounts...");
  const config = await loadAccounts();
  if (!config || config.accounts.length === 0) {
    console.error("❌ No accounts found. Please configure opencode-antigravity-auth first.");
    process.exit(1);
  }
  console.log(`   ✅ Found ${config.accounts.length} account(s)\n`);

  console.log("2. Selecting best account...");
  const account = selectAccount(config, DEFAULT_MODEL);
  if (!account) {
    console.error("❌ No available accounts (all rate-limited)");
    process.exit(1);
  }
  console.log(`   ✅ Selected: ${account.email || "unknown"}\n`);

  console.log("3. Refreshing access token...");
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(account.refreshToken);
    console.log(`   ✅ Token refreshed (${accessToken.slice(0, 20)}...)\n`);
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    process.exit(1);
  }

  const testPrompt = "A cute robot cat sitting on a rainbow, digital art style";
  console.log(`4. Generating image with prompt: "${testPrompt}"`);
  console.log(`   Model: ${DEFAULT_MODEL}`);
  console.log(`   Aspect Ratio: ${DEFAULT_ASPECT_RATIO}\n`);

  const contents = buildContents(testPrompt);

  try {
    const response = await generateImages(
      accessToken,
      DEFAULT_MODEL as SupportedModel,
      contents,
      {
        aspectRatio: DEFAULT_ASPECT_RATIO as AspectRatio,
        count: 1,
      }
    );

    console.log("5. Extracting images from response...");
    const images = extractImages(response);
    console.log(`   ✅ Extracted ${images.length} image(s)\n`);

    if (images.length === 0) {
      console.error("❌ No images in response");
      process.exit(1);
    }

    console.log("6. Saving images to disk...");
    const outputDir = getOutputDir(undefined, process.cwd());
    const savedImages = saveImages(images, testPrompt, outputDir);

    console.log("\n" + "=".repeat(60));
    console.log("✅ TEST SUCCESSFUL!");
    console.log("=".repeat(60) + "\n");

    console.log(formatImageOutput(savedImages));

    await markAccountUsed(config, account);
    console.log("\n✅ Account usage marked");

  } catch (error) {
    console.error("\n❌ Image generation failed:");
    console.error(error);
    process.exit(1);
  }
}

testImageGeneration().catch(console.error);
