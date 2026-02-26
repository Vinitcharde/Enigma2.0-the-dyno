import { useEffect, useRef, useCallback } from 'react';

interface UseWindowChangeProtectionOptions {
  enabled?: boolean;
  showWarning?: boolean;
  enableFullscreen?: boolean;
  onWindowChange?: () => void;
  warningMessage?: string;
}

export const useWindowChangeProtection = (options: UseWindowChangeProtectionOptions = {}) => {
  const {
    enabled = true,
    showWarning = true,
    enableFullscreen = true,
    onWindowChange,
    warningMessage = 'You cannot leave during the quiz/interview. Please return to complete it.',
  } = options;

  const windowBlurredRef = useRef(false);
  const isFullscreenRef = useRef(false);

  // Handle beforeunload - prevent tab/window closing
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.returnValue = warningMessage;
    return warningMessage;
  }, [enabled, warningMessage]);

  // Handle visibility change - detect tab switch
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;

    if (document.hidden) {
      windowBlurredRef.current = true;
      onWindowChange?.();
      if (showWarning) {
        alert(warningMessage);
      }
      // Try to refocus the window
      window.focus();
    } else {
      windowBlurredRef.current = false;
    }
  }, [enabled, showWarning, onWindowChange, warningMessage]);

  // Handle window blur - detect Alt+Tab or window switch
  const handleWindowBlur = useCallback(() => {
    if (!enabled) return;
    windowBlurredRef.current = true;
    onWindowChange?.();
  }, [enabled, onWindowChange]);

  // Handle window focus - return to focused
  const handleWindowFocus = useCallback(() => {
    if (!enabled) return;
    if (windowBlurredRef.current) {
      if (showWarning) {
        alert('You left the quiz/interview window. Please stay focused.');
      }
    }
    windowBlurredRef.current = false;
  }, [enabled, showWarning]);

  // Handle keyboard shortcuts (prevent Alt+Tab, Cmd+Tab, etc.)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Alt+Tab (Windows/Linux)
    if ((e.altKey && e.key === 'Tab') || (e.altKey && e.code === 'Tab')) {
      e.preventDefault();
      if (showWarning) {
        alert('Tab switching is not allowed during quiz/interview.');
      }
      return false;
    }

    // Cmd+Tab (Mac)
    if ((e.metaKey && e.key === 'Tab') || (e.metaKey && e.code === 'Tab')) {
      e.preventDefault();
      if (showWarning) {
        alert('Tab switching is not allowed during quiz/interview.');
      }
      return false;
    }

    // Ctrl+W or Cmd+W (close tab)
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (showWarning) {
        alert(warningMessage);
      }
      return false;
    }

    // F11 (fullscreen toggle)
    if (e.key === 'F11' && !enableFullscreen) {
      e.preventDefault();
      if (showWarning) {
        alert('Fullscreen toggle is not allowed. Click the fullscreen button to enable it.');
      }
      return false;
    }

    // Prevent Esc key from exiting fullscreen
    if (e.key === 'Escape' && isFullscreenRef.current) {
      e.preventDefault();
      if (showWarning) {
        alert('Cannot exit fullscreen mode during quiz/interview.');
      }
      return false;
    }
  }, [enabled, showWarning, enableFullscreen, warningMessage]);

  // Function to enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        isFullscreenRef.current = true;
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
        isFullscreenRef.current = true;
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
        isFullscreenRef.current = true;
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
        isFullscreenRef.current = true;
      }
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }
  }, []);

  // Function to exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen?.();
      } else if ((document as any).mozFullScreenElement) {
        await (document as any).mozCancelFullScreen?.();
      } else if ((document as any).msFullscreenElement) {
        await (document as any).msExitFullscreen?.();
      }
      isFullscreenRef.current = false;
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
    }
  }, []);

  // Handle fullscreen change
  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    if (!isCurrentlyFullscreen && isFullscreenRef.current) {
      if (showWarning && enabled) {
        alert('Cannot exit fullscreen mode during quiz/interview.');
      }
      // Try to re-enter fullscreen
      enterFullscreen();
    }
  }, [showWarning, enabled, enterFullscreen]);

  // Mouse leave detection
  const handleMouseLeave = useCallback(() => {
    if (!enabled) return;
    // Optionally handle when mouse leaves the window
    // This can be useful for detection but won't prevent actual window switching
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [
    enabled,
    handleBeforeUnload,
    handleVisibilityChange,
    handleWindowBlur,
    handleWindowFocus,
    handleKeyDown,
    handleFullscreenChange,
    handleMouseLeave,
  ]);

  return {
    isWindowBlurred: windowBlurredRef.current,
    isFullscreen: isFullscreenRef.current,
    enterFullscreen,
    exitFullscreen,
  };
};
