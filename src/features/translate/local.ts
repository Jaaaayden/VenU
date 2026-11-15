// The offline stub, loaded with the app's own string tables (volunteer `mock.*` in all 13 locales).
import { resources } from '@/i18n/locales';

import { createStub, flattenStrings, type StubCatalog } from './stub';

export const MOCK_CATALOG: StubCatalog = Object.fromEntries(
  Object.entries(resources).map(([lang, tables]) => [lang, flattenStrings(tables.volunteer.mock)]),
);

export const localStub = createStub(MOCK_CATALOG);
