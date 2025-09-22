# Performance Guidelines for R/HOOD App

## Navigation & Transitions

- [ ] Use a navigation system that runs native transitions by default (e.g. a native-stack or equivalent) rather than a JS-only stack.
- [ ] Turn on any built-in options to freeze or detach inactive screens so off-screen components don't re-render during transitions.
- [ ] Define a small set of transition styles (slide, fade, modal) at the navigation level and reuse them, rather than customising every screen individually.

## Animations

- [ ] Prefer an animation library that runs work on the UI thread (not the JS thread) for high-FPS performance.
- [ ] For simple fades/scales, use a built-in animation API with its "native driver" or equivalent setting.
- [ ] For more complex sequences or gestures, use a library that supports layout transitions and gesture callbacks natively.
- [ ] Create reusable animation patterns (enter, exit, shared element) and call them from your components, instead of embedding inline values in each screen.

## Performance Hygiene

- [ ] Postpone heavy computations or data fetching until after navigation/animations finish (e.g. run after interactions/transition complete).
- [ ] For large lists, use virtualisation and pre-calculate item layouts where possible.
- [ ] Prefetch and cache images and fonts for the next screen while the user is still on the current one.
- [ ] Show lightweight placeholders or skeletons while heavy content loads instead of blocking the UI.

## Visual & UX Consistency

- [ ] Keep transition durations and easing curves consistent across the app; store them in a theme or constants file.
- [ ] Use shared element or crossfade patterns for key flows (list → detail) to preserve context.
- [ ] Provide small haptic or visual cues at gesture thresholds to make interactions feel deliberate.

## Testing & Profiling

- [ ] Always test transitions in release mode to get real-world performance.
- [ ] Use the platform's performance monitor or equivalent to watch frame rates and identify jank.
- [ ] Profile animations to ensure they run as "worklets"/native animations, not on the JS thread.

## Implementation Status

### Completed
- ✅ Custom modal animations with native driver
- ✅ Menu drawer animations with native driver
- ✅ Audio player swipe gestures with native driver
- ✅ Consistent animation durations (200-300ms)
- ✅ Skeleton loading states for images

### In Progress
- 🔄 Optimizing large lists with FlatList
- 🔄 Implementing image prefetching
- 🔄 Adding haptic feedback

### Pending
- ⏳ Native navigation stack implementation
- ⏳ Screen freezing/detaching
- ⏳ Shared element transitions
- ⏳ Performance profiling setup
