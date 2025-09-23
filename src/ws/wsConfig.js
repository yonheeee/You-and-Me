// src/ws/wsConfig.js
export const WS_URL = process.env.REACT_APP_WS_URL;

export const USER_DEST_PREFIX = "/user";
export const BROKER_DEST_PREFIX = "/queue";

export const SUBS = {
  signals: `${USER_DEST_PREFIX}${BROKER_DEST_PREFIX}/signals`,
  matches: `${USER_DEST_PREFIX}${BROKER_DEST_PREFIX}/matches`,
};
