// These rules exist only to demonstrate a WebMCP interaction-review contract.
// They are deliberately incomplete and are not a clinical knowledge base.
export const demoInteractionRules = Object.freeze([
  {
    drugIds: ["med_sildenafil", "med_isosorbide_mononitrate"],
    severity: "demo-high",
    message: "Synthetic high-priority review flag. A licensed pharmacist must verify this pair against current labeling.",
  },
  {
    drugIds: ["med_warfarin", "med_naproxen"],
    severity: "demo-high",
    message: "Synthetic bleeding-risk review flag. This fixture is not complete clinical guidance.",
  },
  {
    drugIds: ["med_fluoxetine", "med_naproxen"],
    severity: "demo-review",
    message: "Synthetic monitoring flag for the hackathon workflow. Confirm with a pharmacist.",
  },
  {
    drugIds: ["med_levothyroxine", "med_calcium_carbonate"],
    severity: "demo-timing",
    message: "Synthetic administration-timing flag. Validate against the current product labels.",
  },
  {
    drugIds: ["med_simvastatin", "med_clarithromycin"],
    severity: "demo-high",
    message: "Synthetic high-priority review flag. Do not use this fixture for a care decision.",
  },
  {
    drugIds: ["med_lisinopril", "med_naproxen"],
    severity: "demo-review",
    message: "Synthetic monitoring flag used to demonstrate an incomplete interaction data source.",
  },
]);

