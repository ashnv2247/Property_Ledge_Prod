const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'images', 'workflows');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function generateAssets() {
  console.log('Generating workflow visual guidance assets...');

  // 1. Lease workflow
  await sharp(path.join(__dirname, '..', 'public', 'images', 'invoices', 'lease_light.webp'))
    .resize(600, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'lease_workflow_light.webp'));

  await sharp(path.join(__dirname, '..', 'public', 'images', 'invoices', 'lease_dark.webp'))
    .resize(600, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'lease_workflow_dark.webp'));

  // 2. Maintenance / Standalone workflow
  await sharp(path.join(__dirname, '..', 'public', 'images', 'invoices', 'standalone_light.webp'))
    .resize(600, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'maintenance_workflow_light.webp'));

  await sharp(path.join(__dirname, '..', 'public', 'images', 'invoices', 'standalone_dark.webp'))
    .resize(600, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'maintenance_workflow_dark.webp'));

  // 3. Property workflow (from step3 onboarding 3D isometric properties)
  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step3_light.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'property_workflow_light.webp'));

  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step3_dark.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'property_workflow_dark.webp'));

  // 4. Team workflow (from step1 onboarding 3D workspace)
  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step1_light.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'team_workflow_light.webp'));

  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step1_dark.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'team_workflow_dark.webp'));

  // 5. Subscription workflow (from step2 onboarding 3D subscription plans)
  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step2_light.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'subscription_workflow_light.webp'));

  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step2_dark.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'subscription_workflow_dark.webp'));

  // 6. Tenant workflow (from tenant_banner_visual / step4)
  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step4_light.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'tenant_workflow_light.webp'));

  await sharp(path.join(__dirname, '..', 'public', 'onboarding', 'step4_dark.png'))
    .resize(600, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, 'tenant_workflow_dark.webp'));

  console.log('All workflow visual guidance assets generated successfully in:', outDir);
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
