export const environment = {
  production: false,
  appName: 'ريحانة',
  appVersion: '1.0.0',
  defaultLang: 'ar',

  /** .NET REST API — plain HTTP, no HTTPS available today (see spec §2, §10 issue 8). */
  apiUrl: 'http://78.89.159.126:9393/TheOneAPIRehana/api',
  /** Every request must carry this — the backend renders Arabic-only error/text bodies. */
  acceptLanguage: 'ar',

  /** localStorage key for the single opaque bearer token (no refresh token exists). */
  tokenKey: 'rehana_token',
  /** localStorage key for the cached display name. */
  nameKey: 'rehana_name',
  /** localStorage key for the cached role string (login heuristic only — see spec §6.4). */
  roleKey: 'rehana_role',

  firebase: {
    apiKey: 'AIzaSyCbnm3X57a3JMaQtXHYglcsXFCHSUyTWMw',
    appId: '1:987914961227:web:306f46d5e760a3f81568ce',
    messagingSenderId: '987914961227',
    projectId: 'rehana-dc092',
    authDomain: 'rehana-dc092.firebaseapp.com',
    storageBucket: 'rehana-dc092.firebasestorage.app',
    measurementId: 'G-PBDQGE12L8',
  },
  /** Used only to fetch an FCM token at login (sent as deviceToken) — see spec §4. */
  vapidKey:
    'BF4pFQe9Hn3uvUQvIxdcu1CKhF-B3knjSggQE30Vut-wy_YtvELbn5LCIwIP4_jMYEOVTnLgIxlxVT2nm_Poiuo',
};
