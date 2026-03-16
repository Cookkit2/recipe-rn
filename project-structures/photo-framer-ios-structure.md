# Photo-Framer-iOS Project Structure

## Technology Stack

- **Language:** Swift 5.9+
- **Platform:** iOS 15.0+
- **UI Framework:** SwiftUI
- **Data Persistence:** Core Data
- **Image Processing:** Metal (GPU acceleration)
- **ML/AI:** CoreML + Create ML
- **AR:** ARKit 6.0
- **Networking:** URLSession (native) / Alamofire
- **Testing:** XCTest + XCTest

## Directory Structure

```
Photo-Framer-iOS/
├── App/
│   ├── PhotoFramerApp.swift
│   ├── AppDelegate.swift
│   └── SceneDelegate.swift
├── Application/
│   ├── DI/                 # Dependency Injection
│   │   ├── Container.swift
│   │   ├── Protocols/          # Dependency protocols
│   │   │   ├── PhotoRepositoryProtocol.swift
│   │   │   ├── FrameRepositoryProtocol.swift
│   │   │   └── AnalysisServiceProtocol.swift
│   │   └── Implementations/
│   │       ├── PhotoRepository.swift
│   │       ├── FrameRepository.swift
│   │       └── AnalysisService.swift
│   ├── Config/
│   │   ├── AppConfig.swift
│   │   ├── APIConfig.swift
│   │   └── CoreDataConfig.swift
│   ├── Theme/
│   │   ├── Colors.swift           # Dark mode colors
│   │   │   ├── AccentColors.swift
│   │   │   ├── BackgroundColors.swift
│   │   │   └── TextColors.swift
│   │   ├── Typography.swift       # Font definitions
│   │   └── Spacing.swift         # Spacing tokens
│   └── Utils/
│       ├── DateUtils.swift
│       ├── ImageUtils.swift
│       └── Validation.swift
├── Domain/
│   ├── Models/              # Domain models
│   │   ├── Photo.swift
│   │   ├── Frame.swift
│   │   ├── FramedPhoto.swift
│   │   ├── User.swift
│   │   ├── PhotoAnalysis.swift
│   │   ├── WatermarkSettings.swift
│   │   └── BatchJob.swift
│   ├── Repositories/        # Repository pattern
│   │   ├── PhotoRepository.swift
│   │   ├── FrameRepository.swift
│   │   ├── UserRepository.swift
│   │   ├── FramedPhotoRepository.swift
│   │   └── BatchJobRepository.swift
│   └── Services/           # Domain services
│       ├── PhotoAnalysisService.swift
│       ├── FrameRecommendationService.swift
│       ├── ARPreviewService.swift
│       ├── WatermarkService.swift
│       └── BatchProcessingService.swift
├── Infrastructure/
│   ├── Persistence/          # Core Data stack
│   │   ├── CoreDataStack.swift
│   │   ├── Models/             # Core Data models
│   │   │   ├── User+CoreDataProperties.swift
│   │   │   ├── Photo+CoreDataProperties.swift
│   │   │   ├── Frame+CoreDataProperties.swift
│   │   │   └── FramedPhoto+CoreDataProperties.swift
│   │   ├── Repositories/       # Core Data repositories
│   │   │   ├── CoreDataPhotoRepository.swift
│   │   │   ├── CoreDataFrameRepository.swift
│   │   │   └── CoreDataUserRepository.swift
│   │   └── Migrations/
│   │       ├── Migration_1_0_to_1_1.swift
│   │       └── CoreDataMigration.swift
│   ├── Network/             # Networking layer
│   │   ├── URLSession+Extensions.swift
│   │   ├── APIClient.swift
│   │   ├── Endpoints/         # API endpoints
│   │   │   ├── PhotoEndpoint.swift
│   │   │   ├── FrameEndpoint.swift
│   │   │   └── AnalyticsEndpoint.swift
│   │   └── Middleware/        # Network middleware
│   │       ├── AuthInterceptor.swift
│   │       ├── RetryPolicy.swift
│   │       └── ErrorHandling.swift
│   ├── Storage/              # File storage
│   │   ├── PhotoStorage.swift
│   │   ├── FrameStorage.swift
│   │   └── CacheManager.swift
│   └── Analytics/            # Analytics
│       └── AnalyticsTracker.swift
├── Presentation/
│   ├── Views/
│   │   ├── Home/
│   │   │   ├── HomeView.swift
│   │   │   └── Components/
│   │   │       ├── PhotoGrid.swift
│   │   │       ├── FrameGallery.swift
│   │   │       └── QuickActions.swift
│   │   ├── PhotoEditor/
│   │   │   ├── PhotoEditorView.swift
│   │   │   ├── FrameSelectionView.swift
│   │   │   ├── PhotoPreviewView.swift
│   │   │   ├── WatermarkOverlay.swift
│   │   │   └── AdjustmentControls.swift
│   │   ├── ARPreview/
│   │   │   ├── ARPreviewView.swift
│   │   │   ├── ARCameraView.swift
│   │   │   ├── FrameOverlay.swift
│   │   │   └── ARSessionManager.swift
│   │   ├── BatchProcessing/
│   │   │   ├── BatchProcessingView.swift
│   │   │   ├── BatchUploadView.swift
│   │   │   ├── ProgressIndicator.swift
│   │   │   └── BatchResultsView.swift
│   │   ├── Collections/
│   │   │   ├── CollectionView.swift
│   │   │   └── CollectionDetailView.swift
│   │   ├── CustomFrames/
│   │   │   ├── CustomFrameCreator.swift
│   │   │   ├── FrameEditor.swift
│   │   │   └── FrameGallery.swift
│   │   └── Profile/
│   │       ├── ProfileView.swift
│   │       ├── SettingsView.swift
│   │       └── PremiumSubscriptionView.swift
│   ├── Components/         # Reusable components
│   │   ├── PhotoCell.swift
│   │   ├── FrameCell.swift
│   │   ├── FramedPhotoCell.swift
│   │   ├── Button/
│   │   │   ├── PrimaryButton.swift
│   │   │   ├── SecondaryButton.swift
│   │   │   └── IconButton.swift
│   │   ├── Inputs/
│   │   │   ├── SearchBar.swift
│   │   │   ├── Slider.swift
│   │   │   └── SegmentedControl.swift
│   │   ├── Cards/
│   │   │   ├── PhotoCard.swift
│   │   │   └── FrameCard.swift
│   │   ├── Modals/
│   │   │   ├── ShareSheet.swift
│   │   │   ├── WatermarkSettings.swift
│   │   │   └── FilterSheet.swift
│   │   └── Views/
│   │       ├── LoadingView.swift
│   │       ├── EmptyState.swift
│   │       └── ErrorView.swift
│   ├── Navigation/          # Navigation structure
│   │   ├── RootCoordinator.swift
│   │   ├── HomeCoordinator.swift
│   │   ├── EditorCoordinator.swift
│   │   ├── ARPreviewCoordinator.swift
│   │   ├── BatchProcessingCoordinator.swift
│   │   └── ProfileCoordinator.swift
│   └── Styles/             # Shared styles
│       ├── Typography.swift
│       ├── Colors.swift
│       ├── Spacing.swift
│       └── Shadows.swift
├── Resources/
│   ├── Assets.xcassets/     # Image and color assets
│   ├── CoreMLModels/        # ML model files
│   │   ├── ColorDetection.mlmodel
│   │   ├── MoodClassification.mlmodel
│   │   ├── SubjectRecognition.mlmodel
│   │   └── QualityAssessment.mlmodel
│   ├── MetalShaders/         # Metal shader files
│   │   ├── FrameCompositor.metal
│   │   └── ImageFilter.metal
│   └── Localizable.strings  # Localization strings
├── UnitTests/
│   ├── Domain/
│   │   ├── PhotoAnalysisTests.swift
│   │   ├── FrameRecommendationTests.swift
│   │   └── ARPreviewTests.swift
│   ├── Infrastructure/
│   │   ├── CoreDataTests.swift
│   │   ├── PhotoStorageTests.swift
│   │   └── NetworkTests.swift
│   └── Presentation/
│       ├── PhotoEditorTests.swift
│       └── BatchProcessingTests.swift
├── UITests/
│   ├── HomeFlowTests.swift
│   ├── EditorFlowTests.swift
│   └── BatchFlowTests.swift
├── PerformanceTests/
│   ├── ImageProcessingTests.swift
│   ├── ARPerformanceTests.swift
│   └── BatchProcessingTests.swift
└── README.md
```

## Phase 1 Implementation Order

### Sprint 1: Core Infrastructure (Week 1-2)

1. **Project Setup**
   - [ ] Initialize Xcode project
   - [ ] Configure SwiftUI architecture
   - [ ] Set up SwiftLint
   - [ ] Set up SwiftFormat
   - [ ] Create project structure

2. **Core Data Stack**
   - [ ] Set up Core Data model
   - [ ] Create all entities from schema
   - [ ] Implement migration system
   - [ ] Create repository pattern
   - [ ] Add fetch request templates
   - [ ] Set up background context

3. **Dependency Injection**
   - [ ] Implement DI container
   - [ ] Define protocols
   - [ ] Register services
   - [ ] Create testable implementations

### Sprint 2: CoreML Integration (Week 3-4)

1. **Photo Analysis Models**
   - [ ] Train/color detection model
   - [ ] Train mood classification model
   - [ ] Train subject recognition model
   - [ ] Train quality assessment model
   - [ ] Export to CoreML format
   - [ ] Integrate into app

2. **Frame Recommendation Algorithm**
   - [ ] Implement color-based recommendations
   - [ ] Implement mood-based recommendations
   - [ ] Implement subject-based recommendations
   - [ ] Create algorithm service
   - [ ] Add scoring logic

### Sprint 3: MVP Features (Week 5-6)

1. **Photo Editor (Basic)**
   - [ ] Photo upload and display
   - [ ] Frame selection gallery
   - [ ] Basic frame application
   - [ ] Photo preview
   - [ ] Save framed photo
   - [ ] Basic adjustment controls

2. **AR Preview**
   - [ ] ARKit configuration
   - [ ] Camera view with AR overlay
   - [ ] Frame real-time positioning
   - [ ] Accurate sizing
   - [ ] Live preview performance

3. **Batch Processing**
   - [ ] Multi-photo upload
   - [ ] Progress tracking
   - [ ] Concurrent processing
   - [ ] Error handling
   - [ ] Results display

## Dependencies

### iOS Native

```swift
import Foundation
import SwiftUI
import CoreData
import CoreML
import ARKit
import Metal
import PhotosUI
```

### Third-Party Libraries

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0"),
    .package(url: "https://github.com/SDWebImage/SDWebImage.git", from: "5.18.0"),
]
```

## Key Implementation Notes

### Completely Dark Mode UI

1. Background: #050505 (deep black)
2. Text: #E8E8E8 (off-white, not harsh white)
3. Accents: Rich, vibrant colors
4. Typography: Elegant, modern fonts
5. Minimal chrome: Clean, content-first

### Metal-Accelerated Processing

1. Use GPU for image compositing
2. Metal shaders for filters
3. Hardware encoder for compression
4. Target: <500ms per photo

### CoreML Optimization

1. All models <50MB total
2. On-device inference (no cloud)
3. Inference time: <100ms per photo
4. Batch predictions when possible

### ARKit Performance Targets

1. Frame update rate: 60 FPS
2. Tracking latency: <16ms
3. Battery: Minimal usage (only during AR)
4. Light estimation for frame blending

### Testing Strategy

- Unit tests: 80% coverage minimum
- UI tests: Critical user journeys
- Performance tests: Image processing <500ms
- Memory tests: <200MB RAM usage

---

**Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Ready for Sprint 1
