interface TabsProps {
  tab: string;
  setTab: (tab: string) => void;
  isAdmin: boolean;
  onUsersClick?: () => void;
}

export function Tabs({ tab, setTab, isAdmin, onUsersClick }: TabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, targetTab: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (targetTab === "users" && onUsersClick) {
        onUsersClick();
      }
      setTab(targetTab);
    }
  };

  return (
    <div className="tabs" role="tablist">
      <div
        role="tab"
        tabIndex={0}
        aria-selected={tab === "groups"}
        className={`tab ${tab === "groups" ? "active" : ""}`}
        onClick={() => setTab("groups")}
        onKeyDown={(e) => handleKeyDown(e, "groups")}
      >
        Group Stage
      </div>
      <div
        role="tab"
        tabIndex={0}
        aria-selected={tab === "knockout"}
        className={`tab ${tab === "knockout" ? "active" : ""}`}
        onClick={() => setTab("knockout")}
        onKeyDown={(e) => handleKeyDown(e, "knockout")}
      >
        Knockout
      </div>
      <div
        role="tab"
        tabIndex={0}
        aria-selected={tab === "leaderboard"}
        className={`tab ${tab === "leaderboard" ? "active" : ""}`}
        onClick={() => setTab("leaderboard")}
        onKeyDown={(e) => handleKeyDown(e, "leaderboard")}
      >
        Leaderboard
      </div>
      {isAdmin && (
        <div
          role="tab"
          tabIndex={0}
          aria-selected={tab === "users"}
          className={`tab ${tab === "users" ? "active" : ""}`}
          onClick={() => {
            if (onUsersClick) onUsersClick();
            setTab("users");
          }}
          onKeyDown={(e) => handleKeyDown(e, "users")}
        >
          Users
        </div>
      )}
    </div>
  );
}