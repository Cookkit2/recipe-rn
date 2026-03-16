# Recipe-cms Database Schema

## Overview
Headless content management system for recipe developers, food bloggers, and content marketers.

## Core Tables

### 1. users
Stores user accounts and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User unique ID |
| email | TEXT | UNIQUE NOT NULL | User email |
| username | TEXT | UNIQUE NOT NULL | Username |
| password_hash | TEXT | NOT NULL | Encrypted password |
| display_name | TEXT | | Public display name |
| avatar_url | TEXT | | Profile avatar image URL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| last_login_at | TIMESTAMP | | Last login time |
| is_active | BOOLEAN | DEFAULT TRUE | Is account active? |

### 2. roles
Stores user roles and permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Role unique ID |
| name | TEXT | UNIQUE NOT NULL | Role name (admin, editor, contributor, viewer) |
| description | TEXT | | Role description |
| permissions | TEXT | JSON | JSON array of permissions |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 3. user_roles
Many-to-many relationship between users and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FOREIGN KEY → users(id) | User ID |
| role_id | UUID | FOREIGN KEY → roles(id) | Role ID |
| assigned_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When role assigned |
| revoked_at | TIMESTAMP | | When role revoked |
| PRIMARY KEY (user_id, role_id) | | | Composite primary key |

### 4. content_types
Stores supported content types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Type unique ID |
| name | TEXT | UNIQUE NOT NULL | Type name (recipe, video, blog_post) |
| slug | TEXT | UNIQUE NOT NULL | URL-friendly identifier |
| is_enabled | BOOLEAN | DEFAULT TRUE | Is this type enabled? |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 5. collections
Stores user content collections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Collection unique ID |
| user_id | UUID | FOREIGN KEY → users(id) | User ID |
| name | TEXT | NOT NULL | Collection name |
| description | TEXT | | Collection description |
| cover_image_url | TEXT | | Cover image URL |
| is_public | BOOLEAN | DEFAULT FALSE | Is collection publicly visible? |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

### 6. content_items
Stores all content (recipes, videos, blog posts).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Content unique ID |
| user_id | UUID | FOREIGN KEY → users(id) | Author user ID |
| content_type_id | UUID | FOREIGN KEY → content_types(id) | Content type |
| collection_id | UUID | FOREIGN KEY → collections(id) | Parent collection |
| title | TEXT | NOT NULL | Content title |
| slug | TEXT | NOT NULL | URL-friendly identifier |
| content | TEXT | NOT NULL | Content (markdown) |
| status | TEXT | CHECK(status IN ('draft', 'published', 'archived')) | Content status |
| visibility | TEXT | CHECK(visibility IN ('public', 'private', 'unlisted')) | Visibility |
| featured_image_url | TEXT | | Featured image URL |
| excerpt | TEXT | | Short description |
| tags | TEXT | JSON | Array of tags |
| published_at | TIMESTAMP | | Publication date |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

### 7. recipe_metadata
Extended metadata for recipe content items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Reference to content |
| PRIMARY KEY (content_item_id) | | | Composite primary key |
| cuisine | TEXT | | Cuisine type |
| dietary_info | TEXT | JSON | Dietary information |
| cooking_time_minutes | INTEGER | | Cooking time in minutes |
| prep_time_minutes | INTEGER | | Prep time in minutes |
| servings | INTEGER | | Number of servings |
| source_url | TEXT | | Original source URL |
| source_title | TEXT | | Original source title |
| nutritional_info | TEXT | JSON | Nutritional information |

### 8. ingredients
Stores recipe ingredients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Ingredient unique ID |
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Recipe ID |
| name | TEXT | NOT NULL | Ingredient name |
| amount | TEXT | NOT NULL | Amount |
| unit | TEXT | | Unit |
| notes | TEXT | | Notes |

### 9. video_metadata
Extended metadata for video content items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Reference to content |
| PRIMARY KEY (content_item_id) | | | Composite primary key |
| duration_seconds | INTEGER | | Video duration |
| video_url | TEXT | | Video file URL |
| thumbnail_url | TEXT | | Thumbnail image URL |
| subtitles_url | TEXT | | Subtitle file URL |
| transcript | TEXT | JSON | Video transcript |
| video_resolution | TEXT | | Resolution (1080p, 720p, etc.) |
| file_size_bytes | INTEGER | | File size in bytes |

### 10. blog_post_metadata
Extended metadata for blog post content items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Reference to content |
| PRIMARY KEY (content_item_id) | | | Composite primary key |
| canonical_url | TEXT | | Canonical URL |
| word_count | INTEGER | | Word count |
| read_time_minutes | INTEGER | | Estimated read time |
| meta_description | TEXT | | SEO meta description |
| meta_keywords | TEXT | JSON | SEO keywords |

### 11. tags
Stores tags for content items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Tag unique ID |
| name | TEXT | UNIQUE NOT NULL | Tag name |
| slug | TEXT | UNIQUE NOT NULL | URL-friendly identifier |
| category | TEXT | | Tag category |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 12. content_tags
Many-to-many relationship between content and tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Content ID |
| tag_id | UUID | FOREIGN KEY → tags(id) | Tag ID |
| PRIMARY KEY (content_item_id, tag_id) | | | Composite primary key |

### 13. versions
Stores content versions (Git integration).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Version unique ID |
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Content ID |
| version_number | INTEGER | NOT NULL | Version number |
| parent_version_id | UUID | FOREIGN KEY → versions(id) | Parent version |
| author_id | UUID | FOREIGN KEY → users(id) | Author user ID |
| message | TEXT | | Commit message |
| branch_name | TEXT | | Branch name |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 14. version_diffs
Stores version differences (for conflict resolution).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Diff unique ID |
| version_id | UUID | FOREIGN KEY → versions(id) | Version ID |
| field | TEXT | NOT NULL | Changed field |
| old_value | TEXT | | Old value |
| new_value | TEXT | | New value |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 15. comments
Stores content comments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Comment unique ID |
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Content ID |
| author_id | UUID | FOREIGN KEY → users(id) | Author user ID |
| parent_comment_id | UUID | FOREIGN KEY → comments(id) | Parent comment (for threads) |
| content | TEXT | NOT NULL | Comment content |
| status | TEXT | DEFAULT 'pending' | Status (pending, approved, rejected) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

### 16. collaborators
Stores team members and collaborators.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Collaboration ID |
| user_id | UUID | FOREIGN KEY → users(id) | User ID |
| role_id | UUID | FOREIGN KEY → roles(id) | Role ID |
| can_edit | BOOLEAN | DEFAULT TRUE | Can edit content? |
| can_publish | BOOLEAN | DEFAULT FALSE | Can publish content? |
| can_manage_users | BOOLEAN | DEFAULT FALSE | Can manage users? |
| invited_by | UUID | FOREIGN KEY → users(id) | Inviter user ID |
| invited_at | TIMESTAMP | | Invitation date |
| accepted_at | TIMESTAMP | | Acceptance date |
| PRIMARY KEY (user_id, role_id) | | | Composite primary key |

### 17. activity_logs
Stores system activity logs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Log unique ID |
| user_id | UUID | FOREIGN KEY → users(id) | User ID (NULL for system) |
| action | TEXT | NOT NULL | Action performed |
| resource_type | TEXT | | Resource type |
| resource_id | TEXT | | Resource ID |
| metadata | TEXT | JSON | Additional metadata |
| ip_address | TEXT | | IP address |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 18. api_keys
Stores API keys for developer access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Key unique ID |
| user_id | UUID | FOREIGN KEY → users(id) | User ID |
| key_hash | TEXT | UNIQUE NOT NULL | Hashed API key |
| name | TEXT | NOT NULL | Key name |
| permissions | TEXT | JSON | JSON array of permissions |
| rate_limit | INTEGER | DEFAULT 1000 | Rate limit (requests/minute) |
| is_active | BOOLEAN | DEFAULT TRUE | Is key active? |
| last_used_at | TIMESTAMP | | Last usage time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 19. usage_analytics
Stores API usage statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Analytics record ID |
| api_key_id | UUID | FOREIGN KEY → api_keys(id) | API Key ID |
| content_item_id | UUID | FOREIGN KEY → content_items(id) | Content ID |
| request_count | INTEGER | DEFAULT 1 | Number of requests |
| success_count | INTEGER | | Successful requests |
| error_count | INTEGER | | Error requests |
| response_time_ms | INTEGER | | Average response time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 20. webhooks
Stores webhook configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Webhook unique ID |
| user_id | UUID | FOREIGN KEY → users(id) | User ID |
| name | TEXT | NOT NULL | Webhook name |
| url | TEXT | NOT NULL | Webhook URL |
| secret | TEXT | | Webhook secret (for signature) |
| events | TEXT | JSON | Array of events to trigger |
| is_active | BOOLEAN | DEFAULT TRUE | Is webhook active? |
| last_triggered_at | TIMESTAMP | | Last trigger time |
| failed_count | INTEGER | DEFAULT 0 | Consecutive failures |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

### 21. webhook_events
Stores webhook event queues.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Event unique ID |
| webhook_id | UUID | FOREIGN KEY → webhooks(id) | Webhook ID |
| event_type | TEXT | NOT NULL | Event type |
| payload | TEXT | JSON | Event payload |
| status | TEXT | DEFAULT 'pending' | Status (pending, sent, failed) |
| attempts | INTEGER | DEFAULT 0 | Number of attempts |
| last_attempt_at | TIMESTAMP | | Last attempt time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

## Indexes

```sql
-- Performance optimizations
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_display_name ON users(display_name);
CREATE INDEX idx_content_items_user_id ON content_items(user_id);
CREATE INDEX idx_content_items_type ON content_items(content_type_id);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_visibility ON content_items(visibility);
CREATE INDEX idx_content_items_slug ON content_items(slug);
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX idx_recipes_metadata ON recipe_metadata(cooking_time_minutes);
CREATE INDEX idx_recipes_metadata ON recipe_metadata(dietary_info);
CREATE INDEX idx_video_metadata ON video_metadata(duration_seconds);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_content_tags_content_item_id ON content_tags(content_item_id);
CREATE INDEX idx_content_tags_tag_id ON content_tags(tag_id);
CREATE INDEX idx_versions_content_item_id ON versions(content_item_id);
CREATE INDEX idx_comments_content_item_id ON comments(content_item_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_usage_analytics_api_key_id ON usage_analytics(api_key_id);
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
```

## Relationships Summary

```
User (1) ──> (N) Role (via user_roles)
User (1) ──> (N) Collection
User (1) ──> (N) Content Item (via content_items)
User (1) ──> (N) Comment (via comments)
User (1) ──> (N) Collaboration (via collaborators)
User (1) ──> (N) API Key (via api_keys)
User (1) ──> (N) Webhook

Content Type (1) ──> (N) Content Item
Collection (1) ──> (N) Content Item
Content Item (1) ──> (1) Recipe Metadata
Content Item (1) ──> (1) Video Metadata
Content Item (1) ──> (1) Blog Post Metadata
Content Item (1) ──> (1) Ingredients
Content Item (1) ──> (N) Tag (via content_tags)
Content Item (1) ──> (N) Version (via versions)
Content Item (1) ──> (N) Comment (via comments)
Content Item (1) ──> (N) Webhook Event

Role (1) ──> (N) User (via user_roles)
Role (1) ──> (N) Collaboration

Tag (1) ──> (N) Content Item (via content_tags)

Version (1) ──> (N) Version Diff (via version_diffs)
Version (1) ──> (N) Version (parent)

API Key (1) ──> (N) Usage Analytics
Webhook (1) ──> (N) Webhook Event
```

## Migration Strategy

### Version 1.0 - Initial Schema
```sql
CREATE TABLE users (...);
CREATE TABLE roles (...);
CREATE TABLE user_roles (...);
CREATE TABLE content_types (...);
CREATE TABLE collections (...);
CREATE TABLE content_items (...);
CREATE TABLE recipe_metadata (...);
CREATE TABLE ingredients (...);
CREATE TABLE tags (...);
CREATE TABLE content_tags (...);
-- ... and so on
```

### Version 1.1 - Add Version Control
```sql
ALTER TABLE content_items ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE content_items ADD COLUMN status TEXT DEFAULT 'draft';
-- Create version tracking tables
```

### Version 1.2 - Add Integrations
```sql
CREATE TABLE video_metadata (...);
CREATE TABLE blog_post_metadata (...);
CREATE TABLE api_keys (...);
CREATE TABLE webhooks (...);
-- ...
```

## Headless CMS Considerations

### API Structure
- REST API endpoints for all CRUD operations
- GraphQL endpoint for complex queries
- Webhook integration for real-time updates

### Backend Architecture
- PostgreSQL for structured data
- Elasticsearch for search
- S3/Cloud Storage for media files
- CDN for static assets

### Developer Experience
- RESTful API with predictable URLs
- SDKs for JavaScript, Python, PHP, Ruby
- Interactive API documentation
- CLI tool for bulk operations

---

**Database Schema Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Ready for Implementation
