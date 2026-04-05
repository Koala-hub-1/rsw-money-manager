"use client";

import { pdf } from "@react-pdf/renderer";
import { ReportPDF } from "@/lib/report-pdf";
import type { MonthlyReport, Resident } from "@/lib/types";
import { useState } from "react";

interface Props {
  report: MonthlyReport;
  resident: Resident;
}

export default function PDFDownloadButton({ report, resident }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      const blob = await pdf(
        <ReportPDF report={report} resident={resident} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${resident.name}_${report.year_month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
    >
      {generating ? "PDF生成中..." : "PDFダウンロード"}
    </button>
  );
}
