import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NPCMemoryModule = buildModule("NPCMemoryModule", (m) => {
  const npcMemory = m.contract("NPCMemory");

  return { npcMemory };
});

export default NPCMemoryModule;