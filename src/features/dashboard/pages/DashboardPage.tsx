import { useAuth } from "../../auth/hooks/useAuth";
import TeacherDashboard from "../components/TeacherDashboard";
import AdminDashboard from "../components/AdminDashboard";

const LEADERSHIP_ROLES = ["school_admin", "head_teacher", "deputy_head", "hod"];

export default function Dashboard() {
  const { profile, school } = useAuth();

  // A teacher-linked account (has an employee number) lands on their own
  // SBA workspace; school leadership gets the cockpit.
  if (profile?.role === "teacher" || profile?.employeeNumber) {
    return <TeacherDashboard />;
  }
  if (school && LEADERSHIP_ROLES.includes(profile?.role ?? "")) {
    return <AdminDashboard />;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-3 text-gray-600">
        Welcome to the School Information Management System.
      </p>
    </div>
  );
}
