import { apiClient } from '../api/client';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient('/uploads', {
    method: 'POST',
    body: formData,
  });
}

export async function uploadFiles(fileList) {
  const formData = new FormData();
  Array.from(fileList).forEach((f) => formData.append('files', f));
  return apiClient('/uploads/multiple', {
    method: 'POST',
    body: formData,
  });
}

export const uploadService = {
  uploadFile,
  uploadFiles,
};
