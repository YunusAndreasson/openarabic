# ThemedText Usage Statistics

This document tracks the usage of ThemedText types across the codebase to help identify patterns and ensure consistent typography.

## Current Usage

As of 2025-03-20, ThemedText is used consistently across the codebase:

| Type       | Description          | Usage Count | Primary Use Cases                  |
| ---------- | -------------------- | ----------- | ---------------------------------- |
| `body`     | Standard body text   | -           | General content, article text      |
| `bodyBold` | Bold body text       | -           | Emphasized content                 |
| `heading1` | Large heading        | -           | Page titles                        |
| `heading2` | Medium heading       | -           | Section headers                    |
| `heading3` | Small heading        | -           | Subsection headers                 |
| `caption`  | Small text           | -           | Supporting information, timestamps |
| `label`    | Small semi-bold text | -           | Form labels, list items            |
| `overline` | Tiny uppercase text  | -           | Category labels, metadata          |
| `link`     | Clickable text       | -           | Links and interactive text         |
| `arabic`   | Arabic text          | -           | Arabic language content            |

## Variant Usage

| Variant     | Description            | Usage Count | Primary Use Cases               |
| ----------- | ---------------------- | ----------- | ------------------------------- |
| `error`     | Error messages         | -           | Form validation, alerts         |
| `warning`   | Warning messages       | -           | Notices, cautionary information |
| `success`   | Success messages       | -           | Confirmation messages           |
| `info`      | Informational messages | -           | Tips, helpful information       |
| `primary`   | Primary text           | -           | Main content                    |
| `secondary` | Secondary text         | -           | Supporting content              |
| `subtle`    | Subtle text            | -           | Less important information      |
| `disabled`  | Disabled text          | -           | Inactive options                |

## Usage by File Type

- Screen components: 6
- Reusable UI components: 30
- Modal components: 2
- Header components: 2

## Legacy Types Usage

These types are deprecated and should be migrated to their newer equivalents:

| Legacy Type       | New Type   | Remaining Usage Count |
| ----------------- | ---------- | --------------------- |
| `default`         | `body`     | -                     |
| `title`           | `heading1` | -                     |
| `subtitle`        | `heading2` | -                     |
| `defaultSemiBold` | `bodyBold` | -                     |

## Common Patterns

- Most common combinations:
- Frequently customized styles:

## Recommendations

Based on the current usage statistics, consider:

1. **Standardizing typography**: [recommendations based on usage patterns]
2. **Reducing custom styles**: [suggestions for reducing one-off styling]
3. **Improving consistency**: [areas where consistency could be improved]

Last updated: 2025-03-20
