/* Where Kola's real jobs come from.
   - BOARDS: curated hiring partners, read from their public Greenhouse / Lever job boards (no key needed).
     Each was checked on 2026-10-27 to have open roles in Europe or Brazil. Add a company by adding a line.
   - ADZUNA: broad search volume per country (needs ADZUNA_APP_ID / ADZUNA_APP_KEY; skipped without them).
     Adzuna has no Portugal feed; Portuguese roles come from the boards (e.g. Feedzai). */

export interface CompanyInfo {
  id: string;
  name: string;
  industry: string;
  headquarters: string;
  website: string;
  about: string;
}

export interface BoardSource {
  kind: 'greenhouse' | 'lever';
  /** Board token (Greenhouse) or site slug (Lever). */
  token: string;
  company: CompanyInfo;
}

const gh = (token: string, company: CompanyInfo): BoardSource => ({ kind: 'greenhouse', token, company });
const lv = (token: string, company: CompanyInfo): BoardSource => ({ kind: 'lever', token, company });

export const BOARDS: BoardSource[] = [
  gh('stone', { id: 'stone', name: 'Stone', industry: 'Fintech', headquarters: 'São Paulo, Brazil', website: 'https://www.stone.com.br', about: 'Stone builds payment and banking tools for Brazilian merchants.' }),
  gh('sumup', { id: 'sumup', name: 'SumUp', industry: 'Fintech', headquarters: 'London, UK', website: 'https://www.sumup.com', about: 'SumUp makes card readers, point-of-sale and payment tools for small businesses.' }),
  gh('elastic', { id: 'elastic', name: 'Elastic', industry: 'Software', headquarters: 'Distributed', website: 'https://www.elastic.co', about: 'Elastic is the company behind Elasticsearch, used for search, observability and security.' }),
  gh('hellofresh', { id: 'hellofresh', name: 'HelloFresh', industry: 'Food & consumer', headquarters: 'Berlin, Germany', website: 'https://www.hellofresh.com', about: 'HelloFresh delivers meal kits and ready-to-eat meals.' }),
  gh('deliveroo', { id: 'deliveroo', name: 'Deliveroo', industry: 'Marketplace', headquarters: 'London, UK', website: 'https://deliveroo.co.uk', about: 'Deliveroo is an online food and grocery delivery marketplace.' }),
  gh('canonical', { id: 'canonical', name: 'Canonical', industry: 'Software', headquarters: 'London, UK', website: 'https://canonical.com', about: 'Canonical is the publisher of Ubuntu and open-source infrastructure software.' }),
  gh('celonis', { id: 'celonis', name: 'Celonis', industry: 'Software', headquarters: 'Munich, Germany', website: 'https://www.celonis.com', about: 'Celonis builds process mining and process intelligence software.' }),
  gh('doctolib', { id: 'doctolib', name: 'Doctolib', industry: 'Health tech', headquarters: 'Paris, France', website: 'https://www.doctolib.fr', about: 'Doctolib provides appointment booking and software for patients and health professionals.' }),
  gh('adyen', { id: 'adyen', name: 'Adyen', industry: 'Fintech', headquarters: 'Amsterdam, Netherlands', website: 'https://www.adyen.com', about: 'Adyen is a payments platform for online and in-store businesses.' }),
  gh('datadog', { id: 'datadog', name: 'Datadog', industry: 'Software', headquarters: 'New York, USA', website: 'https://www.datadoghq.com', about: 'Datadog is a monitoring and security platform for cloud applications.' }),
  gh('quintoandar', { id: 'quintoandar', name: 'QuintoAndar', industry: 'Proptech', headquarters: 'São Paulo, Brazil', website: 'https://www.quintoandar.com.br', about: 'QuintoAndar is a housing platform for renting, buying and selling homes.' }),
  gh('gitlab', { id: 'gitlab', name: 'GitLab', industry: 'Software', headquarters: 'Remote', website: 'https://about.gitlab.com', about: 'GitLab is a DevSecOps platform, built by an all-remote company.' }),
  gh('monzo', { id: 'monzo', name: 'Monzo', industry: 'Fintech', headquarters: 'London, UK', website: 'https://monzo.com', about: 'Monzo is a UK digital bank.' }),
  gh('getyourguide', { id: 'getyourguide', name: 'GetYourGuide', industry: 'Travel', headquarters: 'Berlin, Germany', website: 'https://www.getyourguide.com', about: 'GetYourGuide is a marketplace for tours and travel experiences.' }),
  gh('grafanalabs', { id: 'grafanalabs', name: 'Grafana Labs', industry: 'Software', headquarters: 'Remote', website: 'https://grafana.com', about: 'Grafana Labs builds open-source observability tools, including Grafana.' }),
  gh('intercom', { id: 'intercom', name: 'Intercom', industry: 'Software', headquarters: 'Dublin, Ireland', website: 'https://www.intercom.com', about: 'Intercom builds customer service software and AI support agents.' }),
  lv('palantir', { id: 'palantir', name: 'Palantir', industry: 'Software', headquarters: 'Denver, USA', website: 'https://www.palantir.com', about: 'Palantir builds data integration and analytics platforms.' }),
  lv('spotify', { id: 'spotify', name: 'Spotify', industry: 'Media', headquarters: 'Stockholm, Sweden', website: 'https://www.spotify.com', about: 'Spotify is an audio streaming service for music and podcasts.' }),
  gh('n26', { id: 'n26', name: 'N26', industry: 'Fintech', headquarters: 'Berlin, Germany', website: 'https://n26.com', about: 'N26 is a mobile bank operating across Europe.' }),
  lv('swile', { id: 'swile', name: 'Swile', industry: 'HR tech', headquarters: 'Montpellier, France', website: 'https://www.swile.co', about: 'Swile builds employee benefits and meal voucher products.' }),
  gh('raisin', { id: 'raisin', name: 'Raisin', industry: 'Fintech', headquarters: 'Berlin, Germany', website: 'https://www.raisin.com', about: 'Raisin runs a marketplace for savings and investment products.' }),
  gh('ebanx', { id: 'ebanx', name: 'EBANX', industry: 'Fintech', headquarters: 'Curitiba, Brazil', website: 'https://www.ebanx.com', about: 'EBANX processes payments for global companies selling in Latin America.' }),
  gh('vtex', { id: 'vtex', name: 'VTEX', industry: 'Software', headquarters: 'São Paulo, Brazil', website: 'https://vtex.com', about: 'VTEX is a composable commerce platform for brands and retailers.' }),
  gh('solarisbank', { id: 'solaris', name: 'Solaris', industry: 'Fintech', headquarters: 'Berlin, Germany', website: 'https://www.solarisgroup.com', about: 'Solaris provides banking-as-a-service infrastructure.' }),
  gh('commercetools', { id: 'commercetools', name: 'commercetools', industry: 'Software', headquarters: 'Munich, Germany', website: 'https://commercetools.com', about: 'commercetools builds a headless commerce platform.' }),
  gh('gocardless', { id: 'gocardless', name: 'GoCardless', industry: 'Fintech', headquarters: 'London, UK', website: 'https://gocardless.com', about: 'GoCardless handles recurring and bank payments.' }),
  gh('cabify', { id: 'cabify', name: 'Cabify', industry: 'Mobility', headquarters: 'Madrid, Spain', website: 'https://cabify.com', about: 'Cabify is a ride-hailing and mobility platform in Spain and Latin America.' }),
  lv('agicap', { id: 'agicap', name: 'Agicap', industry: 'Fintech', headquarters: 'Lyon, France', website: 'https://agicap.com', about: 'Agicap builds cash flow management software for businesses.' }),
  gh('staffbase', { id: 'staffbase', name: 'Staffbase', industry: 'Software', headquarters: 'Chemnitz, Germany', website: 'https://staffbase.com', about: 'Staffbase builds employee communication software.' }),
  gh('contentful', { id: 'contentful', name: 'Contentful', industry: 'Software', headquarters: 'Berlin, Germany', website: 'https://www.contentful.com', about: 'Contentful is a content platform for digital teams.' }),
  gh('wildlifestudios', { id: 'wildlife', name: 'Wildlife Studios', industry: 'Games', headquarters: 'São Paulo, Brazil', website: 'https://wildlifestudios.com', about: 'Wildlife Studios develops mobile games.' }),
  gh('feedzai', { id: 'feedzai', name: 'Feedzai', industry: 'Fintech', headquarters: 'Coimbra, Portugal', website: 'https://feedzai.com', about: 'Feedzai builds AI for fraud prevention and financial crime detection.' }),
  lv('contentsquare', { id: 'contentsquare', name: 'Contentsquare', industry: 'Software', headquarters: 'Paris, France', website: 'https://contentsquare.com', about: 'Contentsquare builds digital experience analytics.' }),
  gh('typeform', { id: 'typeform', name: 'Typeform', industry: 'Software', headquarters: 'Barcelona, Spain', website: 'https://www.typeform.com', about: 'Typeform makes conversational forms and surveys.' }),
];

export interface AdzunaMarket {
  /** Adzuna's country path segment. */
  code: string;
  /** ISO country code stored on the job. */
  country: string;
  currency: string;
}

export const ADZUNA_MARKETS: AdzunaMarket[] = [
  { code: 'gb', country: 'GB', currency: 'GBP' },
  { code: 'de', country: 'DE', currency: 'EUR' },
  { code: 'fr', country: 'FR', currency: 'EUR' },
  { code: 'es', country: 'ES', currency: 'EUR' },
  { code: 'nl', country: 'NL', currency: 'EUR' },
  { code: 'it', country: 'IT', currency: 'EUR' },
  { code: 'br', country: 'BR', currency: 'BRL' },
];
