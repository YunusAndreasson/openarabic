# Code Guideline Violations

The previously listed `app/` files have been refactored to use shared string constants and layout values.

All outstanding component and hook violations have been addressed.

## Issues found in `utils/`

The following utility file includes hard-coded strings or inline error messages that should reference the shared constants:

- `utils/bumpVersion.js` – CLI logs and error text defined inline
