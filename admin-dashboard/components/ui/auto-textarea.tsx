import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 2, value, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to recalculate
      textarea.style.height = '0px';

      // Set to scrollHeight (content height) with padding
      const newHeight = textarea.scrollHeight;
      textarea.style.height = `${newHeight}px`;
    }, []);

    // Adjust on mount and when value changes
    React.useLayoutEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    };

    return (
      <textarea
        ref={(node) => {
          textareaRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{
          minHeight: `${minRows * 1.5}rem`,
          resize: 'none',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

AutoTextarea.displayName = 'AutoTextarea';

export { AutoTextarea };
