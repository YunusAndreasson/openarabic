// Root barrel — the library is consumed via subpaths (/download, /stt) which
// each have their own mock below via moduleNameMapper. This file exists so
// that any future top-level imports don't blow up under Jest.
module.exports = { __esModule: true };
