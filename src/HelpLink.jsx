import React from "react";
import { Link } from "react-router-dom";

export default function HelpLink({ section, label = "How to use this page" }) {
  return (
    <Link className="help-link" to={`/help#${section}`} title={label} aria-label={label}>
      <span className="help-link-mark" aria-hidden="true">?</span>
      <span className="help-link-text">Help</span>
    </Link>
  );
}
