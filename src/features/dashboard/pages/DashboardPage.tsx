import { useAuth } from "../../auth/hooks/useAuth";
import TeacherDashboard from "../components/TeacherDashboard";

export default function Dashboard() {
  const { profile } = useAuth();

  // A teacher-linked account (has an employee number) lands on their own
  // SBA workspace; everyone else gets the generic welcome for now.
  if (profile?.role === "teacher" || profile?.employeeNumber) {
    return <TeacherDashboard />;
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
