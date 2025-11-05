import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UniversalNPCIdentityModule = buildModule("UniversalNPCIdentityModule", (m) => {
  const universalNPCIdentity = m.contract("UniversalNPCIdentity");

  return { universalNPCIdentity };
});

export default UniversalNPCIdentityModule;