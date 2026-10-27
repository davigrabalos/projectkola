/* Outbound requests to job sources: JSON only, with a timeout and an honest User-Agent. */

const UA = 'KolaJobs/0.1 (job aggregator; links back to every original posting)';

export class SourceError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new SourceError(`${res.status} from ${new URL(url).host}`, res.status);
  return (await res.json()) as T;
}
