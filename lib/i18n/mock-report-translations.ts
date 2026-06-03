import type {
  AbnormalValue,
  ChartDataPoint,
  KeyFinding,
  MedicalSummaryResult,
  RiskFlag,
} from "@/lib/ai-summary";

export const PHRASE_MAP_HI: Record<string, string> = {
  "This medical report shows a general health checkup with some values that may need attention. Most parameters appear within or close to reference ranges. A few values are slightly outside typical ranges and could benefit from follow-up with a healthcare professional. Overall, the report suggests a moderate health status with room for improvement through diet, exercise, and lifestyle adjustments.":
    "यह मेडिकल रिपोर्ट एक सामान्य स्वास्थ्य जांच दिखाती है, जिसमें कुछ मान ध्यान देने योग्य हैं। अधिकांश पैरामीटर सामान्य सीमा में या उसके करीब हैं। कुछ मान सामान्य सीमा से थोड़े बाहर हैं, जिन पर डॉक्टर से सलाह लेना उपयोगी हो सकता है।",
  "Your hemoglobin level is within the normal range, indicating healthy oxygen-carrying capacity.":
    "आपका हीमोग्लोबिन स्तर सामान्य सीमा में है, जो शरीर में ऑक्सीजन ले जाने की क्षमता के लिए अच्छा संकेत है।",
  "Your fasting blood sugar is slightly above the normal range (70–100 mg/dL). This may suggest pre-diabetic tendencies.":
    "आपका फास्टिंग ब्लड शुगर सामान्य सीमा से थोड़ा अधिक है। यह प्री-डायबिटीज की संभावना की ओर संकेत कर सकता है, इसलिए डॉक्टर से सलाह लें।",
  "Your total cholesterol is slightly elevated. Desirable levels are below 200 mg/dL.":
    "आपका कुल कोलेस्ट्रॉल थोड़ा अधिक है। वांछित स्तर 200 mg/dL से नीचे होते हैं।",
  "Your blood pressure is within a mildly elevated but generally acceptable range.":
    "आपका रक्तचाप हल्का उच्च लेकिन सामान्यतः स्वीकार्य सीमा में है।",
  "Your Vitamin D level is below the recommended range (30–100 ng/mL). Consider supplementation after consulting your doctor.":
    "आपका विटामिन डी स्तर अनुशंसित सीमा से नीचे है। डॉक्टर से सलाह के बाद पूरक पर विचार करें।",
  "Slightly elevated fasting glucose may indicate pre-diabetes. Dietary changes and regular exercise can help.":
    "थोड़ा अधिक फास्टिंग ग्लूकोज प्री-डायबिटीज का संकेत हो सकता है। आहार बदलाव और नियमित व्यायाम मदद कर सकते हैं।",
  "Mildly elevated cholesterol. Reducing saturated fats and increasing fiber intake may help.":
    "हल्का अधिक कोलेस्ट्रॉल। संतृप्त वसा कम करना और फाइबर बढ़ाना मदद कर सकता है।",
  "Low vitamin D can affect bone health and immunity. Sun exposure and supplements may be recommended.":
    "कम विटामिन डी हड्डी और प्रतिरक्षा को प्रभावित कर सकता है। सूर्य की रोशी और पूरक की सलाह हो सकती है।",
  "Prefer fiber-rich foods like vegetables, pulses, and whole grains.":
    "सब्जियां, दालें और साबुत अनाज जैसे फाइबर युक्त भोजन को प्राथमिकता दें।",
  "Limit sugary drinks and highly processed snacks.":
    "मीठे पेय और अत्यधिक प्रोसेस्ड स्नैक्स सीमित करें।",
  "Include omega-3 rich foods such as fish, walnuts, and flaxseeds.":
    "मछली, अखरोट और अलसी जैसे ओमेगा-3 युक्त खाद्य पदार्थ शामिल करें।",
  "Eat more leafy greens and colorful vegetables.":
    "अधिक हरी पत्तेदार सब्जियां और रंगीन सब्जियां खाएं।",
  "Reduce sodium intake to support healthy blood pressure.":
    "स्वस्थ रक्तचाप के लिए नमक का सेवन कम करें।",
  "Consider 30 minutes of brisk walking most days if your doctor allows it.":
    "यदि डॉक्टर अनुमति दें, तो सप्ताह के अधिकांश दिनों में 30 मिनट तेज चलने पर विचार करें।",
  "Try light strength training 2–3 times per week.":
    "सप्ताह में 2–3 बार हल्का स्ट्रेंथ ट्रेनिंग करें।",
  "Include stretching or yoga for flexibility and stress relief.":
    "लचीलेपन और तनाव कम करने के लिए स्ट्रेचिंग या योग शामिल करें।",
  "Gradually increase activity level if currently sedentary.":
    "यदि अभी कम गतिविधि है तो धीरे-धीरे सक्रियता बढ़ाएं।",
  "Sleep 7–8 hours regularly.":
    "नियमित रूप से 7–8 घंटे की नींद लें।",
  "Track key health markers and discuss abnormal values with your doctor.":
    "मुख्य स्वास्थ्य मार्कर ट्रैक करें और असामान्य मानों पर डॉक्टर से चर्चा करें।",
  "Manage stress through mindfulness, hobbies, or counseling.":
    "माइंडफुलनेस, शौक या परामर्श से तनाव प्रबंधित करें।",
  "Stay well-hydrated throughout the day.":
    "दिन भर पर्याप्त पानी पिएं।",
  "Schedule regular health checkups at least once a year.":
    "साल में कम से कम एक बार नियमित स्वास्थ्य जांच कराएं।",
  "Fasting blood sugar is above the normal range. Please consult a qualified doctor for further evaluation.":
    "फास्टिंग ब्लड शुगर सामान्य सीमा से ऊपर है। कृपया आगे की जांच के लिए योग्य डॉक्टर से सलाह लें।",
  "Cholesterol is mildly elevated. Dietary and lifestyle changes are recommended.":
    "कोलेस्ट्रॉल हल्का अधिक है। आहार और जीवनशैली में बदलाव की सलाह है।",
  "Vitamin D is low. Consider supplementation under medical guidance.":
    "विटामिन डी कम है। चिकित्सा मार्गदर्शन में पूरक पर विचार करें।",
  Hemoglobin: "हीमोग्लोबिन (Hemoglobin)",
  "Blood Sugar (Fasting)": "फास्टिंग ब्लड शुगर (Fasting Blood Sugar)",
  "Total Cholesterol": "कुल कोलेस्ट्रॉल (Total Cholesterol)",
  "Blood Pressure": "रक्तचाप (Blood Pressure)",
  "Vitamin D": "विटामिन डी (Vitamin D)",
  "Fasting Blood Sugar": "फास्टिंग ब्लड शुगर (Fasting Blood Sugar)",
  "Blood Sugar": "ब्लड शुगर (Blood Sugar)",
  Cholesterol: "कोलेस्ट्रॉल (Cholesterol)",
  "BP Systolic": "सिस्टोलिक रक्तचाप (BP Systolic)",
  "Below 200 mg/dL": "200 mg/dL से नीचे",
};

function mapPhrase(text: string, lang: string): string {
  if (lang !== "hi" || !text) return text;
  return PHRASE_MAP_HI[text] ?? text;
}

function mapTitle(title: string, lang: string): string {
  if (lang !== "hi") return title;
  return PHRASE_MAP_HI[title] ?? title;
}

export function applyMockReportTranslation(
  content: MedicalSummaryResult,
  language: string
): MedicalSummaryResult {
  if (language !== "hi") return content;

  return {
    ...content,
    summary: mapPhrase(content.summary, language),
    keyFindings: (content.keyFindings || []).map((k: KeyFinding) => ({
      ...k,
      title: mapTitle(k.title, language),
      explanation: mapPhrase(k.explanation, language),
    })),
    abnormalValues: (content.abnormalValues || []).map((a: AbnormalValue) => ({
      ...a,
      name: mapTitle(a.name, language),
      meaning: mapPhrase(a.meaning, language),
      normalRange: a.normalRange,
      value: a.value,
    })),
    foodRecommendations: (content.foodRecommendations || []).map((s) =>
      mapPhrase(s, language)
    ),
    exerciseRecommendations: (content.exerciseRecommendations || []).map((s) =>
      mapPhrase(s, language)
    ),
    lifestyleAdvice: (content.lifestyleAdvice || []).map((s) =>
      mapPhrase(s, language)
    ),
    riskFlags: (content.riskFlags || []).map((f: RiskFlag) => ({
      ...f,
      message: mapPhrase(f.message, language),
    })),
    chartData: (content.chartData || []).map((c: ChartDataPoint) => ({
      ...c,
      label: mapTitle(c.label, language),
    })),
  };
}

export function isMockAiMode(): boolean {
  if (process.env.MOCK_AI_MODE === "true") return true;
  if (!process.env.OPENAI_API_KEY) return true;
  return false;
}
