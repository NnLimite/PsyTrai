import axios from 'axios';
import i18n from 'i18next'; // Импортируем для синхронизации языка с бэкендом

export const api = axios.create({
  baseURL: '/api/v1', // Хорошая практика — сразу указывать префикс версии API
  headers: { 'Content-Type': 'application/json' }
});

// Перехватчик запросов (Добавление токена и языка)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  

  config.headers['Accept-Language'] = i18n.language || 'ru';
  
  return config;
});

// Перехватчик ответов (Безопасный Sliding Expiration)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // 1. Проверяем, что это ошибка 401 и мы еще не пытались повторить этот запрос
    if (err.response?.status === 401 && !originalRequest._retry) {
      
      // КРИТИЧЕСКИЙ ФИКС: Если 401 упал сам запрос рефреша — чистим сторедж и отправляем на авторизацию
      if (originalRequest.url.includes('/auth/refresh')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login'; // Или роутинг твоего приложения
        return Promise.reject(err);
      }

      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');

      if (refresh) {
        try {
          // Вызываем обновление. Если упадет — сработает блок catch ниже
          const res = await api.post('/auth/refresh', { refresh_token: refresh });
          
          localStorage.setItem('access_token', res.data.access_token);
          
          // Обновляем заголовок в упавшем запросе и повторяем его
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Если при обновлении токена произошел сбой (например, токен отозван)
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(err);
  }
);