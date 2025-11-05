import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NPCMarketplaceModule = buildModule("NPCMarketplaceModule", (m) => {
  const npcMarketplace = m.contract("NPCMarketplace");

  return { npcMarketplace };
});

export default NPCMarketplaceModule;