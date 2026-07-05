import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "../app/AppShell";
import { DashboardPage } from "../features/dashboard";
import { SchoolsPage, CreateSchoolPage } from "../features/schools";
import {
  StudentDashboardPage,
  StudentRegistryPage,
  StudentProfilePage,
  GuardianProfilePage,
  AdmissionWizard,
} from "../features/students";
import { AcademicStructurePage } from "../features/academic";
import { SubjectsPage } from "../features/subjects";
import {
  TeacherDashboardPage,
  TeacherRegistryPage,
  TeacherRegisterPage,
  TeacherProfilePage,
} from "../features/teachers";
import { TeachingAssignmentsPage } from "../features/teaching";
import { SbaPlansPage } from "../features/assessments";
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
              <StudentDashboardPage />
            </AppShell>
          }
        />

        <Route
          path="/students/registry"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <StudentRegistryPage />
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
          path="/academic/structure"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <AcademicStructurePage />
            </AppShell>
          }
        />

        <Route
          path="/subjects"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <SubjectsPage />
            </AppShell>
          }
        />

        <Route
          path="/teachers"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <TeacherDashboardPage />
            </AppShell>
          }
        />

        <Route
          path="/teachers/registry"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <TeacherRegistryPage />
            </AppShell>
          }
        />

        <Route
          path="/teachers/register"
          element={
            <AppShell roles={["school_admin"]}>
              <TeacherRegisterPage />
            </AppShell>
          }
        />

        <Route
          path="/teachers/:employeeNumber"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <TeacherProfilePage />
            </AppShell>
          }
        />

        <Route
          path="/teaching"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <TeachingAssignmentsPage />
            </AppShell>
          }
        />

        <Route
          path="/assessments/plans"
          element={
            <AppShell roles={["school_admin", "head_teacher", "hod"]}>
              <SbaPlansPage />
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
