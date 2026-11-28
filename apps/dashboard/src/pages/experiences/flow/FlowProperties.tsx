import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@movcues/ui";
import type { EventDefinitionSummary, PageDefinition, PageRule } from "../../../types/api";
import type { GuideAdvance, GuidePresentation, GuideStep, SurveyBranchRule, SurveyBranching, SurveyConfig, SurveyQuestion } from "../../../types/experiences";
import { guideStepSupportsTargetAdvance } from "../../../types/experiences";
import { AnchoredCardBehaviorEditor, BackdropBehaviorEditor } from "../ExperienceBehaviorFields";
import { advanceNames, branchOperators, moveStep, surveyFlowError, validOperators } from "./flowGraph";

const pageOperators: Record<PageRule["operator"], string> = {
  equals: "Equals", starts_with: "Starts with", ends_with: "Ends with", contains: "Contains", matches_pattern: "Matches pattern",
};

export function GuideProgression({ step, events, pages, onChange, onOpen }: {
  step: GuideStep;
  events: EventDefinitionSummary[];
  pages: PageDefinition[];
  onChange: (advance: GuideAdvance) => void;
  onOpen: () => void;
}) {
  const [advance, setAdvance] = useState<GuideAdvance>(step.advance ?? { type: "button" });
  const [error, setError] = useState("");
  const availableEvents = useId();
  const canTarget = guideStepSupportsTargetAdvance(step);
  const elementTarget = advance.type === "element_click" || advance.type === "element_hover" ? advance.target : undefined;
  function select(type: GuideAdvance["type"]) {
    setError("");
    switch (type) {
      case "route":
        setAdvance({ type, pageRules: [{ id: crypto.randomUUID(), kind: "include", operator: "equals", value: "" }] });
        break;
      case "custom_event":
        setAdvance({ type, eventName: "" });
        break;
      case "element_hover":
        setAdvance({ type, target: elementTarget, durationMs: 500 });
        break;
      case "element_click":
        setAdvance({ type, target: elementTarget });
        break;
      default:
        setAdvance({ type });
    }
  }
  const updateRouteRule = (index: number, changes: Partial<PageRule>) => {
    if (advance.type === "route")
      setAdvance({ ...advance, pageRules: advance.pageRules.map((rule, i) => i === index ? { ...rule, ...changes } : rule) });
  };
  const submit = (openTarget = false) => {
    if (advance.type === "route" && (!advance.pageRules.some(rule => rule.kind === "include") || advance.pageRules.some(rule => !rule.value.trim()))) {
      setError("Enter a value for every route rule and include at least one route.");
      return;
    }
    if (advance.type === "custom_event" && (!advance.eventName.trim() || /[\u0000-\u001f\u007f]/.test(advance.eventName))) {
      setError("Enter a valid event name.");
      return;
    }
    if (advance.type === "element_hover" && advance.durationMs !== undefined &&
      (!Number.isInteger(advance.durationMs) || advance.durationMs < 100 || advance.durationMs > 60000)) {
      setError("Hover duration must be between 100 and 60,000 ms.");
      return;
    }
    setError("");
    onChange(advance.type === "custom_event" ? { ...advance, eventName: advance.eventName.trim() } : advance);
    if (openTarget) onOpen();
  };
  return (
    <form className="flow-properties" onSubmit={event => { event.preventDefault(); submit(); }}>
      <label>Advance when
        <select value={advance.type} onChange={event => select(event.target.value as GuideAdvance["type"])}>
          {(Object.keys(advanceNames) as GuideAdvance["type"][]).filter(type => canTarget || (type !== "element_click" && type !== "element_hover")).map(type =>
            <option key={type} value={type}>{advanceNames[type]}</option>)}
        </select>
      </label>
      {advance.type === "custom_event" && <>
        <label>Event name
          <Input list={availableEvents} maxLength={200} value={advance.eventName} onChange={event => setAdvance({ ...advance, eventName: event.target.value })}/>
        </label>
        <datalist id={availableEvents}>{events.map(event => <option key={event.name} value={event.name}/>)}</datalist>
      </>}
      {advance.type === "route" && <>
        {!!pages.length && <label>Use a saved page
          <select value="" onChange={event => {
            const page = pages.find(item => item.id === event.target.value);
            if (page?.rules.length) setAdvance({ ...advance, pageRules: page.rules });
          }}>
            <option value="" disabled>Choose a page</option>
            {pages.filter(page => page.rules.length).map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
          </select>
        </label>}
        {advance.pageRules.map((rule, index) =>
          <fieldset className="flow-rule" key={rule.id}>
            <legend>Route rule {index + 1}</legend>
            <div className="flow-form-row">
              <select aria-label={`Route rule ${index + 1} type`} value={rule.kind} onChange={event => updateRouteRule(index, { kind: event.target.value as PageRule["kind"] })}>
                <option value="include">Include</option><option value="exclude">Exclude</option>
              </select>
              <select aria-label={`Route rule ${index + 1} match`} value={rule.operator} onChange={event => updateRouteRule(index, { operator: event.target.value as PageRule["operator"] })}>
                {Object.entries(pageOperators).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <Input aria-label={`Route rule ${index + 1} value`} value={rule.value} placeholder="/projects" maxLength={500}
              onChange={event => updateRouteRule(index, { value: event.target.value })}/>
            <Button type="button" size="sm" variant="ghost" disabled={advance.pageRules.length === 1}
              onClick={() => setAdvance({ ...advance, pageRules: advance.pageRules.filter((_, i) => i !== index) })}><Trash2 /> Remove rule</Button>
          </fieldset>)}
        <Button type="button" size="sm" variant="outline" disabled={advance.pageRules.length >= 30} onClick={() => setAdvance({
          ...advance, pageRules: [...advance.pageRules, { id: crypto.randomUUID(), kind: "include", operator: "equals", value: "" }],
        })}><Plus /> Add route rule</Button>
      </>}
      {advance.type === "element_hover" && <label>Hover duration (ms)
        <Input type="number" min={100} max={60000} step={1} required value={advance.durationMs ?? 500}
          onChange={event => setAdvance({ ...advance, durationMs: event.target.valueAsNumber })}/>
      </label>}
      {(advance.type === "element_hover" || advance.type === "element_click") && <>
        <p className="flow-property-note">{elementTarget?.label || (elementTarget ? elementTarget.primarySelector : step.target ? "Uses this step’s display target." : "Select an interaction target in the Live Editor.")}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => submit(true)}><ExternalLink /> Choose interaction target</Button>
      </>}
      {error && <p role="alert" className="flow-property-error">{error}</p>}
      <Button className="flow-apply" size="sm" type="submit">Apply progression</Button>
    </form>
  );
}

export function GuidePresentationSettings({ step, onChange }: {
  step: GuideStep;
  onChange: (label: string | undefined, presentation: GuidePresentation, behavior: GuideStep["behavior"]) => void;
}) {
  const [label, setLabel] = useState(step.label ?? "");
  const [delay, setDelay] = useState(step.presentation?.delayMs ?? 0);
  const [action, setAction] = useState<NonNullable<GuidePresentation["missingTarget"]>["action"]>(step.presentation?.missingTarget?.action ?? "wait");
  const [timeout, setTimeout] = useState(step.presentation?.missingTarget?.timeoutMs ?? 5000);
  const [behavior, setBehavior] = useState(step.behavior);
  const updateBehavior = (change: (value: GuideStep["behavior"]) => void) => {
    const next = { ...behavior };
    change(next);
    setBehavior(next);
  };
  const anchored = guideStepSupportsTargetAdvance(step);
  return <form className="flow-properties" onSubmit={event => {
    event.preventDefault();
    onChange(label.trim() || undefined, {
      delayMs: delay, missingTarget: anchored ? { action, timeoutMs: timeout } : undefined,
    }, behavior);
  }}>
    <label>Step name<Input value={label} maxLength={80} placeholder={step.content.heading || "Step name"} onChange={event => setLabel(event.target.value)}/></label>
    <label>Presentation delay (ms)<Input type="number" min={0} max={30000} step={1} required value={delay} onChange={event => setDelay(event.target.valueAsNumber)}/></label>
    {anchored && <>
      <label>When a target is missing
        <select value={action} onChange={event => setAction(event.target.value as typeof action)}>
          <option value="wait">Wait for target</option><option value="skip">Skip step after timeout</option><option value="dismiss">Dismiss guide after timeout</option>
        </select>
      </label>
      <label>Target wait timeout (ms)<Input type="number" min={100} max={60000} step={1} required value={timeout} onChange={event => setTimeout(event.target.valueAsNumber)}/></label>
    </>}
    <label className="flow-checkbox"><input type="checkbox" checked={behavior.dismissible}
      onChange={event => setBehavior({ ...behavior, dismissible: event.target.checked })}/> Allow dismissal</label>
    {anchored && <details className="flow-presentation-options">
      <summary>Placement and backdrop</summary>
      <AnchoredCardBehaviorEditor behavior={behavior} onChange={updateBehavior}/>
      <BackdropBehaviorEditor behavior={behavior} onChange={updateBehavior}/>
    </details>}
    <Button className="flow-apply" type="submit" size="sm">Apply presentation</Button>
  </form>;
}

function initialRule(question: SurveyQuestion, nextStepId: string): SurveyBranchRule {
  return {
    questionId: question.id,
    operator: validOperators(question)[0],
    value: "options" in question ? question.options[0]?.id : question.type === "rating" ? question.min : question.type === "nps" ? 0 : "",
    nextStepId,
  };
}

export function SurveyBranchSettings({ survey, index, focusedRule, onChange }: {
  survey: SurveyConfig;
  index: number;
  focusedRule?: number;
  onChange: (branching: SurveyBranching | undefined) => void;
}) {
  const step = survey.steps[index];
  const [branching, setBranching] = useState<SurveyBranching>(step.branching ?? { rules: [] });
  const [error, setError] = useState("");
  const later = survey.steps.slice(index + 1);
  const destinations = <>
    {later.map((item, offset) => <option key={item.id} value={item.id}>{index + offset + 2}. {item.content.heading || "Untitled slide"}</option>)}
    <option value="submit">Submit</option>
  </>;
  const setRule = (order: number, patch: Partial<SurveyBranchRule>) =>
    setBranching(value => ({ ...value, rules: value.rules.map((rule, position) => position === order ? { ...rule, ...patch } : rule) }));
  return (
    <form className="flow-properties" onSubmit={event => {
      event.preventDefault();
      const message = surveyFlowError({ ...survey, steps: survey.steps.map(item => item.id === step.id ? { ...item, branching } : item) });
      setError(message ?? "");
      if (!message) onChange(branching.rules.length || branching.defaultNextStepId ? branching : undefined);
    }}>
      <label>Default destination
        <select value={branching.defaultNextStepId ?? ""} onChange={event => setBranching({ ...branching, defaultNextStepId: event.target.value || undefined })}>
          {branching.defaultNextStepId && branching.defaultNextStepId !== "submit" && !later.some(item => item.id === branching.defaultNextStepId) && <option value={branching.defaultNextStepId}>Invalid destination</option>}
          <option value="">{later.length ? "Next slide" : "Submit after this slide"}</option>
          {destinations}
        </select>
      </label>
      {branching.rules.length > 0 && <p className="flow-property-note">Rules are evaluated in order. The first matching answer sets the destination.</p>}
      {branching.rules.map((rule, order) => {
        const question = step.questions.find(item => item.id === rule.questionId);
        return <fieldset key={order} className="flow-rule" data-active={order === focusedRule}>
          <legend>Rule {order + 1}</legend>
          <label>Question
            <select value={rule.questionId} onChange={event => {
              const selected = step.questions.find(item => item.id === event.target.value);
              if (selected) setRule(order, initialRule(selected, rule.nextStepId));
            }}>
              {!question && <option value={rule.questionId}>Deleted question</option>}
              {step.questions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {question && <label>Condition
            <select value={rule.operator} onChange={event => {
              const operator = event.target.value as SurveyBranchRule["operator"];
              setRule(order, { operator, value: operator === "answered" ? undefined : rule.value ?? initialRule(question, rule.nextStepId).value });
            }}>
              {!validOperators(question).includes(rule.operator) && <option value={rule.operator}>Unsupported condition</option>}
              {validOperators(question).map(operator => <option key={operator} value={operator}>{branchOperators[operator]}</option>)}
            </select>
          </label>}
          {question && rule.operator !== "answered" && <label>Answer
            {"options" in question ? (
              <select value={rule.value ?? ""} onChange={event => setRule(order, { value: event.target.value })}>
                {!question.options.some(option => option.id === rule.value) && <option value={rule.value ?? ""}>Choose an option</option>}
                {question.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            ) : question.type === "rating" || question.type === "nps" ? (
              <Input type="number" required step={1} min={question.type === "nps" ? 0 : question.min} max={question.type === "nps" ? 10 : question.max}
                value={typeof rule.value === "number" ? rule.value : ""} onChange={event => setRule(order, { value: event.target.valueAsNumber })}/>
            ) : <Input value={rule.value ?? ""} maxLength={10000} onChange={event => setRule(order, { value: event.target.value })}/>}
          </label>}
          <label>Go to
            <select value={rule.nextStepId} onChange={event => setRule(order, { nextStepId: event.target.value })}>
              {rule.nextStepId !== "submit" && !later.some(item => item.id === rule.nextStepId) && <option value={rule.nextStepId}>Invalid destination</option>}
              {destinations}
            </select>
          </label>
          <div className="flow-form-row">
            <Button type="button" size="icon" variant="ghost" aria-label={`Move rule ${order + 1} earlier`} disabled={order === 0}
              onClick={() => setBranching({ ...branching, rules: moveStep(branching.rules, order, -1) })}><ArrowUp /></Button>
            <Button type="button" size="icon" variant="ghost" aria-label={`Move rule ${order + 1} later`} disabled={order === branching.rules.length - 1}
              onClick={() => setBranching({ ...branching, rules: moveStep(branching.rules, order, 1) })}><ArrowDown /></Button>
            <Button type="button" size="icon" variant="ghost" aria-label={`Remove rule ${order + 1}`}
              onClick={() => setBranching({ ...branching, rules: branching.rules.filter((_, position) => position !== order) })}><Trash2 /></Button>
          </div>
        </fieldset>;
      })}
      <Button type="button" size="sm" variant="outline" disabled={!step.questions.length || branching.rules.length >= 10}
        onClick={() => setBranching({ ...branching, rules: [...branching.rules, initialRule(step.questions[0], later[0]?.id ?? "submit")] })}><Plus /> Add answer rule</Button>
      {!step.questions.length && <p className="flow-property-note">Add questions in the Live Editor to branch on answers.</p>}
      {error && <p role="alert" className="flow-property-error">{error}</p>}
      <Button className="flow-apply" size="sm" type="submit">Apply branching</Button>
    </form>
  );
}
