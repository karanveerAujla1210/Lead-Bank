'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Phone, CreditCard, Banknote } from 'lucide-react';
import type { CustomerIntelligence, StatementAnalysis } from '@/lib/intelligence-types';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function RiskBadge({ score }: { score: number }) {
  const level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const cls = score >= 70
    ? 'bg-red-100 text-red-700 border-red-200'
    : score >= 40
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {level} Risk · {score}
    </span>
  );
}

function AnalysisSummary({ analysis }: { analysis: StatementAnalysis }) {
  const metrics = [
    { label: 'Opening Balance', value: fmt(analysis.opening_balance) },
    { label: 'Closing Balance', value: fmt(analysis.closing_balance) },
    { label: 'Average Balance', value: fmt(analysis.average_balance) },
    { label: 'Highest Credit', value: fmt(analysis.highest_credit) },
    { label: 'Highest Debit', value: fmt(analysis.highest_debit) },
    { label: 'Min Balance', value: fmt(analysis.minimum_balance) },
    { label: 'Cash Deposits', value: fmt(analysis.cash_deposits) },
    { label: 'Cash Withdrawals', value: fmt(analysis.cash_withdrawals) },
    { label: 'Total Salary', value: fmt(analysis.salary_total) },
    { label: 'Total EMI', value: fmt(analysis.emi_total) },
    { label: 'Active Loans', value: String(analysis.loan_count) },
    { label: 'Bounce Charges', value: fmt(analysis.bounce_charges) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">{m.label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CustomerIntelligenceCard({ customer }: { customer: CustomerIntelligence }) {
  const [expanded, setExpanded] = useState(true);

  const allAnalysis = customer.bank_statements.flatMap((s) => s.statement_analysis);
  const allSalary = customer.bank_statements.flatMap((s) => s.salary_records);
  const allLoans = customer.bank_statements.flatMap((s) => s.loan_records);
  const allContacts = customer.bank_statements.flatMap((s) => s.contact_numbers);
  const allUpis = customer.bank_statements.flatMap((s) => s.upi_ids);

  const topRisk = allAnalysis.reduce((max, a) => Math.max(max, a.risk_score), 0);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 font-semibold text-lg">
            {customer.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{customer.full_name}</p>
            <p className="text-sm text-slate-500">
              {customer.customer_code} · {customer.primary_mobile ?? '—'} · {customer.primary_email ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {allAnalysis.length > 0 && <RiskBadge score={topRisk} />}
          <span className="text-sm text-slate-400">{customer.bank_statements.length} statement{customer.bank_statements.length !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-6 space-y-6">
          {/* Banking Summary */}
          {allAnalysis.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <TrendingUp className="h-4 w-4" /> Banking Summary
              </h3>
              <AnalysisSummary analysis={allAnalysis[0]} />
            </section>
          )}

          {/* Salary */}
          {allSalary.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Banknote className="h-4 w-4" /> Detected Salary
              </h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Employer</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Last Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {allSalary.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{s.employer}</td>
                        <td className="px-4 py-2.5 text-slate-700">{fmt(s.salary_amount)}</td>
                        <td className="px-4 py-2.5 text-slate-700">{s.salary_date}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {s.confidence.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Loans */}
          {allLoans.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertTriangle className="h-4 w-4" /> Detected Loans / EMIs
              </h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Lender</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">EMI</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Frequency</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Active</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-600">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {allLoans.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{l.lender_name}</td>
                        <td className="px-4 py-2.5 text-slate-700">{fmt(l.emi_amount)}</td>
                        <td className="px-4 py-2.5 text-slate-700 capitalize">{l.frequency}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${l.estimated_active_loan ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {l.estimated_active_loan ? 'Active' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${l.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {l.confidence.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Contacts & UPI */}
          <div className="grid gap-4 md:grid-cols-2">
            {allContacts.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone className="h-4 w-4" /> Extracted Contacts
                </h3>
                <div className="space-y-2">
                  {allContacts.slice(0, 10).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">{c.number}</span>
                      <span className="text-xs text-slate-500">{c.occurrence_count}× seen</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {allUpis.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CreditCard className="h-4 w-4" /> Extracted UPI IDs
                </h3>
                <div className="space-y-2">
                  {allUpis.slice(0, 10).map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-mono text-xs text-slate-900">{u.upi}</span>
                      <span className="text-xs text-slate-500">{u.occurrence_count}× seen</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {allAnalysis.length === 0 && customer.bank_statements.length === 0 && (
            <p className="text-sm text-slate-400">No statements uploaded yet for this customer.</p>
          )}
        </div>
      )}
    </div>
  );
}
