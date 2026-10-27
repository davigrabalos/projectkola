import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Placeholder({ title }: { title: string }) {
  useDocumentTitle(title);
  return (
    <div className="container">
      <div className="page-head"><h1>{title}</h1><p>This page is coming soon.</p></div>
    </div>
  );
}
