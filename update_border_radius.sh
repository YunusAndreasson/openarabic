#!/bin/bash
mkdir -p ./backups
update_file() { local file=$1; local backup_file="./backups/$(basename $file).bak"; cp "$file" "$backup_file"; sed -i "s/LAYOUT\.CARD\.BORDER_RADIUS\.SMALL/LAYOUT\.BORDER_RADIUS\.SMALL/g" "$file"; sed -i "s/LAYOUT\.CARD\.BORDER_RADIUS\.MEDIUM/LAYOUT\.BORDER_RADIUS\.MEDIUM/g" "$file"; sed -i "s/LAYOUT\.CARD\.BORDER_RADIUS\.LARGE/LAYOUT\.BORDER_RADIUS\.LARGE/g" "$file"; sed -i "s/LAYOUT\.BUTTON\.BORDER_RADIUS\.SMALL/LAYOUT\.BORDER_RADIUS\.SMALL/g" "$file"; sed -i "s/LAYOUT\.BUTTON\.BORDER_RADIUS\.MEDIUM/LAYOUT\.BORDER_RADIUS\.MEDIUM/g" "$file"; sed -i "s/LAYOUT\.BUTTON\.BORDER_RADIUS\.LARGE/LAYOUT\.BORDER_RADIUS\.XLARGE/g" "$file"; echo "Updated $file"; }
find . -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "LAYOUT\.CARD\.BORDER_RADIUS\|LAYOUT\.BUTTON\.BORDER_RADIUS" | while read file; do update_file "$file"; done
echo "All files updated. Backups stored in ./backups directory."
