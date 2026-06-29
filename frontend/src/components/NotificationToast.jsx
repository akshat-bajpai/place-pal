import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './NotificationToast.css';

// Derive socket URL from the API URL (strip the /api path)
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '');

const NotificationToast = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            // Join the user's private room so we only receive our own updates
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user?.id) {
                socket.emit('join', user.id);
            }
        });

        socket.on('job_update', (data) => {
            const newNotif = { id: Date.now(), message: data.message, application: data.application };

            setNotifications((prev) => [...prev, newNotif]);

            setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
            }, 5000);

            window.dispatchEvent(new CustomEvent('job_update_received', { detail: data }));
        });

        return () => socket.disconnect();
    }, []);

    const remove = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

    if (notifications.length === 0) return null;

    return (
        <div className="notification-container">
            {notifications.map((notif) => (
                <div key={notif.id} className="notification-toast slide-in">
                    <div className="notification-content">
                        <strong>Application Update</strong>
                        <p>{notif.message}</p>
                    </div>
                    <button className="notification-close" onClick={() => remove(notif.id)}>×</button>
                </div>
            ))}
        </div>
    );
};

export default NotificationToast;
