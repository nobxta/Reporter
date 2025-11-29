import Link from "next/link";

interface HeaderProps {
  showLogin?: boolean;
  showLogout?: boolean;
  showHistory?: boolean;
  showSettings?: boolean;
}

export default function Header({ showLogin = false, showLogout = false, showHistory = false, showSettings = false }: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <span className="text-white font-bold text-sm">TG</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              TG Report Shield
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {showHistory && (
              <Link
                href="/history"
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium hover:scale-105 shadow-sm hover:shadow-md"
              >
                History
              </Link>
            )}
            {showSettings && (
              <Link
                href="/settings"
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium hover:scale-105 shadow-sm hover:shadow-md"
              >
                Settings
              </Link>
            )}
            {showLogin && (
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                Login
              </Link>
            )}
            {showLogout && (
              <button
                onClick={async () => {
                  await fetch("/api/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

