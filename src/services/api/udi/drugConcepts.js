// Real-world generic/brand names provide recognizable demo search terms.
// Every identifier, price, availability value, and clinical relationship
// produced from these concepts is fictional and must not be used for care.
export const drugConcepts = Object.freeze([
  {
    key: "atorvastatin", name: "Atorvastatin Calcium", genericFor: "Lipitor", category: "Heart health",
    drugClass: "Statin", comparisonGroup: "lipid-management", form: "Tablet", strengths: ["10mg", "20mg", "40mg"],
    description: "A familiar statin entry used to demonstrate normalized catalog and price data.",
  },
  {
    key: "simvastatin", name: "Simvastatin", genericFor: "Zocor", category: "Heart health",
    drugClass: "Statin", comparisonGroup: "lipid-management", form: "Tablet", strengths: ["10mg", "20mg", "40mg"],
    description: "A statin index entry grouped for non-clinical comparison demonstrations.",
  },
  {
    key: "lisinopril", name: "Lisinopril", genericFor: "Prinivil", category: "Heart health",
    drugClass: "ACE inhibitor", comparisonGroup: "blood-pressure", form: "Tablet", strengths: ["5mg", "10mg", "20mg"],
    description: "A blood-pressure index entry used throughout the ClearDose demo journey.",
  },
  {
    key: "losartan", name: "Losartan Potassium", genericFor: "Cozaar", category: "Heart health",
    drugClass: "Angiotensin receptor blocker", comparisonGroup: "blood-pressure", form: "Tablet", strengths: ["25mg", "50mg", "100mg"],
    description: "A normalized blood-pressure medication entry for catalog exploration.",
  },
  {
    key: "amlodipine", name: "Amlodipine Besylate", genericFor: "Norvasc", category: "Heart health",
    drugClass: "Calcium channel blocker", comparisonGroup: "blood-pressure", form: "Tablet", strengths: ["2.5mg", "5mg", "10mg"],
    description: "A calcium channel blocker entry with deterministic fictional offers.",
  },
  {
    key: "metoprolol", name: "Metoprolol Tartrate", genericFor: "Lopressor", category: "Heart health",
    drugClass: "Beta blocker", comparisonGroup: "blood-pressure", form: "Tablet", strengths: ["25mg", "50mg", "100mg"],
    description: "A beta blocker entry for broad category and price comparison examples.",
  },
  {
    key: "hydrochlorothiazide", name: "Hydrochlorothiazide", genericFor: "Microzide", category: "Heart health",
    drugClass: "Thiazide diuretic", comparisonGroup: "blood-pressure", form: "Tablet", strengths: ["12.5mg", "25mg", "50mg"],
    description: "A diuretic entry for the fictional Universal Drug Index.",
  },
  {
    key: "furosemide", name: "Furosemide", genericFor: "Lasix", category: "Heart health",
    drugClass: "Loop diuretic", comparisonGroup: "fluid-management", form: "Tablet", strengths: ["20mg", "40mg", "80mg"],
    description: "A loop diuretic record with local-only package and offer data.",
  },
  {
    key: "clopidogrel", name: "Clopidogrel", genericFor: "Plavix", category: "Heart health",
    drugClass: "Antiplatelet", comparisonGroup: "antithrombotic", form: "Tablet", strengths: ["75mg", "75mg", "75mg"],
    description: "An antiplatelet index record for procurement and catalog demos.",
  },
  {
    key: "warfarin", name: "Warfarin Sodium", genericFor: "Coumadin", category: "Heart health",
    drugClass: "Anticoagulant", comparisonGroup: "antithrombotic", form: "Tablet", strengths: ["1mg", "2.5mg", "5mg"],
    description: "An anticoagulant demo record. ClearDose never provides dosing guidance.",
  },
  {
    key: "isosorbide_mononitrate", name: "Isosorbide Mononitrate", genericFor: "Imdur", category: "Heart health",
    drugClass: "Nitrate", comparisonGroup: "angina-management", form: "Extended-release tablet", strengths: ["30mg", "60mg", "120mg"],
    description: "A nitrate entry included for clearly labeled synthetic interaction examples.",
  },
  {
    key: "metformin", name: "Metformin Hydrochloride", genericFor: "Glucophage", category: "Diabetes",
    drugClass: "Biguanide", comparisonGroup: "glucose-management", form: "Tablet", strengths: ["500mg", "850mg", "1000mg"],
    description: "A diabetes medication entry with package-level fictional price offers.",
  },
  {
    key: "glipizide", name: "Glipizide", genericFor: "Glucotrol", category: "Diabetes",
    drugClass: "Sulfonylurea", comparisonGroup: "glucose-management", form: "Tablet", strengths: ["5mg", "10mg", "10mg"],
    description: "A diabetes index entry used for related-record discovery.",
  },
  {
    key: "pioglitazone", name: "Pioglitazone Hydrochloride", genericFor: "Actos", category: "Diabetes",
    drugClass: "Thiazolidinedione", comparisonGroup: "glucose-management", form: "Tablet", strengths: ["15mg", "30mg", "45mg"],
    description: "A glucose-management record for non-clinical browsing and comparison.",
  },
  {
    key: "empagliflozin", name: "Empagliflozin", genericFor: "Jardiance", category: "Diabetes",
    drugClass: "SGLT2 inhibitor", comparisonGroup: "glucose-management", form: "Tablet", strengths: ["10mg", "25mg", "25mg"],
    description: "A recognizable branded-generic mapping with entirely fictional prices.",
  },
  {
    key: "fluoxetine", name: "Fluoxetine Hydrochloride", genericFor: "Prozac", category: "Mental health",
    drugClass: "SSRI", comparisonGroup: "mood-management", form: "Capsule", strengths: ["10mg", "20mg", "40mg"],
    description: "An SSRI record used to demonstrate normalized search and review workflows.",
  },
  {
    key: "sertraline", name: "Sertraline Hydrochloride", genericFor: "Zoloft", category: "Mental health",
    drugClass: "SSRI", comparisonGroup: "mood-management", form: "Tablet", strengths: ["25mg", "50mg", "100mg"],
    description: "An SSRI entry grouped for discussion-oriented, non-substitution results.",
  },
  {
    key: "escitalopram", name: "Escitalopram Oxalate", genericFor: "Lexapro", category: "Mental health",
    drugClass: "SSRI", comparisonGroup: "mood-management", form: "Tablet", strengths: ["5mg", "10mg", "20mg"],
    description: "A mental-health category record with local deterministic offer data.",
  },
  {
    key: "bupropion", name: "Bupropion Hydrochloride", genericFor: "Wellbutrin", category: "Mental health",
    drugClass: "NDRI", comparisonGroup: "mood-management", form: "Extended-release tablet", strengths: ["150mg", "300mg", "300mg"],
    description: "A demo index record for broad related-medication discovery.",
  },
  {
    key: "buspirone", name: "Buspirone Hydrochloride", genericFor: "Buspar", category: "Mental health",
    drugClass: "Anxiolytic", comparisonGroup: "anxiety-management", form: "Tablet", strengths: ["5mg", "10mg", "15mg"],
    description: "An anxiolytic record used only for catalog and mock procurement examples.",
  },
  {
    key: "hydroxyzine", name: "Hydroxyzine Hydrochloride", genericFor: "Atarax", category: "Mental health",
    drugClass: "Antihistamine", comparisonGroup: "anxiety-management", form: "Tablet", strengths: ["10mg", "25mg", "50mg"],
    description: "An antihistamine entry grouped for a non-clinical browsing example.",
  },
  {
    key: "trazodone", name: "Trazodone Hydrochloride", genericFor: "Desyrel", category: "Mental health",
    drugClass: "Serotonin modulator", comparisonGroup: "mood-management", form: "Tablet", strengths: ["50mg", "100mg", "150mg"],
    description: "A mental-health index record with fictional package prices.",
  },
  {
    key: "levothyroxine", name: "Levothyroxine Sodium", genericFor: "Synthroid", category: "Thyroid",
    drugClass: "Thyroid hormone", comparisonGroup: "thyroid-management", form: "Tablet", strengths: ["50mcg", "75mcg", "100mcg"],
    description: "A thyroid-hormone record used throughout the fictional patient account.",
  },
  {
    key: "liothyronine", name: "Liothyronine Sodium", genericFor: "Cytomel", category: "Thyroid",
    drugClass: "Thyroid hormone", comparisonGroup: "thyroid-management", form: "Tablet", strengths: ["5mcg", "25mcg", "50mcg"],
    description: "A thyroid index entry for related-record exploration only.",
  },
  {
    key: "methimazole", name: "Methimazole", genericFor: "Tapazole", category: "Thyroid",
    drugClass: "Antithyroid agent", comparisonGroup: "thyroid-management", form: "Tablet", strengths: ["5mg", "10mg", "10mg"],
    description: "An antithyroid demo record with no clinical recommendation behavior.",
  },
  {
    key: "naproxen", name: "Naproxen", genericFor: "Naprosyn", category: "Pain & inflammation",
    drugClass: "NSAID", comparisonGroup: "pain-management", form: "Tablet", strengths: ["250mg", "375mg", "500mg"],
    description: "An NSAID entry used in price and synthetic interaction demonstrations.",
  },
  {
    key: "ibuprofen", name: "Ibuprofen", genericFor: "Motrin", category: "Pain & inflammation",
    drugClass: "NSAID", comparisonGroup: "pain-management", form: "Tablet", strengths: ["200mg", "400mg", "600mg"],
    description: "A common pain-management index record with fictional offers.",
  },
  {
    key: "celecoxib", name: "Celecoxib", genericFor: "Celebrex", category: "Pain & inflammation",
    drugClass: "COX-2 inhibitor", comparisonGroup: "pain-management", form: "Capsule", strengths: ["50mg", "100mg", "200mg"],
    description: "A pain-management record for broad related-item comparison.",
  },
  {
    key: "meloxicam", name: "Meloxicam", genericFor: "Mobic", category: "Pain & inflammation",
    drugClass: "NSAID", comparisonGroup: "pain-management", form: "Tablet", strengths: ["7.5mg", "15mg", "15mg"],
    description: "An NSAID entry for deterministic demo price generation.",
  },
  {
    key: "gabapentin", name: "Gabapentin", genericFor: "Neurontin", category: "Pain & inflammation",
    drugClass: "Gabapentinoid", comparisonGroup: "nerve-pain", form: "Capsule", strengths: ["100mg", "300mg", "400mg"],
    description: "A nerve-pain category entry for search and procurement examples.",
  },
  {
    key: "amoxicillin", name: "Amoxicillin", genericFor: "Amoxil", category: "Infectious disease",
    drugClass: "Penicillin antibiotic", comparisonGroup: "antibiotic", form: "Capsule", strengths: ["250mg", "500mg", "500mg"],
    description: "An antibiotic record for schema and package-price demonstrations.",
  },
  {
    key: "azithromycin", name: "Azithromycin", genericFor: "Zithromax", category: "Infectious disease",
    drugClass: "Macrolide antibiotic", comparisonGroup: "antibiotic", form: "Tablet", strengths: ["250mg", "500mg", "500mg"],
    description: "A macrolide index entry with local-only fictional availability.",
  },
  {
    key: "clarithromycin", name: "Clarithromycin", genericFor: "Biaxin", category: "Infectious disease",
    drugClass: "Macrolide antibiotic", comparisonGroup: "antibiotic", form: "Tablet", strengths: ["250mg", "500mg", "500mg"],
    description: "A macrolide record included in the synthetic interaction fixture set.",
  },
  {
    key: "doxycycline", name: "Doxycycline Hyclate", genericFor: "Vibramycin", category: "Infectious disease",
    drugClass: "Tetracycline antibiotic", comparisonGroup: "antibiotic", form: "Capsule", strengths: ["50mg", "100mg", "100mg"],
    description: "A tetracycline index entry for broad catalog exploration.",
  },
  {
    key: "cephalexin", name: "Cephalexin", genericFor: "Keflex", category: "Infectious disease",
    drugClass: "Cephalosporin antibiotic", comparisonGroup: "antibiotic", form: "Capsule", strengths: ["250mg", "500mg", "500mg"],
    description: "A cephalosporin entry with deterministic fictional price offers.",
  },
  {
    key: "ciprofloxacin", name: "Ciprofloxacin Hydrochloride", genericFor: "Cipro", category: "Infectious disease",
    drugClass: "Fluoroquinolone antibiotic", comparisonGroup: "antibiotic", form: "Tablet", strengths: ["250mg", "500mg", "750mg"],
    description: "A fluoroquinolone demo record without clinical decision behavior.",
  },
  {
    key: "albuterol", name: "Albuterol Sulfate", genericFor: "Ventolin HFA", category: "Respiratory & allergy",
    drugClass: "Bronchodilator", comparisonGroup: "airway-management", form: "Metered-dose inhaler", strengths: ["90mcg", "90mcg", "90mcg"], quantities: [1, 2, 3],
    description: "An inhaler-format entry used to test non-tablet quantities.",
  },
  {
    key: "montelukast", name: "Montelukast Sodium", genericFor: "Singulair", category: "Respiratory & allergy",
    drugClass: "Leukotriene modifier", comparisonGroup: "airway-management", form: "Tablet", strengths: ["4mg", "5mg", "10mg"],
    description: "A respiratory category record with fictional package pricing.",
  },
  {
    key: "cetirizine", name: "Cetirizine Hydrochloride", genericFor: "Zyrtec", category: "Respiratory & allergy",
    drugClass: "Antihistamine", comparisonGroup: "allergy-management", form: "Tablet", strengths: ["5mg", "10mg", "10mg"],
    description: "An allergy-management entry for broad search examples.",
  },
  {
    key: "fluticasone", name: "Fluticasone Propionate", genericFor: "Flonase", category: "Respiratory & allergy",
    drugClass: "Corticosteroid", comparisonGroup: "allergy-management", form: "Nasal spray", strengths: ["50mcg", "50mcg", "50mcg"], quantities: [1, 2, 3],
    description: "A spray-format record that demonstrates flexible UDI package shapes.",
  },
  {
    key: "omeprazole", name: "Omeprazole", genericFor: "Prilosec", category: "Digestive health",
    drugClass: "Proton pump inhibitor", comparisonGroup: "acid-management", form: "Delayed-release capsule", strengths: ["10mg", "20mg", "40mg"],
    description: "A digestive-health entry with deterministic fictional offers.",
  },
  {
    key: "pantoprazole", name: "Pantoprazole Sodium", genericFor: "Protonix", category: "Digestive health",
    drugClass: "Proton pump inhibitor", comparisonGroup: "acid-management", form: "Delayed-release tablet", strengths: ["20mg", "40mg", "40mg"],
    description: "A proton-pump inhibitor record grouped for non-clinical comparison.",
  },
  {
    key: "famotidine", name: "Famotidine", genericFor: "Pepcid", category: "Digestive health",
    drugClass: "H2 blocker", comparisonGroup: "acid-management", form: "Tablet", strengths: ["10mg", "20mg", "40mg"],
    description: "An H2 blocker entry for broad related-item discovery.",
  },
  {
    key: "ondansetron", name: "Ondansetron Hydrochloride", genericFor: "Zofran", category: "Digestive health",
    drugClass: "Antiemetic", comparisonGroup: "nausea-management", form: "Tablet", strengths: ["4mg", "8mg", "8mg"],
    description: "An antiemetic demo record with no prescribing or dosing guidance.",
  },
  {
    key: "anastrozole", name: "Anastrozole", genericFor: "Arimidex", category: "Cancer care",
    drugClass: "Aromatase inhibitor", comparisonGroup: "oncology-hormonal", form: "Tablet", strengths: ["1mg", "1mg", "1mg"],
    description: "An oncology index record with highly visible non-clinical boundaries.",
  },
  {
    key: "tamoxifen", name: "Tamoxifen Citrate", genericFor: "Nolvadex", category: "Cancer care",
    drugClass: "Selective estrogen receptor modulator", comparisonGroup: "oncology-hormonal", form: "Tablet", strengths: ["10mg", "20mg", "20mg"],
    description: "An oncology demo entry for data-shape and search evaluation only.",
  },
  {
    key: "sildenafil", name: "Sildenafil Citrate", genericFor: "Viagra", category: "Men's health",
    drugClass: "PDE5 inhibitor", comparisonGroup: "erectile-dysfunction", form: "Tablet", strengths: ["25mg", "50mg", "100mg"],
    description: "A PDE5 inhibitor record included in price and synthetic interaction examples.",
  },
  {
    key: "tadalafil", name: "Tadalafil", genericFor: "Cialis", category: "Men's health",
    drugClass: "PDE5 inhibitor", comparisonGroup: "erectile-dysfunction", form: "Tablet", strengths: ["5mg", "10mg", "20mg"],
    description: "A related PDE5 index record for non-substitution demonstrations.",
  },
  {
    key: "estradiol", name: "Estradiol", genericFor: "Estrace", category: "Women's health",
    drugClass: "Estrogen", comparisonGroup: "hormone-management", form: "Tablet", strengths: ["0.5mg", "1mg", "2mg"],
    description: "A hormone-management demo record with fictional package prices.",
  },
  {
    key: "norethindrone", name: "Norethindrone", genericFor: "Aygestin", category: "Women's health",
    drugClass: "Progestin", comparisonGroup: "hormone-management", form: "Tablet", strengths: ["0.35mg", "5mg", "5mg"],
    description: "A progestin index entry used only for catalog and schema demonstrations.",
  },
  {
    key: "alendronate", name: "Alendronate Sodium", genericFor: "Fosamax", category: "Bone health",
    drugClass: "Bisphosphonate", comparisonGroup: "bone-management", form: "Tablet", strengths: ["5mg", "35mg", "70mg"], quantities: [30, 12, 4],
    description: "A bone-health entry that demonstrates nonstandard package quantities.",
  },
  {
    key: "calcium_carbonate", name: "Calcium Carbonate", genericFor: "Caltrate", category: "Bone health",
    drugClass: "Mineral supplement", comparisonGroup: "bone-management", form: "Tablet", strengths: ["500mg", "600mg", "600mg"],
    description: "A supplement-format record included in a clearly synthetic interaction fixture.",
  },
]);

