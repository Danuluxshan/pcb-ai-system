// frontend/src/services/api.js
// All API calls go through this file. One place to change the base URL.

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Static files (uploads, heatmaps, reports) are served by FastAPI
// Your decision: backend/static/ + StaticFiles middleware
export const staticUrl = (path) => `${API_BASE}${path}`;

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,   // 30s — AI inference can take up to 8s per board
});

// ── Inspection endpoints ─────────────────────────────────────────────

/** POST /api/inspect — upload PCB image, receive full inspection result */
export const inspectPCB = async (imageFile, onUploadProgress) => {
  const form = new FormData();
  form.append('file', imageFile);
  const { data } = await api.post('/inspect', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;  // InspectionResponse
};

/** PATCH /api/measure — submit multimeter reading */
export const submitMeasurement = async (componentId, type, value, unit) => {
  const { data } = await api.patch('/measure', {
    component_id: componentId,
    measurement_type: type,
    value,
    unit,
  });
  return data;  // MeasurementResponse
};

/** GET /api/inspect/:id — fetch a full inspection by ID */
export const getInspection = async (id) => {
  const { data } = await api.get(`/inspect/${id}`);
  return data;
};

// ── History endpoints ────────────────────────────────────────────────

/** GET /api/history — paginated inspection history */
export const getHistory = async (page = 1, limit = 10) => {
  const { data } = await api.get('/history', { params: { page, limit } });
  return data;  // HistoryResponse
};

/** GET /api/compare — compare two inspections */
export const compareInspections = async (id1, id2) => {
  const { data } = await api.get('/compare', { params: { id1, id2 } });
  return data;
};

// ── Reports endpoints ────────────────────────────────────────────────

/** GET /api/report/:id — download PDF or Excel report */
export const downloadReport = async (inspectionId, format = 'pdf') => {
  const response = await api.get(`/report/${inspectionId}`, {
    params: { format },
    responseType: 'blob',
  });
  // Trigger browser download
  const url  = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href  = url;
  link.download = `pcb_inspection_${inspectionId}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Knowledge base endpoints ─────────────────────────────────────────

/** GET /api/knowledge/:part — look up component by part number */
export const lookupPart = async (partNumber) => {
  const { data } = await api.get(`/knowledge/${partNumber}`);
  return data;
};

/** GET /api/testing/:class — get testing procedure for component class */
export const getTestingProcedure = async (componentClass) => {
  const { data } = await api.get(`/testing/${componentClass}`);
  return data;
};

/** GET /api/health — server health check */
export const healthCheck = async () => {
  const { data } = await api.get('/health');
  return data;
};

export default api;