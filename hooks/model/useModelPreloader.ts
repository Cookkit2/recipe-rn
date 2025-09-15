import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import allModel from './allModel';

interface ModelPreloaderOptions {
  delay?: number;
  priority?: 'low' | 'normal' | 'high';
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

export const useModelPreloader = (options: ModelPreloaderOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    delay = 100,
    priority = 'low',
    onLoadStart,
    onLoadComplete,
    onLoadError
  } = options;

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (__DEV__) {
          console.log(`Starting model preload with ${priority} priority...`);
        }
        
        onLoadStart?.();
        
        // Wait for models to load
        await allModel.get();
        
        setIsLoaded(true);
        onLoadComplete?.();
        
        if (__DEV__) {
          console.log('Model preload completed successfully');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Model loading failed');
        setError(error);
        onLoadError?.(error);
        
        if (__DEV__) {
          console.error('Model preload failed:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const scheduleModelLoading = () => {
      if (priority === 'high') {
        // Load immediately after interactions
        InteractionManager.runAfterInteractions(() => {
          loadModel();
        });
      } else {
        // Add delay for lower priority loading
        InteractionManager.runAfterInteractions(() => {
          setTimeout(loadModel, delay);
        });
      }
    };

    // Check if already loaded
    if (allModel.isLoaded()) {
      setIsLoaded(true);
      return;
    }

    scheduleModelLoading();
  }, [delay, priority, onLoadStart, onLoadComplete, onLoadError]);

  return {
    isLoading,
    isLoaded,
    error,
    forceReload: () => {
      if (!isLoading) {
        setIsLoaded(false);
        setError(null);
        allModel.preload();
      }
    }
  };
};
