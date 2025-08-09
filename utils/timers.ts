export function clearTimeoutRef(ref: { current: ReturnType<typeof setTimeout> | null }): void {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}
