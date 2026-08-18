import type { ErrorOptions, ErrorSeverityLevel } from '@/utils/errorHandling';

/**
 * What this factory produces: a ready-to-pass `executeQuery` config with the
 * four fields it decides, all of them settled (no optionals to re-default
 * downstream).
 *
 * Built from `ErrorOptions` so it cannot describe a field `handleError` does
 * not understand. It replaced a hand-written `ServiceErrorConfig` whose only
 * appearance anywhere was inside `Omit<ServiceErrorConfig, 'analyticsProperties'>`
 * — the omitted field was typed `Record<string, unknown>`, incompatible with
 * the `Record<string, boolean | number | string>` every consumer actually
 * wanted, which is precisely why every use had to omit it.
 */
type ServiceErrorConfig = Required<
  Pick<ErrorOptions, 'toastMessage' | 'analyticsEventName' | 'sentrySeverity' | 'showToast'>
>;

/**
 * Common CRUD operation types
 */
export type CrudOperation =
  'load' | 'add' | 'create' | 'update' | 'delete' | 'remove' | 'check' | 'fetch' | 'save';

/**
 * Per-operation overrides. Same four fields as {@link ServiceErrorConfig}, all
 * optional — each one falls back to a default derived from the resource name
 * and the operation:
 *
 * - `toastMessage` — "Failed to {operation} {resource}"
 * - `analyticsEventName` — `Resource_Name_Operation_Error`
 * - `sentrySeverity` — 'warning' for check/fetch, 'error' otherwise
 * - `showToast` — false for check/fetch, true otherwise
 */
type ErrorConfigOptions = Partial<ServiceErrorConfig>;

/**
 * Factory function to create standardized error configs for service operations
 *
 * @param resourceName - Name of the resource (e.g., 'reading_list', 'vocabulary_stats')
 * @param operation - CRUD operation type
 * @param options - Optional customization
 *
 * @example
 * ```ts
 * const errorConfig = {
 *   readingList: {
 *     load: createServiceErrorConfig('reading_list', 'load', {
 *       toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS,
 *     }),
 *     add: createServiceErrorConfig('reading_list', 'add', {
 *       toastMessage: STRINGS.FAILED_TO_ADD_TO_READING_LIST,
 *     }),
 *     check: createServiceErrorConfig('reading_list', 'check', {
 *       toastMessage: STRINGS.FAILED_TO_CHECK_READING_LIST_STATUS,
 *       showToast: false, // Silent check
 *     }),
 *   },
 * };
 * ```
 */
export function createServiceErrorConfig(
  resourceName: string,
  operation: CrudOperation,
  options: ErrorConfigOptions = {},
): ServiceErrorConfig {
  // Convert resource_name to ResourceName for analytics
  const analyticsResourceName = resourceName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');

  // Convert operation to Title_Case for analytics
  const analyticsOperation = operation.charAt(0).toUpperCase() + operation.slice(1).toLowerCase();

  // Default analytics event name: Resource_Name_Operation_Error
  const defaultAnalyticsEventName = `${analyticsResourceName}_${analyticsOperation}_Error`;

  // Default toast message: "Failed to {operation} {resource}"
  const defaultToastMessage = `Failed to ${operation} ${resourceName.replace(/_/g, ' ')}`;

  // Default severity: 'warning' for check/fetch, 'error' for others
  const defaultSeverity: ErrorSeverityLevel =
    operation === 'check' || operation === 'fetch' ? 'warning' : 'error';

  // Default showToast: false for check/fetch, true for others
  const defaultShowToast = operation !== 'check' && operation !== 'fetch';

  return {
    toastMessage: options.toastMessage ?? defaultToastMessage,
    analyticsEventName: options.analyticsEventName ?? defaultAnalyticsEventName,
    sentrySeverity: options.sentrySeverity ?? defaultSeverity,
    showToast: options.showToast ?? defaultShowToast,
  };
}

/**
 * Batch create error configs for multiple operations on the same resource
 *
 * @example
 * ```ts
 * const errorConfig = {
 *   readingList: createServiceErrorConfigs('reading_list', {
 *     load: { toastMessage: STRINGS.FAILED_TO_LOAD_BOOKMARKS },
 *     add: { toastMessage: STRINGS.FAILED_TO_ADD_TO_READING_LIST },
 *     remove: { toastMessage: STRINGS.FAILED_TO_REMOVE_FROM_READING_LIST },
 *     check: { toastMessage: STRINGS.FAILED_TO_CHECK_READING_LIST_STATUS, showToast: false },
 *   }),
 * };
 * ```
 */
export function createServiceErrorConfigs<
  T extends Partial<Record<CrudOperation, ErrorConfigOptions>>,
>(resourceName: string, operationsConfig: T): { [K in keyof T]: ServiceErrorConfig } {
  const configs = {} as { [K in keyof T]: ServiceErrorConfig };

  // Keys are narrowed once, here, rather than each use casting itself back:
  // `for...in` widens the key to `string`, which is what forced the previous
  // `as CrudOperation` / `as ErrorConfigOptions` pair — two assertions that
  // would have kept compiling had the generic's constraint been loosened.
  const operations = Object.keys(operationsConfig) as (keyof T & CrudOperation)[];

  for (const operation of operations) {
    configs[operation] = createServiceErrorConfig(
      resourceName,
      operation,
      operationsConfig[operation],
    );
  }

  return configs;
}
