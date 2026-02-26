# Window Change Prevention System - Implementation Guide

## Overview
A comprehensive window/tab switching prevention system has been implemented for quiz and interview sessions to ensure focused, uninterrupted test-taking.

## Features Implemented

### 1. **Tab Switching Detection**
- Detects when user switches away from the application tab
- Uses Web Page Visibility API to detect tab changes
- Automatically attempts to refocus the window when user returns

### 2. **Window Focus Loss Detection**
- Detects Alt+Tab (Windows/Linux) and Cmd+Tab (Mac) attempts to switch applications
- Provides real-time warnings when focus is lost
- Automatically tries to regain window focus

### 3. **Keyboard Shortcut Prevention**
- **Alt+Tab** (Windows/Linux): Prevented
- **Cmd+Tab** (Mac): Prevented
- **Ctrl+W / Cmd+W**: Tab close prevention
- **F11**: Fullscreen toggle prevention (if not enabled)
- **Escape**: Fullscreen exit prevention (during active session)

### 4. **Fullscreen Enforcement**
- Optional fullscreen mode for maximum focus
- Attempts to prevent accidental fullscreen exit
- Cross-browser compatible (Chrome, Firefox, Safari, Edge)

### 5. **Session Warnings**
- Visual warning banner appears when tab switch is detected
- Shows number of warnings received
- Warns user if ≥3 tabs switches occurred (session may be flagged)
- Auto-dismisses after 4 seconds

### 6. **Before Unload Protection**
- Prevents users from closing the browser tab during active session
- Shows warning dialog if user tries to close/navigate away
- Tracks number of attempted exits

## Files Created/Modified

### New Files
- **`lib/useWindowChangeProtection.tsx`**: Core hook for all window protection logic

### Modified Files
- **`app/interview/ai/session/page.tsx`**:
  - Added window protection hook
  - Integrated fullscreen mode
  - Enhanced tab switch tracking
  
- **`app/aptitude/[section]/page.tsx`**:
  - Added window protection hook
  - Integrated fullscreen mode on quiz start
  - Added warning banner UI
  - Tab switch warning tracking

## Hook Usage

### Basic Setup
```tsx
import { useWindowChangeProtection } from '@/lib/useWindowChangeProtection';

export default function MyComponent() {
  const { enterFullscreen, exitFullscreen, isWindowBlurred, isFullscreen } = 
    useWindowChangeProtection({
      enabled: true,                    // Enable/disable protection
      showWarning: true,                // Show alerts on switches
      enableFullscreen: true,           // Allow fullscreen
      onWindowChange: () => {           // Callback when switch detected
        // Handle switch event
      },
      warningMessage: 'Custom message'  // Custom warning text
    });

  return (
    <button onClick={() => enterFullscreen()}>
      Start Fullscreen
    </button>
  );
}
```

### Configuration Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Activate/deactivate protection |
| `showWarning` | boolean | true | Show alert dialogs on violations |
| `enableFullscreen` | boolean | true | Allow fullscreen requests |
| `onWindowChange` | function | undefined | Callback on tab switch |
| `warningMessage` | string | Default message | Custom warning text |

### Return Values
```tsx
{
  isWindowBlurred: boolean,          // Is window currently blurred?
  isFullscreen: boolean,             // Is fullscreen active?
  enterFullscreen: () => Promise,    // Enter fullscreen
  exitFullscreen: () => Promise      // Exit fullscreen
}
```

## Implementation Details

### Interview Session (`app/interview/ai/session/page.tsx`)
- **Feature**: Window protection active during coding, voice, and follow-up phases
- **Disabled during**: Intro and completion phases
- **Fullscreen**: Enabled automatically on interview start
- **Warnings**: Shows custom message about returning to interview

### Aptitude Quiz (`app/aptitude/[section]/page.tsx`)
- **Feature**: Window protection active from quiz start until submission
- **Fullscreen**: User can enter fullscreen when clicking "Begin Quiz"
- **Warnings**: Shows tab switch count and flags session at ≥3 warnings
- **Sidebar**: Remains visible (can be hidden if needed)

## Detection Methods

### 1. Page Visibility API
```tsx
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // User switched tabs
  }
});
```

### 2. Window Focus Events
```tsx
window.addEventListener('blur', () => {
  // User switched windows (Alt+Tab, etc.)
});

window.addEventListener('focus', () => {
  // User returned to window
});
```

### 3. Keyboard Event Interception
```tsx
document.addEventListener('keydown', (e) => {
  if ((e.altKey && e.key === 'Tab') || 
      (e.metaKey && e.key === 'Tab')) {
    e.preventDefault();
  }
});
```

### 4. Fullscreen Change Detection
```tsx
document.addEventListener('fullscreenchange', () => {
  // Monitor fullscreen state changes
});
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Visibility API | ✅ | ✅ | ✅ | ✅ |
| Focus/Blur Events | ✅ | ✅ | ✅ | ✅ |
| Keyboard Prevention | ✅ | ✅ | ✅ | ✅ |
| Fullscreen | ✅ | ✅ | ✅ | ✅ |

## Limitations & Considerations

### What This System CAN'T Prevent
1. **Physical Alt+Tab** on some older Firefox versions
2. **System-level fullscreen exit** (might re-enter automatically)
3. **Multiple Monitor Switches** (detected but not preventable)
4. **Mobile Device Tab Switching** (different API constraints)
5. **Browser DevTools** toggling (can be worked around)

### What This System CAN Prevent
✅ Tab switching via normal browser UI
✅ Ctrl+W / Cmd+W tab close
✅ Alt+Tab / Cmd+Tab window switching
✅ Accidental fullscreen exit
✅ Unload/navigation attempts

## Session Tracking

### Tab Switch Warnings
- First switch: ⚠️ Warning shown, counter increments
- Second switch: ⚠️ Another warning
- Third switch: 🚨 Session flagged for review
- Session data sent to backend with `tab_switches` count

### Backend Integration (Future)
```tsx
// After session completes, send metrics
const sessionMetrics = {
  tab_switches: tabSwitches,
  session_flagged: tabSwitches >= 3,
  duration: sessionTime,
  // ... other metrics
};
```

## Customization Examples

### Strict Mode (Maximum Protection)
```tsx
useWindowChangeProtection({
  enabled: true,
  showWarning: true,
  enableFullscreen: false,  // No fullscreen option
  warningMessage: 'Leaving the test is not permitted.',
  onWindowChange: () => {
    // Auto-submit or end session
    handleSessionEnd();
  }
});
```

### Lenient Mode (Gentle Reminders)
```tsx
useWindowChangeProtection({
  enabled: true,
  showWarning: true,
  enableFullscreen: true,
  onWindowChange: () => {
    // Just track, don't enforce
    console.warn('User switched tabs');
  }
});
```

### Disabled Mode (Development/Testing)
```tsx
useWindowChangeProtection({
  enabled: false  // All protections disabled
});
```

## Testing Checklist

- [ ] Tab switch detected when switching away
- [ ] Warning banner appears and auto-dismisses
- [ ] Alt+Tab attempt prevented
- [ ] Ctrl+W prevented
- [ ] Fullscreen enter/exit works
- [ ] Window refocus attempts on return
- [ ] Quiz timer continues during tab switch
- [ ] Interview session continues during tab switch
- [ ] Mobile devices can still interact (if applicable)
- [ ] Session metrics recorded correctly

## Troubleshooting

### Warning Not Appearing
- Check browser console for errors
- Verify CSS class `warning-banner` has proper styling
- Ensure `showWarning` prop is `true`

### Fullscreen Not Working
- Some browsers require user gesture to enter fullscreen
- Check if browser permissions allow fullscreen
- Test in incognito mode (removes extensions)

### False Tab Switch Detections
- May occur on browser minimize
- Can happen with popup windows
- Intentional for strict enforcement

## Future Enhancements

- [ ] Camera/microphone monitoring for interview integrity
- [ ] AI-powered cheating detection
- [ ] Biometric verification
- [ ] Screen recording for evidence
- [ ] Mouse tracking analytics
- [ ] Eye-tracking (for supported devices)
- [ ] Network monitoring to detect suspicious activity

## Support & Questions

For issues or questions about the window protection system, refer to:
1. Browser console for JavaScript errors
2. Network tab for API calls
3. Application logs for session events
4. This documentation file

---

**Last Updated**: February 26, 2026
**Version**: 1.0
