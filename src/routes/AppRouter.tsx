import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "../app/AppShell";
import { DashboardPage } from "../features/dashboard";
import { SchoolsPage, CreateSchoolPage } from "../features/schools";
import { LoginPage } from "../features/auth";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />

        <Route
          path="/schools"
          element={
            <AppShell roles={["super_admin"]}>
              <SchoolsPage />
            </AppShell>
          }
        />

        <Route
          path="/schools/new"
          element={
            <AppShell roles={["super_admin"]}>
              <CreateSchoolPage />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
