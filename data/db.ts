import { storageFacade, StorageFactory } from "./storage";

// Initialize the storage system with AsyncStorage (Expo Go compatible)
// You can easily switch to other storage types by changing this configuration
StorageFactory.initialize({
  type: "async-storage",
});

export const storage = storageFacade;
