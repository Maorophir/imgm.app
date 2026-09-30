/**
 * MarqueeText — one line of text, cut with "…" when it's too long for its box.
 * Hover over it and it immediately slides to show the rest, pauses at the end,
 * then slides back. Text that fits never moves. With "reduce motion" turned on it
 * stays cut with "…" (the full text is in the tooltip).
 */
import { useState, useEffect, useRef } from 'react';

const SPEED = 25; // pixels per second — slow enough to read

const MarqueeText = ({ text, className = '' }) => {
  const boxRef = useRef(null);
  // How many pixels of text don't fit (0 = it fits, nothing to slide)
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    // ResizeObserver measures after layout (and again if the box changes size).
    // scrollWidth = full text width, clientWidth = the visible box.
    const box = boxRef.current;
    const observer = new ResizeObserver(() => {
      const hidden = box.scrollWidth - box.clientWidth;
      setOverflow(hidden > 1 ? hidden : 0);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [text]);

  return (
    // group/marquee: the inner text reacts to hovering this box
    <span
      ref={boxRef}
      className={`group/marquee block min-w-0 overflow-hidden whitespace-nowrap text-ellipsis ${className}`}
      title={text}
    >
      <span
        // At rest: plain inline text, so "…" shows. On hover: an inline-block that slides.
        className={overflow
          ? 'inline group-hover/marquee:inline-block group-hover/marquee:animate-marquee motion-reduce:group-hover/marquee:inline motion-reduce:group-hover/marquee:animate-none'
          : 'inline'}
        style={overflow ? {
          '--marquee-shift': `-${overflow}px`,
          // Each slide is 40% of the loop (there and back = 80%, pauses = 20%),
          // so the loop is 2.5 × one slide — the speed stays the same for any length
          '--marquee-duration': `${Math.max(3, (overflow / SPEED) * 2.5).toFixed(2)}s`,
        } : undefined}
      >
        {text}
      </span>
    </span>
  );
};

export default MarqueeText;
