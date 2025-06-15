# Elevation Design System

## Overview

The elevation system provides a consistent visual hierarchy across the app by using different background colors to represent surfaces at various "heights" above the base layer. This creates depth and helps users understand the relationship between different UI elements.

## Design Principles

### 1. **Intelligent Hierarchy**

- Start with Level 0 for base components
- Each stacked component uses the next elevation level
- Never skip elevation levels in the same component hierarchy

### 2. **Semantic Meaning**

- Each elevation level has a specific purpose and meaning
- Higher elevations indicate more important or interactive content
- Floating elements use the highest elevation

### 3. **Consistency**

- Use elevation colors for surface hierarchy
- Use shadows (`LAYOUT.ELEVATION`) for visual depth
- Maintain consistent elevation usage across similar components

## Elevation Levels

### Level 0 (elevation0) - Base Surfaces

**Purpose**: Foundation layer, screen backgrounds
**Color**: `colors.elevation0` → `colors.background`

**Usage:**

- ThemedView backgrounds
- Screen backgrounds
- Modal backgrounds
- Full-screen containers

**Examples:**

```typescript
// Screen background
<ThemedView style={{ backgroundColor: colors.background }}>

// Modal header
headerStyle: {
  backgroundColor: colors.background,
}
```

### Level 1 (elevation1) - Primary Surfaces

**Purpose**: Main content surfaces, cards
**Color**: `colors.elevation1` → `colors.card`

**Usage:**

- Cards (BaseCard, ArticleCard)
- Input fields
- Chart empty/loading states
- Button backgrounds (inactive)
- Modal content areas

**Examples:**

```typescript
// BaseCard
<BaseCard style={{ backgroundColor: colors.card }}>

// Input field
<ThemedInput style={{ backgroundColor: colors.elevation1 }}>

// Chart empty state (inside BaseCard)
<View style={{ backgroundColor: colors.elevation1 }}>
```

### Level 2 (elevation2) - Raised Surfaces

**Purpose**: Interactive elements, elevated states
**Color**: `colors.elevation2`

**Usage:**

- Cards inside modals (raised above modal background)
- Active/selected states
- Interactive elements on cards
- Icon containers in cards
- Raised buttons

**Examples:**

```typescript
// Modal option cards
<TouchableOpacity style={{ backgroundColor: colors.elevation2 }}>

// Active button state
<ThemedButton style={{
  backgroundColor: isActive ? colors.elevation2 : colors.elevation1
}}>
```

### Level 3 (elevation3) - Floating Surfaces

**Purpose**: Floating elements, overlays
**Color**: `colors.elevation3`

**Usage:**

- Tooltips
- Toast messages (default type)
- Floating action buttons
- Chart tooltips
- Dropdown overlays

**Examples:**

```typescript
// Tooltip
<View style={{ backgroundColor: colors.elevation3 }}>

// Toast message
const backgroundColor = type === 'default'
  ? colors.elevation3
  : colors.success; // Semantic colors override for specific types
```

## Implementation Guidelines

### 1. **Component Hierarchy Rules**

```
Modal Structure Example:
├── Modal Background: elevation0 (colors.background)
│   ├── Header: elevation0 (same as modal)
│   ├── Content Cards: elevation2 (raised above modal)
│   └── Floating Tooltip: elevation3 (above everything)
```

### 2. **Common Patterns**

#### **Cards in Lists**

```typescript
// Article cards in lists
<BaseCard>
  {' '}
  // Uses elevation1 automatically
  <ArticleContent />
</BaseCard>
```

#### **Cards in Modals**

```typescript
// Modal with option cards
<Modal style={{ backgroundColor: colors.background }}>
  {' '}
  // elevation0
  <TouchableOpacity style={{ backgroundColor: colors.elevation2 }}>
    {' '}
    // elevation2
    <OptionContent />
  </TouchableOpacity>
</Modal>
```

#### **Interactive States**

```typescript
// Button with state-based elevation
<ThemedButton style={{
  backgroundColor: isPressed
    ? colors.elevation2  // Raised when pressed
    : colors.elevation1  // Normal state
}}>
```

### 3. **Chart Components**

Charts follow a specific pattern:

- **Chart container**: Uses BaseCard (elevation1)
- **Chart content**: Inherits from container (elevation1)
- **Empty/loading states**: Match container (elevation1)
- **Chart tooltips**: Float above (elevation3)

### 4. **Toast Messages**

Toast messages use semantic colors for specific types, elevation3 for default:

```typescript
const backgroundColor = useMemo(() => {
  switch (type) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.error;
    case 'warning':
      return colors.warning;
    default:
      return colors.elevation3; // Default floating elevation
  }
}, [type, colors]);
```

## Color Definitions

The elevation colors are defined in `constants/Colors.ts`:

```typescript
const elevation = {
  light: {
    level0: basePalette.sage.lighter, // Background
    level1: basePalette.pure.white, // Cards (green-tinted white)
    level2: basePalette.sage.lightest, // Raised elements
    level3: basePalette.sage.lighter, // Floating elements
  },
  dark: {
    level0: basePalette.sage.darkest, // Background
    level1: basePalette.sage.dark, // Cards
    level2: basePalette.sage.mediumDark, // Raised elements
    level3: basePalette.sage.medium, // Floating elements
  },
};
```

## Visual Depth vs Surface Hierarchy

**Important**: Don't confuse elevation colors with visual shadows:

- **Elevation colors**: Define surface hierarchy and relationships
- **Visual shadows**: Create depth perception using `LAYOUT.ELEVATION`

```typescript
// Correct: Use both elevation color AND shadow for cards
<BaseCard
  style={{
    backgroundColor: colors.elevation1,  // Surface hierarchy
    ...LAYOUT.ELEVATION.SMALL           // Visual depth
  }}
>
```

## Common Mistakes to Avoid

### ❌ **Wrong: Skipping Elevation Levels**

```typescript
// Don't jump from elevation0 to elevation2
<Modal style={{ backgroundColor: colors.elevation0 }}>
  <Card style={{ backgroundColor: colors.elevation2 }}> // Skip level1
```

### ❌ **Wrong: Using Background for Card Content**

```typescript
// Don't use background color inside cards
<BaseCard> // elevation1
  <View style={{ backgroundColor: colors.background }}> // elevation0 - wrong!
```

### ❌ **Wrong: Inconsistent Modal Hierarchy**

```typescript
// Don't use same elevation for modal and its cards
<Modal style={{ backgroundColor: colors.elevation1 }}>
  <Card style={{ backgroundColor: colors.elevation1 }}> // Same level - wrong!
```

### ✅ **Correct: Proper Hierarchy**

```typescript
// Correct elevation progression
<Modal style={{ backgroundColor: colors.elevation0 }}>
  <Card style={{ backgroundColor: colors.elevation2 }}> // Raised above modal
    <Tooltip style={{ backgroundColor: colors.elevation3 }}> // Floating above card
```

## Testing Elevation

To verify correct elevation usage:

1. **Visual Test**: Components should have clear visual hierarchy
2. **Theme Test**: Switch between light/dark themes - hierarchy should remain clear
3. **Accessibility Test**: Ensure sufficient contrast at all elevation levels
4. **Consistency Test**: Similar components should use same elevation levels

## Migration Guide

When updating existing components:

1. **Identify the component's role** in the hierarchy
2. **Check parent component** elevation level
3. **Apply appropriate elevation** based on relationship
4. **Test visual hierarchy** in both themes
5. **Update any dependent styles** that reference the old colors

## Related Documentation

- [Colors System](./colors-system.md) - Base color palette and theming
- [Layout System](./layout-system.md) - Spacing, shadows, and visual depth
- [Component Guidelines](./component-guidelines.md) - Component-specific usage patterns
