/**
 * RichText — the guide writes *italic* game titles; show them as real emphasis
 * instead of raw asterisks.
 */
const RichText = ({ text }) =>
  text.split(/(\*[^*\n]+\*)/).map((part, i) =>
    part.length > 2 && part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part
  );

export default RichText;
