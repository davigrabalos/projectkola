import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useShortcut } from '../hooks/useShortcut';
import { brand } from '../brand/brand';
import { Icon } from './Icon';

interface Props {
  initialQ?: string;
  initialWhere?: string;
  onSearch: (q: string, where: string) => void;
  size?: 'lg';
}

/** The classic two-field "What / Where" search used by most job boards. */
export function SearchBar({ initialQ = '', initialWhere = '', onSearch, size }: Props) {
  const [q, setQ] = useState(initialQ);
  const [where, setWhere] = useState(initialWhere);
  useEffect(() => { setQ(initialQ); setWhere(initialWhere); }, [initialQ, initialWhere]);

  // "/" jumps to the search field (as on GitHub, YouTube, Gmail).
  const whatRef = useRef<HTMLInputElement>(null);
  useShortcut('/', (e) => { e.preventDefault(); whatRef.current?.focus(); whatRef.current?.select(); });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim(), where.trim());
  };

  return (
    <form className="search-bar glass" role="search" onSubmit={submit}>
      <label className="search-bar__field">
        <span className="visually-hidden">What</span>
        <Icon name="search" />
        <input ref={whatRef} className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={brand.voice.searchPlaceholderWhat} aria-keyshortcuts="/" />
        <kbd className="kbd search-bar__kbd" title="Press / to search" aria-hidden="true">/</kbd>
      </label>
      <label className="search-bar__field">
        <span className="visually-hidden">Where</span>
        <Icon name="pin" />
        <input className="input" type="search" value={where} onChange={(e) => setWhere(e.target.value)} placeholder={brand.voice.searchPlaceholderWhere} />
      </label>
      <button type="submit" className={`btn btn--primary${size === 'lg' ? ' btn--lg' : ''}`}>Search jobs</button>
    </form>
  );
}
