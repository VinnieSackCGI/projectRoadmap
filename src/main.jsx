import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppErrorBoundary from "./AppErrorBoundary";
import RootApp from "./RootApp";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <RootApp />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
