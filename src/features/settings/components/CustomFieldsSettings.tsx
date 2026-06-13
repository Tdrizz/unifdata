"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  createCustomFieldAction,
  updateCustomFieldAction,
  deleteCustomFieldAction,
  reorderCustomFieldAction,
} from "../actions";

export type CustomFieldDef = {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  options: string[] | null;
  required: boolean;
  position: number;
  entity_type: string;
};

type Props = {
  orgId: string;
  contactFields: CustomFieldDef[];
  recordFields: CustomFieldDef[];
};

const FIELD_TYPES = ["text", "number", "date", "select", "multiselect", "checkbox", "url"];

const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms] disabled:opacity-40";

type FormState = {
  label: string;
  field_type: string;
  options: string;
  required: boolean;
};

const emptyForm: FormState = { label: "", field_type: "text", options: "", required: false };

function FieldForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const showOptions = form.field_type === "select" || form.field_type === "multiselect";

  return (
    <div className="p-3 rounded-[10px] border border-ud bg-ud-bg mt-2 mb-2">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="form-label">Label</label>
          <input
            className="form-input"
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
          />
        </div>
        <div>
          <label className="form-label">Type</label>
          <select
            className="form-input"
            value={form.field_type}
            onChange={(e) => setForm((p) => ({ ...p, field_type: e.target.value }))}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {showOptions && (
        <div className="mb-3">
          <label className="form-label">Options (one per line)</label>
          <textarea
            className="form-input"
            rows={4}
            value={form.options}
            onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
          />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          id="field-required"
          checked={form.required}
          onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="field-required" className="text-[12.5px] text-ud-ink cursor-pointer">Required</label>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <button type="button" className={btnInk} onClick={() => onSave(form)} disabled={!form.label.trim()}>Save</button>
      </div>
    </div>
  );
}

function FieldList({
  orgId,
  entityType,
  fields,
  setFields,
}: {
  orgId: string;
  entityType: string;
  fields: CustomFieldDef[];
  setFields: (updater: (prev: CustomFieldDef[]) => CustomFieldDef[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAdd(form: FormState) {
    const opts = form.options.trim()
      ? form.options.split("\n").map((s) => s.trim()).filter(Boolean)
      : null;
    startTransition(async () => {
      try {
        await createCustomFieldAction(orgId, entityType, form.label, form.field_type, opts, form.required);
        setFields((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            label: form.label,
            field_key: form.label.toLowerCase().replace(/\s+/g, "_"),
            field_type: form.field_type,
            options: opts,
            required: form.required,
            position: prev.length,
            entity_type: entityType,
          },
        ]);
        setShowAdd(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create field");
      }
    });
  }

  function handleEdit(fieldId: string, form: FormState) {
    const opts = form.options.trim()
      ? form.options.split("\n").map((s) => s.trim()).filter(Boolean)
      : null;
    startTransition(async () => {
      try {
        await updateCustomFieldAction(fieldId, form.label, form.field_type, opts, form.required);
        setFields((prev) =>
          prev.map((f) =>
            f.id === fieldId
              ? { ...f, label: form.label, field_type: form.field_type, options: opts, required: form.required }
              : f
          )
        );
        setEditingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update field");
      }
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      try {
        await deleteCustomFieldAction(fieldId);
        setFields((prev) => prev.filter((f) => f.id !== fieldId));
        setDeletingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete field");
      }
    });
  }

  function handleReorder(fieldId: string, direction: "up" | "down") {
    startTransition(async () => {
      try {
        await reorderCustomFieldAction(fieldId, orgId, entityType, direction);
        setFields((prev) => {
          const sorted = [...prev].sort((a, b) => a.position - b.position);
          const idx = sorted.findIndex((f) => f.id === fieldId);
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
          const next = [...sorted];
          [next[idx].position, next[swapIdx].position] = [next[swapIdx].position, next[idx].position];
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reorder field");
      }
    });
  }

  const sorted = [...fields].sort((a, b) => a.position - b.position);

  return (
    <div>
      {error && <p className="text-[12px] text-ud-danger mb-2">{error}</p>}

      {sorted.length === 0 && !showAdd && (
        <p className="text-[12px] text-ud-muted mb-2">No custom fields yet.</p>
      )}

      {sorted.map((field, idx) => (
        <div key={field.id}>
          {editingId === field.id ? (
            <FieldForm
              initial={{
                label: field.label,
                field_type: field.field_type,
                options: (field.options ?? []).join("\n"),
                required: field.required,
              }}
              onSave={(form) => handleEdit(field.id, form)}
              onCancel={() => setEditingId(null)}
            />
          ) : deletingId === field.id ? (
            <div className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.04)]">
              <span className="flex-1 text-[13px] font-medium text-ud-ink">{field.label}</span>
              <span className="text-[12px] text-ud-muted">This will delete all saved values.</span>
              <div className="flex gap-1.5">
                <Button type="button" variant="secondary" size="sm" onClick={() => setDeletingId(null)}>Cancel</Button>
                <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(field.id)}>Delete</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-b-0">
              <span className="text-[13px] font-medium text-ud-ink flex-1">{field.label}</span>
              <span className="inline-flex items-center px-[7px] py-[2px] rounded-[5px] text-[11px] font-semibold bg-ud-surface border border-ud text-ud-muted">{field.field_type}</span>
              {field.required && (
                <span className="inline-flex items-center px-[7px] py-[2px] rounded-[5px] text-[11px] font-semibold text-[#8B5CF6] bg-[rgba(139,92,246,0.08)]">required</span>
              )}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={idx === 0}
                  onClick={() => handleReorder(field.id, "up")}
                  style={{ padding: "4px 7px", opacity: idx === 0 ? 0.3 : 1 }}
                >↑</Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={idx === sorted.length - 1}
                  onClick={() => handleReorder(field.id, "down")}
                  style={{ padding: "4px 7px", opacity: idx === sorted.length - 1 ? 0.3 : 1 }}
                >↓</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(field.id)}>Edit</Button>
                <Button type="button" variant="danger" size="sm" onClick={() => setDeletingId(field.id)}>Delete</Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <FieldForm initial={emptyForm} onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      ) : (
        <div className="mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(true)}>+ Add field</Button>
        </div>
      )}
    </div>
  );
}

export function CustomFieldsSettings({ orgId, contactFields, recordFields }: Props) {
  const [activeTab, setActiveTab] = useState<"contacts" | "records">("contacts");
  const [contactFieldsState, setContactFieldsState] = useState<CustomFieldDef[]>(contactFields);
  const [recordFieldsState, setRecordFieldsState] = useState<CustomFieldDef[]>(recordFields);

  return (
    <div>
      <div className="flex gap-0 border-b border-ud mb-4">
        {(["contacts", "records"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`text-[13px] font-semibold pb-2.5 px-1 mr-5 border-b-2 transition-[color,border-color] duration-[120ms] ${
              activeTab === tab
                ? "border-ud-accent text-ud-ink"
                : "border-transparent text-ud-muted hover:text-ud-ink"
            }`}
          >
            {tab === "contacts" ? "Contacts" : "Process Records"}
          </button>
        ))}
      </div>

      {activeTab === "contacts" ? (
        <FieldList
          orgId={orgId}
          entityType="contact"
          fields={contactFieldsState}
          setFields={setContactFieldsState}
        />
      ) : (
        <FieldList
          orgId={orgId}
          entityType="process_record"
          fields={recordFieldsState}
          setFields={setRecordFieldsState}
        />
      )}
    </div>
  );
}
