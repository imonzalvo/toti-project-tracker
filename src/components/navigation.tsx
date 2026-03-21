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
  Users,
  BarChart2,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Proyectos",
    href: "/proyectos",
    icon: FolderKanban,
  },
  {
    title: "Facturaciones",
    href: "/facturaciones",
    icon: Receipt,
  },
  {
    title: "Cobros Trimestrales",
    href: "/cobros",
    icon: Calculator,
  },
  {
    title: "Métricas",
    href: "/metricas",
    icon: BarChart2,
  },
  {
    title: "Usuarios",
    href: "/usuarios",
    icon: Users,
    adminOnly: true,
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
