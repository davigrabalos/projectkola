import { brand } from '../brand/brand';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// TODO: employer dashboard and job posting flow.
export default function Employers() {
  useDocumentTitle('For employers');
  return (
    <div className="container">
      <div className="page-head">
        <span className="eyebrow">For employers</span>
        <h1>Hire with {brand.name}</h1>
        <p>Post a job and reach candidates who fit your team. Employer tools are coming soon.</p>
      </div>
      <a href={`mailto:${brand.contact.email}`} className="btn btn--primary">Talk to us</a>
    </div>
  );
}
