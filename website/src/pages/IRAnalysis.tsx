import React from "react";
import { ProcessedKernel } from "../utils/dataLoader";

interface IRAnalysisProps {
  kernels: ProcessedKernel[];
  selectedKernel: number;
}

const IRAnalysis: React.FC<IRAnalysisProps> = ({ kernels, selectedKernel }) => {
  if (kernels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-800">No kernel data available</div>
      </div>
    );
  }

  const kernel = kernels[selectedKernel];
  if (kernel.ir_analysis === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-800">No IR Analysis available</div>
      </div>
    );
  }
  const io_counts = kernel.ir_analysis!.io_counts
  const ttgir_info = kernel.ir_analysis!.io_counts!["amd_ttgir_bufferops_count"];
  const amdgcn_info = kernel.ir_analysis!.io_counts!["amd_gcn_bufferops_count"];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Triton Kernel IR Analysis</h1>

      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Kernel: {kernel.name}
        </h2>

        <h3 className="text-lg font-medium mb-3 text-gray-800">
          AMD BufferOps Information:
        </h3>

        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <p className="text-sm text-gray-700">
            Tiled Buffer Load Count: {ttgir_info["tt.load_count"]}
          </p>
          <p className="text-sm text-gray-700">
            Tiled Buffer Store Count: {ttgir_info["tt.store_count"]}
          </p>
          <p className="text-sm text-gray-700">
            Tiled Global Load Count: {ttgir_info["amdgpu.buffer_load_count"]}
          </p>
          <p className="text-sm text-gray-700">
            Tiled Global Store Count:{ttgir_info["amdgpu.buffer_store_count"]}
          </p>
          <p className="text-sm text-gray-700">
            AMDGCN Buffer Load Instruction Count: {amdgcn_info["global_load_count"]}
          </p>
          <p className="text-sm text-gray-700">
            AMDGCN Buffer Store Instruction Count: {amdgcn_info["global_store_count"]}
          </p>
          <p className="text-sm text-gray-700">
            AMDGCN Global Load Instruction Count: {amdgcn_info["buffer_load_count"]}
          </p>
          <p className="text-sm text-gray-700">
            AMDGCN Global Store Instruction Count: {amdgcn_info["buffer_store_count"]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IRAnalysis;
