importScripts(
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBWVZERDb9xbfqCzG3bZvRIciCslbhGTD4",
  authDomain: "entry-4a14b.firebaseapp.com",
  databaseURL: "https://tfteamdata-default-rtdb.firebaseio.com/",
  projectId: "entry-4a14b",
  storageBucket: "entry-4a14b.firebasestorage.app",
  messagingSenderId: "262491101728",
  appId: "1:262491101728:web:c67d03020d7e753e07ba45",
  measurementId: "G-V45QGJ3D8E"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("백그라운드 알림 수신:", payload);

  const notificationTitle =
    payload.notification?.title || "온라인 출입 시스템";

  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/image/favicon.png"
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});