/**
 * ArtIcon — a Lucide icon drawn at text size, in the text's colour. Used wherever an
 * option has "art" (the review quest's choices, badges, checklist categories…).
 * Icons, never phone emojis: one clean, mature style across the site.
 */
const ArtIcon = ({ icon: Icon, className = 'w-[1.1em] h-[1.1em]' }) =>
  Icon ? <Icon className={`inline-block shrink-0 ${className}`} strokeWidth={2} aria-hidden="true" /> : null;

export default ArtIcon;
