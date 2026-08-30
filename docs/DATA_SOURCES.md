# Universal Drug Index data sources

The checked-in ClearDose UDI is generated and fictional. It has 52 recognizable drug records, 156 package variants, and 624 provider offers across four providers and three mock locations. The demo works offline and never presents a scraped cash price, inventory check, delivery promise, insurance quote, or interaction result as current information.

Comparison eligibility is also seeded data. Each explicit relationship declares its kind, reason code, plain explanation, purpose-specific permissions, professional-review flag, and `clinicallyEquivalent: false`. If no relationship allows the requested purpose, the UDI returns `INCOMPATIBLE_COMPARISON` and recommends `cleardose_find_compatible_options`.

## Recommended bulk inputs

| Need | Primary source | How it fits |
|---|---|---|
| Normalized drug identity | [NLM RxNorm Current Prescribable Content](https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html) | Use RxCUI as the normalized identity and import ingredients, clinical drugs, branded drugs, dose forms, strengths, packs, and relationships. The prescribable monthly file is available without a UMLS license. |
| Approved products and equivalence metadata | [FDA Orange Book data files/API](https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files) | Add active ingredient, strength, dosage form, route, application, reference-listed-drug, and therapeutic-equivalence data. Do not turn equivalence codes into patient-specific substitution advice. |
| Acquisition-cost reference | [CMS Medicaid NADAC](https://data.medicaid.gov/datasets) | Join by normalized NDC and effective date. NADAC is an acquisition-cost reference, not a consumer cash price or guaranteed pharmacy offer. |
| Current labeling | [NLM DailyMed bulk SPL files](https://dailymed.nlm.nih.gov/dailymed/spl-resources-all-drug-labels.cfm) or [web services](https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm) | Store label SET IDs and provenance. Use label sections for review and linking, not as an automatically complete interaction engine. |
| Searchable/downloadable label JSON | [openFDA drug labeling](https://open.fda.gov/apis/drug/label/) | Useful for prototypes and label-section ingestion. Fields vary between products, so preserve missingness and the label effective date. |
| Approval history | [Drugs@FDA bulk files](https://www.fda.gov/drugs/drug-approvals-and-databases/drugsfda-data-files) | Add products, applications, submissions, and marketing status when the demo grows into an approval-history workflow. |

## Practical import pipeline

1. Load RxNorm's Current Prescribable Content and keep `IN`, `PIN`, `SCD`, `SBD`, and pack concepts needed by the product.
2. Resolve package NDCs through RxNorm and FDA data. Preserve the original code, source, release date, and status rather than silently overwriting identity.
3. Join NADAC by normalized NDC and effective date. Keep the unit-of-measure field and never compare unlike units without conversion code and tests.
4. Generate fictional demo offers with a stable seeded transform. Label every output as fictional, retain the source release only as provenance, and avoid publishing transformed values that could be mistaken for current quotes.
5. Map DailyMed SET IDs or openFDA label records for warnings and source links. Keep raw label text outside WebMCP outputs; return only the minimum fields required for the next user step.
6. Treat drug-interaction knowledge as a separate, versioned, clinically governed source. Free-text label parsing alone is not sufficient to claim complete pairwise safety coverage.

## UDI shape

```js
{
  id: "med_lisinopril",
  identifiers: {
    udi: "udi:cleardose:lisinopril",
    rxCui: null,
    ndc: null
  },
  name: "Lisinopril",
  drugClass: "ACE inhibitor",
  comparisonGroup: "blood-pressure",
  activeIngredient: { name: "lisinopril", fictional: true },
  manufacturer: { id: "maker_north_harbor", name: "North Harbor Generics", fictional: true },
  clinicalSample: { coverage: "sample-and-incomplete" },
  variants: [{
    strength: "10mg",
    quantity: 60,
    offers: [{ providerId, cashPrice, estimatedInsurancePrice, costPlusStylePrice, shippingCost, deliveredCashTotal, inventory, fulfillment }]
  }]
}
```

The empty `rxCui` and `ndc` fields are deliberate extension points. The demo UDI remains useful before an authoritative import and makes missing identity explicit instead of fabricating codes.

## Seeded provider and location model

Provider fixtures declare the pricing model, provider fee, base shipping cost, pickup and shipping support, and a deterministic delivery range. Location fixtures declare a fictional postal code, shipping adjustment, surcharge, and provider distance. Exact overrides create stable examples for mixed inventory, a package unavailable at one location, a missed delivery deadline, and one unavailable provider.

The availability clock is fixed at `2026-08-29T12:00:00.000Z`. Inventory versions, quote versions, pickup windows, and delivery dates are reproducible. Changing the mock location can change availability, distance, shipping cost, and arrival date. It never performs geolocation or contacts a provider.

Clinical sample facts contain common uses, common side effects, warnings, and discussion points for the demo. The UI labels this coverage as informational sample data. It is not a drug label, complete safety review, diagnosis, or recommendation.
