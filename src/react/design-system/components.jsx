import React from "react";
import { tokens } from "./tokens.js";

export function Button({ variant = "primary", children, asChild = false, ...props }) {
  const className = `rr-btn rr-btn-${variant}`;

  if (asChild && React.isValidElement(children)) {
    const { className: childClassName, ...childProps } = children.props;

    return React.cloneElement(children, {
      ...childProps,
      ...props,
      className: [className, childClassName, props.className].filter(Boolean).join(" ")
    });
  }

  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}

export function Card({ title, eyebrow, children }) {
  return (
    <article className="rr-card">
      {eyebrow ? <p className="rr-eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="rr-card-title">{title}</h2> : null}
      <div className="rr-card-body">{children}</div>
    </article>
  );
}

export function Input(props) {
  return <input className="rr-input" {...props} />;
}

export function Badge({ tone = "accent", children }) {
  return <span className={`rr-badge rr-badge-${tone}`}>{children}</span>;
}

export function Table({ columns, rows }) {
  return (
    <div className="rr-table-wrap">
      <table className="rr-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Toast({ tone = "info", title, message }) {
  return (
    <div className={`rr-toast rr-toast-${tone}`} role="status" aria-live="polite">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export function Dropdown({ label, items }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rr-dropdown">
      <Button variant="secondary" onClick={() => setOpen((value) => !value)}>{label}</Button>
      {open ? (
        <div className="rr-dropdown-menu">
          {items.map((item) => (
            <button key={item.label} type="button" className="rr-dropdown-item" onClick={item.onSelect}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="rr-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="rr-modal" role="dialog" aria-modal="true" aria-labelledby="rr-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="rr-modal-header">
          <h3 id="rr-modal-title">{title}</h3>
          <button type="button" className="rr-modal-close" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <div className="rr-modal-body">{children}</div>
      </div>
    </div>
  );
}

export const designSystemMeta = tokens;
