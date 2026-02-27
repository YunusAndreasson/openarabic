# Arabic Text Handling

## Single-Word Color-Coding Rule (CRITICAL)

- **CRITICAL**: Single English words should NEVER have grammar color-coding applied
- Color-coding is only educational when showing how multi-word phrases are constructed from Arabic components
- **Always check**: `text.trim().split(/\s+/).length === 1` before applying color analysis
- Single words should display in standard text color regardless of Arabic analysis results
- This prevents misleading educational cues and maintains clarity

## Grammar Color Palette

The grammar color family uses **12 perceptually distinct colors** in OKLCH color space:

| Hue  | Role                | Usage                                     |
| ---- | ------------------- | ----------------------------------------- |
| 65°  | Definite Article    | `grammar.definiteArticle`                 |
| 90°  | Prepositions        | `grammar.preposition` (highest frequency) |
| 110° | Particles           | `grammar.particle`                        |
| 125° | Negation            | `grammar.negation`                        |
| 140° | Plural markers      | `grammar.plural`                          |
| 155° | Possessive pronouns | `grammar.possessive` (high frequency)     |
| 170° | Verb Conjugation    | `grammar.verbConjugation`                 |
| 185° | Interrogative       | `grammar.interrogative`                   |
| 200° | Demonstrative       | `grammar.demonstrative`                   |
| 225° | Subject Prefix      | `grammar.subjectPrefix`                   |
| 250° | Conjunctions        | `grammar.conjunction`                     |
| 270° | Future Tense        | `grammar.futureTense`                     |

## Component Type Configuration

Dual-layer color system:

```typescript
// Layer 1: Component Type (structural)
COMPONENT_TYPE_CONFIG = {
  PREFIX: { colorName: 'tint', icon: '→' },
  INFIX: { colorName: 'violet', icon: '↔' },
  SUFFIX: { colorName: 'warning', icon: '←' },
  DIACRITIC: { colorName: 'accent', icon: '◌' },
};

// Layer 2: Grammatical Role (semantic)
GRAMMATICAL_ROLE_COLORS = {
  CONJUNCTION: 'grammar.conjunction',
  PREPOSITION: 'grammar.preposition',
  POSSESSIVE: 'grammar.possessive',
  // ... 12 total grammatical roles
};
```

**Priority:** If a component has a role, the role-based color is used. Otherwise, type-based color is fallback.

## Color Resolution

**Color name format:** `'grammar.{roleName}'` or flat colors like `'tint'`, `'warning'`, `'accent'`

**Theme Adaptation:**

- Same hue for all three themes (light, dark, sepia)
- Lightness adjusted per theme for visibility

## Diacritic Color Inheritance

Diacritics (vowel markings) inherit colors from their parent components:

- Diacritics after suffixes inherit suffix color
- Diacritics after prefixes inherit last prefix color

## Key Files

- `constants/arabicWordComponents.ts` - Comprehensive Arabic language rules
- `utils/colorResolution.ts` - Color name resolution logic
- `utils/arabicAnalysis/colorSegments.ts` - Reconstructs colored segments
- `components/common/ColorCodedText.tsx` - Renders color-coded text
