import { useCallback, useState } from "react";
import { prepareWorkItemDraftForSave, updateWorkItemDraft } from "./workItemUtils";

export default function useWorkItemEditor({
  createEmptyDraft,
  onCreate,
  onUpdate,
  onDelete
}) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("edit");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [draft, setDraft] = useState(createEmptyDraft());
  const [validationError, setValidationError] = useState("");

  const openCreateEditor = useCallback((seed) => {
    // Guard against being used directly as an onClick handler (seed = event).
    const isPlainSeed =
      seed &&
      typeof seed === "object" &&
      !seed.nativeEvent &&
      typeof seed.preventDefault !== "function";
    setEditorMode("create");
    setEditingTaskId(null);
    setDraft(isPlainSeed ? { ...createEmptyDraft(), ...seed } : createEmptyDraft());
    setValidationError("");
    setIsEditorOpen(true);
  }, [createEmptyDraft]);

  const openEditEditor = useCallback((task) => {
    if (!task) {
      return;
    }

    setEditorMode("edit");
    setEditingTaskId(task.id);
    setDraft({ ...createEmptyDraft(), ...task });
    setValidationError("");
    setIsEditorOpen(true);
  }, [createEmptyDraft]);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setValidationError("");
  }, []);

  const updateDraft = useCallback((field, value) => {
    setDraft((previous) => updateWorkItemDraft(previous, field, value));
  }, []);

  const saveDraft = useCallback(() => {
    const result = prepareWorkItemDraftForSave(draft);
    if (result.error) {
      setValidationError(result.error);
      return null;
    }

    const normalized = result.value;
    const saved = editorMode === "edit" && editingTaskId
      ? onUpdate(editingTaskId, normalized)
      : onCreate(normalized);

    setIsEditorOpen(false);
    setValidationError("");
    return saved;
  }, [draft, editingTaskId, editorMode, onCreate, onUpdate]);

  const deleteDraftTask = useCallback(() => {
    if (editorMode !== "edit" || !editingTaskId) {
      return;
    }

    onDelete(editingTaskId);
    setIsEditorOpen(false);
    setValidationError("");
  }, [editingTaskId, editorMode, onDelete]);

  return {
    draft,
    editingTaskId,
    editorMode,
    isEditorOpen,
    validationError,
    closeEditor,
    deleteDraftTask,
    openCreateEditor,
    openEditEditor,
    saveDraft,
    updateDraft
  };
}