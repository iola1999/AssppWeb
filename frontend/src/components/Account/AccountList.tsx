import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAccountsStore } from "../../store/accounts";
import { storeIdToCountry } from "../../apple/config";
import type { Account } from "../../types";
import PageContainer from "../Layout/PageContainer";

export default function AccountList() {
  const navigate = useNavigate();
  const { accounts, loading, loadAccounts, addAccount } = useAccountsStore();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleImport() {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Clipboard is empty.");
        return;
      }

      const data = JSON.parse(text);

      // Validate required fields
      if (!data.email || typeof data.email !== "string") {
        setError("Invalid account data: missing or invalid email.");
        return;
      }
      if (!data.password || typeof data.password !== "string") {
        setError("Invalid account data: missing or invalid password.");
        return;
      }
      if (!data.deviceIdentifier || typeof data.deviceIdentifier !== "string") {
        setError("Invalid account data: missing or invalid device identifier.");
        return;
      }

      // Build account object with defaults for missing fields
      const importedAccount: Account = {
        email: data.email,
        password: data.password,
        appleId: data.appleId ?? data.email,
        store: data.store ?? "",
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        passwordToken: data.passwordToken ?? "",
        directoryServicesIdentifier: data.directoryServicesIdentifier ?? "",
        cookies: Array.isArray(data.cookies) ? data.cookies : [],
        deviceIdentifier: data.deviceIdentifier,
        pod: data.pod,
      };

      await addAccount(importedAccount);
      setSuccess(`Account "${importedAccount.email}" imported successfully.`);
      navigate(`/accounts/${encodeURIComponent(importedAccount.email)}`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON in clipboard.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to import account",
        );
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageContainer
      title="Accounts"
      action={
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing && <Spinner />}
            Import
          </button>
          <Link
            to="/accounts/add"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Account
          </Link>
        </div>
      }
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">
          Loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No accounts added yet.</p>
          <Link
            to="/accounts/add"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first account
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <NavLink
              key={account.email}
              to={`/accounts/${encodeURIComponent(account.email)}`}
              className={({ isActive }) =>
                `block bg-white rounded-lg border p-4 transition-colors ${
                  isActive
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {account.firstName} {account.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{account.email}</p>
                </div>
                <div className="text-sm text-gray-400">
                  {storeIdToCountry(account.store) || account.store}
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
