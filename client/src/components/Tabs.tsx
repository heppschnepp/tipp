interface TabsProps {
  tab: string;
  setTab: (tab: string) => void;
  isAdmin: boolean;
  onUsersClick?: () => void;
}

export function Tabs({ tab, setTab, isAdmin, onUsersClick }: TabsProps) {
  return (
    <div className="tabs">
      <div
        className={`tab ${tab === "groups" ? "active" : ""}`}
        onClick={() => setTab("groups")}
      >
        Group Stage
      </div>
      <div
        className={`tab ${tab === "knockout" ? "active" : ""}`}
        onClick={() => setTab("knockout")}
      >
        Knockout
      </div>
      <div
        className={`tab ${tab === "leaderboard" ? "active" : ""}`}
        onClick={() => setTab("leaderboard")}
      >
        Leaderboard
      </div>
      {isAdmin && (
        <div
          className={`tab ${tab === "users" ? "active" : ""}`}
          onClick={() => {
            if (onUsersClick) onUsersClick();
            setTab("users");
          }}
        >
          Users
        </div>
      )}
    </div>
  );
}