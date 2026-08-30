const boundary = Object.freeze({
  informationalOnly: true,
  coverage: "sample-and-incomplete",
  requiresProfessionalReview: true,
  disclaimer: "Sample label summary for the ClearDose sandbox. It is incomplete, is not medical advice, and must not be used to diagnose, prescribe, or decide whether to start, stop, or switch a medicine.",
});

const facts = Object.freeze({
  lisinopril: Object.freeze({
    activeIngredient: "Lisinopril",
    commonUses: Object.freeze(["High blood pressure", "Heart failure", "Care after certain heart attacks"]),
    commonSideEffects: Object.freeze(["Headache", "Dizziness", "Cough"]),
    importantWarnings: Object.freeze(["Serious swelling can occur", "Kidney function and potassium may need monitoring", "Low blood pressure can occur"]),
    discussionPoints: Object.freeze(["Ask what monitoring applies to you", "Ask which symptoms need prompt medical attention", "Review other medicines and supplements with a clinician or pharmacist"]),
    source: Object.freeze({
      label: "DailyMed lisinopril prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=34953f77-bae1-41fe-af11-3ea0b3ceaa11",
      reviewedAt: "2026-08-29",
    }),
  }),
  losartan: Object.freeze({
    activeIngredient: "Losartan",
    commonUses: Object.freeze(["High blood pressure", "Certain cardiovascular-risk and kidney-care contexts described in the product label"]),
    commonSideEffects: Object.freeze(["Dizziness", "Nasal congestion", "Back pain"]),
    importantWarnings: Object.freeze(["Low blood pressure can occur", "Kidney function and potassium may need monitoring", "Pregnancy warnings require clinician review"]),
    discussionPoints: Object.freeze(["Ask what monitoring applies to you", "Review potassium products and other medicines with a clinician or pharmacist"]),
    source: Object.freeze({
      label: "DailyMed losartan potassium prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=207881a6-cc87-49a5-8e8f-6266b0dba4e9",
      reviewedAt: "2026-08-29",
    }),
  }),
  atorvastatin: Object.freeze({
    activeIngredient: "Atorvastatin",
    commonUses: Object.freeze(["Cholesterol management", "Certain cardiovascular-risk reduction contexts described in the product label"]),
    commonSideEffects: Object.freeze(["Joint pain", "Diarrhea", "Pain in an extremity"]),
    importantWarnings: Object.freeze(["Unexplained muscle pain or weakness needs prompt clinical review", "Liver problems can occur", "Some medicines and grapefruit juice can change risk"]),
    discussionPoints: Object.freeze(["Ask which symptoms need prompt medical attention", "Review other medicines and supplements with a clinician or pharmacist", "Ask whether any monitoring applies to you"]),
    source: Object.freeze({
      label: "DailyMed atorvastatin calcium prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=e6d068ed-f9d2-4fd1-9755-b76bea89725e",
      reviewedAt: "2026-08-29",
    }),
  }),
  simvastatin: Object.freeze({
    activeIngredient: "Simvastatin",
    commonUses: Object.freeze(["Cholesterol management", "Certain cardiovascular-risk reduction contexts described in the product label"]),
    commonSideEffects: Object.freeze(["Headache", "Abdominal pain", "Nausea"]),
    importantWarnings: Object.freeze(["Unexplained muscle pain or weakness needs prompt clinical review", "Risk can change with dose and interacting medicines", "Liver problems can occur"]),
    discussionPoints: Object.freeze(["Ask which symptoms need prompt medical attention", "Review every medicine and supplement with a clinician or pharmacist"]),
    source: Object.freeze({
      label: "DailyMed simvastatin prescribing information",
      url: "https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=433f8a86-5ad3-43db-8e62-c0812dd3d723",
      reviewedAt: "2026-08-29",
    }),
  }),
});

const activeIngredientNames = Object.freeze({
  atorvastatin: "Atorvastatin",
  simvastatin: "Simvastatin",
  lisinopril: "Lisinopril",
  losartan: "Losartan",
  amlodipine: "Amlodipine",
  metformin: "Metformin",
  empagliflozin: "Empagliflozin",
  fluoxetine: "Fluoxetine",
  sertraline: "Sertraline",
  escitalopram: "Escitalopram",
  naproxen: "Naproxen",
  ibuprofen: "Ibuprofen",
  meloxicam: "Meloxicam",
  azithromycin: "Azithromycin",
  clarithromycin: "Clarithromycin",
  omeprazole: "Omeprazole",
  pantoprazole: "Pantoprazole",
  sildenafil: "Sildenafil",
  tadalafil: "Tadalafil",
  levothyroxine: "Levothyroxine",
  liothyronine: "Liothyronine",
});

export function clinicalSampleFor(concept) {
  const sample = facts[concept.key];
  if (!sample) {
    return {
      ...structuredClone(boundary),
      coverage: "not-seeded",
      commonUses: [],
      commonSideEffects: [],
      importantWarnings: [],
      discussionPoints: [],
      source: null,
    };
  }
  return { ...structuredClone(boundary), ...structuredClone(sample) };
}

export function activeIngredientFor(concept) {
  return Object.freeze({
    id: `ingredient_${concept.key}`,
    name: activeIngredientNames[concept.key] ?? concept.name,
  });
}
