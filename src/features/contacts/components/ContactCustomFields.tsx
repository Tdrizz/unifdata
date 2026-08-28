// Settings has full CRUD for *defining* custom fields (see
// src/features/settings/components/CustomFieldsSettings.tsx), but nothing
// ever let a user set a *value* on a record — a field could be created and
// then never used. This is that missing piece for contacts, the only entity
// type Settings currently offers ("entity_type: contact" is hardcoded
// there). Values are saved as part of the same form submit as the rest of
// the contact edit (see updateContactAction), not a separate save step.

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

export type CustomFieldDef = {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  options: string[] | null;
  required: boolean;
  position: number;
};

/** Form field name a given definition's input is submitted under. */
export function customFieldInputName(fieldId: string): string {
  return `custom_${fieldId}`;
}

/**
 * Editable inputs for every field the org has defined on contacts, meant to
 * be dropped inside the existing contact edit <form> — one extra section,
 * not a second form or a separate save action.
 */
export function ContactCustomFieldsEdit({
  fields,
  values,
}: {
  fields: CustomFieldDef[];
  values: Record<string, string | null>;
}) {
  if (fields.length === 0) return null;

  return (
    <div>
      <span className="block text-xs font-semibold text-ud-muted mb-2">Custom fields</span>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <CustomFieldInput key={field.id} field={field} value={values[field.id] ?? null} />
        ))}
      </div>
    </div>
  );
}

function CustomFieldInput({ field, value }: { field: CustomFieldDef; value: string | null }) {
  const name = customFieldInputName(field.id);
  const label = (
    <span className="block text-xs font-semibold text-ud-muted">
      {field.label} {field.required && <span className="text-ud-accent">*</span>}
    </span>
  );

  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-center gap-2 pt-5">
        <input type="checkbox" name={name} defaultChecked={value === "true"} className="rounded" />
        <span className="text-[13px] text-ud-ink">{field.label}</span>
      </label>
    );
  }

  if (field.field_type === "select") {
    return (
      <label className="block">
        {label}
        <select name={name} defaultValue={value ?? ""} className={f}>
          <option value="">—</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.field_type === "multiselect") {
    // Stored as a comma-joined string (custom_field_values.value is a single
    // TEXT column, no array type) -- split back out to know which checkboxes
    // were previously checked.
    const selected = new Set((value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    return (
      <div className="block">
        {label}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[13px] text-ud-ink">
              <input type="checkbox" name={name} value={opt} defaultChecked={selected.has(opt)} className="rounded" />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const inputType = field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : field.field_type === "url" ? "url" : "text";

  return (
    <label className="block">
      {label}
      <input type={inputType} name={name} defaultValue={value ?? ""} className={f} />
    </label>
  );
}

/** Read-only display for the contact detail page's Details panel. */
export function ContactCustomFieldsDisplay({
  fields,
  values,
}: {
  fields: CustomFieldDef[];
  values: Record<string, string | null>;
}) {
  const withValues = fields.filter((f) => values[f.id]);
  if (withValues.length === 0) return null;

  return (
    <>
      {withValues.map((field) => (
        <div key={field.id} className="flex items-start gap-2">
          <span className="text-[11px] text-ud-faint w-[90px] shrink-0 mt-0.5">{field.label}</span>
          <span className="text-[13px] text-ud-ink break-words">
            {field.field_type === "checkbox"
              ? (values[field.id] === "true" ? "Yes" : "No")
              : values[field.id]}
          </span>
        </div>
      ))}
    </>
  );
}
