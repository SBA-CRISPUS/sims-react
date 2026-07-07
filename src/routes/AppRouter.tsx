import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppShell from "../app/AppShell";
import { DashboardPage } from "../features/dashboard";
import {
  SchoolsPage,
  CreateSchoolPage,
  SchoolProfilePage,
} from "../features/schools";
import {
  StudentDashboardPage,
  StudentRegistryPage,
  StudentProfilePage,
  TranscriptPage,
  TransferCertificatePage,
  ReportCardPage,
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
import {
  SbaPlansPage,
  SbaMarksPage,
  SbaReviewPage,
  SbaReadinessPage,
  SbaRegisterPage,
  SbaExamNumbersPage,
  SbaExportPage,
} from "../features/assessments";
import { SbaSeedPage, BulkAdmitPage } from "../features/dev";
import { MyClassesPage } from "../features/myclasses";
import { ReportsPage } from "../features/reports";
import { TransfersPage } from "../features/transfers";
import StaffAccountsPage from "../features/staff/pages/StaffAccountsPage";
import AccountPasswordPage from "../features/auth/pages/AccountPasswordPage";
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
          path="/my-classes"
          element={
            <AppShell roles={["teacher", "hod", "head_teacher", "deputy_head"]}>
              <MyClassesPage />
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
          path="/assessments/marks"
          element={
            <AppShell roles={["school_admin", "head_teacher", "hod", "teacher"]}>
              <SbaMarksPage />
            </AppShell>
          }
        />

        <Route
          path="/assessments/review"
          element={
            <AppShell roles={["school_admin", "head_teacher", "deputy_head", "hod"]}>
              <SbaReviewPage />
            </AppShell>
          }
        />

        <Route
          path="/assessments/readiness"
          element={
            <AppShell roles={["school_admin", "head_teacher", "deputy_head", "hod"]}>
              <SbaReadinessPage />
            </AppShell>
          }
        />

        <Route
          path="/assessments/register"
          element={
            <AppShell roles={["school_admin", "head_teacher", "deputy_head", "hod", "teacher"]}>
              <SbaRegisterPage />
            </AppShell>
          }
        />

        <Route
          path="/assessments/exam-numbers"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <SbaExamNumbersPage />
            </AppShell>
          }
        />

        <Route
          path="/assessments/export"
          element={
            <AppShell roles={["school_admin", "head_teacher", "deputy_head"]}>
              <SbaExportPage />
            </AppShell>
          }
        />

        <Route
          path="/school"
          element={
            <AppShell roles={["school_admin"]}>
              <SchoolProfilePage />
            </AppShell>
          }
        />

        <Route
          path="/reports"
          element={
            <AppShell roles={["school_admin", "head_teacher", "deputy_head", "hod"]}>
              <ReportsPage />
            </AppShell>
          }
        />

        <Route
          path="/transfers"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <TransfersPage />
            </AppShell>
          }
        />

        <Route
          path="/dev/seed"
          element={
            <AppShell roles={["school_admin"]}>
              <SbaSeedPage />
            </AppShell>
          }
        />

        <Route
          path="/dev/bulk-admit"
          element={
            <AppShell roles={["school_admin"]}>
              <BulkAdmitPage />
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

        <Route
          path="/students/:studentNumber/transcript"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <TranscriptPage />
            </AppShell>
          }
        />

        <Route
          path="/students/:studentNumber/transfer-certificate"
          element={
            <AppShell roles={["school_admin", "head_teacher"]}>
              <TransferCertificatePage />
            </AppShell>
          }
        />

        <Route
          path="/students/:studentNumber/report-card"
          element={
            <AppShell roles={["school_admin", "head_teacher", "teacher"]}>
              <ReportCardPage />
            </AppShell>
          }
        />

        <Route
          path="/staff"
          element={
            <AppShell roles={["school_admin"]}>
              <StaffAccountsPage />
            </AppShell>
          }
        />

        <Route
          path="/account/password"
          element={
            <AppShell>
              <AccountPasswordPage />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
