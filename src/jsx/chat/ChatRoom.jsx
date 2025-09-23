// src/jsx/chat/ChatRoom.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  getDoc,
  runTransaction,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../libs/firebase";
import { onAuthStateChanged } from "firebase/auth";
import useUserStore from "../../api/userStore";
import useChatStore from "../../api/chatStore";
import { FaArrowUp } from "react-icons/fa";
import "../../css/chat/ChatRoom.css";
import YouProfile from "../mypage/YouProfile.jsx";

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserStore();

  const { addDeletedRoom } = useChatStore();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const [sending, setSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const myIdNum = Number(user?.userId);
  const myIdStr = Number.isFinite(myIdNum) ? String(myIdNum) : "";

  const chatroomRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const composingRef = useRef(false);

  // ✅ 첫 로드 체크 ref
  const firstLoadRef = useRef(true);

  // 포커스 보강
  const refocusInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 0);
  }, []);

  // iOS 스크롤 보정
  const unlockBodyScroll = useCallback(() => {
    document.body.style.overflow = "auto";
  }, []);
  const lockBodyScroll = useCallback(() => {
    document.body.style.overflow = "hidden";
  }, []);

  // Firebase Auth 준비
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => setAuthReady(true));
    return unsub;
  }, []);

  // 채팅화면 body 스크롤 잠금
  useEffect(() => {
    lockBodyScroll();
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [lockBodyScroll]);

  // 방 정보 로드
  useEffect(() => {
    if (!authReady || !roomId) return;
    const roomRef = doc(db, "chatRooms", roomId);
    getDoc(roomRef)
      .then((snap) => {
        if (snap.exists()) setRoomInfo(snap.data());
        else navigate("/chat");
      })
      .catch((e) => console.error("[ChatRoom] getDoc room error:", e));
  }, [authReady, roomId, navigate]);

  const participants = useMemo(
    () => (roomInfo?.participants || []).map(Number),
    [roomInfo]
  );
  const peerIdNum = useMemo(
    () => participants.find((id) => id !== myIdNum) ?? null,
    [participants, myIdNum]
  );
  const peerIdStr = useMemo(
    () => (Number.isFinite(peerIdNum) ? String(peerIdNum) : ""),
    [peerIdNum]
  );

  const peersByUserId = useMemo(() => {
    const out = {};
    const p = roomInfo?.peers || {};
    for (const k of Object.keys(p)) {
      const u = Number(p[k]?.userId);
      if (Number.isFinite(u)) out[u] = p[k];
    }
    return out;
  }, [roomInfo]);

  const peerData = peerIdNum != null ? peersByUserId[peerIdNum] ?? null : null;

  // 방 나가기
  async function handleLeaveRoom() {
    if (!roomId) return;
    const ok = window.confirm(
      "채팅방을 나가면 대화 내용이 모두 삭제됩니다. 나가시겠습니까?"
    );
    if (!ok) return;

    try {
      const roomRef = doc(db, "chatRooms", roomId);
      await deleteDoc(roomRef);
      addDeletedRoom(roomId);
      navigate("/chat");
    } catch (err) {
      console.error("채팅방 삭제 실패:", err);
      alert("채팅방을 나갈 수 없습니다.");
    }
  }

  // === 스크롤 유틸 ===
  const isNearBottom = useCallback(() => {
    const el = messagesWrapRef.current;
    if (!el) return true;
    const threshold = 120;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance < threshold;
  }, []);

  const smartScrollToBottom = useCallback(
    (force = false) => {
      if (force || isNearBottom()) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 30);
      }
    },
    [isNearBottom]
  );

  // ✅ 첫 로드 점프 스크롤
  const jumpToBottom = useCallback(() => {
    const el = messagesWrapRef.current;
    if (!el) return;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollTop = el.scrollHeight;
    el.style.scrollBehavior = prev || "";
  }, []);

  // 읽음 처리
  const markRoomUnreadZero = useCallback(async (roomId, userIdStr) => {
    try {
      const roomRef = doc(db, "chatRooms", roomId);
      await updateDoc(roomRef, { [`unread.${userIdStr}`]: 0 });
    } catch (e) {
      console.warn("markRoomUnreadZero failed", e);
    }
  }, []);

  const markAllAsRead = useCallback(async (roomId, userIdStr, list) => {
    if (!roomId || !userIdStr || !Array.isArray(list) || list.length === 0)
      return;
    try {
      const batch = writeBatch(db);
      const msgCol = collection(db, "chatRooms", roomId, "messages");
      let dirty = 0;

      for (const msg of list) {
        if (msg?.readBy?.[userIdStr]) continue;
        const msgRef = doc(msgCol, msg.id);
        batch.update(msgRef, { [`readBy.${userIdStr}`]: true });
        dirty++;
        if (dirty >= 450) break;
      }

      if (dirty > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn("markAllAsRead failed", e);
    }
  }, []);

  const maybeMarkAsRead = useCallback(
    (list) => {
      if (!roomId || !myIdStr || !Array.isArray(list) || list.length === 0)
        return;
      if (document.visibilityState !== "visible") return;
      if (typeof window !== "undefined" && !document.hasFocus()) return;

      const last = list[list.length - 1];
      if (Number(last?.senderId) !== myIdNum) {
        markAllAsRead(roomId, myIdStr, list);
        markRoomUnreadZero(roomId, myIdStr);
      }
    },
    [roomId, myIdStr, myIdNum, markAllAsRead, markRoomUnreadZero]
  );

  // 메시지 구독
  useEffect(() => {
    if (!authReady || !roomId) return;

    const q = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMessages(newMessages);

        // ✅ 첫 로드: 점프 스크롤
        if (firstLoadRef.current) {
          firstLoadRef.current = false;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              jumpToBottom();
              maybeMarkAsRead(newMessages);
            });
          });
          return;
        }

        // 이후: 부드러운 스크롤
        const added = snapshot.docChanges().some((c) => c.type === "added");
        if (added) maybeMarkAsRead(newMessages);
        smartScrollToBottom();
      },
      (err) => {
        console.error("[ChatRoom] onSnapshot(messages) error:", err);
      }
    );

    return () => unsub();
  }, [authReady, roomId, myIdNum, maybeMarkAsRead, smartScrollToBottom, jumpToBottom]);

  // 포커스/가시성 변화 시 읽음 처리
  useEffect(() => {
    const onFocusOrVisible = () => maybeMarkAsRead(messages);
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [messages, maybeMarkAsRead]);

  // 최초 입장 시 읽음 처리
  useEffect(() => {
    if (authReady && roomId && myIdStr) {
      markAllAsRead(roomId, myIdStr, messages);
      markRoomUnreadZero(roomId, myIdStr);
    }
  }, [authReady, roomId, myIdStr, messages, markAllAsRead, markRoomUnreadZero]);

  // iOS 뷰포트 대응
  useEffect(() => {
    const handleResize = () => {
      if (!chatroomRef.current || !inputWrapperRef.current) return;
      chatroomRef.current.style.height = `${window.innerHeight}px`;
      inputWrapperRef.current.style.bottom = "0px";
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 전송
  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    if (!Number.isFinite(myIdNum) || !roomId) return;
    if (!Array.isArray(roomInfo?.participants) || roomInfo.participants.length < 2)
      return;

    setSending(true);
    try {
      const roomRef = doc(db, "chatRooms", roomId);
      const msgColRef = collection(db, "chatRooms", roomId, "messages");

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) throw new Error("Room not found");
        const data = snap.data() || {};
        const parts = (data.participants || []).map(Number);
        const receiverIdNum = parts.find((id) => id !== myIdNum);
        if (!Number.isFinite(receiverIdNum)) throw new Error("Peer not found");

        const newMsgRef = doc(msgColRef);
        const now = serverTimestamp();

        tx.set(newMsgRef, {
          text,
          senderId: myIdNum,
          createdAt: now,
          readBy: { [String(myIdNum)]: true },
        });

        tx.update(roomRef, {
          lastMessage: { text, senderId: myIdNum, createdAt: now },
          [`unread.${String(receiverIdNum)}`]: increment(1),
        });
      });

      setInput("");
      refocusInput();
      smartScrollToBottom(true);
    } catch (e) {
      console.error("sendMessage failed:", e);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!sending) sendMessage();
    refocusInput();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && composingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleInputWrapperTouchEnd(e) {
    const tag = (e.target.tagName || "").toUpperCase();
    if (tag !== "INPUT" && tag !== "TEXTAREA" && inputRef.current) {
      refocusInput();
    }
  }

  function formatTime(ts) {
    try {
      if (!ts?.toDate) return "";
      return ts.toDate().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className="chatroom" ref={chatroomRef}>
      {/* 상단 헤더 */}
      <div className="chatroom-header">
        <button className="back-btn" onClick={() => navigate("/chat")}>
          ←
        </button>
        {peerData ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}
            onClick={() => setShowProfile(true)}
          >
            <img
              src={peerData.typeImageUrl2}
              alt="avatar"
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <div style={{ fontWeight: "bold" }}>{peerData.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>{peerData.department}</div>
            </div>
          </div>
        ) : (
          <span className="title" style={{ flex: 1 }}>채팅방</span>
        )}
        <button
          className="leave-btn"
          onClick={handleLeaveRoom}
          style={{ marginLeft: "auto", background: "none", border: "none", fontSize: "0.9rem", color: "#e74c3c", cursor: "pointer" }}
        >
          나가기
        </button>
      </div>

      {/* 메시지 영역 */}
      <div className="chatroom-messages" ref={messagesWrapRef}>
        {messages.map((msg) => {
          const isMe = Number(msg.senderId) === myIdNum;
          const senderData = peersByUserId[Number(msg.senderId)] || {};
          const peerHasRead = isMe && peerIdStr ? Boolean(msg?.readBy?.[peerIdStr]) : false;

          return (
            <div key={msg.id} className={`chat-msg ${isMe ? "me" : "other"}`}>
              {!isMe && (
                <img
                  src={senderData.typeImageUrl2}
                  alt="avatar"
                  className="avatar"
                  onClick={() => setShowProfile(true)}
                  style={{ cursor: "pointer" }}
                />
              )}
              <div className="bubble-wrap">
                {!isMe && senderData.name && <div className="name">{senderData.name}</div>}
                <div className="bubble">{msg.text}</div>
                <div className="time">
                  {formatTime(msg.createdAt)}
                  {isMe && (
                    <span className="read-status" aria-label="read-status">
                      {peerHasRead ? "읽음" : "1"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <form
        className="chatroom-input"
        ref={inputWrapperRef}
        onSubmit={handleSubmit}
        onTouchEnd={handleInputWrapperTouchEnd}
        onPointerUp={handleInputWrapperTouchEnd}
        style={{ zIndex: 200 }}
      >
        <input
          autoFocus
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onFocus={unlockBodyScroll}
          onBlur={lockBodyScroll}
          placeholder="메세지를 입력해주세요."
          inputMode="text"
          enterKeyHint="send"
          disabled={!Number.isFinite(myIdNum) || !roomId}
        />
        <button
          type="submit"
          className="send-btn"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          disabled={sending || !input.trim() || !Number.isFinite(myIdNum) || !roomId}
          aria-busy={sending}
        >
          <FaArrowUp size={20} color="white" />
        </button>
      </form>

      {/* 상대방 프로필 모달 */}
      {showProfile && peerIdNum != null && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <YouProfile userId={peerIdNum} onClose={() => setShowProfile(false)} fromMatching={false} />
          </div>
        </div>
      )}
    </div>
  );
}
