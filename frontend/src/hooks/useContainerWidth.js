import { useEffect, useRef, useState } from 'react';

export default function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width || element.clientWidth || 0;
        setWidth(Math.round(w));
      }
    });
    ro.observe(element);
    return () => ro.disconnect();
  }, [ref.current]);

  return { ref, width };
}

