importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDZY3CYX2-euGMJXHCzA4JA_4Ik_64GP4M",
  authDomain: "kurakani-90a8d.firebaseapp.com",
  projectId: "kurakani-90a8d",
  storageBucket: "kurakani-90a8d.firebasestorage.app",
  messagingSenderId: "898273082956",
  appId: "1:898273082956:web:1752ed05111dc8d3093ee9",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have received a new message.',
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
