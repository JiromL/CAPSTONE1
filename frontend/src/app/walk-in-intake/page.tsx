"use client";
import React, { useState } from "react";

export default function WalkInIntakePage() {
  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    email: "",
    preferredDate: "",
    preferredTime: "",
    alreadyTaking: false,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: string | boolean = value;
    if (type === "checkbox") {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setForm((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/intake/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create walk-in intake");
      setSuccess(true);
      setForm({
        studentName: "",
        studentId: "",
        email: "",
        preferredDate: "",
        preferredTime: "",
        alreadyTaking: false,
        notes: "",
      });
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Walk-In Intake</h1>
      <p className="mb-6 text-gray-700">
        Register a walk-in or email-based intake for a student. Fill in the details below. All actions will be logged.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block font-medium mb-1">Student Name</label>
          <input
            type="text"
            name="studentName"
            value={form.studentName}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Student ID</label>
          <input
            type="text"
            name="studentId"
            value={form.studentId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block font-medium mb-1">Preferred Date</label>
            <input
              type="date"
              name="preferredDate"
              value={form.preferredDate}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Preferred Time</label>
            <input
              type="time"
              name="preferredTime"
              value={form.preferredTime}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="alreadyTaking"
            checked={form.alreadyTaking}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <label className="font-medium">Student is already taking intake now</label>
        </div>
        <div>
          <label className="block font-medium mb-1">Notes (optional)</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Walk-In Intake"}
        </button>
        {success && <p className="text-green-600 mt-2">Walk-in intake created and logged!</p>}
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </form>
    </div>
  );
}
