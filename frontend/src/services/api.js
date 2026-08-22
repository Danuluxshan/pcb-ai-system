import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const staticUrl = (path) => `${API_BASE}${path}`;

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 180000,   // 3 minutes
});

// ── Inspection ───────────────────────────────────────────────────────
export const inspectPCB = async (imageFile, useSahi = false, onUploadProgress) => {
  const form = new FormData();
  form.append('file', imageFile);
  const { data } = await api.post(`/inspect?use_sahi=${useSahi}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
};

export const submitMeasurement = async (
  inspectionId, componentId, measurementType, value, unit, nominal = null
) => {
  const { data } = await api.post(
    `/inspect/${inspectionId}/measure`,
    null,
    { params: { component_id: componentId, measurement_type: measurementType,
                value, unit, nominal } }
  );
  return data;
};

export const getInspection = async (id) => {
  const { data } = await api.get(`/history/${id}`);
  return data;
};

// ── History ──────────────────────────────────────────────────────────
export const getHistory = async (page = 1, limit = 10) => {
  const { data } = await api.get('/history', { params: { page, limit } });
  return data;
};

export const deleteInspection = async (id) => {
  await api.delete(`/history/${id}`);
};

// ── Reports ──────────────────────────────────────────────────────────
export const downloadReport = async (inspectionId) => {
  const response = await api.get(`/reports/${inspectionId}/pdf`, {
    responseType: 'blob',
  });
  const url  = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href  = url;
  link.download = `pcb_report_${inspectionId.slice(0, 8)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Knowledge base ───────────────────────────────────────────────────
export const getComponents = async () => {
  const { data } = await api.get('/knowledge/components');
  return data;
};

export const getInstructions = async (componentName) => {
  const { data } = await api.get(`/knowledge/${componentName}`);
  return data;
};

export const diagnoseComponent = async (componentName, measuredValue, nominalValue, unit) => {
  const { data } = await api.post('/knowledge/diagnose', {
    component_name:  componentName,
    measured_value:  measuredValue,
    nominal_value:   nominalValue,
    unit:            unit || '',
  });
  return data;
};

// ── Health ───────────────────────────────────────────────────────────
export const healthCheck = async () => {
  const { data } = await api.get('/health');
  return data;
};

export const getNotifications = async (limit=20) =>
  (await api.get('/notifications', { params:{limit} })).data;
export const markNotificationRead = async (id) =>
  (await api.post(`/notifications/${id}/read`)).data;
export const markAllNotificationsRead = async () =>
  (await api.post('/notifications/read-all')).data;

export const saveComponentDiagnosis = async (inspectionId, componentId, diagnosis, severity) =>
  (await api.patch(`/inspect/${inspectionId}/components/${componentId}/diagnosis`, { diagnosis, severity })).data;

export default api;