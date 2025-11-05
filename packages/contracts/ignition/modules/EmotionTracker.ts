import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EmotionTrackerModule = buildModule("EmotionTrackerModule", (m) => {
  const emotionTracker = m.contract("EmotionTracker");

  return { emotionTracker };
});

export default EmotionTrackerModule;