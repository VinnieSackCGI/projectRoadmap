import React from "react";
import { NavLink } from "react-router-dom";
import RoadmapSwitcher from "./RoadmapSwitcher";
import logoWhite from "../design/dos-flag-seal-logo-horizontal-color-whitetext.png";

const NAV_ITEMS = [
  { to: "/", label: "Roadmap", end: true },
  { to: "/tasks", label: "Work Items" },
  { to: "/staffing", label: "Staffing" },
  { to: "/executive", label: "Executive" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/help", label: "Guide" }
];

const CURRENT_USER = {
  name: "Vinson Sack",
  role: "Regional PM"
};

function initialsOf(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AppHeader() {
  return (
    <header className="page-header">
      <div className="page-header-bottom">
        <div className="brand">
          <img src={logoWhite} alt="Department of State seal logo" />
        </div>
        <RoadmapSwitcher />
        <nav className="nav-bar" aria-label="Primary" role="tablist">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              role="tab"
              className={({ isActive }) =>
                `nav-tab ${isActive ? "active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-chip" title={`${CURRENT_USER.name} — ${CURRENT_USER.role}`}>
          <span className="user-avatar" aria-hidden="true">
            {initialsOf(CURRENT_USER.name)}
          </span>
          <span className="user-meta">
            <span className="user-name">{CURRENT_USER.name}</span>
            <span className="user-role">{CURRENT_USER.role}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
