import { useEffect } from 'react';
import { pageTitle } from '../brand/brand';

export function useDocumentTitle(title?: string) {
  useEffect(() => { document.title = pageTitle(title); }, [title]);
}
