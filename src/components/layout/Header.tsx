export default function Header() {
  return (
    <header className="h-16 bg-blue-700 flex items-center justify-between px-6 text-white shadow">

      <div>
        <h1 className="text-xl font-bold">
          School Information Management System
        </h1>
      </div>

      <div className="text-sm">
        Not Signed In
      </div>

    </header>
  );
}