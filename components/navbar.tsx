"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Menu, X, History, Settings, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavbarProps {
  showLogin?: boolean;
  showLogout?: boolean;
  showHistory?: boolean;
  showSettings?: boolean;
}

export default function Navbar({
  showLogin = false,
  showLogout = false,
  showHistory = false,
  showSettings = false,
}: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 w-full"
    >
      <nav className="bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow"
              >
                <Shield className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold text-white">
                TG Report Shield
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {showHistory && (
                  <Link href="/history">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-2 text-white hover:bg-gray-900",
                        pathname === "/history" && "bg-gray-900"
                      )}
                    >
                      <History className="w-4 h-4" />
                      History
                    </Button>
                  </Link>
                )}
                {showSettings && (
                  <Link href="/settings">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-2 text-white hover:bg-gray-900",
                        pathname === "/settings" && "bg-gray-900"
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Button>
                  </Link>
                )}
              {showLogin && (
                <Link href="/login">
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600">
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </Link>
              )}
              {showLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-gray-800 text-white hover:bg-gray-900"
                  onClick={async () => {
                    await fetch("/api/logout", { method: "POST" });
                    window.location.href = "/login";
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-900 transition-colors text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 space-y-2"
            >
              {showHistory && (
                <Link href="/history" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-white hover:bg-gray-900"
                  >
                    <History className="w-4 h-4" />
                    History
                  </Button>
                </Link>
              )}
              {showSettings && (
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-white hover:bg-gray-900"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </Link>
              )}
              {showLogin && (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600">
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </Link>
              )}
              {showLogout && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-gray-800 text-white hover:bg-gray-900"
                  onClick={async () => {
                    await fetch("/api/logout", { method: "POST" });
                    window.location.href = "/login";
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </nav>
    </motion.header>
  );
}

