import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/jobs`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

export const startJobSearch = async (resumeId, interests, targetCompanies) => {
    const res = await axios.post(`${API_URL}/search`, { resume_id: resumeId, interests, target_companies: targetCompanies }, getAuthHeaders());
    return res.data;
};

export const getLatestSearch = async () => {
    const res = await axios.get(`${API_URL}/search/latest`, getAuthHeaders());
    return res.data;
};

export const getJobMatches = async () => {
    const res = await axios.get(API_URL, getAuthHeaders());
    return res.data;
};

export const dismissJobMatch = async (id) => {
    const res = await axios.put(`${API_URL}/${id}/dismiss`, {}, getAuthHeaders());
    return res.data;
};

export const generateCoverLetter = async (id, inputs) => {
    const res = await axios.post(`${API_URL}/${id}/cover-letter`, inputs, getAuthHeaders());
    return res.data;
};

export const generateSuggestions = async (id) => {
    const res = await axios.post(`${API_URL}/${id}/suggestions`, {}, getAuthHeaders());
    return res.data;
};

export const trackJobMatch = async (id) => {
    const res = await axios.post(`${API_URL}/${id}/track`, {}, getAuthHeaders());
    return res.data;
};
