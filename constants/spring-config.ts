export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

export const SPRING_CONFIG_SPRINGY = {
  damping: 10,
  stiffness: 300,
  mass: 1,
};

// Material 3 motion spring tokens (12 total): 6 Standard, 6 Expressive
// Token names mirror the Material token IDs for easy mapping across platforms
// export const SPRINGS = {
//   // Standard – Spatial
//   "spring.spatial": { damping: 0.9, stiffness: 700 },
//   "spring.fast.spatial": { damping: 0.9, stiffness: 1200 },
//   "spring.slow.spatial": { damping: 0.9, stiffness: 300 },

//   // Standard – Effects
//   "spring.effects": { damping: 1, stiffness: 1600 },
//   "spring.fast.effects": { damping: 1, stiffness: 3800 },
//   "spring.slow.effects": { damping: 1, stiffness: 800 },

//   // Expressive – Spatial
//   "expressive.spring.spatial": { damping: 0.7, stiffness: 200 },
//   "expressive.spring.fast.spatial": { damping: 0.7, stiffness: 300 },
//   "expressive.spring.slow.spatial": { damping: 0.7, stiffness: 150 },

//   // Expressive – Effects
//   "expressive.spring.effects": { damping: 0.7, stiffness: 250 },
//   "expressive.spring.fast.effects": { damping: 0.7, stiffness: 350 },
//   "expressive.spring.slow.effects": { damping: 0.7, stiffness: 200 },
// } as const;

// Converted
// Compose uses damping ratio, React Spring uses absolute damping.
// Compose stiffness is in px/s², React Spring uses an arbitrary spring constant.
export const SPRINGS = {
  // Standard – Spatial
  "spring.spatial": { mass: 1, damping: 19, stiffness: 105 },
  "spring.fast.spatial": { mass: 1, damping: 25, stiffness: 150 },
  "spring.slow.spatial": { mass: 1, damping: 13, stiffness: 70 },

  // Standard – Effects
  "spring.effects": { mass: 1, damping: 26, stiffness: 160 },
  "spring.fast.effects": { mass: 1, damping: 33, stiffness: 230 },
  "spring.slow.effects": { mass: 1, damping: 22, stiffness: 120 },

  // Expressive – Spatial
  "expressive.spring.spatial": { mass: 1, damping: 10, stiffness: 60 },
  "expressive.spring.fast.spatial": { mass: 1, damping: 13, stiffness: 70 },
  "expressive.spring.slow.spatial": { mass: 1, damping: 9, stiffness: 50 },

  // Expressive – Effects
  "expressive.spring.effects": { mass: 1, damping: 11, stiffness: 65 },
  "expressive.spring.fast.effects": { mass: 1, damping: 14, stiffness: 80 },
  "expressive.spring.slow.effects": { mass: 1, damping: 10, stiffness: 60 },
} as const;
