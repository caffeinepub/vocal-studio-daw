import { Bell, User } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center h-12 px-4 bg-card border-b border-border shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6" data-ocid="header.panel">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          aria-label="Vocal Studio logo"
          role="img"
        >
          <title>Vocal Studio</title>
          <path
            d="M2 11 Q5 4, 8 11 Q11 18, 14 11 Q17 4, 20 11"
            stroke="#27C7B8"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="text-foreground font-semibold text-[17px] tracking-tight">
          Vocal Studio
        </span>
      </div>

      {/* Nav */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        {["File", "Edit", "Track", "Region", "View"].map((item) => (
          <button
            type="button"
            key={item}
            className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-3 ml-auto">
        <span className="hidden sm:block text-xs text-muted-foreground">
          My DAW &middot; Project Alpha
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <User size={14} className="text-primary-foreground" />
        </div>
      </div>
    </header>
  );
}
