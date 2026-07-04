import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import { DashboardPage } from "../features/dashboard";
import { SchoolsPage, CreateSchoolPage } from "../features/schools";
import { LoginPage } from "../features/auth";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route path="/schools/new" element={<CreateSchoolPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
