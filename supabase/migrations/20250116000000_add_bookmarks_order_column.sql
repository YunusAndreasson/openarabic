-- Add order column to bookmarks table for user-defined ordering
ALTER TABLE bookmarks
ADD COLUMN order_index INTEGER;

-- Update existing bookmarks to have order based on added_at using a subquery
UPDATE bookmarks
SET order_index = sub.row_num
FROM (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY added_at ASC) as row_num
  FROM bookmarks
  WHERE order_index IS NULL
) sub
WHERE bookmarks.id = sub.id;

-- Create index for better performance on ordering queries
CREATE INDEX idx_bookmarks_user_order ON bookmarks(user_id, order_index);

-- Add comment for documentation
COMMENT ON COLUMN bookmarks.order_index IS 'User-defined order for bookmarks. Lower values appear first.';
