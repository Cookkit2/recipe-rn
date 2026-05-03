import { loadTensorflowModel, type TensorflowModel } from "react-native-fast-tflite";
import { log } from "~/utils/logger";

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
    if (this.models) {
      log.info("[create-camera] allModel.get returning cached models");
      return this.models;
    }
    if (this.loadPromise) {
      log.info("[create-camera] allModel.get awaiting existing load promise");
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      const start = performance.now();
      log.info("[create-camera] allModel.get loading magic touch model");
      const [magicTouchModel] = await Promise.all([
        loadTensorflowModel(require("~/assets/model/magic_touch.tflite"), []),
      ]);

      this.models = { magicTouchModel };
      log.info("[create-camera] allModel.get loaded magic touch model", {
        durationMs: Number((performance.now() - start).toFixed(2)),
      });
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
}

const allModel = AllModelSingleton.getInstance();
export default allModel;
