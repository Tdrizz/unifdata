"use client";

import { useState, useTransition } from "react";
import {
  createBoardAction,
  renameBoardAction,
  deleteBoardAction,
  createStageAction,
  renameStageAction,
  updateStageColorAction,
  updateStageTypeAction,
  reorderStageAction,
  deleteStageAction,
} from "../actions";

export type BoardStage = { id: string; name: string; position: number; color: string; stage_type: string };
export type Board = { id: string; name: string; is_default: boolean; stages: BoardStage[] };
type Props = { orgId: string; boards: Board[] };

const STAGE_COLORS = ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6", "#6B7280"];
const STAGE_TYPES = ["active", "completed", "cancelled"];

const btnGhost = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";
const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms] disabled:opacity-40";
const btnDanger = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-red-500 hover:border-red-300 transition-[color,border-color] duration-[120ms] disabled:opacity-40";

function ColorSwatch({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: (c: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(color)}
      className="w-4 h-4 rounded-full border-2 transition-all"
      style={{
        background: color,
        borderColor: selected ? "#171614" : "transparent",
        transform: selected ? "scale(1.2)" : "scale(1)",
      }}
      aria-label={color}
    />
  );
}

type StageTypeKey = "active" | "completed" | "cancelled";
const stageTypeBadgeColors: Record<StageTypeKey, string> = {
  active: "bg-blue-50 text-blue-600",
  completed: "bg-green-50 text-green-600",
  cancelled: "bg-gray-100 text-gray-500",
};

function StageRow({
  stage,
  isFirst,
  isLast,
  boardId,
  otherStages,
  onUpdate,
  onDelete,
}: {
  stage: BoardStage;
  isFirst: boolean;
  isLast: boolean;
  boardId: string;
  otherStages: BoardStage[];
  onUpdate: (updated: BoardStage) => void;
  onDelete: (stageId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(stage.name);
  const [deleting, setDeleting] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>(otherStages[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRename() {
    if (!renameVal.trim()) return;
    startTransition(async () => {
      try {
        await renameStageAction(stage.id, renameVal.trim());
        onUpdate({ ...stage, name: renameVal.trim() });
        setRenaming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename");
      }
    });
  }

  function handleColorChange(color: string) {
    startTransition(async () => {
      try {
        await updateStageColorAction(stage.id, color);
        onUpdate({ ...stage, color });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update color");
      }
    });
  }

  function handleTypeChange(stageType: string) {
    startTransition(async () => {
      try {
        const result = await updateStageTypeAction(stage.id, stageType);
        if (result?.error) { setError(result.error); return; }
        onUpdate({ ...stage, stage_type: stageType });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update type");
      }
    });
  }

  function handleReorder(direction: "up" | "down") {
    startTransition(async () => {
      try {
        await reorderStageAction(stage.id, boardId, direction);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reorder");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteStageAction(stage.id, reassignTo || undefined);
        if (result?.error) { setError(result.error); return; }
        onDelete(stage.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete stage");
      }
    });
  }

  if (deleting) {
    return (
      <div className="flex flex-col gap-2 py-2.5 border-b border-[rgba(0,0,0,0.04)]">
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-ud-ink flex-1">{stage.name}</span>
          {otherStages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ud-muted">Reassign records to:</span>
              <select
                className="form-input text-[12px] py-1"
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
              >
                {otherStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className={btnGhost} onClick={() => { setDeleting(false); setError(null); }}>Cancel</button>
          <button type="button" className={btnDanger} onClick={handleDelete}>
            {otherStages.length > 0 ? "Confirm delete + reassign" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-b-0">
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: stage.color }} />

        {renaming ? (
          <>
            <input
              className="form-input flex-1"
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
              autoFocus
            />
            <button type="button" className={btnGhost} onClick={() => setRenaming(false)}>Cancel</button>
            <button type="button" className={btnInk} onClick={handleRename}>Save</button>
          </>
        ) : (
          <>
            <span className="text-[13px] font-medium text-ud-ink flex-1">{stage.name}</span>
            <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[5px] text-[11px] font-semibold ${stageTypeBadgeColors[stage.stage_type as StageTypeKey] ?? "bg-ud-surface text-ud-muted"}`}>
              {stage.stage_type}
            </span>

            <div className="flex items-center gap-1">
              {STAGE_COLORS.map((c) => (
                <ColorSwatch key={c} color={c} selected={stage.color === c} onSelect={handleColorChange} />
              ))}
            </div>

            <select
              className="form-input text-[11px] py-[3px] px-2"
              value={stage.stage_type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {STAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <div className="flex items-center gap-1">
              <button type="button" className={btnGhost} disabled={isFirst} onClick={() => handleReorder("up")} style={{ padding: "3px 6px", opacity: isFirst ? 0.3 : 1 }}>↑</button>
              <button type="button" className={btnGhost} disabled={isLast} onClick={() => handleReorder("down")} style={{ padding: "3px 6px", opacity: isLast ? 0.3 : 1 }}>↓</button>
              <button type="button" className={btnGhost} onClick={() => { setRenaming(true); setRenameVal(stage.name); }}>Rename</button>
              <button type="button" className={btnGhost} style={{ color: "var(--danger, #dc2626)" }} onClick={() => { setDeleting(true); setError(null); }}>×</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BoardCard({
  board,
  orgId,
  onUpdate,
  onDelete,
}: {
  board: Board;
  orgId: string;
  onUpdate: (updated: Board) => void;
  onDelete: (boardId: string) => void;
}) {
  const [expanded, setExpanded] = useState(board.is_default);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(board.name);
  const [deleting, setDeleting] = useState(false);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[3]);
  const [newStageType, setNewStageType] = useState("active");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const stages = [...board.stages].sort((a, b) => a.position - b.position);

  function handleRename() {
    if (!renameVal.trim()) return;
    startTransition(async () => {
      try {
        await renameBoardAction(board.id, renameVal.trim());
        onUpdate({ ...board, name: renameVal.trim() });
        setRenaming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename board");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteBoardAction(board.id);
        if (result?.error) { setError(result.error); return; }
        onDelete(board.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete board");
      }
    });
  }

  function handleAddStage() {
    if (!newStageName.trim()) return;
    startTransition(async () => {
      try {
        const result = await createStageAction(board.id, orgId, newStageName.trim(), newStageColor, newStageType);
        if (result?.error) { setError(result.error); return; }
        const newStage: BoardStage = {
          id: crypto.randomUUID(),
          name: newStageName.trim(),
          color: newStageColor,
          stage_type: newStageType,
          position: stages.length,
        };
        onUpdate({ ...board, stages: [...board.stages, newStage] });
        setNewStageName("");
        setNewStageColor(STAGE_COLORS[3]);
        setNewStageType("active");
        setShowAddStage(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add stage");
      }
    });
  }

  function handleStageUpdate(updated: BoardStage) {
    onUpdate({ ...board, stages: board.stages.map((s) => (s.id === updated.id ? updated : s)) });
  }

  function handleStageDelete(stageId: string) {
    onUpdate({ ...board, stages: board.stages.filter((s) => s.id !== stageId) });
  }

  return (
    <div className="border border-ud rounded-[10px] mb-3">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => !renaming && !deleting && setExpanded((p) => !p)}
      >
        <span className="text-[12px] text-ud-muted select-none">{expanded ? "▾" : "▸"}</span>

        {renaming ? (
          <>
            <input
              className="form-input flex-1"
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <button type="button" className={btnGhost} onClick={(e) => { e.stopPropagation(); setRenaming(false); }}>Cancel</button>
            <button type="button" className={btnInk} onClick={(e) => { e.stopPropagation(); handleRename(); }}>Save</button>
          </>
        ) : (
          <>
            <span className="text-[13.5px] font-semibold text-ud-ink flex-1">{board.name}</span>
            {board.is_default && (
              <span className="inline-flex items-center px-[8px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-accent text-white">default</span>
            )}
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button type="button" className={btnGhost} onClick={() => { setRenaming(true); setRenameVal(board.name); }}>Rename</button>
              {!board.is_default && (
                <button type="button" className={btnGhost} style={{ color: "var(--danger, #dc2626)" }} onClick={() => setDeleting(true)}>Delete</button>
              )}
            </div>
          </>
        )}
      </div>

      {error && <p className="text-[12px] text-red-500 px-4 pb-2">{error}</p>}

      {deleting && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <span className="text-[12px] text-ud-muted">Delete this board and all its stages?</span>
          <button type="button" className={btnGhost} onClick={() => { setDeleting(false); setError(null); }}>Cancel</button>
          <button type="button" className={btnDanger} onClick={handleDelete}>Confirm delete</button>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-ud">
          <div className="mt-3">
            {stages.length === 0 && (
              <p className="text-[12px] text-ud-muted mb-2">No stages yet.</p>
            )}
            {stages.map((stage, idx) => (
              <StageRow
                key={stage.id}
                stage={stage}
                isFirst={idx === 0}
                isLast={idx === stages.length - 1}
                boardId={board.id}
                otherStages={stages.filter((s) => s.id !== stage.id)}
                onUpdate={handleStageUpdate}
                onDelete={handleStageDelete}
              />
            ))}

            {showAddStage ? (
              <div className="mt-3 p-3 rounded-[10px] border border-ud bg-ud-bg">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    className="form-input flex-1"
                    placeholder="Stage name"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddStage(); if (e.key === "Escape") setShowAddStage(false); }}
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {STAGE_COLORS.map((c) => (
                      <ColorSwatch key={c} color={c} selected={newStageColor === c} onSelect={setNewStageColor} />
                    ))}
                  </div>
                  <select
                    className="form-input text-[12px] py-[5px]"
                    value={newStageType}
                    onChange={(e) => setNewStageType(e.target.value)}
                  >
                    {STAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className={btnGhost} onClick={() => setShowAddStage(false)}>Cancel</button>
                  <button type="button" className={btnInk} onClick={handleAddStage} disabled={!newStageName.trim()}>Add</button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <button type="button" className={btnGhost} onClick={() => setShowAddStage(true)}>+ Add stage</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProcessBoardsSettings({ orgId, boards: initialBoards }: Props) {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleCreateBoard() {
    if (!newBoardName.trim()) return;
    startTransition(async () => {
      try {
        const result = await createBoardAction(orgId, newBoardName.trim());
        if ("error" in result) { setError(result.error); return; }
        setBoards((prev) => [
          ...prev,
          {
            id: result.id,
            name: newBoardName.trim(),
            is_default: false,
            stages: [
              { id: crypto.randomUUID(), name: "New", color: "#3B82F6", stage_type: "active", position: 0 },
              { id: crypto.randomUUID(), name: "In Progress", color: "#F59E0B", stage_type: "active", position: 1 },
              { id: crypto.randomUUID(), name: "Under Review", color: "#8B5CF6", stage_type: "active", position: 2 },
              { id: crypto.randomUUID(), name: "Completed", color: "#22C55E", stage_type: "completed", position: 3 },
              { id: crypto.randomUUID(), name: "Cancelled", color: "#6B7280", stage_type: "cancelled", position: 4 },
            ],
          },
        ]);
        setNewBoardName("");
        setShowNewBoard(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create board");
      }
    });
  }

  return (
    <div>
      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

      {showNewBoard && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-[10px] border border-ud bg-ud-bg">
          <input
            className="form-input flex-1"
            placeholder="Board name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateBoard(); if (e.key === "Escape") setShowNewBoard(false); }}
            autoFocus
          />
          <button type="button" className={btnGhost} onClick={() => setShowNewBoard(false)}>Cancel</button>
          <button type="button" className={btnInk} onClick={handleCreateBoard} disabled={!newBoardName.trim()}>Create</button>
        </div>
      )}

      {boards.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          orgId={orgId}
          onUpdate={(updated) => setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))}
          onDelete={(boardId) => setBoards((prev) => prev.filter((b) => b.id !== boardId))}
        />
      ))}

      {!showNewBoard && (
        <div className="mt-2">
          <button type="button" className={btnGhost} onClick={() => setShowNewBoard(true)}>+ New board</button>
        </div>
      )}
    </div>
  );
}
