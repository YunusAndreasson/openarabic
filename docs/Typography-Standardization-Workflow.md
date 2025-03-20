# Typography Standardization Workflow

This document outlines the recommended workflow for standardizing typography across the codebase using the `ThemedText` component.

## Overview

Our application uses a typography system centered around the `ThemedText` component, which ensures consistent text styling across the app. This workflow helps teams progressively migrate to and maintain this typography system.

## Workflow Steps

### 1. Analyze Current Typography Usage

**Goal:** Understand the current state of typography in the codebase.

**Actions:**

- Run the statistics script: `node scripts/update-themedtext-stats.js`
- Review the updated `docs/ThemedText-Usage-Stats.md` file
- Identify inconsistencies and patterns in text styling

### 2. Establish Typography Guidelines

**Goal:** Define clear guidelines for typography usage.

**Actions:**

- Review `docs/ThemedText-Usage.md` for existing guidelines
- For each text purpose (headings, body text, labels, etc.), identify the appropriate text type
- Document any exceptions or special cases
- Update the guidelines if necessary

### 3. Identify Migration Candidates

**Goal:** Find components that need to be migrated to `ThemedText`.

**Actions:**

- Use `scripts/convert-to-themed-text.js` to identify `Text` components
- Prioritize components based on visibility and usage
- Create tickets for migration work
- Assign priority levels based on impact

### 4. Implement Migrations

**Goal:** Convert direct `Text` usage to `ThemedText`.

**Actions:**

- For each component, replace direct `Text` usage with `ThemedText`
- Map existing styles to the appropriate text type and variant
- Use the ESLint rule to catch any missed instances
- Update component tests

### 5. Monitor and Measure Progress

**Goal:** Track the adoption of the typography system.

**Actions:**

- Regularly run the statistics script
- Compare current stats with previous runs
- Identify areas of improvement
- Share progress with the team

### 6. Continuous Improvement

**Goal:** Refine the typography system based on usage.

**Actions:**

- Review the most common usage patterns
- Consider condensing rarely used text types
- Address any pain points reported by developers
- Update guidelines and documentation as needed

## Success Criteria

The typography standardization can be considered successful when:

1. All direct `Text` usage has been replaced with `ThemedText`
2. The number of custom text styles has been minimized
3. Text appearance is consistent across the app
4. Developers can easily choose the appropriate text type for new components

## Best Practices

- Avoid creating new text types; use existing ones when possible
- Use semantic variants (`error`, `success`, etc.) for meaningful text coloring
- Keep custom styling to a minimum
- Follow the PR template in `docs/ThemedText-PR-TEMPLATE.md` when submitting changes
- Run the statistics script before and after significant changes to measure impact
