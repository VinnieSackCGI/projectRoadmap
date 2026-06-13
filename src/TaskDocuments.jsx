import React, { useRef, useState } from "react";
import { addTaskDocument, removeTaskDocument } from "./taskStore";
import { formatDateLabel } from "./workItemUtils";

const MAX_BYTES = 3 * 1024 * 1024;

function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDocuments({ task }) {
  const documents = Array.isArray(task.documents) ? task.documents : [];
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("File exceeds the 3 MB local pilot limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addTaskDocument(task.id, {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: String(reader.result)
      });
      setError("");
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="task-documents">
      {documents.length === 0 ? (
        <p className="note">No documents attached yet.</p>
      ) : (
        <ul className="document-list">
          {documents.map((doc) => (
            <li key={doc.id} className="document-item">
              <div className="document-main">
                {doc.dataUrl ? (
                  <a className="table-link" href={doc.dataUrl} download={doc.name}>{doc.name}</a>
                ) : (
                  <span>{doc.name}</span>
                )}
                <span className="burnout-meta">
                  {formatSize(doc.size)} · {doc.uploadedBy} · {formatDateLabel(doc.uploadedAt?.slice(0, 10))}
                </span>
              </div>
              <button
                type="button"
                className="secondary-btn document-remove"
                onClick={() => removeTaskDocument(task.id, doc.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="document-upload">
        <button type="button" className="secondary-btn" onClick={() => inputRef.current?.click()}>
          Upload document
        </button>
        <input ref={inputRef} type="file" className="visually-hidden-input" onChange={handleFile} />
        <span className="note">Stored locally for the pilot (max 3 MB per file).</span>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
