# DoneDish (legacy: Cookkit) – Smart Recipe & Pantry Management App

> **Product name:** DoneDish. Legacy/internal name: Cookkit.

## App Overview

**DoneDish** is a sophisticated React Native mobile application that revolutionizes home cooking through intelligent pantry management and AI-powered recipe discovery. The app combines modern design principles with practical functionality to help users efficiently track ingredients, discover personalized recipes, and streamline their cooking experience.

### Core Value Proposition
- **Smart Pantry Tracking**: Visual inventory management with expiration date monitoring
- **AI-Powered Recipe Discovery**: Personalized recipe recommendations based on available ingredients
- **Seamless Cooking Experience**: Step-by-step cooking guidance with ingredient integration
- **Modern Design**: Beautiful, intuitive interface with sophisticated animations

---

## Design System & Branding

### Brand Identity
- **Name**: Cookkit
- **Logo Typography**: Bowlby One (bold, rounded, friendly)
- **Tagline**: "Track your ingredients. Discover tailored recipes."
- **Powered by**: AI technology with sparkle iconography

### Color Palette

#### Light Theme
- **Primary**: `hsl(12 100% 50%)` - Vibrant orange-red
- **Primary Foreground**: `hsl(349 57% 95%)` - Light pink-white
- **Background**: `hsl(0 0% 100%)` - Pure white
- **Foreground**: `hsl(240 10% 3.9%)` - Near black
- **Secondary**: `hsl(240 4.8% 95.9%)` - Light gray
- **Muted**: `hsl(240 4.8% 95.9%)` - Subtle gray
- **Border**: `hsl(240 5.9% 90%)` - Light border
- **Destructive**: `hsl(0 84.2% 60.2%)` - Warning red

#### Dark Theme
- **Primary**: `hsl(349 57% 95%)` - Light pink-white
- **Primary Foreground**: `hsl(12 100% 50%)` - Vibrant orange-red
- **Background**: `hsl(240 10% 3.9%)` - Dark charcoal
- **Foreground**: `hsl(0 0% 98%)` - Near white
- **Secondary**: `hsl(240 3.7% 15.9%)` - Dark gray
- **Muted**: `hsl(240 3.7% 15.9%)` - Muted dark
- **Border**: `hsl(240 3.7% 15.9%)` - Dark border

### Typography
- **Primary Font**: Urbanist (weights: 100-900)
  - Modern, clean sans-serif for body text and UI elements
  - Available in 9 weights: Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black
- **Display Font**: Bowlby One Regular
  - Rounded, bold typography for branding and headlines
  - Used for app name and major headings

### Animation & Motion
- **Material 3 Design System**: Implements Google's Material 3 motion tokens
- **Spring Animations**: Natural, physics-based motion
- **Bezier Curves**: Custom easing curves for expressive animations
- **Gesture-Driven**: Pan, swipe, and tap interactions with fluid responses

### Visual Elements
- **Blur Effects**: iOS-style blur overlays for modals
- **Gradients**: Linear gradients for AI branding and accents
- **Shadows**: Subtle drop shadows for depth
- **Border Radius**: Rounded corners (up to 3rem for major elements)
- **Iconography**: Lucide icons with consistent stroke width

---

## Core Features & Functionality

### 1. Smart Pantry Management

#### Visual Inventory System
- **Categorized Storage**: Fridge, Cabinet, Freezer organization
- **Visual Item Cards**: Product images with quantity and expiration display
- **Expiration Tracking**: Color-coded system showing days until expiry
- **Smart Sorting**: Automatic sorting by expiration date (earliest first)

#### Item Management
- **Add Items**: Camera integration for ingredient capture
- **Edit Quantities**: Simple tap-to-edit interface
- **Storage Instructions**: Step-by-step storage guidance for optimal freshness
- **Categories**: Organized by food types (Vegetables, Meat, Dairy, Grains, etc.)

#### Data Structure
```typescript
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  category: string;
  type: "fridge" | "cabinet" | "freezer";
  image_url: string;
  steps_to_store: StepsToStore[];
}
```

### 2. AI-Powered Recipe Discovery

#### Recipe Recommendation Engine
- **Ingredient-Based Matching**: Recipes tailored to available pantry items
- **Difficulty Filtering**: 1-5 star difficulty rating system
- **Dietary Preferences**: Vegetarian, gluten-free, and allergy-conscious options
- **Cooking Time**: Prep and cook time estimation

#### Recipe Features
- **Comprehensive Instructions**: Step-by-step cooking guidance
- **Ingredient Integration**: Direct links to pantry items
- **Nutrition Information**: Calorie counts and serving sizes
- **Source Attribution**: Links to original recipe sources
- **Tag System**: Categorization by cuisine, meal type, difficulty

#### Recipe Data Structure
```typescript
interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  calories: number;
  tags: string[];
}
```

### 3. Interactive Cooking Experience

#### Step-by-Step Guidance
- **Visual Instructions**: Large, clear step descriptions
- **Ingredient Highlighting**: Related ingredients highlighted per step
- **Progress Tracking**: Visual progress through recipe steps
- **Timer Integration**: Built-in cooking timers for precise timing

#### Gesture-Based Navigation
- **Swipe Navigation**: Smooth transitions between recipe steps
- **Pan Gestures**: Expandable recipe panel with fluid animations
- **Voice-Friendly**: Hands-free navigation capabilities

### 4. User Authentication & Personalization

#### Authentication Options
- **Email/Password**: Traditional account creation
- **Social Login**: Google, Facebook, Apple integration
- **Anonymous Mode**: Try before commitment
- **Account Linking**: Convert anonymous to permanent accounts

#### User Preferences
- **Dietary Restrictions**: Allergies and dietary preferences
- **Cooking Experience**: Skill level adaptation
- **Kitchen Equipment**: Recipe filtering based on available appliances
- **Favorite Recipes**: Personalized recipe collections

### 5. Onboarding & User Experience

#### Progressive Onboarding
- **Visual Introduction**: Floating ingredient cards with rotation animations
- **Tutorial Guidance**: Interactive tutorial for key features
- **Preference Setup**: Dietary restrictions, allergies, and equipment
- **Smart Defaults**: Intelligent initial setup

#### Accessibility
- **Screen Reader Support**: Full VoiceOver/TalkBack compatibility
- **High Contrast**: Dark mode and accessibility-friendly colors
- **Large Touch Targets**: Finger-friendly interface elements
- **Motion Reduction**: Respects system motion preferences

---

## Technical Architecture

### Platform & Framework
- **React Native**: Cross-platform mobile development
- **Expo Router**: File-based navigation system
- **TypeScript**: Type-safe development environment
- **React Native Reanimated**: High-performance animations

### State Management
- **Context API**: Application-wide state management
- **React Query**: Server state and caching
- **Zustand-style Stores**: Local state management patterns

### Design & Styling
- **NativeWind v4**: Tailwind CSS for React Native
- **CSS Variables**: Dynamic theming system
- **Responsive Design**: Adaptive layouts for different screen sizes

### Data Storage
- **WatermelonDB**: Local SQLite database with sync capabilities
- **Supabase**: Backend-as-a-Service for user data and authentication
- **AsyncStorage**: Simple key-value persistence
- **MMKV**: High-performance storage for preferences

### Authentication
- **Supabase Auth**: Secure authentication service
- **OAuth Integration**: Social login providers
- **Strategy Pattern**: Pluggable authentication methods
- **Session Management**: Automatic token refresh and validation

### Media & Assets
- **Expo Image**: Optimized image loading and caching
- **Image Colors**: Dynamic color extraction from recipe images
- **Vector Icons**: Lucide icon library
- **Custom Fonts**: Urbanist and Bowlby One typography

### Performance Optimizations
- **Image Prefetching**: Preload recipe images for smooth experience
- **Gesture Handler**: Native gesture recognition
- **Reanimated Worklets**: 60fps animations on UI thread
- **Code Splitting**: Optimized bundle size

---

## User Interface Design

### Navigation Structure
- **Tab-Based Navigation**: Primary navigation pattern
- **Stack Navigation**: Hierarchical screen flow
- **Modal Presentations**: Contextual overlays
- **Deep Linking**: Direct access to specific content

### Screen Layouts

#### Pantry Screen (Main)
- **Header Section**: App title, add button, menu dropdown
- **Category Filters**: Visual buttons for Fridge, Cabinet, Freezer
- **Item Grid**: Masonry layout of ingredient cards
- **Recipe Panel**: Expandable bottom panel with gesture control

#### Recipe Detail Screen
- **Hero Image**: Full-width recipe photography
- **Recipe Meta**: Prep time, difficulty, servings
- **Ingredient List**: Checkable ingredient list with pantry integration
- **Instructions**: Step-by-step cooking guidance
- **Action Bar**: Save, share, start cooking

#### Recipe Steps Screen
- **Full-Screen Experience**: Immersive cooking interface
- **Large Typography**: Easy-to-read instructions
- **Navigation Controls**: Previous/next with swipe gestures
- **Ingredient Sidebar**: Quick reference to required ingredients

### Component Design Patterns

#### Interactive Elements
- **Animated Buttons**: Spring-based hover and press states
- **Gesture Zones**: Large touch targets for accessibility
- **Visual Feedback**: Immediate response to user interactions
- **Loading States**: Skeleton screens and progress indicators

#### Data Visualization
- **Expiration Indicators**: Color-coded freshness status
- **Progress Bars**: Recipe completion and cooking progress
- **Category Icons**: Visual categorization system
- **Difficulty Stars**: 1-5 star rating display

### Responsive Design
- **Adaptive Layouts**: Optimized for various screen sizes
- **Safe Area Handling**: Proper insets for modern devices
- **Orientation Support**: Portrait-optimized with landscape considerations
- **Device-Specific**: iOS and Android platform conventions

---

## Target Audience & Use Cases

### Primary Users
- **Home Cooking Enthusiasts**: People who cook regularly at home
- **Meal Planners**: Users who plan meals in advance
- **Food Waste Reducers**: Environmentally conscious consumers
- **Recipe Discoverers**: Users seeking new culinary experiences

### Key Use Cases

#### Daily Pantry Management
- Check what ingredients are expiring soon
- Add new grocery purchases to inventory
- Plan meals based on available ingredients
- Reduce food waste through better tracking

#### Recipe Discovery & Cooking
- Find recipes using available ingredients
- Discover new dishes based on dietary preferences
- Follow step-by-step cooking instructions
- Save favorite recipes for future use

#### Meal Planning
- Plan weekly meals based on pantry inventory
- Create shopping lists for missing ingredients
- Track cooking history and preferences
- Optimize grocery shopping efficiency

### Business Value
- **Reduces Food Waste**: Helps users use ingredients before expiration
- **Improves Cooking Skills**: Guided recipes and tutorials
- **Saves Time**: Efficient meal planning and ingredient tracking
- **Enhances Creativity**: AI-powered recipe discovery

---

## Competitive Advantages

### Unique Features
- **Visual Pantry Management**: Unlike text-based inventory apps
- **AI Recipe Matching**: Smart recommendations based on actual inventory
- **Gesture-Driven Interface**: Fluid, intuitive navigation
- **Integrated Cooking Experience**: Seamless flow from pantry to plate

### Technical Excellence
- **Modern Architecture**: Latest React Native and animation frameworks
- **Cross-Platform**: Single codebase for iOS and Android
- **Offline Capable**: Local data storage with cloud sync
- **Performance Optimized**: 60fps animations and fast app startup

### Design Leadership
- **Material 3 Motion**: Industry-leading animation system
- **Accessibility First**: Inclusive design principles
- **Dark Mode**: Complete theming support
- **Typography Excellence**: Carefully selected font pairings

---

## Development & Technical Details

### Code Quality
- **TypeScript**: 100% type coverage for reliability
- **ESLint Configuration**: Comprehensive code quality rules
- **Testing**: Jest and React Native Testing Library
- **Code Organization**: Feature-based folder structure

### Build & Deployment
- **Expo Development Build**: Custom development client
- **EAS Build**: Cloud-based build service
- **Over-the-Air Updates**: Instant app updates
- **Platform Optimization**: iOS and Android specific builds

### Monitoring & Analytics
- **Error Tracking**: Production error monitoring
- **Performance Metrics**: App startup and navigation timing
- **User Analytics**: Feature usage and engagement tracking
- **Crash Reporting**: Automatic crash detection and reporting

---

## Future Roadmap

### Planned Features
- **Voice Commands**: Hands-free recipe navigation
- **Meal Planning Calendar**: Weekly meal scheduling
- **Social Sharing**: Recipe sharing with friends
- **Grocery Integration**: Direct ordering from recipe ingredients
- **Nutrition Tracking**: Detailed nutritional analysis
- **Recipe Rating**: Community-driven recipe reviews

### Technical Improvements
- **Enhanced AI**: More sophisticated recipe matching
- **Advanced Animations**: Physics-based micro-interactions
- **Offline Sync**: Improved offline-first architecture
- **Performance**: Further optimization for low-end devices

---

This documentation provides a comprehensive overview of Cookkit, showcasing its sophisticated design, innovative features, and technical excellence. The app represents the future of home cooking assistance through intelligent technology and beautiful user experience design.
