"use client";

import { useState, useEffect } from "react";
import { api, ApiError, type AdminPayment, type AdminPaymentsOverview } from "@/lib/api";

export function AdminPayments({ token }: { token: string }) {
  const [overview, setOverview] = useState<AdminPaymentsOverview | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refundTarget, setRefundTarget] = useState<AdminPayment | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundFull, setRefundFull] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.adminGetPayments(token, params).then((d) => setPayments(d.payments));
  };

  useEffect(() => {
    api.adminGetPaymentsOverview(token).then(setOverview);
    load();
  }, [token]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = async () => {
    const csv = await api.adminExportPayments(token, dateFrom || undefined, dateTo || undefined);
    downloadBlob(new Blob([csv], { type: "text/csv" }), "dollhouse-payments.csv");
  };

  const exportPdf = async () => {
    const blob = await api.adminExportPaymentsPdf(token, dateFrom || undefined, dateTo || undefined);
    downloadBlob(blob, "dollhouse-payments.pdf");
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    setLoading(true);
    setError("");
    try {
      const remaining = (refundTarget.depositPence ?? 0) - (refundTarget.refundPence ?? 0);
      const amountPence = refundFull ? remaining : remaining;
      const result = await api.adminIssueRefund(token, refundTarget.reference, amountPence, refundReason);
      setMsg(result.message);
      setRefundTarget(null);
      setRefundReason("");
      load();
      api.adminGetPaymentsOverview(token).then(setOverview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refund failed");
    } finally {
      setLoading(false);
    }
  };

  const canRefund = (p: AdminPayment) =>
    p.paymentStatus !== "refunded" && (p.depositPence ?? 0) > (p.refundPence ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-deep-pink">Payments</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="rounded-full border border-hot-pink px-4 py-2 text-sm font-semibold text-hot-pink">Export CSV</button>
          <button onClick={exportPdf} className="rounded-full bg-hot-pink px-4 py-2 text-sm font-semibold text-white">Export PDF</button>
        </div>
      </div>

      {msg && <p className="text-sm text-green-600">{msg}</p>}

      <div className="flex flex-wrap gap-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-blush px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-blush px-3 py-2 text-sm" />
        <button onClick={load} className="rounded-full border border-blush px-4 py-2 text-sm">Filter</button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Object.entries(overview).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-blush bg-white p-4">
              <p className="text-lg font-bold text-deep-pink">{v}</p>
              <p className="text-xs capitalize text-foreground/50">{k.replace(/([A-Z])/g, " $1")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-blush bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blush bg-blush/30 text-left">
              <th className="px-3 py-2">Client</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Total</th><th className="px-3 py-2">Deposit</th><th className="px-3 py-2">Remaining</th>
              <th className="px-3 py-2">Refund</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.reference} className="border-b border-blush/50">
                <td className="px-3 py-2">{p.client}</td>
                <td className="px-3 py-2">{p.service}</td>
                <td className="px-3 py-2">{p.date}</td>
                <td className="px-3 py-2">{p.totalFormatted}</td>
                <td className="px-3 py-2">{p.depositFormatted}</td>
                <td className="px-3 py-2">{p.remainingFormatted}</td>
                <td className="px-3 py-2">{p.refundFormatted ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{p.paymentStatus.replace("_", " ")}</td>
                <td className="px-3 py-2">
                  {canRefund(p) && (
                    <button onClick={() => { setRefundTarget(p); setError(""); }} className="text-xs font-semibold text-red-500 hover:underline">
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRefundTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-deep-pink">Issue Refund</h3>
            <p className="mt-1 text-sm text-foreground/60">{refundTarget.reference} — {refundTarget.client}</p>
            <p className="mt-2 text-sm">Deposit: <strong>{refundTarget.depositFormatted}</strong></p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={refundFull} onChange={(e) => setRefundFull(e.target.checked)} />
              Full deposit refund
            </label>
            <textarea
              placeholder="Internal reason (optional)"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-blush p-3 text-sm"
            />
            <p className="mt-2 text-xs text-foreground/40">Processed via Stripe when configured.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setRefundTarget(null)} className="flex-1 rounded-full border py-2 text-sm">Cancel</button>
              <button onClick={submitRefund} disabled={loading} className="flex-1 rounded-full bg-red-500 py-2 text-sm text-white disabled:opacity-60">
                {loading ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
