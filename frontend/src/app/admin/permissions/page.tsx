"use client";

import PageShell from '@/components/PageShell';

const ROLES = ['ADMIN','DPO','COUNSELOR','PSYCHOLOGIST','CSC','CSP','IC','STAFF','STUDENT'];
const PERMS: Record<string,string[]> = {
  ADMIN:['VIEW_ALL','EDIT_CASE','EDIT_NOTES','VIEW_CASE','MANAGE_USERS','VIEW_AUDIT_LOG','ASSIGN_CASE','MANAGE_APPOINTMENTS','VIEW_ANALYTICS'],
  DPO:['VIEW_ALL','VIEW_CASE','VIEW_AUDIT_LOG','VIEW_ANALYTICS','EXPORT_DATA'],
  COUNSELOR:['VIEW_CASE','EDIT_CASE','EDIT_NOTES','MANAGE_APPOINTMENTS','CREATE_REFERRAL'],
  PSYCHOLOGIST:['VIEW_CASE','EDIT_CASE','EDIT_NOTES','MANAGE_APPOINTMENTS','CREATE_REFERRAL','VIEW_HIGH_RISK'],
  CSC:['VIEW_CASE','VIEW_NOTES','MANAGE_APPOINTMENTS'],
  CSP:['VIEW_CASE','VIEW_NOTES','MANAGE_APPOINTMENTS'],
  IC:['VIEW_CASE','CREATE_CASE','EDIT_INTAKE','ASSIGN_CASE','MANAGE_APPOINTMENTS'],
  STAFF:['MANAGE_APPOINTMENTS','VIEW_SCHEDULE','WALK_IN_INTAKE'],
  STUDENT:['VIEW_OWN_CASE','BOOK_APPOINTMENT','SUBMIT_INTAKE'],
};
const ALL = Array.from(new Set(Object.values(PERMS).flat())).sort();

export default function PermissionsPage() {
  return (
    <PageShell title="Permissions Matrix" subtitle="Role-to-permission mapping">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <p className="text-sm text-gray-500">Changes to permissions require a code deployment.</p>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-gray-700 min-w-44">Permission</th>
                {ROLES.map((r) => <th key={r} className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 min-w-20">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALL.map((perm) => (
                <tr key={perm} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">{perm}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-3 py-2 text-center">
                      {PERMS[role]?.includes(perm)
                        ? <span className="inline-block w-3.5 h-3.5 rounded-full bg-green-500" />
                        : <span className="inline-block w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-600" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Granted</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-gray-300" /> Not granted</span>
        </div>
      </div>
    </PageShell>
  );
}
