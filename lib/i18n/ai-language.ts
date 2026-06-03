import { getLanguageName } from "@/lib/translation/language-map";

import { DEFAULT_LANGUAGE } from "./languages";



export function getAiLanguageInstruction(languageCode?: string | null): string {

  const code = languageCode || DEFAULT_LANGUAGE;

  if (code === "en") {

    return "Generate the report explanation in English. Preserve medical test names, values, and units. Use simple user-friendly language.";

  }



  const name = getLanguageName(code);



  return (

    `Generate the report explanation in ${name}. ` +

    `Preserve medical test names, numeric values, and units exactly (English abbreviations for units are acceptable). ` +

    `Use simple user-friendly ${name}. ` +

    `Do not translate numbers or units. All JSON string values must be in ${name}.`

  );

}

