import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { brand } from '../brand/brand';
import { useJob } from '../hooks/useData';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Icon } from '../components/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import NotFound from './NotFound';
import { api } from '../lib/api';
import { uuid } from '../lib/uuid';
import { Sk } from '../components/Skeleton';
import { useDelayedFlag } from '../hooks/useDelayedFlag';

type Errors = Partial<Record<'name' | 'email' | 'cv', string>>;

/** Two-step application: details, then review. Keeps the job in view so users know what they're applying for. */
export default function Apply() {
  const { id = '' } = useParams();
  const { data: job, isLoading } = useJob(id);
  const company = job?.company;
  useDocumentTitle(job ? `Apply: ${job.title}` : isLoading ? 'Loading job' : 'Job not found');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', linkedin: '', cover: '' });
  const [cv, setCv] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  // One idempotency key per application, made when the user starts it and reused on every retry.
  const [idempotencyKey] = useState(uuid);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const showSkeleton = useDelayedFlag(isLoading);

  if (isLoading) {
    return showSkeleton ? (
      <div className="container" aria-busy="true"><div className="form-page is-skeleton">
        <div className="page-head"><h1><Sk w="70%" /></h1><p><Sk w="35%" /></p></div>
        <div className="card" style={{ height: 420 }} />
      </div></div>
    ) : null;
  }
  if (!job) return <NotFound />;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (submitting) return; // ignore double clicks while the request runs
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitApplication(
        { jobId: job.id, ...form, cvFileName: cv?.name },
        idempotencyKey,
      );
      setStep(3);
    } catch {
      setSubmitError("We couldn't send your application. Your details are kept, so you can try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!form.name.trim()) errs.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Please enter a valid email address.';
    if (!cv) errs.cv = 'Please attach your CV.';
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  return (
    <div className="container">
      <div className="form-page">
        <Breadcrumbs items={[{ label: 'Jobs', to: '/jobs' }, { label: job.title, to: `/jobs/${job.id}` }, { label: 'Apply' }]} />
        <div className="page-head">
          <span className="eyebrow">Application · step {step} of 3</span>
          <h1>Apply for {job.title}</h1>
          <p>{company?.name} · {job.location}</p>
        </div>
        <ol className="progress" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((s) => <li key={s} className={s <= step ? 'is-done' : ''} />)}
        </ol>

        {step === 1 && (
          <form className="card form-grid reveal" onSubmit={next} noValidate>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Your details</h2>
            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field__label">Full name *</span>
                <input className="input" value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} />
                {errors.name && <span className="field__error">{errors.name}</span>}
              </label>
              <label className="field">
                <span className="field__label">Email *</span>
                <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} />
                {errors.email && <span className="field__error">{errors.email}</span>}
              </label>
              <label className="field">
                <span className="field__label">Phone</span>
                <input className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </label>
              <label className="field">
                <span className="field__label">LinkedIn or portfolio</span>
                <input className="input" type="url" value={form.linkedin} onChange={set('linkedin')} placeholder="https://" />
              </label>
            </div>
            <label className="field">
              <span className="field__label">CV / Résumé *</span>
              <input className="input" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] ?? null)} aria-invalid={!!errors.cv} />
              <span className="field__hint">PDF or Word, up to 5 MB.</span>
              {errors.cv && <span className="field__error">{errors.cv}</span>}
            </label>
            <label className="field">
              <span className="field__label">Cover letter <span className="subtle">(optional)</span></span>
              <textarea className="textarea" value={form.cover} onChange={set('cover')} placeholder={`Why are you a great fit for ${company?.name}?`} />
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'space-between' }}>
              <Link to={`/jobs/${job.id}`} className="btn btn--ghost"><Icon name="arrowLeft" size={16} />Back to job</Link>
              <button className="btn btn--primary" type="submit">Review application<Icon name="arrowRight" size={16} /></button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="card stack">
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Review</h2>
            <dl className="job-facts">
              <div><dt>Name</dt><dd>{form.name}</dd></div>
              <div><dt>Email</dt><dd>{form.email}</dd></div>
              {form.phone && <div><dt>Phone</dt><dd>{form.phone}</dd></div>}
              <div><dt>CV</dt><dd>{cv?.name}</dd></div>
            </dl>
            {form.cover && <p>{form.cover}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'space-between' }}>
              <button className="btn btn--ghost" onClick={() => setStep(1)}><Icon name="arrowLeft" size={16} />Edit</button>
              <button className="btn btn--primary" onClick={submit} disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Submitting…' : submitError ? 'Try again' : 'Submit application'}
              </button>
            </div>
            {submitError && <p className="field__error" role="alert">{submitError}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="card success-panel glass" role="status">
            <div className="success-panel__icon"><Icon name="check" size={32} /></div>
            <h2>{brand.voice.applySuccess}</h2>
            <p>{company?.name} will contact you at {form.email}.</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/jobs" className="btn btn--primary">Keep searching</Link>
              <Link to={`/jobs?category=${encodeURIComponent(job.category)}`} className="btn btn--secondary">More {job.category} jobs</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
