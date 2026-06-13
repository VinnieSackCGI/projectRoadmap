import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RoadmapPage from "./App";
import TasksPage from "./TasksPage";
import TaskDetailsPage from "./TaskDetailsPage";
import StaffingPage from "./StaffingPage";
import ExecutiveDashboardPage from "./ExecutiveDashboardPage";
import "./App.css";

export default function RootApp() {
  return (
    <Routes>
      <Route path="/" element={<RoadmapPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/tasks/:taskId" element={<TaskDetailsPage />} />
      <Route path="/staffing" element={<StaffingPage />} />
      <Route path="/executive" element={<ExecutiveDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
