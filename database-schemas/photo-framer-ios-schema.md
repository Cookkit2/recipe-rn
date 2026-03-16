# Photo-Framer-iOS Database Schema

## Overview

iOS photo framing app with CoreML integration, AR preview, and batch processing. Uses Core Data (iOS 15+).

## Core Entities

### 1. User

Stores user account and preferences.

| Attribute       | Type    | Constraints     | Description                 |
| --------------- | ------- | --------------- | --------------------------- |
| id              | UUID    | PRIMARY KEY     | User unique ID              |
| email           | String  | UNIQUE NOT NULL | User email                  |
| username        | String  | UNIQUE NOT NULL | Username                    |
| displayName     | String  |                 | Display name                |
| avatarURL       | URL     |                 | Profile avatar image        |
| createdAt       | Date    | DEFAULT NOW()   | Account creation time       |
| lastLoginAt     | Date    |                 | Last login time             |
| isPremium       | Boolean | DEFAULT FALSE   | Premium subscription status |
| premiumExpiryAt | Date    |                 | Premium expiry date         |

### 2. Photo

Stores user photos.

| Attribute         | Type    | Constraints                                               | Description                |
| ----------------- | ------- | --------------------------------------------------------- | -------------------------- |
| id                | UUID    | PRIMARY KEY                                               | Photo unique ID            |
| userID            | UUID    | FOREIGN KEY → User(id)                                    | Owner user                 |
| originalImageURL  | URL     | NOT NULL                                                  | Original photo URL         |
| processedImageURL | URL     |                                                           | Processed/framed photo URL |
| thumbnailURL      | URL     |                                                           | Thumbnail URL              |
| caption           | String  |                                                           | Photo caption              |
| createdAt         | Date    | DEFAULT NOW()                                             | Upload time                |
| updatedAt         | Date    | DEFAULT NOW()                                             | Last update time           |
| fileSizeBytes     | Integer |                                                           | File size in bytes         |
| width             | Integer |                                                           | Photo width in pixels      |
| height            | Integer |                                                           | Photo height in pixels     |
| orientation       | String  | CHECK(orientation IN ('portrait', 'landscape', 'square')) | Photo orientation          |
| format            | String  | CHECK(format IN ('HEIC', 'JPEG', 'PNG', 'WEBP'))          | Image format               |

### 3. Frame

Stores frame definitions and templates.

| Attribute     | Type    | Constraints            | Description                                           |
| ------------- | ------- | ---------------------- | ----------------------------------------------------- |
| id            | UUID    | PRIMARY KEY            | Frame unique ID                                       |
| name          | String  | NOT NULL               | Frame name                                            |
| description   | String  |                        | Frame description                                     |
| imageURL      | URL     | NOT NULL               | Frame image URL                                       |
| thumbnailURL  | URL     |                        | Frame thumbnail URL                                   |
| category      | String  |                        | Frame category (abstract, seasonal, minimalist, etc.) |
| isCustom      | Boolean | DEFAULT FALSE          | Is this a custom user-created frame?                  |
| creatorID     | UUID    | FOREIGN KEY → User(id) | Creator user ID (NULL for system frames)              |
| dominantColor | String  |                        | Dominant color (hex)                                  |
| colorScheme   | String  | JSON                   | Color scheme (analogous, complementary, triadic)      |
| mood          | String  |                        | Frame mood (happy, dramatic, moody, etc.)             |
| isFree        | Boolean | DEFAULT TRUE           | Is frame free for all users?                          |
| downloadCount | Integer | DEFAULT 0              | Number of downloads                                   |
| rating        | Float   | 0.0-5.0                | Average user rating                                   |
| isActive      | Boolean | DEFAULT TRUE           | Is frame active?                                      |
| createdAt     | Date    | DEFAULT NOW()          | Creation time                                         |
| updatedAt     | Date    | DEFAULT NOW()          | Last update time                                      |

### 4. FramedPhoto

Association table linking photos with applied frames.

| Attribute       | Type    | Constraints             | Description                |
| --------------- | ------- | ----------------------- | -------------------------- |
| id              | UUID    | PRIMARY KEY             | Framed photo unique ID     |
| photoID         | UUID    | FOREIGN KEY → Photo(id) | Photo ID                   |
| frameID         | UUID    | FOREIGN KEY → Frame(id) | Frame ID                   |
| framedImageURL  | URL     | NOT NULL                | Resulting framed photo URL |
| thumbnailURL    | URL     |                         | Thumbnail URL              |
| borderThickness | Float   | DEFAULT 10.0            | Border thickness in points |
| borderColor     | String  |                         | Border color (hex)         |
| isWatermarked   | Boolean | DEFAULT FALSE           | Has watermark?             |
| appliedAt       | Date    | DEFAULT NOW()           | When frame was applied     |
| isShared        | Boolean | DEFAULT FALSE           | Has been shared?           |

### 5. FrameRecommendation

Stores AI frame recommendations for photos.

| Attribute  | Type   | Constraints             | Description                                             |
| ---------- | ------ | ----------------------- | ------------------------------------------------------- |
| id         | UUID   | PRIMARY KEY             | Recommendation unique ID                                |
| photoID    | UUID   | FOREIGN KEY → Photo(id) | Photo ID                                                |
| frameID    | UUID   | FOREIGN KEY → Frame(id) | Recommended frame ID                                    |
| matchScore | Float  | 0.0-100.0               | Compatibility score                                     |
| reason     | String |                         | Recommendation reason                                   |
| algorithm  | String |                         | Algorithm used (color-based, mood-based, subject-based) |
| createdAt  | Date   | DEFAULT NOW()           | When recommendation generated                           |

### 6. PhotoAnalysis

Stores CoreML analysis results for photos.

| Attribute        | Type    | Constraints             | Description                                                |
| ---------------- | ------- | ----------------------- | ---------------------------------------------------------- |
| id               | UUID    | PRIMARY KEY             | Analysis unique ID                                         |
| photoID          | UUID    | FOREIGN KEY → Photo(id) | Photo ID                                                   |
| dominantColor1   | String  |                         | Primary dominant color (hex)                               |
| dominantColor2   | String  |                         | Secondary dominant color (hex)                             |
| dominantColor3   | String  |                         | Tertiary dominant color (hex)                              |
| mood             | String  |                         | Detected mood (happy, dramatic, moody, peaceful, bright)   |
| subjectType      | String  |                         | Subject type (portrait, landscape, food, travel, abstract) |
| qualityScore     | Float   | 0.0-10.0                | Photo quality score                                        |
| blurScore        | Float   | 0.0-10.0                | Blur detection score                                       |
| exposureScore    | Float   | 0.0-10.0                | Exposure score                                             |
| compositionScore | Float   | 0.0-10.0                | Composition score (rule of thirds, balance)                |
| viralityScore    | Float   | 0.0-100.0               | Predicted viral potential                                  |
| processingTimeMS | Integer |                         | Analysis time in milliseconds                              |
| createdAt        | Date    | DEFAULT NOW()           | When analysis ran                                          |

### 7. BatchProcessingJob

Stores batch processing job information.

| Attribute         | Type    | Constraints                                                                           | Description               |
| ----------------- | ------- | ------------------------------------------------------------------------------------- | ------------------------- |
| id                | UUID    | PRIMARY KEY                                                                           | Job unique ID             |
| userID            | UUID    | FOREIGN KEY → User(id)                                                                | User ID                   |
| name              | String  | NOT NULL                                                                              | Job name                  |
| status            | String  | CHECK(status IN ('pending', 'processing', 'completed', 'failed'))                     | Job status                |
| totalPhotos       | Integer | DEFAULT 0                                                                             | Total photos to process   |
| processedPhotos   | Integer | DEFAULT 0                                                                             | Photos processed so far   |
| failedPhotos      | Integer | DEFAULT 0                                                                             | Photos that failed        |
| defaultFrameID    | UUID    | FOREIGN KEY → Frame(id)                                                               | Default frame to apply    |
| applyWatermark    | Boolean | DEFAULT FALSE                                                                         | Apply watermark?          |
| watermarkText     | String  |                                                                                       | Watermark text            |
| watermarkPosition | String  | CHECK(position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center')) | Watermark position        |
| watermarkOpacity  | Float   | 0.0-1.0                                                                               | Watermark opacity (0-1)   |
| startedAt         | Date    |                                                                                       | When job started          |
| completedAt       | Date    |                                                                                       | When job completed        |
| error             | String  |                                                                                       | Error message (if failed) |
| createdAt         | Date    | DEFAULT NOW()                                                                         | Job creation time         |

### 8. BatchPhoto

Stores individual photos in batch jobs.

| Attribute       | Type    | Constraints                                                       | Description               |
| --------------- | ------- | ----------------------------------------------------------------- | ------------------------- |
| id              | UUID    | PRIMARY KEY                                                       | Batch photo unique ID     |
| jobID           | UUID    | FOREIGN KEY → BatchProcessingJob(id)                              | Job ID                    |
| photoID         | UUID    | FOREIGN KEY → Photo(id)                                           | Photo ID                  |
| status          | String  | CHECK(status IN ('pending', 'processing', 'completed', 'failed')) | Processing status         |
| framedPhotoID   | UUID    | FOREIGN KEY → FramedPhoto(id)                                     | Resulting framed photo    |
| errorMessage    | String  |                                                                   | Error message (if failed) |
| processingOrder | Integer |                                                                   | Order in batch            |
| startedAt       | Date    |                                                                   | When processing started   |
| completedAt     | Date    |                                                                   | When processing completed |

### 9. WatermarkSettings

Stores user watermark presets.

| Attribute    | Type    | Constraints                                                                           | Description             |
| ------------ | ------- | ------------------------------------------------------------------------------------- | ----------------------- |
| id           | UUID    | PRIMARY KEY                                                                           | Setting unique ID       |
| userID       | UUID    | FOREIGN KEY → User(id)                                                                | User ID                 |
| name         | String  | NOT NULL                                                                              | Preset name             |
| text         | String  | NOT NULL                                                                              | Watermark text          |
| position     | String  | CHECK(position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center')) | Position                |
| opacity      | Float   | 0.0-1.0                                                                               | Opacity (0-1)           |
| fontSize     | Integer |                                                                                       | Font size in points     |
| fontColor    | String  |                                                                                       | Font color (hex)        |
| shadowOffset | Integer | DEFAULT 0                                                                             | Shadow offset in points |
| isDefault    | Boolean | DEFAULT FALSE                                                                         | Is default preset?      |
| createdAt    | Date    | DEFAULT NOW()                                                                         | Creation time           |

### 10. ShareHistory

Stores share history and analytics.

| Attribute     | Type    | Constraints                                                                        | Description            |
| ------------- | ------- | ---------------------------------------------------------------------------------- | ---------------------- |
| id            | UUID    | PRIMARY KEY                                                                        | Share record unique ID |
| userID        | UUID    | FOREIGN KEY → User(id)                                                             | User ID                |
| framedPhotoID | UUID    | FOREIGN KEY → FramedPhoto(id)                                                      | Framed photo ID        |
| platform      | String  | CHECK(platform IN ('Instagram', 'WhatsApp', 'Messages', 'Save to Files', 'Other')) | Platform used          |
| isPublic      | Boolean | DEFAULT FALSE                                                                      | Shared publicly?       |
| likeCount     | Integer | DEFAULT 0                                                                          | Likes received         |
| commentCount  | Integer | DEFAULT 0                                                                          | Comments received      |
| viewCount     | Integer | DEFAULT 0                                                                          | Views received         |
| sharedAt      | Date    | DEFAULT NOW()                                                                      | When shared            |

### 11. Collection

Stores user photo collections.

| Attribute     | Type   | Constraints            | Description            |
| ------------- | ------ | ---------------------- | ---------------------- |
| id            | UUID   | PRIMARY KEY            | Collection unique ID   |
| userID        | UUID   | FOREIGN KEY → User(id) | User ID                |
| name          | String | NOT NULL               | Collection name        |
| description   | String |                        | Collection description |
| coverImageURL | URL    |                        | Cover image URL        |
| createdAt     | Date   | DEFAULT NOW()          | Creation time          |
| updatedAt     | Date   | DEFAULT NOW()          | Last update time       |

### 12. CollectionItem

Links photos to collections.

| Attribute                                 | Type | Constraints                   | Description               |
| ----------------------------------------- | ---- | ----------------------------- | ------------------------- |
| id                                        | UUID | PRIMARY KEY                   | Collection item unique ID |
| collectionID                              | UUID | FOREIGN KEY → Collection(id)  | Collection ID             |
| framedPhotoID                             | UUID | FOREIGN KEY → FramedPhoto(id) | Framed photo ID           |
| addedAt                                   | Date | DEFAULT NOW()                 | When added to collection  |
| PRIMARY KEY (collectionID, framedPhotoID) |      |                               | Composite primary key     |

### 13. CustomFrame

Stores user-created custom frames.

| Attribute       | Type    | Constraints                                                    | Description             |
| --------------- | ------- | -------------------------------------------------------------- | ----------------------- |
| id              | UUID    | PRIMARY KEY                                                    | Custom frame unique ID  |
| userID          | UUID    | FOREIGN KEY → User(id)                                         | Creator user ID         |
| name            | String  | NOT NULL                                                       | Frame name              |
| frameImageURL   | URL     | NOT NULL                                                       | Frame image URL         |
| thumbnailURL    | URL     |                                                                | Thumbnail URL           |
| frameType       | String  | CHECK(type IN ('image', 'video', 'gradient', 'color-overlay')) | Frame type              |
| backgroundColor | String  |                                                                | Background color (hex)  |
| textureURL      | URL     |                                                                | Texture image URL       |
| overlayURL      | URL     |                                                                | Overlay image URL       |
| borderColor     | String  |                                                                | Border color (hex)      |
| borderWidth     | Float   |                                                                | Border width in points  |
| borderRadius    | Float   |                                                                | Border radius in points |
| isPublic        | Boolean | DEFAULT FALSE                                                  | Is publicly visible?    |
| isDownloadable  | Boolean | DEFAULT TRUE                                                   | Can others download?    |
| downloadCount   | Integer | DEFAULT 0                                                      | Number of downloads     |
| rating          | Float   | 0.0-5.0                                                        | Average user rating     |
| createdAt       | Date    | DEFAULT NOW()                                                  | Creation time           |
| updatedAt       | Date    | DEFAULT NOW()                                                  | Last update time        |

### 14. ARSession

Stores AR preview session data.

| Attribute         | Type    | Constraints             | Description                       |
| ----------------- | ------- | ----------------------- | --------------------------------- |
| id                | UUID    | PRIMARY KEY             | Session unique ID                 |
| userID            | UUID    | FOREIGN KEY → User(id)  | User ID                           |
| frameID           | UUID    | FOREIGN KEY → Frame(id) | Frame ID                          |
| isLive            | Boolean | DEFAULT FALSE           | Is this a live AR camera preview? |
| durationSeconds   | Integer |                         | Session duration in seconds       |
| frameChangesCount | Integer | DEFAULT 0               | Number of frame switches          |
| endedAt           | Date    | DEFAULT NOW()           | Session end time                  |
| startedAt         | Date    | DEFAULT NOW()           | Session start time                |

### 15. PerformanceMetrics

Stores performance metrics for optimization.

| Attribute           | Type    | Constraints                                                                     | Description                    |
| ------------------- | ------- | ------------------------------------------------------------------------------- | ------------------------------ |
| id                  | UUID    | PRIMARY KEY                                                                     | Metric record unique ID        |
| operationType       | String  | CHECK(type IN ('frame_apply', 'batch_process', 'ar_preview', 'photo_analysis')) | Operation type                 |
| durationMS          | Integer |                                                                                 | Duration in milliseconds       |
| memoryUsageMB       | Float   |                                                                                 | Memory usage in MB             |
| cpuUsagePercent     | Float   |                                                                                 | CPU usage percentage           |
| batteryDrainPercent | Float   |                                                                                 | Battery drain percentage       |
| deviceModel         | String  |                                                                                 | Device model (iPhone 12, etc.) |
| iOSVersion          | String  |                                                                                 | iOS version                    |
| timestamp           | Date    | DEFAULT NOW()                                                                   | When metric recorded           |

### 16. UsageAnalytics

Stores user behavior analytics.

| Attribute   | Type          | Constraints            | Description                     |
| ----------- | ------------- | ---------------------- | ------------------------------- |
| id          | UUID          | PRIMARY KEY            | Analytics record unique ID      |
| userID      | UUID          | FOREIGN KEY → User(id) | User ID                         |
| action      | String        | NOT NULL               | Action performed                |
| featureName | String        |                        | Feature used                    |
| durationMS  | Integer       |                        | Action duration in milliseconds |
| metadata    | String (JSON) | Additional metadata    |
| timestamp   | Date          | DEFAULT NOW()          | When action performed           |

## Indexes

```sql
-- Performance optimizations
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_username ON User(username);
CREATE INDEX idx_photo_user_id ON Photo(userID);
CREATE INDEX idx_photo_created_at ON Photo(createdAt DESC);
CREATE INDEX idx_photo_orientation ON Photo(orientation);
CREATE INDEX idx_photo_format ON Photo(format);
CREATE INDEX idx_frame_name ON Frame(name);
CREATE INDEX idx_frame_category ON Frame(category);
CREATE INDEX idx_frame_is_custom ON Frame(isCustom);
CREATE INDEX idx_frame_is_active ON Frame(isActive);
CREATE INDEX idx_frame_rating ON Frame(rating);
CREATE INDEX idx_framed_photo_id ON FramedPhoto(photoID);
CREATE INDEX idx_framed_frame_id ON FramedPhoto(frameID);
CREATE INDEX idx_framed_applied_at ON FramedPhoto(appliedAt DESC);
CREATE INDEX idx_recommendation_photo_id ON FrameRecommendation(photoID);
CREATE INDEX idx_recommendation_frame_id ON FrameRecommendation(frameID);
CREATE INDEX idx_recommendation_score ON FrameRecommendation(matchScore);
CREATE INDEX idx_photo_analysis_photo_id ON PhotoAnalysis(photoID);
CREATE INDEX idx_photo_analysis_mood ON PhotoAnalysis(mood);
CREATE INDEX idx_photo_analysis_subject_type ON PhotoAnalysis(subjectType);
CREATE INDEX idx_batch_job_user_id ON BatchProcessingJob(userID);
CREATE INDEX idx_batch_job_status ON BatchProcessingJob(status);
CREATE INDEX idx_batch_photo_job_id ON BatchPhoto(jobID);
CREATE INDEX idx_batch_photo_status ON BatchPhoto(status);
CREATE INDEX idx_watermark_user_id ON WatermarkSettings(userID);
CREATE INDEX idx_collection_user_id ON Collection(userID);
CREATE INDEX idx_collection_item_collection_id ON CollectionItem(collectionID);
CREATE INDEX idx_custom_frame_user_id ON CustomFrame(userID);
CREATE INDEX idx_custom_frame_is_public ON CustomFrame(isPublic);
CREATE INDEX idx_ar_session_user_id ON ARSession(userID);
CREATE INDEX idx_ar_session_started_at ON ARSession(startedAt DESC);
CREATE INDEX idx_performance_operation ON PerformanceMetrics(operationType);
CREATE INDEX idx_performance_timestamp ON PerformanceMetrics(timestamp DESC);
CREATE INDEX idx_usage_user_id ON UsageAnalytics(userID);
CREATE INDEX idx_usage_action ON UsageAnalytics(action);
CREATE INDEX idx_usage_timestamp ON UsageAnalytics(timestamp DESC);
```

## Relationships Summary

```
User (1) ──> (N) Photo
User (1) ──> (N) Watermark Settings
User (1) ──> (N) Collection
User (1) ──> (N) Batch Processing Job
User (1) ──> (N) Share History
User (1) ──> (N) AR Session
User (1) ──> (N) Custom Frame
User (1) ──> (N) Usage Analytics

Photo (1) ──> (N) Frame Recommendation
Photo (1) ──> (N) Photo Analysis
Photo (1) ──> (N) Framed Photo
Photo (1) ──> (N) Collection Item (via Framed Photo)

Framed Photo (1) ──> (N) Frame
Framed Photo (1) ──> (N) Collection Item
Framed Photo (1) ──> (N) Share History

Frame (1) ──> (N) Frame Recommendation
Frame (1) ──> (N) Framed Photo
Frame (1) ──> (N) Custom Frame (if isCustom=true)

Batch Processing Job (1) ──> (N) Batch Photo
Batch Processing Job (1) ──> (N) Frame (default)

Collection (1) ──> (N) Collection Item

Custom Frame (1) ──> (N) Frame
```

## Offline-First Architecture

### Local Storage (Core Data)

- Core Data stack on iOS
- All user data, photos, frames stored locally
- Automatic sync when connection restored

### Sync Strategy

1. Download user's photos and frames from server
2. Store locally in Core Data
3. When editing: update locally, flag for sync
4. Background sync on Wi-Fi + charging

### Cache Management

- LRU eviction for least-recently used photos
- Compress images before storing
- Store thumbnails separate from full-size images
- 500MB cache limit for photo data

## Metal-Accelerated Processing

### Image Processing Pipeline

1. Upload photo → Decode using Metal
2. Apply frame → GPU-accelerated compositing
3. Save result → Compress using hardware encoder
4. Generate thumbnail → Metal-accelerated resize

### Performance Targets

- Frame apply time: <500ms per photo
- Batch processing: Process 50 photos in <60 seconds
- Memory usage: <200MB RAM
- Battery drain: <5% per 50-photo batch

## CoreML Integration

### Photo Analysis Models

- **Color Detection:** Detect dominant colors (3 top colors)
- **Mood Classification:** Classify mood (happy, dramatic, moody, etc.)
- **Subject Recognition:** Identify subject type (portrait, food, travel, etc.)
- **Quality Assessment:** Score photo quality (blur, exposure, composition)
- **Virality Prediction:** Predict viral potential

### Model Size & Performance

- Total model size: <50MB
- Inference time: <100ms per photo
- On-device only (no cloud dependency)

## ARKit Integration

### AR Preview Features

- Real-time frame overlay on camera feed
- Accurate sizing and positioning
- Light estimation for frame blending
- Face tracking for portrait frames

### AR Performance Targets

- Frame update rate: 60 FPS
- Tracking latency: <16ms
- Battery usage: Minimal (only during AR preview)

---

**Database Schema Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Ready for Implementation
