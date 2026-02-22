import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageContainer from "../Layout/PageContainer";
import { useAccounts } from "../../hooks/useAccounts";
import { authenticate, AuthenticationError } from "../../apple/authenticate";
import { storeIdToCountry } from "../../apple/config";

export default function AccountDetail() {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const {
    accounts,
    loading: storeLoading,
    loadAccounts,
    updateAccount,
    removeAccount,
  } = useAccounts();
  const [showDelete, setShowDelete] = useState(false);
  const [reauthing, setReauthing] = useState(false);
  const [reauthCode, setReauthCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);


  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const decodedEmail = email ? decodeURIComponent(email) : "";
  const account = accounts.find((a) => a.email === decodedEmail);

  if (storeLoading) {
    return (
      <PageContainer title="Account">
        <div className="text-center text-gray-500 py-12">Loading...</div>
      </PageContainer>
    );
  }

  if (!account) {
    return (
      <PageContainer title="Account">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Account not found.</p>
          <button
            onClick={() => navigate("/accounts")}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to accounts
          </button>
        </div>
      </PageContainer>
    );
  }

  async function handleReauth() {
    if (!account) return;
    setError(null);
    setSuccess(null);
    setReauthing(true);

    try {
      const updated = await authenticate(
        account.email,
        account.password,
        needsCode && reauthCode ? reauthCode : undefined,
        account.cookies,
        account.deviceIdentifier,
      );
      await updateAccount(updated);
      setNeedsCode(false);
      setReauthCode("");
      setSuccess("Account re-authenticated successfully.");
    } catch (err) {
      if (err instanceof AuthenticationError && err.codeRequired) {
        setNeedsCode(true);
        setError(err.message);
      } else {
        setError(
          err instanceof Error ? err.message : "Re-authentication failed",
        );
      }
    } finally {
      setReauthing(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    await removeAccount(account.email);
    navigate("/accounts");
  }

  async function handleExport() {
    if (!account) return;
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const exportData = JSON.stringify(account, null, 2);
      await navigator.clipboard.writeText(exportData);
      setSuccess("Account data copied to clipboard.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export account",
      );
    } finally {
      setExporting(false);
    }
  }




  const country = storeIdToCountry(account.store);

  return (
    <PageContainer title="Account Details">
      <div className="max-w-lg space-y-6">
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <dl className="space-y-4">
            <DetailRow
              label="Name"
              value={`${account.firstName} ${account.lastName}`}
            />
            <DetailRow label="Email" value={account.email} />
            <DetailRow
              label="Apple ID"
              value={account.appleId || account.email}
            />
            <DetailRow
              label="Store Region"
              value={country ? `${country} (${account.store})` : account.store}
            />
            <DetailRow
              label="DSID"
              value={account.directoryServicesIdentifier}
            />
            <DetailRow
              label="Device Identifier"
              value={account.deviceIdentifier}
            />
            {account.pod && <DetailRow label="Pod" value={account.pod} />}
          </dl>
        </section>

        {needsCode && (
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <label
              htmlFor="reauth-code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              2FA Verification Code
            </label>
            <div className="flex items-center gap-2">
              <input
                id="reauth-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={reauthCode}
                onChange={(e) => setReauthCode(e.target.value)}
                disabled={reauthing}
                placeholder="000000"
                className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                autoFocus
              />
              <button
                onClick={handleReauth}
                disabled={reauthing || !reauthCode}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {reauthing && <Spinner />}
                Verify
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Export</h3>
          <p className="text-xs text-gray-500 mb-4">
            Export account data to clipboard for backup.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting && <Spinner />}
            Export to Clipboard
          </button>
        </section>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReauth}
            disabled={reauthing}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {reauthing && <Spinner />}
            Re-authenticate
          </button>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Are you sure?</span>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/accounts")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back to accounts
        </button>
      </div>
    </PageContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-all">
        {value || "--"}
      </dd>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
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
