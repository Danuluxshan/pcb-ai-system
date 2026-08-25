import axios from 'axios';
import { getDeviceId } from './deviceId';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const staticUrl = (path) => `${API_BASE}${path}`;

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 180000,   // 3 minutes
});

// ── Inspection ───────────────────────────────────────────────────────
export const inspectPCB = async (file, useSahi, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('device_id', getDeviceId());
  const { data } = await api.post(`/inspect?use_sahi=${useSahi}`, formData, {
    onUploadProgress: onProgress,
  });
  return data;
};

export const submitMeasurement = async (
  inspectionId, componentId, measurementType, value, unit, nominal = null
) => {
  const { data } = await api.post(
    `/inspect/${inspectionId}/measure`,
    null,
    {
      params: {
        component_id: componentId, measurement_type: measurementType,
        value, unit, nominal
      }
    }
  );
  return data;
};

export const getInspection = async (id) => {
  const { data } = await api.get(`/history/${id}`);
  return data;
};

// ── History ──────────────────────────────────────────────────────────
export const getHistory = async (page = 1, limit = 10) => {
  const { data } = await api.get('/history', {
    params: { page, limit, device_id: getDeviceId() },
  });
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
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
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
    component_name: componentName,
    measured_value: measuredValue,
    nominal_value: nominalValue,
    unit: unit || '',
  });
  return data;
};

// ── Health ───────────────────────────────────────────────────────────
export const healthCheck = async () => {
  const { data } = await api.get('/health');
  return data;
};

export const getNotifications = async (limit=20) =>
  (await api.get('/notifications', { params:{ limit, device_id: getDeviceId() } })).data;
export const markNotificationRead = async (id) =>
  (await api.post(`/notifications/${id}/read`)).data;
export const markAllNotificationsRead = async () =>
  (await api.post('/notifications/read-all', null, { params: { device_id: getDeviceId() } })).data;

export const saveComponentDiagnosis = async (inspectionId, componentId, diagnosis, severity) =>
  (await api.patch(`/inspect/${inspectionId}/components/${componentId}/diagnosis`, { diagnosis, severity })).data;

export default api;