import { getSourceCatalogByCategory, getSupportedSourceCatalog } from "./jobSourceMetadataService.js";

const buildAdapterSummary = (item) => ({
  key: item.key,
  name: item.name,
  market: item.market,
  category: item.category,
  status: item.status,
  ingestMode: item.ingestMode,
  liveSearchImplemented: item.liveSearchImplemented,
  manualActionRequired: item.manualActionRequired,
  autoApplySupported: item.autoApplySupported,
});

export const getSourceAdapterRegistry = () => ({
  totals: {
    all: getSupportedSourceCatalog().length,
    live: getSupportedSourceCatalog().filter((item) => item.liveSearchImplemented).length,
    planned: getSupportedSourceCatalog().filter((item) => item.status === "planned").length,
    inactive: getSupportedSourceCatalog().filter((item) => item.status === "inactive").length,
  },
  categories: Object.fromEntries(
    Object.entries(getSourceCatalogByCategory()).map(([key, items]) => [
      key,
      items.map((item) => buildAdapterSummary(item)),
    ])
  ),
});
