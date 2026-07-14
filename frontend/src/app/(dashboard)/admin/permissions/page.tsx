"use client";

import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

const ROLES = ['ADMIN', 'DPO', 'COUNSELOR', 'PSYCHOLOGIST', 'IC', 'STAFF', 'STUDENT'];
const PERMS: Record<string, string[]> = {
  ADMIN:         ['VIEW_ALL','EDIT_CASE','EDIT_NOTES','VIEW_CASE','MANAGE_USERS','VIEW_AUDIT_LOG','ASSIGN_CASE','MANAGE_APPOINTMENTS','VIEW_ANALYTICS'],
  DPO:           ['VIEW_ALL','VIEW_CASE','VIEW_AUDIT_LOG','VIEW_ANALYTICS','EXPORT_DATA'],
  COUNSELOR:     ['VIEW_CASE','EDIT_CASE','EDIT_NOTES','MANAGE_APPOINTMENTS','CREATE_REFERRAL'],
  PSYCHOLOGIST:  ['VIEW_CASE','EDIT_CASE','EDIT_NOTES','MANAGE_APPOINTMENTS','CREATE_REFERRAL','VIEW_HIGH_RISK'],
  IC:            ['VIEW_CASE','CREATE_CASE','EDIT_INTAKE','ASSIGN_CASE','MANAGE_APPOINTMENTS'],
  STAFF:         ['MANAGE_APPOINTMENTS','VIEW_SCHEDULE','WALK_IN_INTAKE'],
  STUDENT:       ['VIEW_OWN_CASE','BOOK_APPOINTMENT','SUBMIT_INTAKE'],
};
const ALL = Array.from(new Set(Object.values(PERMS).flat())).sort();

export default function PermissionsPage() {
  return (
    <DashboardPageWrapper title="Permissions Matrix" subtitle="Role-to-permission mapping">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">

        <div className="px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-warning-surface)', border: '1px solid var(--color-warning)', color: 'var(--color-warning-text)' }}>
          This matrix is for reference only. It reflects permissions as coded at the last deployment and does not update automatically. To change permissions, a code change is required.
        </div>

        <div className="overflow-x-auto rounded-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold min-w-44 sticky left-0"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                  Permission
                </th>
                {ROLES.map(r => (
                  <th key={r} className="px-3 py-3 text-center font-semibold min-w-20"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL.map(perm => (
                <tr key={perm} className="transition"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-4 py-2 font-mono sticky left-0"
                    style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
                    {perm}
                  </td>
                  {ROLES.map(role => (
                    <td key={role} className="px-3 py-2 text-center">
                      {PERMS[role]?.includes(perm)
                        ? <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                        : <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: 'var(--color-border-strong)' }} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-success)' }} /> Granted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-border-strong)' }} /> Not granted
          </span>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
