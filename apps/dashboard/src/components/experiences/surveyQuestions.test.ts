import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "../../types/experiences";
import { changeSurveyQuestionType, createSurveyQuestion } from "./surveyQuestions";

describe("survey question factories", () => {
  it.each<SurveyQuestion["type"]>(["single_choice", "multiple_choice", "short_text", "long_text", "rating", "nps"])("creates stable structured defaults for %s", type => {
    const question = createSurveyQuestion(type);
    expect(question).toMatchObject({ type, label: "New question", required: false });
    expect(question.id).toMatch(/^question_/);
    if (question.type === "single_choice" || question.type === "multiple_choice") {
      expect(question.options.map(option => option.id)).toHaveLength(2);
      expect(new Set(question.options.map(option => option.id)).size).toBe(2);
    }
  });

  it("preserves identity and authored common fields when changing type", () => {
    const original: SurveyQuestion = { id: "question_existing", type: "short_text", label: "Your name", required: true, placeholder: "Name", maxLength: 80 };
    expect(changeSurveyQuestionType(original, "rating")).toMatchObject({ id: "question_existing", type: "rating", label: "Your name", required: true, min: 1, max: 5 });
  });
});
