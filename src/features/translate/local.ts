// The offline stub, loaded with the app's own string tables (volunteer `mock.*` and the facility
// names, in all 13 locales).
import { resources } from '@/i18n/locales';

import { createStub, flattenStrings, placeNames, type StubCatalog } from './stub';

export const MOCK_CATALOG: StubCatalog = Object.fromEntries(
  Object.entries(resources).map(([lang, tables]) => [lang, { ...flattenStrings(tables.volunteer.mock), ...placeNames(tables.venue.facilityText) }]),
);

export const localStub = createStub(MOCK_CATALOG);
