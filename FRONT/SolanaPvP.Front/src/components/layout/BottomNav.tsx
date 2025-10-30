import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import {
  HomeIcon,
  UserGroupIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  TrophyIcon as TrophyIconSolid,
} from "@heroicons/react/24/solid";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  {
    name: "Home",
    href: ROUTES.HOME,
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    name: "Arena",
    href: ROUTES.MATCHES,
    icon: UserGroupIcon,
    iconSolid: UserGroupIconSolid,
  },
  {
    name: "Leaderboard",
    href: ROUTES.LEADERBOARD,
    icon: TrophyIcon,
    iconSolid: TrophyIconSolid,
  },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-lg border-t border-white/10 md:hidden"
      style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
    >
      <div className="flex items-center py-2">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const IconComponent = active ? item.iconSolid : item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 ${
                active
                  ? "text-sol-purple"
                  : "text-txt-muted hover:text-txt-base"
              }`}
            >
              <IconComponent
                className={`w-6 h-6 mb-1 ${
                  active ? "text-sol-purple" : "text-txt-muted"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  active ? "text-sol-purple" : "text-txt-muted"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
