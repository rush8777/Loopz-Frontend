import {
  Background, BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow,
  ReactFlowProvider, getBezierPath, useNodesState, useReactFlow,
  type Edge, type EdgeProps, type Node, type NodeProps,
} from "@xyflow/react";
import { Button } from "@movcues/ui";
import { ArrowLeft, ArrowRight, Check, CirclePlay, Copy, ExternalLink, Focus, LocateFixed, Minus, Plus, Route, ScanLine, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EventDefinitionSummary, PageDefinition } from "../../../types/api";
import type { Experience, ExperienceDefinition, GuideStep, GuideStepPattern } from "../../../types/experiences";
import { isGuideDefinition, isWidgetDefinition } from "../../../types/experiences";
import { guideStepPage, END, moveStep, projectFlow, START, stepNodeId, surveyFlowError, type FlowConnection, type FlowStep } from "./flowGraph";
import { FlowPreview, previewPayload } from "./FlowPreview";
import { GuidePresentationSettings, GuideProgression, SurveyBranchSettings } from "./FlowProperties";
import "@xyflow/react/dist/style.css";
import "./experienceFlow.css";

const nodeWidth = 292;
const nodeHeight = 250;
const column = nodeWidth + 152;
const terminalWidth = 104;
const terminalHeight = 42;

type StepNode = Node<{ step: FlowStep; payload: string }, "step">;
type TerminalNode = Node<{ label: string; end?: boolean }, "terminal">;
type CanvasNode = StepNode | TerminalNode;
type CanvasEdge = Edge<{
  connection: FlowConnection;
  lane?: number;
  onSelect: () => void;
  onInsert?: () => void;
}, "flow">;
type Selection = { kind: "step" | "connection"; id: string } | { kind: "add"; index: number };
type Props = {
  experience: Experience;
  definition: ExperienceDefinition;
  events?: EventDefinitionSummary[];
  pages?: PageDefinition[];
  editable: boolean;
  onOpenLive: (stepId?: string) => void;
  onOpenSettings: () => void;
  onSelectStep: (stepId?: string) => void;
  onChange: (definition: ExperienceDefinition) => void;
  onCreateGuideStep: (pattern: GuideStepPattern) => GuideStep;
};

function StepCard({ data, selected }: NodeProps<StepNode>) {
  const { step, payload } = data;
  return (
    <article className="flow-card" data-selected={selected}>
      {step.index !== undefined && <>
        <Handle type="target" position={Position.Left} isConnectable={false}/>
        <Handle type="source" position={Position.Right} isConnectable={false}/>
        <Handle type="source" id="branch-out" position={Position.Bottom} className="flow-branch-handle flow-branch-out" isConnectable={false}/>
        <Handle type="target" id="branch-in" position={Position.Bottom} className="flow-branch-handle flow-branch-in" isConnectable={false}/>
      </>}
      <header className="flow-card-header flow-node-drag">
        {step.index !== undefined && <span className="flow-card-index">{step.index + 1}</span>}
        <div className="flow-card-name">
          <div title={step.label}>{step.label}</div>
          <span>{step.format}</span>
        </div>
      </header>
      <FlowPreview payload={payload} label={step.label}/>
      <footer className="flow-card-footer">
        {step.needsTarget ? <>
          <span className="flow-target" data-missing={!step.target}><span className="flow-dot"/>{step.target ? "Target set" : "Select target"}</span>
          {step.target?.targetContext?.pagePath && <span className="flow-path" title={step.target.targetContext.pagePath}>{step.target.targetContext.pagePath}</span>}
        </> : step.index === undefined ? <span className="flow-target"><span className="flow-dot"/>Standalone</span> : <span className="flow-target"><span className="flow-dot"/>On screen</span>}
      </footer>
    </article>
  );
}

function Terminal({ data }: NodeProps<TerminalNode>) {
  return (
    <div className="flow-terminal">
      {data.end ? <>
        <Handle type="target" position={Position.Left} isConnectable={false}/>
        <Handle type="target" position={Position.Bottom} id="branch-in" className="flow-branch-handle" isConnectable={false}/>
        <Check size={15}/>
      </> : <>
        <Handle type="source" position={Position.Right} isConnectable={false}/>
        <CirclePlay size={15}/>
      </>}
      {data.label}
    </div>
  );
}

function FlowEdge({ id, data, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, markerEnd, selected }: EdgeProps<CanvasEdge>) {
  if (!data) return null;
  const { connection, lane } = data;
  const branchY = Math.max(sourceY, targetY) + 64 + (lane ?? 0) * 37;
  const turn = 19;
  const forward = targetX >= sourceX ? 1 : -1;
  const [regular, centerX, centerY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const [path, x, y] = lane === undefined || Math.abs(targetX - sourceX) < 2 * turn
    ? [regular, centerX, centerY]
    : [`M ${sourceX} ${sourceY} V ${branchY - turn} Q ${sourceX} ${branchY} ${sourceX + forward * turn} ${branchY}
      H ${targetX - forward * turn} Q ${targetX} ${branchY} ${targetX} ${branchY - turn} V ${targetY}`, (sourceX + targetX) / 2, branchY];
  const invalid = "invalid" in connection && connection.invalid;
  const color = invalid ? "var(--flow-alert)" : selected || connection.kind === "rule" ? "var(--flow-accent)" : "var(--flow-line)";
  return <>
    <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: color, strokeWidth: selected ? 2.2 : 1.5, strokeDasharray: invalid ? "3 4" : undefined }}/>
    <EdgeLabelRenderer>
      {(connection.label || data.onInsert) && <div className="flow-edge-label nodrag nopan" style={{ transform: `translate(-50%,-50%) translate(${x}px,${y}px)` }}>
        {connection.label && <button type="button" className="flow-edge-button" title={connection.label}
          aria-label={`Configure ${connection.kind === "rule" ? `rule ${connection.order + 1}: ` : ""}${connection.label}`}
          aria-pressed={selected ?? false} data-selected={selected} data-branch={connection.kind === "rule"} data-invalid={invalid}
          onClick={event => { event.stopPropagation(); data.onSelect(); }}>{connection.kind === "rule" && <span>{connection.order + 1}</span>}{connection.label}</button>}
        {data.onInsert && <button type="button" className="flow-insert" aria-label="Insert guide step" onClick={event => {
          event.stopPropagation();
          data.onInsert?.();
        }}><Plus size={14}/></button>}
      </div>}
    </EdgeLabelRenderer>
  </>;
}

const nodeTypes = { step: StepCard, terminal: Terminal };
const edgeTypes = { flow: FlowEdge };
const sameOrder = (nodes: CanvasNode[], next: CanvasNode[]) =>
  nodes.length === next.length && nodes.every((node, index) => node.id === next[index].id);

function Canvas({ experience, definition, events = [], pages = [], editable, onOpenLive, onOpenSettings, onSelectStep, onChange, onCreateGuideStep }: Props) {
  const graph = useMemo(() => projectFlow(experience, definition), [experience, definition]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [problem, setProblem] = useState("");
  const [arranging, setArranging] = useState(false);
  const arrangementTimer = useRef<number | undefined>(undefined);
  const panelRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();
  const reduceMotion = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 230 : 0;
  const guide = isGuideDefinition(definition) ? definition : undefined;
  const widget = isWidgetDefinition(definition) ? definition : undefined;
  const survey = widget?.survey;
  const connection = selection?.kind === "connection" ? graph.connections.find(edge => edge.id === selection.id) : undefined;
  const active = selection?.kind === "step" ? graph.steps.find(step => step.id === selection.id)
    : connection && "stepId" in connection ? graph.steps.find(step => step.stepId === connection.stepId) : undefined;
  const activeGuide = active?.stepId ? guide?.steps.find(step => step.id === active.stepId) : undefined;
  const count = graph.steps.length;
  const dragging = useRef(false);
  useEffect(() => { onSelectStep(active?.stepId); }, [active?.stepId, onSelectStep]);

  const layout = useMemo((): CanvasNode[] => {
    const steps: CanvasNode[] = graph.steps.map((step, index) => ({
      id: step.id, type: "step", position: { x: index * column, y: 0 }, width: nodeWidth, height: nodeHeight,
      dragHandle: ".flow-node-drag", ariaLabel: step.index === undefined ? step.label : `Step ${step.index + 1}: ${step.label}`,
      data: { step, payload: JSON.stringify(previewPayload(experience, definition, step)) },
    }));
    if (!graph.terminal) return steps;
    const y = (nodeHeight - terminalHeight) / 2;
    return [
      { id: START, type: "terminal", position: { x: -terminalWidth - 88, y }, width: terminalWidth, height: terminalHeight,
        data: { label: "Start" }, draggable: false, selectable: false, focusable: false },
      ...steps,
      { id: END, type: "terminal", position: { x: (steps.length - 1) * column + nodeWidth + 146, y }, width: terminalWidth,
        height: terminalHeight, data: { label: graph.terminal, end: true }, draggable: false, selectable: false, focusable: false },
    ];
  }, [graph, definition, experience]);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(layout);

  useEffect(() => {
    setNodes(previous => {
      const preserve = sameOrder(previous, layout);
      return layout.map((node, index) => ({
        ...node, position: preserve ? previous[index].position : node.position, selected: node.id === active?.id,
      }));
    });
  }, [layout, active?.id, setNodes]);

  const fit = () => {
    const bounds = reactFlow.getNodesBounds(reactFlow.getNodes());
    const maxLane = edges.reduce((max, edge) => Math.max(max, edge.data?.lane ?? -1), -1);
    void reactFlow.fitBounds({ ...bounds, height: bounds.height + (maxLane >= 0 ? 86 + maxLane * 37 : 0) }, { padding: 0.15, duration: reduceMotion() });
  };
  const centerAfterArrangement = () => {
    animateArrangement();
    setNodes(layout.map(node => ({ ...node, selected: node.id === active?.id })));
    requestAnimationFrame(fit);
  };
  const animateArrangement = () => {
    const duration = reduceMotion();
    if (!duration) return;
    clearTimeout(arrangementTimer.current);
    setArranging(true);
    arrangementTimer.current = window.setTimeout(() => setArranging(false), duration);
  };
  useEffect(() => () => clearTimeout(arrangementTimer.current), []);
  const select = (next: Selection | null) => {
    setProblem("");
    setSelection(next);
  };

  const byId = new Map(layout.map(node => [node.id, node.position.x]));
  const edges: CanvasEdge[] = graph.connections.map(connection => {
    const index = graph.steps.findIndex(step => step.id === connection.from);
    const longDefault = connection.kind === "default" && (byId.get(connection.to) ?? 0) - (byId.get(connection.from) ?? 0) > column + 1;
    const lane = connection.kind === "rule" ? connection.lane + 1 : longDefault ? 0 : undefined;
    const insert = guide && editable && count < 20 ? () => select({ kind: "add", index: index + 1 }) : undefined;
    return {
      id: connection.id, source: connection.from, target: connection.to, type: "flow",
      sourceHandle: lane === undefined ? undefined : "branch-out", targetHandle: lane === undefined ? undefined : "branch-in",
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: connection.kind === "rule" ? "#2a797a" : "#8c9eb3" },
      selected: selection?.kind === "connection" && selection.id === connection.id,
      focusable: connection.kind !== "start", selectable: connection.kind !== "start",
      ariaLabel: connection.label,
      data: { connection, lane, onSelect: () => select({ kind: "connection", id: connection.id }), onInsert: insert },
    };
  });

  const changeGuide = (steps: GuideStep[]) => { if (guide && editable) onChange({ ...guide, steps }); };
  const changeGuideStep = (step: GuideStep) => {
    if (guide) {
      changeGuide(guide.steps.map(item => item.id === step.id ? step : item));
      requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    }
  };
  const move = (delta: -1 | 1) => {
    if (active?.index === undefined) return;
    if (guide) {
      animateArrangement();
      changeGuide(moveStep(guide.steps, active.index, delta));
    }
    if (survey && widget && editable) {
      const candidate = { ...survey, steps: moveStep(survey.steps, active.index, delta) };
      const error = surveyFlowError(candidate);
      if (error) setProblem(error);
      else {
        animateArrangement();
        onChange({ ...widget, survey: candidate });
      }
    }
  };
  const remove = () => {
    if (!active || count <= 1 || !editable) return;
    if (survey && widget) {
      const candidate = { ...survey, steps: survey.steps.filter(step => step.id !== active.stepId) };
      const error = surveyFlowError(candidate);
      if (error) {
        setProblem("Update any paths that lead to this slide before removing it.");
        return;
      }
      if (!window.confirm(`Remove “${active.label}” from the survey?`)) return;
      onChange({ ...widget, survey: candidate });
    } else if (guide) {
      if (!window.confirm(`Remove “${active.label}” from the guide?`)) return;
      changeGuide(guide.steps.filter(step => step.id !== active.stepId));
    }
    select(null);
  };
  const add = (pattern: GuideStepPattern) => {
    if (selection?.kind !== "add" || !guide || count >= 20) return;
    const step = onCreateGuideStep(pattern);
    const steps = [...guide.steps];
    steps.splice(selection.index, 0, step);
    changeGuide(steps);
    select({ kind: "step", id: stepNodeId(step.id) });
    requestAnimationFrame(() => {
      const position = selection.index * column;
      void reactFlow.setCenter(position + nodeWidth / 2, nodeHeight / 2, { zoom: Math.max(reactFlow.getZoom(), 0.85), duration: reduceMotion() });
    });
  };
  const duplicate = () => {
    if (!activeGuide || !guide || active?.index === undefined || count >= 20) return;
    const newId = onCreateGuideStep(activeGuide.pattern ?? "anchored_card").id;
    const label = `${(activeGuide.label || activeGuide.content.heading || "Step").slice(0, 75).trimEnd()} copy`;
    const steps = [...guide.steps];
    steps.splice(active.index + 1, 0, { ...activeGuide, id: newId, label });
    changeGuide(steps);
    select({ kind: "step", id: stepNodeId(newId) });
  };

  const inspectorKey = selection?.kind === "add" ? `add:${selection.index}` : selection?.id;
  useEffect(() => {
    if (inspectorKey) panelRef.current?.focus({ preventScroll: true });
  }, [inspectorKey]);

  const before = active?.index !== undefined && active.index > 0;
  const after = active?.index !== undefined && active.index < count - 1;
  const empty = count === 0;
  const pending = experience.guidedCapturePending;
  const activePath = guideStepPage(activeGuide) || active?.target?.targetContext?.pagePath;
  const inspectorOpen = !!active || selection?.kind === "add";
  const resetFocus = () => {
    select(null);
    const node = active && canvasRef.current?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(active.id)}"]`);
    (node || canvasRef.current)?.focus({ preventScroll: true });
  };

  return (
    <section ref={canvasRef} tabIndex={-1} aria-label="Experience flow canvas" className="experience-flow" data-arranging={arranging} onKeyDown={event => {
      if (event.key === "Escape" && selection) { event.stopPropagation(); resetFocus(); }
    }}>
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={onNodesChange} onNodeClick={(_, node) => {
          if (!dragging.current && node.type === "step") select({ kind: "step", id: node.id });
        }}
        onEdgeClick={(_, edge) => { if (edge.data?.connection.kind !== "start") select({ kind: "connection", id: edge.id }); }}
        onNodeDragStart={() => { dragging.current = true; setArranging(false); }}
        onNodeDragStop={() => { dragging.current = false; }}
        onPaneClick={() => select(null)} nodesConnectable={false}
        panOnScroll zoomOnScroll={false} zoomOnDoubleClick={false} minZoom={0.12} maxZoom={1.65}
        deleteKeyCode={null} selectionKeyCode={null} multiSelectionKeyCode={null}
        elevateEdgesOnSelect={false} onlyRenderVisibleElements fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        colorMode="system"
        onKeyDown={event => {
          const node = (event.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
          const id = node?.dataset.id;
          if (id && (event.key === "Enter" || event.key === " ") && graph.steps.some(item => item.id === id)) {
            event.preventDefault();
            select({ kind: "step", id });
          }
        }}
      >
        <Background gap={20} color="var(--flow-dot-grid)" size={1.15}/>
      </ReactFlow>
      <div className="flow-canvas-top">
        <div className="flow-canvas-info"><Route size={16}/><span>Flow</span>
          {!!count && <small>{guide ? `${count} ${count === 1 ? "step" : "steps"}` : survey ? `${count} ${count === 1 ? "slide" : "slides"}` : graph.steps[0].format}</small>}
        </div>
        {guide && editable && !pending && !!count && <Button size="sm" variant="outline" disabled={count >= 20}
          onClick={() => select({ kind: "add", index: count })}><Plus /> Add step</Button>}
      </div>
      {empty && !inspectorOpen && <div className="flow-empty">
        <span className="flow-empty-icon"><ScanLine size={25}/></span>
        <h2>{pending ? "Finish capturing your guide" : "Start your flow"}</h2>
        <p>{pending ? "Apply your Guided Capture preview to see the steps and their progression here." : "Add the first step to begin building your experience."}</p>
        {pending ? <Button size="sm" onClick={() => onOpenLive()}><ExternalLink /> Resume Guided Capture</Button>
          : guide && editable && <Button size="sm" onClick={() => select({ kind: "add", index: 0 })}><Plus /> Add first step</Button>}
      </div>}
      {!empty && <div className="flow-canvas-controls" aria-label="Canvas navigation">
        <Button size="icon" variant="ghost" aria-label="Zoom out" onClick={() => void reactFlow.zoomOut({ duration: reduceMotion() })}><Minus /></Button>
        <Button size="icon" variant="ghost" aria-label="Zoom in" onClick={() => void reactFlow.zoomIn({ duration: reduceMotion() })}><Plus /></Button>
        <Button size="icon" variant="ghost" aria-label="Fit flow to view" onClick={fit}><Focus /></Button>
        <Button size="icon" variant="ghost" aria-label="Arrange flow" onClick={centerAfterArrangement}><ScanLine /></Button>
      </div>}
      {inspectorOpen && <aside ref={panelRef} tabIndex={-1} className="flow-inspector" aria-label={selection?.kind === "add" ? "Add guide step" : connection ? "Connection settings" : "Step settings"}>
        <div className="flow-inspector-header">
          <div><span>{selection?.kind === "add" ? "Guide" : connection ? "Connection" : active?.format}</span>
            <h2>{selection?.kind === "add" ? "Add a step" : active?.label}</h2></div>
          <Button size="icon" variant="ghost" aria-label="Close flow settings" onClick={resetFocus}><X /></Button>
        </div>
        {selection?.kind === "add" ? (
          <div className="flow-step-options">
            <button type="button" aria-label="Add modal step" onClick={() => add("modal")}><strong>Modal</strong><span>Show a message on screen</span></button>
            <button type="button" aria-label="Add anchored card step" onClick={() => add("anchored_card")}><strong>Anchored card</strong><span>Point to an element on your site</span></button>
          </div>
        ) : <>
          <div className="flow-step-actions">
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenLive(active?.stepId)}><ExternalLink /> Edit on site</Button>
            {active?.needsTarget && <Button type="button" size="sm" variant="ghost" onClick={() => onOpenLive(active.stepId)}><LocateFixed /> {active.target ? "Reselect target" : "Select target"}</Button>}
            {activePath && <span title={activePath} className="flow-inspector-path">{activePath}</span>}
            {active?.index === undefined && <Button type="button" size="sm" variant="ghost" onClick={onOpenSettings}>Launch settings</Button>}
          </div>
          {editable && active?.index !== undefined && !connection && <div className="flow-order">
            <Button type="button" size="icon" variant="ghost" aria-label="Move step earlier" disabled={!before} onClick={() => move(-1)}><ArrowLeft /></Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Move step later" disabled={!after} onClick={() => move(1)}><ArrowRight /></Button>
            {guide && <Button type="button" size="icon" variant="ghost" aria-label="Duplicate step" disabled={count >= 20} onClick={duplicate}><Copy /></Button>}
            <Button type="button" size="icon" variant="ghost" aria-label="Remove step" disabled={count <= 1} onClick={remove}><Trash2 /></Button>
          </div>}
          {problem && <p className="flow-property-error" role="alert">{problem}</p>}
          {editable && activeGuide && connection?.kind === "guide" && <GuideProgression
            key={`${activeGuide.id}:${JSON.stringify(activeGuide.advance)}`} step={activeGuide} pages={pages} events={events}
            onChange={advance => changeGuideStep({ ...activeGuide, advance })} onOpen={() => onOpenLive(activeGuide.id)}
          />}
          {editable && activeGuide && !connection && <GuidePresentationSettings
            key={`${activeGuide.id}:${activeGuide.label}:${JSON.stringify(activeGuide.presentation)}`} step={activeGuide}
            onChange={(label, presentation, behavior) => changeGuideStep({ ...activeGuide, label, presentation, behavior })}
          />}
          {editable && survey && widget && active?.index !== undefined && <SurveyBranchSettings
            key={`${active.stepId}:${connection?.id ?? "node"}:${JSON.stringify(survey.steps[active.index].branching)}`}
            survey={survey} index={active.index} focusedRule={connection?.kind === "rule" ? connection.order : undefined}
            onChange={branching => {
              onChange({ ...widget, survey: { ...survey, steps: survey.steps.map(step => step.id === active.stepId ? { ...step, branching } : step) } });
              requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
            }}
          />}
        </>}
      </aside>}
    </section>
  );
}

export function ExperienceFlowCanvas(props: Props) {
  return <ReactFlowProvider><Canvas {...props}/></ReactFlowProvider>;
}
