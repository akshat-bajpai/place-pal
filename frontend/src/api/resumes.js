import axios from 'axios';

const API_URL = 'http://localhost:8000/api/resumes';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const getResumes = async () => {
    const response = await axios.get(API_URL, getAuthHeaders());
    return response.data;
};

export const uploadResume = async (formData) => {
    // Requires multipart/form-data, but axios handles it automatically when passing FormData
    const response = await axios.post(API_URL, formData, getAuthHeaders());
    return response.data;
};

export const deleteResume = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    return response.data;
};

export const starResume = async (id) => {
    const response = await axios.put(`${API_URL}/${id}/star`, {}, getAuthHeaders());
    return response.data;
};
