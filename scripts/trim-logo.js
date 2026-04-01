const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "../public/icons/logo-final.png");
const output = input;

async function trimLogo() {
  const image = sharp(input);
  const meta = await image.metadata();
  console.log(`Original: ${meta.width}x${meta.height}px`);

  await sharp(input)
    .trim({ threshold: 10 })
    .toFile(output + ".tmp.png");

  const { execSync } = require("child_process");
  execSync(`mv "${output}.tmp.png" "${output}"`);

  const trimmed = await sharp(output).metadata();
  console.log(`Trimmed:  ${trimmed.width}x${trimmed.height}px`);
  console.log("Done → public/icons/logo-final.png");
}

trimLogo().catch((err) => { console.error(err); process.exit(1); });
