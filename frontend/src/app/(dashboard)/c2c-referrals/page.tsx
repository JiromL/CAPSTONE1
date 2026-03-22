"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function C2CReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/counselor-referrals")
      .then((res) => setReferrals(res.data))
      .catch((err) => setError("Failed to load referrals"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Counselor-to-Counselor Referrals</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <table className="min-w-full border mt-4">
        <thead>
          <tr>
            <th className="border px-2 py-1">Case</th>
            <th className="border px-2 py-1">Client</th>
            <th className="border px-2 py-1">From</th>
            <th className="border px-2 py-1">To</th>
            <th className="border px-2 py-1">Specialty</th>
            <th className="border px-2 py-1">Urgency</th>
            <th className="border px-2 py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {referrals.map((r: any) => (
            <tr key={r._id}>
              <td className="border px-2 py-1">{r.case_id}</td>
              <td className="border px-2 py-1">{r.client_id}</td>
              <td className="border px-2 py-1">{r.referring_counselor_id}</td>
              <td className="border px-2 py-1">{r.target_counselor_id}</td>
              <td className="border px-2 py-1">{r.specialty_required}</td>
              <td className="border px-2 py-1">{r.urgency}</td>
              <td className="border px-2 py-1">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
