import React from "react";
import { ProcessedKernel } from "../utils/dataLoader";

interface IRAnalysisProps {
  kernels: ProcessedKernel[];
  selectedKernel: number;
}

const formatMetadataValue = (value: any): string => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

interface MetadataItemProps {
  label: string;
  value: React.ReactNode;
}

const MetadataItem: React.FC<MetadataItemProps> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <span className="font-mono text-sm break-words">{value}</span>
  </div>
);

const IRAnalysis: React.FC<IRAnalysisProps> = ({ kernels, selectedKernel }) => {
  if (kernels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-800">No kernel data available</div>
      </div>
    );
  }

  const kernel = kernels[selectedKernel];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Triton Kernel IR Analysis</h1>

      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Kernel: {kernel.name}
        </h2>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            The IR analysis provides helpful insights into important kernel properties
            that were derived from the IR.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <p className="text-sm text-gray-700">
            IR analysis data will be displayed here when available in the
            kernel data structure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IRAnalysis;
