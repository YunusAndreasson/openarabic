/**
 * Sentry severity levels used for error reporting
 * Excludes 'log' which is not typically used for errors
 */
export type ErrorSeverityLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warning';

/**
 * Error configuration for service operations
 * Used with executeQuery and executeAuthenticatedQuery
 */
export interface ServiceErrorConfig {
  toastMessage: string;
  analyticsEventName: string;
  sentrySeverity: ErrorSeverityLevel;
  showToast?: boolean;
  analyticsProperties?: Record<string, unknown>;
}

/**
 * Common CRUD operation types
 */
export type CrudOperation =
  'load' | 'add' | 'create' | 'update' | 'delete' | 'remove' | 'check' | 'fetch' | 'save';

/**
 * Options for customizing error configs
 */
interface ErrorConfigOptions {
  /**
   * Custom toast message (overrides default)
   */
  toastMessage?: string;

  /**
   * Custom analytics event name (overrides default)
   */
  analyticsEventName?: string;

  /**
   * Sentry severity level
   * @default 'error' for most operations, 'warning' for check/fetch
   */
  sentrySeverity?: ErrorSeverityLevel;

  /**
   * Whether to show toast notification
   * @default true for user-facing operations, false for background operations
   */
  showToast?: boolean;
}

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
): Omit<ServiceErrorConfig, 'analyticsProperties'> {
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
>(
  resourceName: string,
  operationsConfig: T,
): {
  [K in keyof T]: Omit<ServiceErrorConfig, 'analyticsProperties'>;
} {
  const configs = {} as {
    [K in keyof T]: Omit<ServiceErrorConfig, 'analyticsProperties'>;
  };

  for (const operation in operationsConfig) {
    if (Object.hasOwn(operationsConfig, operation)) {
      const op = operation as CrudOperation;
      configs[operation as keyof T] = createServiceErrorConfig(
        resourceName,
        op,
        operationsConfig[operation] as ErrorConfigOptions,
      );
    }
  }

  return configs;
}
