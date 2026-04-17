import { useState } from "react";
import Loader from "../components/Loader";
import ReportDashboard from "../components/ReportDashboard";
import { getReports } from "../services/api";

const Reports = ({ showToast }) => {
  const [reportType, setReportType] = useState("daily");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (type, params) => {
    setLoading(true);
    try {
      const data = await getReports(type, params);
      setReport(data);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading && <Loader />}
      <ReportDashboard
        reportType={reportType}
        setReportType={setReportType}
        report={report}
        onGenerate={handleGenerate}
        loading={loading}
      />
    </div>
  );
};

export default Reports;
