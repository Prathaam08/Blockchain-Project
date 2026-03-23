const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const NGOs = [
    { name: 'Green Earth Foundation', addr: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' },
    { name: 'Education For All', addr: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' },
    { name: 'Clean Water Initiative', addr: '0x90f79bf6eb2c4f870365e785982e1f101e93b906' }
  ];

  // ... rest of setup ...
  const registryAddress = process.env.NGO_REGISTRY_ADDRESS;
  if (!registryAddress) {
    console.error("❌ NGO_REGISTRY_ADDRESS not found in environment.");
    process.exit(1);
  }

  console.log("🔗 Connecting to NGORegistry at:", registryAddress);
  const NGORegistry = await hre.ethers.getContractFactory("NGORegistry");
  const registry = await NGORegistry.attach(registryAddress);

  for (const ngo of NGOs) {
    console.log(`\n📋 Processing NGO: ${ngo.name} (${ngo.addr})`);
    
    // Check if already registered
    const isRegistered = await registry.isRegistered(ngo.addr);
    if (isRegistered) {
      const isVerified = await registry.isNGOVerified(ngo.addr);
      if (isVerified) {
        console.log("✅ Already registered and verified.");
        continue;
      }
      console.log("  Already registered, proceeding to verify...");
    } else {
      try {
        // Register
        console.log("  Registering...");
        const regTx = await registry.registerNGO(ngo.name, ngo.addr, "ipfs://placeholder");
        await regTx.wait();
      } catch (err) {
        console.error(`❌ Failed to register ${ngo.addr}:`, err.message);
        continue;
      }
    }

    try {
      // Verify
      console.log("  Verifying...");
      const verTx = await registry.verifyNGO(ngo.addr);
      await verTx.wait();
      console.log("✅ Successfully registered and verified!");
    } catch (err) {
      console.error(`❌ Failed to verify ${ngo.addr}:`, err.message);
    }
  }

  console.log("\n✨ On-chain seeding complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
