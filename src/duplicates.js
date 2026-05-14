// Groups of IDs that represent the same condition.
// All IDs in a group share a single canonical ID (the first one) for storage.
export const DUPLICATE_GROUPS = [
  ["o4", "sx17"],           // Melanoma
  ["o5", "sx14"],           // Prostate cancer
  ["o6", "img17", "sx22"],  // Colorectal cancer
  ["ec1", "imc3"],          // Cardiac arrest
  ["ec7", "sx1"],           // Aortic dissection
  ["ec8", "imc4"],          // DVT
  ["er3", "imrsp8"],        // Pneumothorax
  ["er4", "imrsp3"],        // Pneumonia
  ["er6", "imrsp6"],        // Pulmonary embolism
  ["egi2", "sx13"],         // Ischaemic bowel
  ["egi5", "sx9"],          // Peritonitis
  ["eur1", "imr4"],         // Acute kidney injury
  ["eur6", "ime1"],         // Hypoglycaemia
  ["ehi1", "imb1"],         // Anaemia
  ["img12", "sx12"],        // Alcoholic liver disease
  ["img15", "sx20"],        // Peptic ulcer disease
  ["img16", "sx18"],        // Inflammatory bowel disease
  ["imi1", "an2"],          // Anaphylaxis
  ["imrsp4", "an10"],       // Respiratory failure
];

// Map from any ID → canonical ID (first in group)
export const CANONICAL = {};
for (const group of DUPLICATE_GROUPS) {
  const canon = group[0];
  for (const id of group) {
    CANONICAL[id] = canon;
  }
}

// Map from canonical ID → all IDs in group
export const GROUP_MEMBERS = {};
for (const group of DUPLICATE_GROUPS) {
  GROUP_MEMBERS[group[0]] = group;
}
