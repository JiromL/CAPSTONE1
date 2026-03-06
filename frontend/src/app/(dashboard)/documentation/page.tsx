"use client";

import React, { useState } from 'react';
import { DownloadButton } from '@/components/DownloadButton';
import { File, Upload, Search, Filter, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';

export default function DocumentationPage() {
  const [documents] = useState([
    { id: 1, name: 'Initial Intake Form - John Smith', type: 'Intake', date: '2024-01-15', size: '245 KB', uploaded_by: 'Dr. Sarah Johnson' },
    { id: 2, name: 'Clinical Progress Notes - Week 1', type: 'Progress Notes', date: '2024-01-18', size: '156 KB', uploaded_by: 'Dr. Sarah Johnson' },
    { id: 3, name: 'Treatment Plan - Maria Garcia', type: 'Treatment Plan', date: '2024-01-16', size: '312 KB', uploaded_by: 'Dr. Michael Chen' },
    { id: 4, name: 'Assessment Results - PHQ-9 & GAD-7', type: 'Assessment', date: '2024-01-14', size: '89 KB', uploaded_by: 'IC Coordinator' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const documentTypes = ['Intake', 'Progress Notes', 'Treatment Plan', 'Assessment'];
  const filteredDocs = documents.filter((d) => (filterType === 'all' || d.type === filterType) && d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <DashboardPageWrapper title="Documentation Hub" subtitle="Manage clinical and administrative documents">
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-12 mb-8 text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
        <Upload className="mx-auto text-blue-600 dark:text-blue-400 mb-3" size={32} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">Upload New Document</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Drag and drop or click to select files</p>
        <button className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition">Choose File</button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
            <input type="text" placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500 dark:text-gray-400" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50">
              <option value="all">All Types</option>
              {documentTypes.map((typ) => (<option key={typ} value={typ}>{typ}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Document Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Size</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Uploaded By</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-6 py-4 flex items-center gap-3"><File className="text-gray-400 dark:text-gray-500" size={20} /><span className="font-medium text-gray-900 dark:text-gray-50">{doc.name}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"><span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">{doc.type}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(doc.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{doc.size}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{doc.uploaded_by}</td>
                    <td className="px-6 py-4 flex gap-3"><DownloadButton documentId={`${doc.id}`} /><button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"><Trash2 size={18} /></button></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">No documents found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-12">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-3">Document Management Policy</h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
            <li>• All documents are securely stored and encrypted</li>
            <li>• Access is restricted to authorized clinical staff</li>
            <li>• Documents are retained per institutional policy</li>
            <li>• Regular backups ensure document availability</li>
            <li>• Audit logs track all document access</li>
          </ul>
        </div>
      </section>
    </DashboardPageWrapper>
  );
}
