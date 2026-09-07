# Known issues

## Hydration mismatch warning in Chrome on iOS

**Symptom:** In dev mode, visiting a page with a form (e.g. `/t/[slug]/round/[round]/register`) in Chrome on iOS shows the Next.js error overlay with:

> A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.

The diff points at an `<input>` (or the root `<html>` tag) with extra attributes like `__gcrremoteframetoken` and `__gcruniqueid`.

**Cause:** Chrome for iOS injects these attributes into the DOM itself (`gcr` = Google Chrome Remote — related to its built-in remote-debugging/instrumentation hooks). It happens on any page with an input element, in incognito too, and does not happen in Safari on iOS. It is not caused by anything in this app's code.

**Impact:** Dev-only visually — the red error overlay is a Next.js dev feature and never renders in production. The underlying DOM injection happens in prod too, but it only produces a `console.error` in devtools; it doesn't affect functionality or rendering. Not something to fix.
