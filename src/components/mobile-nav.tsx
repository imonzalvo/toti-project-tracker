"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { useAuth } from "~/lib/auth-context";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Calculator,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
}

// Solo los items principales para la bottom nav
const navItems: NavItem[] = [
  {
    title: "Inicio",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Proyectos",
    href: "/proyectos",
    icon: FolderKanban,
  },
  {
    title: "Facturas",
    href: "/facturaciones",
    icon: Receipt,
  },
  {
    title: "Cobros",
    href: "/cobros",
    icon: Calculator,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive && "text-primary"
                )}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area para iPhones con notch */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
