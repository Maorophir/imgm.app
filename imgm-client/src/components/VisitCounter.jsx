/**
 * VisitCounter — tells IMGM's own visitor counter about each page view (the server's
 * lib/visits.js, shown on /admin's Visitors tab). Renders nothing.
 *
 * What it sends, and nothing else: the page (ids collapsed, so /game/:id, no query), the
 * site the visit came from (its host only, with the first page of a visit) and whether
 * this is a phone, a tablet or a computer. No cookies and no storage: the server
 * recognises a visitor only within a day, without keeping their address.
 *
 * Browsers that ask not to be tracked (Do Not Track, Global Privacy Control) send
 * nothing, and neither do browsers driven by a script (navigator.webdriver).
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE } from '../lib/api';

const optedOut = () =>
  navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;

// The page as the counter keeps it (the server collapses it again: it trusts no one)
const pagePath = (pathname) =>
  pathname
    .toLowerCase()
    .replace(/^\/game\/[^/]+/, '/game/:id')
    .replace(/^\/u\/[^/]+/, '/u/:name')
    .replace(/^\/compare\/[^/]+/, '/compare/:name');

// A touch screen's short side tells a phone from a tablet; anything with a mouse is a computer
const deviceKind = () => {
  if (!window.matchMedia('(pointer: coarse)').matches) return 'computer';
  return Math.min(window.screen.width, window.screen.height) < 600 ? 'phone' : 'tablet';
};

// The site a visit came from: only its host, and nothing when it's IMGM itself
const referrerHost = () => {
  try {
    const host = new URL(document.referrer).hostname;
    return host === window.location.hostname ? '' : host;
  } catch {
    return '';
  }
};

export default function VisitCounter() {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (optedOut() || navigator.webdriver || pathname.startsWith('/admin')) return;
    const body = { path: pagePath(pathname), device: deviceKind() };
    // Every page after the first in a visit still has the same document.referrer, so
    // only the page a visit landed on says where it came from
    if (first.current) {
      first.current = false;
      const referrer = referrerHost();
      if (referrer) body.referrer = referrer;
    }
    // keepalive: a view counts even if the page is left at once. No credentials: the
    // counter doesn't care who's logged in.
    fetch(`${API_BASE}/api/visits`, {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
