import { storageFacade, StorageFactory } from "./storage";

// Initialize the storage system with MMKV (your current choice)
// You can easily switch to other storage types by changing this configuration
StorageFactory.initialize({
  type: "mmkv",
  options: {
    id: "recipe-app-storage", // Optional: custom storage ID
    // encryptionKey: 'your-encryption-key' // Optional: for encrypted storage
  },
});

export const storage = storageFacade;
