import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "../app/AppShell";
import { DashboardPage } from "../features/dashboard";
import { SchoolsPage, CreateSchoolPage } from "../features/schools";
import {
  StudentsPage,
  StudentProfilePage,
  GuardianProfilePage,
  AdmissionWizard,
} from "../features/students";
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

        <Route
          path="/students"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <StudentsPage />
            </AppShell>
          }
        />

        <Route
          path="/students/admit"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <AdmissionWizard />
            </AppShell>
          }
        />

        <Route
          path="/students/guardians/:guardianId"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <GuardianProfilePage />
            </AppShell>
          }
        />

        <Route
          path="/students/:studentNumber"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <StudentProfilePage />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
