'use client';

import React, { useState } from 'react';
import { ArrowLeft, File, Upload, Search, Filter, Download, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default class DocumentationPage {
  
  render() {
    const [documents] = useState([
      {
        id: 1,
        name: 'Initial Intake Form - John Smith',
        type: 'Intake',
        date: '2024-01-15',
        size: '245 KB',
        uploaded_by: 'Dr. Sarah Johnson',
      },
      {
        id: 2,
        name: 'Clinical Progress Notes - Week 1',
        type: 'Progress Notes',
        date: '2024-01-18',
        size: '156 KB',
        uploaded_by: 'Dr. Sarah Johnson',
      },
      {
        id: 3,
        name: 'Treatment Plan - Maria Garcia',
        type: 'Treatment Plan',
        date: '2024-01-16',
        size: '312 KB',
        uploaded_by: 'Dr. Michael Chen',
      },
      {
        id: 4,
        name: 'Assessment Results - PHQ-9 & GAD-7',
        type: 'Assessment',
        date: '2024-01-14',
        size: '89 KB',
        uploaded_by: 'IC Coordinator',
      },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    const documentTypes = ['Intake', 'Progress Notes', 'Treatment Plan', 'Assessment'];
    const filteredDocs = documents.filter(
      (d) =>
        (filterType === 'all' || d.type === filterType) &&
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4 mb-3">
              <Link href="/dashboard">
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft size={20} /> Back
                </button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Documentation Hub</h1>
            <p className="text-gray-600 mt-1">Manage clinical and administrative documents</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Upload Section */}
          <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-12 mb-8 text-center cursor-pointer hover:bg-blue-100 transition">
            <Upload className="mx-auto text-blue-600 mb-3" size={32} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Upload New Document</h2>
            <p className="text-gray-600 mb-4">Drag and drop or click to select files</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
              Choose File
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {documentTypes.map((typ) => (
                    <option key={typ} value={typ}>
                      {typ}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Document Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Size</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uploaded By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <File className="text-gray-400" size={20} />
                          <span className="font-medium text-gray-900">{doc.name}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">{doc.type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{new Date(doc.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.size}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.uploaded_by}</td>
                        <td className="px-6 py-4 flex gap-3">
                          <button className="text-blue-600 hover:text-blue-700">
                            <Download size={18} />
                          </button>
                          <button className="text-red-600 hover:text-red-700">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                        No documents found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Management Tips */}
          <section className="mt-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Document Management Policy</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• All documents are securely stored and encrypted</li>
                <li>• Access is restricted to authorized clinical staff</li>
                <li>• Documents are retained per institutional policy</li>
                <li>• Regular backups ensure document availability</li>
                <li>• Audit logs track all document access</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    );
  }
}
