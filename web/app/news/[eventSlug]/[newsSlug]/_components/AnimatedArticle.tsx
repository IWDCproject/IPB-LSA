'use client';

import { useEffect, useRef } from 'react';
import styles from '../NewsDetail.module.css';

export default function AnimatedArticle({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Small rAF delay so the browser has painted before we trigger animations
    requestAnimationFrame(() => {
      el.setAttribute('data-ready', 'true');
    });
  }, []);

  return (
    <article ref={ref} className={styles.article}>
      {children}
    </article>
  );
}