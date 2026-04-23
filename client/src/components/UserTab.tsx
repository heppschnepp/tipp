import { useState } from "react";
import { api } from "../api";
import { MIN_PASSWORD_LENGTH } from "../constants";

interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

interface UserTabData {
  users: User[];
  loadingUsers: boolean;
  showToast: (msg: string) => void;
}

export default function UserTab({
  users,
  loadingUsers,
  showToast,
}: UserTabData) {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const resetPassword = async (userId: number) => {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    try {
      await api.admin.users.resetPassword(userId, newPassword);
      showToast("Password reset successfully");
      setNewPassword("");
      setSelectedUser(null);
    } catch (err: any) {
      showToast(err.message || "Failed to reset password");
    }
  };

  return (
    <div className="users-panel">
      <h2>User Management</h2>
      {loadingUsers ? (
        <div>Loading...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <div className="users-list">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User Name</th>
                <th>Admin</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    <div className="user-name">{u.username}</div>
                    {u.email && <small className="user-email">{u.email}</small>}
                  </td>
                  <td>{u.isAdmin ? "✓" : "-"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    {selectedUser === u.id ? (
                      <div className="reset-form">
                        <input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={4}
                        />
                        <button
                          className="btn-confirm"
                          onClick={() => resetPassword(u.id)}
                        >
                          Reset
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => {
                            setSelectedUser(null);
                            setNewPassword("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-reset"
                        onClick={() => setSelectedUser(u.id)}
                      >
                        Reset Password
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
