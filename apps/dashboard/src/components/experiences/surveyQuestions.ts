import type { SurveyOption, SurveyQuestion } from "../../types/experiences";

function uniqueSurveyId(prefix: "question" | "option"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createSurveyOption(label: string): SurveyOption {
  return { id: uniqueSurveyId("option"), label };
}

export function createSurveyQuestion(type: SurveyQuestion["type"]): SurveyQuestion {
  const base = { id: uniqueSurveyId("question"), label: "New question", required: false };
  if (type === "single_choice" || type === "multiple_choice") return { ...base, type, options: [createSurveyOption("Option 1"), createSurveyOption("Option 2")] };
  if (type === "short_text") return { ...base, type, placeholder: "Type your answer", maxLength: 250 };
  if (type === "long_text") return { ...base, type, placeholder: "Tell us more", maxLength: 2000 };
  if (type === "rating") return { ...base, type, min: 1, max: 5 };
  return { ...base, type: "nps" };
}

export function changeSurveyQuestionType(question: SurveyQuestion, type: SurveyQuestion["type"]): SurveyQuestion {
  const next = createSurveyQuestion(type);
  return { ...next, id: question.id, label: question.label, required: question.required } as SurveyQuestion;
}
