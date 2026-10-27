import type { JobFilters, PostedWithin } from '../lib/filters';
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS, WORK_MODE_LABELS } from '../data/types';

interface Props {
  filters: JobFilters;
  onChange: (next: Partial<JobFilters>) => void;
  /** From /api/meta, with counts. */
  categories?: { name: string; count: number }[];
  /** Hidden when no job offers easy apply (real jobs are applied for on the employer's site). */
  showEasyApply?: boolean;
}

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

/** Standard job-board facets, in the order users expect: when, where, type, level. */
export function FilterPanel({ filters, onChange, categories = [], showEasyApply = false }: Props) {
  return (
    <div>
      <fieldset className="filters__group">
        <legend>Date posted</legend>
        {([['', 'Any time'], ['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days']] as [PostedWithin, string][]).map(([v, label]) => (
          <label key={v} className="check">
            <input type="radio" name="posted" checked={filters.posted === v} onChange={() => onChange({ posted: v })} />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group">
        <legend>Work mode</legend>
        {(Object.keys(WORK_MODE_LABELS) as (keyof typeof WORK_MODE_LABELS)[]).map((k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={filters.workMode.includes(k)} onChange={() => onChange({ workMode: toggle(filters.workMode, k) })} />
            {WORK_MODE_LABELS[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group">
        <legend>Job type</legend>
        {(Object.keys(EMPLOYMENT_LABELS) as (keyof typeof EMPLOYMENT_LABELS)[]).map((k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={filters.type.includes(k)} onChange={() => onChange({ type: toggle(filters.type, k) })} />
            {EMPLOYMENT_LABELS[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group">
        <legend>Experience level</legend>
        {(Object.keys(EXPERIENCE_LABELS) as (keyof typeof EXPERIENCE_LABELS)[]).map((k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={filters.level.includes(k)} onChange={() => onChange({ level: toggle(filters.level, k) })} />
            {EXPERIENCE_LABELS[k]}
          </label>
        ))}
      </fieldset>

      <div className="filters__group">
        <label className="field">
          <span className="filters__title">Category</span>
          <select className="select" value={filters.category} onChange={(e) => onChange({ category: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count.toLocaleString('en')})</option>)}
            {filters.category && !categories.some((c) => c.name === filters.category) && <option value={filters.category}>{filters.category}</option>}
          </select>
        </label>
      </div>

      {(showEasyApply || filters.easyApply) && (
        <div className="filters__group">
          <label className="check">
            <input type="checkbox" checked={filters.easyApply} onChange={() => onChange({ easyApply: !filters.easyApply })} />
            Easy apply only
          </label>
        </div>
      )}
    </div>
  );
}
