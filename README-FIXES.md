# V2 Fix Pack
Replacements: db.js, service-worker.js, manifest.webmanifest.

Important app.js fixes to apply with Copilot:
1. Use `remaining` consistently for batch stock.
2. OUT must consume FEFO batches, including multiple batches when needed.
3. Never allow negative stock.
4. Deleting OUT must restore the exact batch.
5. Use local YYYY-MM-DD instead of `toISOString()` for user-facing dates.
6. Add edit-item workflow.
7. Validate and sanitize imported/user data.
8. Guard missing DOM elements.
9. Keep IndexedDB schema version 3.
10. Register the service worker from the app.
