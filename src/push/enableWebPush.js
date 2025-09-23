// src/push/enableWebPush.js
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function b64urlToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function enableWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64urlToUint8Array(VAPID_PUBLIC_KEY),
  });

  // 사용자 식별과 함께 서버에 저장
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(sub),
  });
  console.log('[PUSH] subscribed');
}
