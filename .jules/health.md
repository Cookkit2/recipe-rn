## 2024-05-18 - Refactored duplicate photo upload logic in ReviewApi
**Learning:** Found deeply duplicated, multi-step concurrent I/O upload code across `createReview` and `updateReview`. Both methods implemented custom parallel Promise chains and bulk-insert operations for photo arrays.
**Action:** Extracted the concurrent upload-and-insert flow into a shared `uploadReviewPhotos` helper function. This simplifies the two parent API methods and enforces consistency in network logging and error handling, reducing the file length.
