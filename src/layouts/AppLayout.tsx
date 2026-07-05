import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import { AcademicContextProvider } from "../features/academic/context/AcademicContextProvider";
import AcademicContextBar from "../features/academic/components/AcademicContextBar";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  // Mounted only for authenticated pages (school is known), so the
  // context reads/persists against a real school from the first render.
  return (
    <AcademicContextProvider>
      <div className="h-screen flex flex-col print:block print:h-auto">
        <div className="print:hidden">
          <Header />
          <AcademicContextBar />
        </div>

        <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
          <div className="print:hidden">
            <Sidebar />
          </div>

          <main className="flex-1 overflow-auto bg-slate-100 print:overflow-visible print:bg-white">
            {children}
          </main>
        </div>
      </div>
    </AcademicContextProvider>
  );
}
