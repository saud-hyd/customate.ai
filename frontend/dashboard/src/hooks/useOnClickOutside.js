import { useEffect } from 'react';

/**
 * Hook that alerts when you click outside of the passed ref
 *
 * @param {React.RefObject} ref - Reference to the element to detect clicks outside of
 * @param {Function} handler - Function to call when a click outside is detected
 * @param {Array} excludeRefs - Array of refs to exclude from outside detection
 */
export function useOnClickOutside(ref, handler, excludeRefs = []) {
  useEffect(() => {
    // Return early if no handler provided
    if (!handler) {
      return;
    }
    
    const listener = (event) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      
      // Check if clicking on any excluded elements
      for (const excludeRef of excludeRefs) {
        if (excludeRef?.current?.contains(event.target)) {
          return;
        }
      }
      
      handler(event);
    };
    
    // Add event listeners
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      // Remove event listeners on cleanup
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, excludeRefs]);
}