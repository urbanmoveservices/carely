/** IFCT legal / product configuration */

export const IFCT_SOURCE_ATTRIBUTION =
  "Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.";

/** Commercial electronic product use may require written permission from NIN/ICMR. */
export function isIfctDataPublicUse(): boolean {
  const v = process.env.IFCT_DATA_PUBLIC_USE?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export const NUTRITION_DISCLAIMER =
  "This is general nutrition guidance based on IFCT reference data, not a medical prescription. Confirm diet changes with your doctor or dietitian.";

export const IFCT_PER_100G_NOTE =
  "Values are per 100 g edible portion of raw/reference food unless a cooked conversion rule was applied.";
