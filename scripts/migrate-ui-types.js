#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Map of type names to their new module locations
const typeMap = {
  // Base types
  BaseStyleProps: 'base.types',
  BaseAnimatedStyleProps: 'base.types',
  BaseThemedProps: 'base.types',
  BasePressableProps: 'base.types',
  BaseOptionalPressableProps: 'base.types',
  BaseChildrenProps: 'base.types',
  BaseAnimationProps: 'base.types',
  BasePillStyles: 'base.types',

  // Button types
  ButtonVariant: 'button.types',
  BaseButtonProps: 'button.types',
  FilledButtonProps: 'button.types',
  OutlinedButtonProps: 'button.types',
  ThemedButtonProps: 'button.types',

  // Card types
  BaseCardProps: 'card.types',
  CardVariant: 'card.types',
  ArticleCardProps: 'card.types',
  CompactCardProps: 'card.types',
  ThemedCardProps: 'card.types',

  // Pill types
  PillVariant: 'pill.types',
  BasePillProps: 'pill.types',
  FilterPillProps: 'pill.types',
  CategoryPillProps: 'pill.types',
  HorizontalCategoryPillProps: 'pill.types',
  PillProps: 'pill.types',
  FilterItem: 'pill.types',
  FilterListProps: 'pill.types',

  // Text types
  ThemedTextProps: 'text.types',
  AnimatedTextProps: 'text.types',

  // Layout types
  ThemedViewProps: 'layout.types',
  PageHeaderProps: 'layout.types',
  AnimatedItemProps: 'layout.types',
  CategoryPillsProps: 'layout.types',
  DailyPickSectionProps: 'layout.types',
  RelatedArticlesFooterProps: 'layout.types',
  RelatedArticlesSectionProps: 'layout.types',
  EntranceAnimationProps: 'layout.types',
  ArticleHeaderProps: 'layout.types',
  ArticleSentenceProps: 'layout.types',
  SectionTitleProps: 'layout.types',

  // Form types
  ThemedInputProps: 'form.types',
  ToggleProps: 'form.types',
  CustomSliderProps: 'form.types',

  // Loader types
  LoaderProps: 'loader.types',
  LoadingScreenProps: 'loader.types',
  LoadingContainerProps: 'loader.types',
  AppLoaderProps: 'loader.types',
  ProgressBarProps: 'loader.types',

  // Modal types
  ThemedModalProps: 'modal.types',
  WordTooltipProps: 'modal.types',

  // Image types
  EnhancedImageProps: 'image.types',

  // Other specialized components
  FloatingButtonProps: 'button.types',
  CloseButtonProps: 'button.types',
  SignInRequiredProps: 'layout.types',
  FilterNoticeProps: 'layout.types',
  ArabicWordProps: 'text.types',
  WordDisplayProps: 'text.types',
  EmptyStateProps: 'layout.types',
  ErrorStateProps: 'layout.types',
  StatCardProps: 'layout.types',
  InstructionFooterProps: 'layout.types',
  VocabularyStatsProps: 'layout.types',
  VocabularyEmptyStateProps: 'layout.types',
  ErrorMessageProps: 'layout.types',
  ReviewButtonProps: 'layout.types',
  MeaningOverlayProps: 'layout.types',
  WordReviewCardProps: 'layout.types',
  ReviewCardProps: 'layout.types',
  ReviewHeaderProps: 'layout.types',
};

// Find all TypeScript files in the components directory
function getTypeScriptFiles() {
  try {
    const result = execSync('find ./components -name "*.tsx" -o -name "*.ts"', {
      encoding: 'utf-8',
    });
    return result.trim().split('\n');
  } catch (error) {
    console.error('Error finding TypeScript files:', error);
    return [];
  }
}

// Process a single file to update imports
function updateImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let updatedContent = content;

  // Check if the file imports from ui.types.ts
  const importLineIndex = lines.findIndex(line => line.includes("from '@/types/ui.types'"));
  if (importLineIndex === -1) return false;

  const importLine = lines[importLineIndex];

  // Extract the types being imported
  const importMatch = importLine.match(
    /import\s+(?:{([^}]+)}|([^\s{]+))\s+from\s+['"]@\/types\/ui\.types['"]/
  );
  if (!importMatch) return false;

  const importedTypes = importMatch[1] || importMatch[2];
  const typesList = importedTypes.split(',').map(t => t.trim());

  // Group types by their target file
  const typesByTarget = {};
  typesList.forEach(type => {
    // Handle the case where type might have 'type' or 'as' keywords
    let cleanType = type;
    if (type.includes(' as ')) {
      cleanType = type.split(' as ')[0].trim();
    }
    if (type.includes(' type ')) {
      cleanType = type.split(' type ')[1].trim();
    }

    const targetFile = typeMap[cleanType] || 'index';
    if (!typesByTarget[targetFile]) {
      typesByTarget[targetFile] = [];
    }
    typesByTarget[targetFile].push(type);
  });

  // Create new import statements
  const newImports = Object.entries(typesByTarget).map(([targetFile, types]) => {
    return `import { ${types.join(', ')} } from '@/types/ui/${targetFile}';`;
  });

  // Replace the old import with the new imports
  updatedContent = updatedContent.replace(importLine, newImports.join('\n'));

  // Write the updated content back to the file
  fs.writeFileSync(filePath, updatedContent, 'utf-8');
  return true;
}

// Process all files
function updateAllFiles() {
  const files = getTypeScriptFiles();
  let updatedCount = 0;

  files.forEach(file => {
    try {
      const wasUpdated = updateImportsInFile(file);
      if (wasUpdated) {
        updatedCount++;
        console.log(`✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });

  console.log(`\nMigration complete. Updated ${updatedCount} files.`);
}

// Run the migration
updateAllFiles();
