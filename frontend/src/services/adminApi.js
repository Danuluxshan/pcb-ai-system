import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const adminApi = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  timeout: 60000,
});

// Auto-attach token
adminApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401
adminApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export const adminLogin = async (username, password) => {
  const { data } = await adminApi.post('/login', { username, password });
  localStorage.setItem('admin_token', data.access_token);
  localStorage.setItem('admin_user', data.username);
  return data;
};

export const adminLogout = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = '/admin/login';
};

export const getAdminStats    = async () => (await adminApi.get('/stats')).data;
export const getDatasetList   = async (cls, limit=50, offset=0) =>
  (await adminApi.get('/dataset/list', { params:{ class_label:cls, limit, offset } })).data;
export const uploadDatasetImg = async (file, classLabel, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  form.append('class_label', classLabel);
  const { data } = await adminApi.post('/dataset/upload', form, {
    headers:{ 'Content-Type':'multipart/form-data' },
    onUploadProgress: onProgress,
  });
  return data;
};
export const deleteDatasetImg = async (id) => adminApi.delete(`/dataset/${id}`);
export const startTraining    = async (config) =>
  (await adminApi.post('/train/start', config)).data;
export const stopTraining     = async () => adminApi.post('/train/stop');
export const getTrainStatus   = async () =>
  (await adminApi.get('/train/status')).data;
export const getModels        = async () =>
  (await adminApi.get('/models')).data;
export const activateModel = async (id, forceReplace = false) =>
  (await adminApi.post(`/models/${id}/activate?force_replace=${forceReplace}`)).data;

export const isAdminLoggedIn = () => !!localStorage.getItem('admin_token');
export const getAdminUser    = () => localStorage.getItem('admin_user') || 'Admin';

export default adminApi;

export const getImageUrl = (id) =>
  `${API_BASE}/api/admin/dataset/${id}/image`;

export const getAnnotations = async (imageId) =>
  (await adminApi.get(`/dataset/${imageId}/annotations`)).data;

export const saveAnnotations = async (imageId, boxes) =>
  (await adminApi.post(`/dataset/${imageId}/annotations`, { boxes })).data;

export const deleteModel = async (id) =>
  (await adminApi.delete(`/models/${id}`)).data;

export const changeCredentials = async (currentPassword, newUsername, newPassword) =>
  (await adminApi.put('/change-credentials', {
    current_password: currentPassword,
    new_username: newUsername || null,
    new_password: newPassword || null,
  })).data;