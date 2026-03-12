# Camera Background Processing Queue Plan

## Overview

Rework the camera ingredient capture page to support **non-blocking background processing**. Users can continuously take photos while previous images are processed in a queue, with skeleton placeholders indicating processing status.

---

## Current Flow (Blocking)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User takes     │ ──▶ │  Camera freezes  │ ──▶ │  User confirms  │ ──▶ │  Can take next  │
│  photo          │     │  + processing    │     │  or rejects     │     │  photo          │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └─────────────────┘
```

**Problems:**

- Camera freezes during processing (~2-3 seconds)
- User must confirm each ingredient individually
- Slow workflow for scanning multiple items
- Cannot capture quickly in succession

---

## New Flow (Non-blocking Queue)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User takes     │ ──▶ │  Photo added to  │ ──▶ │  Camera stays   │
│  photo          │     │  queue instantly │     │  active         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Background      │
                        │  processing      │
                        │  (sequential)    │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Skeleton ──▶    │
                        │  Real thumbnail  │
                        └──────────────────┘
```

**Benefits:**

- Instant photo capture, no waiting
- Scan multiple ingredients rapidly
- Visual feedback via skeleton placeholders
- Review all items on confirmation page

---

## Implementation Plan

### 1. New Types & State

**File:** `store/CreateIngredientContext.tsx`

```typescript
// Processing status for queue items
type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';

// Queue item representing an image being processed
interface QueuedItem {
  id: string;                              // Unique identifier
  imagePath: string;                       // Path to captured image
  framePosition: { x: number; y: number }; // Focus point for segmentation
  status: ProcessingStatus;                // Current processing state
  result?: PantryItemConfirmation;         // Result when completed
  error?: string;                          // Error message if failed
  timestamp: number;                       // When added to queue
}

// New context properties
interface CreateIngredientContextType {
  // ... existing properties ...
  
  // Queue management
  processingQueue: QueuedItem[];
  addToQueue: (imagePath: string, framePosition: { x: number; y: number }) => void;
  removeFromQueue: (id: string) => void;
  retryQueueItem: (id: string) => void;
  clearFailedItems: () => void;
}
```

---

### 2. Queue Processor Logic

**File:** `store/CreateIngredientContext.tsx`

The queue processor runs as a side effect, watching for new items and processing them sequentially:

```typescript
// State for queue
const [processingQueue, setProcessingQueue] = useState<QueuedItem[]>([]);
const isProcessingRef = useRef(false);

// Add item to queue
const addToQueue = useCallback((imagePath: string, framePosition: { x: number; y: number }) => {
  const newItem: QueuedItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    imagePath,
    framePosition,
    status: 'queued',
    timestamp: Date.now(),
  };
  setProcessingQueue(prev => [...prev, newItem]);
}, []);

// Process queue sequentially
useEffect(() => {
  const processNext = async () => {
    if (isProcessingRef.current) return;
    
    const nextItem = processingQueue.find(item => item.status === 'queued');
    if (!nextItem) return;
    
    isProcessingRef.current = true;
    
    // Update status to processing
    setProcessingQueue(prev => 
      prev.map(item => 
        item.id === nextItem.id ? { ...item, status: 'processing' } : item
      )
    );
    
    try {
      // Process the image
      const result = await processImageForQueue(nextItem.imagePath, nextItem.framePosition);
      
      if (result) {
        // Save processed image to file
        const filename = `masked-${Date.now()}.png`;
        const file = new File(Paths.cache, filename);
        
        const { finalImage: trimmedImage } = trimTransparentBorders(result.skImage, 2);
        const { base64 } = resizeImagePreserveAlpha(trimmedImage, 300);
        await file.write(base64, { encoding: 'base64' });
        
        // Add to processed items
        addProcessPantryItems({
          name: titleCase(result.name),
          quantity: result.quantity,
          image_url: file.uri,
          background_color: result.background_color,
          unit: result.unit,
        });
        
        // Remove from queue
        setProcessingQueue(prev => prev.filter(item => item.id !== nextItem.id));
        
        // Haptic feedback for success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      // Mark as failed
      setProcessingQueue(prev =>
        prev.map(item =>
          item.id === nextItem.id 
            ? { ...item, status: 'failed', error: error.message } 
            : item
        )
      );
    } finally {
      isProcessingRef.current = false;
    }
  };
  
  processNext();
}, [processingQueue]);
```

---

### 3. Update Camera Page UI

**File:** `app/ingredient/(create)/create.tsx`

#### Remove

- `segmentedImage` state
- `isProcessingImage` transition state
- Confirmation overlay (Canvas with segmented image)
- Confirm/Cancel buttons

#### Update

**Shutter button - always active:**

```tsx
const takePicture = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // Paywall check...

  if (camera.current) {
    try {
      const photo = await camera.current.takePhoto();
      
      if (photo?.path) {
        // Immediately add to queue - no waiting!
        addToQueue(photo.path, { ...framePosition });
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      toast.error("Error taking picture");
    }
  }
};
```

**Ingredient list with skeletons:**

```tsx
<Animated.FlatList
  horizontal
  data={[...processingQueue, ...processPantryItems]}
  renderItem={({ item }) => {
    // Check if it's a queue item (has 'status' property)
    if ('status' in item) {
      return (
        <SkeletonThumbnail 
          key={item.id}
          status={item.status}
          onRetry={() => retryQueueItem(item.id)}
          onRemove={() => removeFromQueue(item.id)}
        />
      );
    }
    
    // Regular pantry item thumbnail
    return (
      <AnimatedPressable onPress={onConfirm}>
        <Image source={item.image_url} style={{ width: 32, height: 32 }} />
      </AnimatedPressable>
    );
  }}
/>
```

---

### 4. Skeleton Thumbnail Component

**File:** `components/Ingredient/SkeletonThumbnail.tsx` (NEW)

```tsx
import { View, ActivityIndicator, Pressable } from 'react-native';
import Animated, { 
  BounceIn, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-nativewind';

type ProcessingStatus = 'queued' | 'processing' | 'failed';

interface SkeletonThumbnailProps {
  status: ProcessingStatus;
  onRetry?: () => void;
  onRemove?: () => void;
}

const THUMBNAIL_SIZE = 32;

export default function SkeletonThumbnail({ 
  status, 
  onRetry, 
  onRemove 
}: SkeletonThumbnailProps) {
  const opacity = useSharedValue(0.3);
  
  // Pulsing animation for queued/processing states
  useEffect(() => {
    if (status === 'queued' || status === 'processing') {
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 800 }),
        -1,
        true
      );
    }
  }, [status]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  if (status === 'failed') {
    return (
      <Animated.View
        entering={BounceIn}
        className="ml-3 items-center justify-center"
        style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
      >
        <Pressable 
          onPress={onRetry}
          onLongPress={onRemove}
          className="w-full h-full rounded-lg bg-red-500/30 items-center justify-center"
        >
          <AlertCircleIcon className="text-red-400" size={16} />
        </Pressable>
      </Animated.View>
    );
  }
  
  return (
    <Animated.View
      entering={BounceIn.springify().damping(15).mass(1).stiffness(150)}
      style={[
        { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE },
        animatedStyle,
      ]}
      className="ml-3 rounded-lg bg-white/40 items-center justify-center"
    >
      {status === 'processing' && (
        <ActivityIndicator size="small" color="white" />
      )}
    </Animated.View>
  );
}
```

---

### 5. Update Confirmation Page

**File:** `app/ingredient/confirmation.tsx`

Handle cases where some items are still processing when user navigates to confirmation:

```tsx
// Show processing items as skeletons in the confirmation list
// Or: Block navigation until queue is empty
// Or: Show a "Still processing X items..." banner
```

**Option A - Block navigation:**

```tsx
const onConfirm = () => {
  if (processingQueue.length > 0) {
    toast.info(`Still processing ${processingQueue.length} item(s)...`);
    return;
  }
  router.push("/ingredient/confirmation");
};
```

**Option B - Show banner on confirmation page:**

```tsx
{processingQueue.length > 0 && (
  <View className="bg-yellow-500/20 p-3 rounded-lg mb-4">
    <P className="text-yellow-200">
      Processing {processingQueue.length} more item(s)...
    </P>
  </View>
)}
```

---

### 6. Edge Cases & Error Handling

| Scenario | Solution |
|----------|----------|
| **App backgrounded** | Queue persists in memory, continues when foregrounded |
| **Processing fails** | Show red skeleton with retry option |
| **Memory pressure** | Process one item at a time (sequential queue) |
| **User navigates away** | Queue continues processing in background |
| **Duplicate photos** | Each has unique ID, processed independently |
| **Clear all failed** | Provide "Clear failed" action |
| **Network error (Gemini)** | Retry with exponential backoff, then mark failed |

---

### 7. Visual Feedback Summary

| Event | Feedback |
|-------|----------|
| Photo captured | Light haptic + skeleton appears |
| Processing starts | Skeleton shows spinner |
| Processing complete | Success haptic + thumbnail appears |
| Processing failed | Warning haptic + red skeleton |
| Retry tapped | Light haptic + back to processing |

---

### 8. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `store/CreateIngredientContext.tsx` | Modify | Add queue state, processor, new methods |
| `app/ingredient/(create)/create.tsx` | Modify | Remove confirmation UI, update shutter logic |
| `components/Ingredient/SkeletonThumbnail.tsx` | Create | New skeleton placeholder component |
| `app/ingredient/confirmation.tsx` | Modify | Handle in-progress queue items |
| `types/PantryItem.ts` | Modify | Add QueuedItem type (optional) |

---

### 9. Optional Enhancements (Future)

- [ ] **Batch indicator:** "Processing 3/5 items..."
- [ ] **Cancel individual items:** Long-press skeleton to cancel
- [ ] **Priority queue:** Most recent photos process first
- [ ] **Offline persistence:** Save queue to AsyncStorage for crash recovery
- [ ] **Progress percentage:** Show processing progress on skeleton
- [ ] **Undo:** Shake to undo last capture

---

## Estimated Timeline

| Task | Effort | Priority |
|------|--------|----------|
| Queue state & types | 1 hour | High |
| Queue processor logic | 2 hours | High |
| Update create.tsx UI | 2 hours | High |
| Skeleton component | 1 hour | High |
| Update confirmation page | 1 hour | Medium |
| Edge case handling | 1-2 hours | Medium |
| Testing & polish | 1-2 hours | High |

**Total:** ~8-10 hours

---

## Testing Checklist

- [ ] Take multiple photos rapidly - all queue correctly
- [ ] Skeletons appear and animate properly
- [ ] Processing completes and thumbnails appear
- [ ] Failed items show error state
- [ ] Retry works for failed items
- [ ] Navigation to confirmation works
- [ ] Gallery picker adds to queue
- [ ] Haptic feedback fires correctly
- [ ] Memory usage stays stable
- [ ] App backgrounding doesn't break queue
