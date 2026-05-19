import { useRef, useCallback } from 'react';

declare global {
  interface Window {
    html2pdf: any;
  }
}

export const useAppointmentExport = () => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    try {
      if (!printRef.current) {
        alert('Unable to print: Document reference not found');
        return;
      }

      const printWindow = window.open('', '' , 'width=800,height=600');
      if (!printWindow) {
        alert('Please enable pop-ups to print this document');
        return;
      }

      const styles = `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            font-family: Arial, sans-serif; 
            background-color: white;
            color: #333;
            width: 100%;
            height: 100%;
          }
          body { padding: 20px; }
          img { max-width: 100%; height: auto; display: block; }
          @page { margin: 10mm; size: A4; }
          @media print {
            * { margin: 0; padding: 0; }
            body { padding: 0; }
          }
        </style>
      `;
      
      const content = printRef.current.outerHTML;
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            ${styles}
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for content to load
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1000);
    } catch (error) {
      console.error('Print error:', error);
      alert('Error printing document. Please try again.');
    }
  }, [printRef]);

  const handleDownloadPDF = useCallback(async (filename: string) => {
    try {
      if (!printRef.current) {
        alert('Unable to download: Document reference not found');
        return;
      }

      if (typeof window === 'undefined') return;

      // Try to load html2pdf from window first (global script)
      let html2pdf = (window as any).html2pdf;

      // If not available globally, try dynamic import (browser-only)
      if (!html2pdf) {
        try {
          const module = await import('html2pdf.js');
          html2pdf = module.default || module;
        } catch {
          html2pdf = null;
        }
      }

      if (!html2pdf) {
        throw new Error('PDF library could not be loaded');
      }

      const element = printRef.current;
      const options = {
        margin: [10, 10, 10, 10],
        filename: filename || 'appointment-confirmation.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { 
          orientation: 'portrait', 
          unit: 'mm', 
          format: 'a4',
          compress: true
        }
      };
      
      const pdf = html2pdf();
      pdf.set(options)
        .from(element)
        .save()
        .catch((err: any) => {
          console.error('PDF generation failed:', err);
          alert('Failed to generate PDF. Using Print to PDF option instead?');
        });
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Error downloading PDF. Please use your browser\'s "Print to PDF" feature instead.');
    }
  }, [printRef]);

  return {
    printRef,
    handlePrint,
    handleDownloadPDF,
  };
};
