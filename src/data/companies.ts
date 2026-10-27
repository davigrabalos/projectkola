import type { Company } from './types';

// Mock data. Replace with an API call when the backend exists.
export const companies: Company[] = [
  { id: 'lumen', name: 'Lumen Labs', industry: 'Software', size: '201-500 employees', headquarters: 'Lisbon, Portugal', website: 'https://example.com', rating: 4.5,
    about: 'Lumen Labs builds analytics tools that help small businesses understand their customers. Remote-friendly, async-first, and obsessed with craft.' },
  { id: 'verde', name: 'Verde Energy', industry: 'Clean energy', size: '1,001-5,000 employees', headquarters: 'São Paulo, Brazil', website: 'https://example.com', rating: 4.2,
    about: 'Verde Energy develops solar and wind projects across Latin America and Europe, with a mission to make clean power the cheapest option everywhere.' },
  { id: 'atlas', name: 'Atlas Health', industry: 'Healthcare', size: '501-1,000 employees', headquarters: 'London, UK', website: 'https://example.com', rating: 4.0,
    about: 'Atlas Health connects patients and clinicians through a modern care platform used by hospitals in 12 countries.' },
  { id: 'orbit', name: 'Orbit Finance', industry: 'Fintech', size: '51-200 employees', headquarters: 'Berlin, Germany', website: 'https://example.com', rating: 4.6,
    about: 'Orbit makes cross-border payments simple for freelancers and small teams. Series B, growing fast.' },
  { id: 'mosaic', name: 'Mosaic Studio', industry: 'Design & media', size: '11-50 employees', headquarters: 'Porto, Portugal', website: 'https://example.com', rating: 4.8,
    about: 'Mosaic is an independent design studio crafting brands and digital products for purpose-driven companies.' },
  { id: 'harbor', name: 'Harbor Logistics', industry: 'Logistics', size: '5,001+ employees', headquarters: 'Rotterdam, Netherlands', website: 'https://example.com', rating: 3.9,
    about: 'Harbor moves goods for thousands of retailers with a network of smart warehouses and a growing tech team.' },
];

export function getCompany(id: string) {
  return companies.find((c) => c.id === id);
}
