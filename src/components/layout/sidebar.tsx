"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { useSidebar } from "@/hooks/use-sidebar";
import {
  Bell,
  Bot,
  Crown,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; labelKey: string; className: string }
> = {
  owner: {
    icon: Crown,
    labelKey: "roleOwner",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  admin: {
    icon: Shield,
    labelKey: "roleAdmin",
    className:
      "border-primary/40 bg-primary/10 text-primary",
  },
  agent: {
    icon: UserCog,
    labelKey: "roleAgent",
    className:
      "border-border bg-muted text-foreground",
  },
  viewer: {
    icon: User,
    labelKey: "roleViewer",
    className:
      "border-border bg-card text-muted-foreground",
  },
};
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  beta?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/inbox", labelKey: "inbox", icon: MessageSquare },
  { href: "/notifications", labelKey: "notifications", icon: Bell },
  { href: "/contacts", labelKey: "contacts", icon: Users },
  { href: "/pipelines", labelKey: "pipelines", icon: GitBranch },
  { href: "/broadcasts", labelKey: "broadcasts", icon: Radio },
  { href: "/automations", labelKey: "automations", icon: Zap },
  { href: "/flows", labelKey: "flows", icon: Workflow, beta: true },
  { href: "/agents", labelKey: "aiAgents", icon: Bot },
];

const bottomNavItems = [
  { href: "/settings", labelKey: "settings", icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

import { useTranslations } from "next-intl";

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  const { collapsed } = useSidebar();

  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          // Mobile: fixed drawer
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border bg-card",
          "transition-all duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: static, collapsible
          "lg:static lg:z-0 lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
        )}
        aria-label="Primary"
      >
        {/* Logo row */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            collapsed
              ? "justify-center px-0"
              : "justify-between gap-2 px-4",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-2",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
                <text x="70" y="285" fontFamily="Arial, Helvetica, sans-serif" fontSize="88" fontWeight="700" fill="#FFFFFF">
                  Codix
                </text>
                <text x="340" y="285" fontFamily="Arial, Helvetica, sans-serif" fontSize="88" fontWeight="700" fill="#E11B22">
                  IA
                </text>
              </svg>
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold text-foreground">
                {t("title")}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden",
              collapsed && "hidden",
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main navigation */}
        <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-0" : "px-3")}>
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              const showUnreadDot =
                item.href === "/inbox" && totalUnread > 0 && !isActive;

              const showNotificationBadge =
                item.href === "/notifications" && unreadNotifications > 0;

              const link = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    collapsed
                      ? "w-full justify-center py-2.5"
                      : "gap-3 px-3 py-2.5 lg:py-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{t(item.labelKey as string)}</span>
                      {item.beta && (
                        <span
                          aria-label={t("beta")}
                          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
                        >
                          {t("beta")}
                        </span>
                      )}
                    </>
                  )}
                  {showUnreadDot && (
                    <span
                      aria-label={t("unreadConversations", { count: totalUnread })}
                      className={cn(
                        "relative flex h-2 w-2",
                        collapsed && "absolute top-1 right-1",
                      )}
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  )}
                  {showNotificationBadge && (
                    <span
                      aria-label={t("unreadNotifications", { count: unreadNotifications })}
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground",
                        collapsed && "absolute -top-0.5 -right-0.5",
                      )}
                    >
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <li key={item.href} className="relative">
                    <Tooltip>
                      <TooltipTrigger>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {showUnreadDot && (
                            <span
                              aria-label={t("unreadConversations", { count: totalUnread })}
                              className="absolute top-1 right-1 flex h-2 w-2"
                            >
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                            </span>
                          )}
                          {showNotificationBadge && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                              {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {t(item.labelKey as string)}
                        {showNotificationBadge && unreadNotifications > 0 && (
                          <span className="ml-1.5 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                            {unreadNotifications > 9 ? "9+" : unreadNotifications}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.href}>{link}</li>;
            })}
          </ul>

          {!collapsed && <div className="my-4 border-t border-border" />}

          <ul className="flex flex-col gap-1">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              const link = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    collapsed
                      ? "w-full justify-center py-2.5"
                      : "gap-3 px-3 py-2.5 lg:py-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="flex-1">{t(item.labelKey as string)}</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {t(item.labelKey as string)}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.href}>{link}</li>;
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className={cn("shrink-0 border-t border-border", collapsed ? "px-0 py-3" : "p-3")}>
          {!collapsed && showAccountStrip && account?.name ? (
            <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {t(meta.labelKey as string)}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center rounded-lg text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-popup-open:bg-muted/60",
                collapsed
                  ? "justify-center py-2.5"
                  : "gap-3 px-3 py-2",
              )}
            >
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? t("defaultAvatar")}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {profile?.full_name ?? t("defaultUser")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile?.email ?? ""}
                  </p>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-popover text-popover-foreground ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                {t("menuProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                {t("menuSettings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                {t("menuSignOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
