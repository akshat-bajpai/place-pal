import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/applications`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const getApplications = async () => {
  const res = await axios.get(API_URL, getAuthHeaders());
  return res.data;
};

export const createApplication = async (applicationData) => {
  const res = await axios.post(API_URL, applicationData, getAuthHeaders());
  return res.data;
};

export const updateApplicationStatus = async (id, status) => {
  const res = await axios.put(`${API_URL}/${id}`, { status }, getAuthHeaders());
  return res.data;
};

export const deleteApplication = async (id) => {
  const res = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
  return res.data;
};
