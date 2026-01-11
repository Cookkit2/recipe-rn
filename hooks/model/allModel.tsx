import {
  loadTensorflowModel,
  type TensorflowModel,
} from "react-native-fast-tflite";

type AllModels = {
  // vegeModel: TensorflowModel;
  magicTouchModel: TensorflowModel;
};

class AllModelSingleton {
  private static instance: AllModelSingleton | null = null;
  private models: AllModels | null = null;
  private loadPromise: Promise<AllModels> | null = null;

  static getInstance(): AllModelSingleton {
    if (this.instance == null) {
      this.instance = new AllModelSingleton();
    }
    return this.instance;
  }

  async get(): Promise<AllModels> {
    if (this.models) return this.models;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const [magicTouchModel] = await Promise.all([
        loadTensorflowModel(
          require("~/assets/model/magic_touch.tflite"),
          "default"
        ),
      ]);

      this.models = { magicTouchModel };
      return this.models;
    })();

    return this.loadPromise;
  }

  isLoaded(): boolean {
    return this.models !== null;
  }

  preload(): void {
    void this.get();
  }

  dispose(): void {
    if (this.models) {
      this.models = null;
      this.loadPromise = null;
    }
  }
}

const allModel = AllModelSingleton.getInstance();
export default allModel;
