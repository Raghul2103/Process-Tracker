import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="text-lg font-bold text-slate-800">
          Process Tracker
        </Link>
        <div className="flex gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            Reports
          </NavLink>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
