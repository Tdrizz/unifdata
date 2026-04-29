"use client";

import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CsvRow = Record<string, string>;

type Mapping = {
  name: string;
  phone: string;
  email: string;
  address: string;
  customerType: string;
  notes: string;
};

const emptyMapping: Mapping = {
  name: "",
  phone: "",
  email: "",
  address: "",
  customerType: "",
  notes: "",
};

const importFields = [
  { key: "name", label: "Customer name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "address", label: "Address", required: false },
  { key: "customerType", label: "Customer type", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim();
}

function guessColumn(columns: string[], possibleNames: string[]) {
  return (
    columns.find((column) =>
      possibleNames.includes(column.toLowerCase().trim()),
    ) || ""
  );
}

export function ImportCustomersClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const mappedCustomers = useMemo(() => {
    return rows
      .map((row) => ({
        name: mapping.name ? String(row[mapping.name] || "").trim() : "",
        phone: mapping.phone ? String(row[mapping.phone] || "").trim() : "",
        email: mapping.email ? String(row[mapping.email] || "").trim() : "",
        address: mapping.address
          ? String(row[mapping.address] || "").trim()
          : "",
        customerType: mapping.customerType
          ? String(row[mapping.customerType] || "").trim()
          : "",
        notes: mapping.notes ? String(row[mapping.notes] || "").trim() : "",
      }))
      .filter((customer) => customer.name);
  }, [rows, mapping]);

  function resetImport() {
    setFileName("");
    setRows([]);
    setColumns([]);
    setMapping(emptyMapping);
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function updateMapping(field: keyof Mapping, value: string) {
    setMapping((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    resetImport();

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage("Please upload a CSV file.");
      return;
    }

    setFileName(file.name);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => {
        const parsedRows = results.data.filter((row) =>
          Object.values(row).some((value) => String(value || "").trim()),
        );

        if (results.errors.length > 0) {
          setMessage(`CSV parsed with warnings: ${results.errors[0]?.message}`);
        }

        if (parsedRows.length === 0) {
          setMessage("No rows found in this CSV.");
          return;
        }

        const detectedColumns = Object.keys(parsedRows[0] || {}).map(
          normalizeHeader,
        );

        if (detectedColumns.length <= 1) {
          setMessage(
            "This CSV only appears to have one column. Open the file and make sure it is comma-separated with headers like name, phone, email, address.",
          );
          setRows(parsedRows);
          setColumns(detectedColumns);
          return;
        }

        setRows(parsedRows);
        setColumns(detectedColumns);

        setMapping({
          name: guessColumn(detectedColumns, [
            "name",
            "customer",
            "customer name",
            "client",
            "client name",
          ]),
          phone: guessColumn(detectedColumns, [
            "phone",
            "phone number",
            "mobile",
            "cell",
            "cell phone",
          ]),
          email: guessColumn(detectedColumns, ["email", "email address"]),
          address: guessColumn(detectedColumns, [
            "address",
            "street address",
            "location",
            "property address",
          ]),
          customerType: guessColumn(detectedColumns, [
            "type",
            "customer type",
            "customer_type",
            "category",
          ]),
          notes: guessColumn(detectedColumns, [
            "notes",
            "note",
            "comments",
            "description",
          ]),
        });
      },
      error: (error) => {
        setMessage(error.message);
      },
    });
  }

  async function importCustomers() {
    setMessage("");

    if (!mapping.name) {
      setMessage("You must map the Customer name field.");
      return;
    }

    if (mappedCustomers.length === 0) {
      setMessage(
        "No valid customers found. Make sure name is mapped correctly.",
      );
      return;
    }

    if (mappedCustomers.length > 500) {
      setMessage("For now, import 500 customers or fewer at a time.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/imports/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: fileName || "customer-import.csv",
        customers: mappedCustomers,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "Import failed.");
      return;
    }

    setMessage(`Imported ${data.imported} customers successfully.`);
    resetImport();
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Import customers</h2>

      <p className="mt-2 text-sm text-slate-500">
        Upload a CSV, map each spreadsheet column, preview the mapped customer
        records, then import.
      </p>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-800"
        />

        {fileName && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Selected file: <span className="font-semibold">{fileName}</span>
            </p>

            <button
              type="button"
              onClick={resetImport}
              className="text-sm font-semibold text-slate-600 hover:text-slate-950"
            >
              Clear file
            </button>
          </div>
        )}
      </div>

      {columns.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold">Map columns</h3>

            <p className="mt-1 text-sm text-slate-500">
              Make sure each FrontierOps field points to the correct CSV column.
              Do not map every field to the same column.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {importFields.map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-slate-700">
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-red-600">*</span>
                    )}
                  </label>

                  <select
                    value={mapping[field.key]}
                    onChange={(event) =>
                      updateMapping(field.key, event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">Do not import</option>

                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={importCustomers}
              disabled={loading}
              className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Importing..."
                : `Import ${mappedCustomers.length} customers`}
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50">
            <div className="border-b border-emerald-200 p-5">
              <h3 className="font-bold text-emerald-950">Mapped preview</h3>
              <p className="mt-1 text-sm text-emerald-800">
                This is exactly what will be saved to FrontierOps.
              </p>
            </div>

            {mappedCustomers.length === 0 ? (
              <div className="p-5 text-sm text-emerald-800">
                No mapped customers yet. Map the Customer name field first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-emerald-100/60 text-emerald-900">
                    <tr>
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Phone</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Address</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-emerald-100 bg-white">
                    {mappedCustomers.slice(0, 10).map((customer, index) => (
                      <tr key={index}>
                        <td className="p-3 font-semibold text-slate-950">
                          {customer.name || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {customer.phone || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {customer.email || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {customer.address || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {customer.customerType || "—"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {customer.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 p-5">
              <h3 className="font-bold">Raw CSV preview</h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing first 10 rows out of {rows.length}.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th key={column} className="p-3 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="max-w-xs p-3 text-slate-600"
                        >
                          {row[column] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}
    </section>
  );
}
