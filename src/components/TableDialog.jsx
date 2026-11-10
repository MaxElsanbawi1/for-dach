import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const smallButton = "rounded border px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50";
const removeButton = "h-7 w-7 flex-shrink-0 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:invisible";

// Rendered through a portal because the editor sits inside the article form:
// inputs there would submit the whole form when Enter is pressed.
export default function TableDialog({ initialRows, isNew, onSave, onDelete, onClose }) {
  const [rows, setRows] = useState(initialRows);
  const columnCount = rows[0].length;
  const hasText = rows.some((row) => row.some((cell) => cell.trim()));

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const setCell = (rowIndex, columnIndex, text) => {
    setRows((current) =>
      current.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === columnIndex ? text : cell)) : row))
    );
  };
  const addRow = () => setRows((current) => [...current, Array(columnCount).fill("")]);
  const addColumn = () => setRows((current) => current.map((row) => [...row, ""]));
  const removeRow = (rowIndex) => setRows((current) => current.filter((_, r) => r !== rowIndex));
  const removeColumn = (columnIndex) =>
    setRows((current) => current.map((row) => row.filter((_, c) => c !== columnIndex)));

  const save = () => onSave(rows.map((row) => row.map((cell) => cell.trim())));

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div role="dialog" aria-modal="true" aria-label="جدول" className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">{isNew ? "إضافة جدول" : "تعديل الجدول"}</h3>
          <p className="mt-1 text-xs text-gray-500">الصف الأول هو عناوين الأعمدة.</p>
        </div>

        <div className="flex-1 space-y-2 overflow-auto p-5">
          <div className="flex items-center gap-2">
            {rows[0].map((_, columnIndex) => (
              <div key={columnIndex} className="flex min-w-[10rem] flex-1 justify-center">
                <button
                  type="button"
                  aria-label={`حذف العمود ${columnIndex + 1}`}
                  title="حذف العمود"
                  disabled={columnCount <= 1}
                  onClick={() => removeColumn(columnIndex)}
                  className={removeButton}
                >
                  ×
                </button>
              </div>
            ))}
            <span className="w-7 flex-shrink-0" />
          </div>

          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              {row.map((cell, columnIndex) => (
                <input
                  key={columnIndex}
                  autoFocus={rowIndex === 0 && columnIndex === 0}
                  value={cell}
                  aria-label={`الصف ${rowIndex + 1}، العمود ${columnIndex + 1}`}
                  onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)}
                  className={`min-w-[10rem] flex-1 rounded border p-2 text-sm ${rowIndex === 0 ? "bg-gray-100 font-bold" : ""}`}
                />
              ))}
              <button
                type="button"
                aria-label={`حذف الصف ${rowIndex + 1}`}
                title="حذف الصف"
                disabled={rows.length <= 1}
                onClick={() => removeRow(rowIndex)}
                className={removeButton}
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={addRow} className={smallButton}>+ صف</button>
            <button type="button" onClick={addColumn} className={smallButton}>+ عمود</button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t px-5 py-4">
          <button
            type="button"
            disabled={!hasText}
            onClick={save}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isNew ? "إضافة" : "حفظ"}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border px-5 py-2 text-sm">إلغاء</button>
          {!isNew && (
            <button type="button" onClick={onDelete} className="ms-auto rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              حذف الجدول
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
