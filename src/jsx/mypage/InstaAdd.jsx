// src/components/common/InstaAdd.jsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "../../css/mypage/InstaAdd.css";

export default function InstaAdd({
  onClose,
  onSave,
  defaultId = "",
  allowEmpty = true, // ✅ 빈값 저장(연결 해제) 허용
}) {
  const [instaId, setInstaId] = useState("");

  // 어떤 형태(raw)든 username만 뽑아내기: URL/앞의 @/끝의 / 모두 제거
  const toUsername = (raw) => {
    if (!raw) return "";
    let s = String(raw).trim();
    if (!s) return "";

    // URL처럼 생기면 URL 파싱해서 path의 첫 세그먼트만 추출
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
      try {
        const u = new URL(s.startsWith("http") ? s : `https://${s}`);
        // instagram 도메인인 경우만 안전하게 추출
        const host = u.hostname.replace(/^www\./i, "");
        if (host === "instagram.com") {
          // "/username/" -> "username"
          s = u.pathname.replace(/^\/+|\/+$/g, "");
        }
      } catch {
        // 파싱 실패 시 그대로 진행 (아래에서 @/슬래시 제거)
      }
    }

    // 앞의 @ 제거, 끝의 / 제거
    s = s.replace(/^@+/, "").replace(/\/+$/, "");
    return s;
  };

  // 유효성: 영문/숫자/._, 1~30자, 앞/뒤 '.' 금지
  const isValidUsername = (u) =>
    /^[A-Za-z0-9._]{1,30}$/.test(u) && !u.startsWith(".") && !u.endsWith(".");

  // 모달 열릴 때 defaultId를 username으로 정규화해서 채워넣기
  useEffect(() => {
    setInstaId(toUsername(defaultId));
  }, [defaultId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = toUsername(instaId);

    if (!value && !allowEmpty) {
      alert("인스타그램 아이디를 입력해주세요.");
      return;
    }
    if (value && !isValidUsername(value)) {
      alert(
        "아이디 형식이 올바르지 않습니다. (영문/숫자/._, 1–30자, 앞뒤에 . 금지)"
      );
      return;
    }

    onSave?.(value); // 빈 문자열이면 상위에서 '연결 해제' 처리
    onClose?.();
  };

  const modal = (
    <div className="insta-modal-backdrop" role="dialog" aria-modal="true">
      <div className="insta-modal" role="document">
        {/* 헤더 */}
        <div className="insta-modal-header">
          <h2>인스타그램 아이디 추가</h2>
          <button
            type="button"
            className="insta-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <form className="insta-modal-body" onSubmit={handleSubmit}>
          <label htmlFor="insta-input" className="insta-label">
            인스타그램 <strong>아이디</strong>만 입력하세요
            <span className="hint"> (URL 불가, 비우면 해제)</span>
          </label>

          <div className="insta-input-wrapper">
            <span className="insta-prefix">@</span>
            <input
              id="insta-input"
              type="text"
              value={instaId}
              onChange={(e) => setInstaId(e.target.value)}
              placeholder="username"
              autoFocus
              inputMode="text"
              autoComplete="off"
            />
          </div>

          <div className="insta-actions">
            <button type="submit" className="insta-save-btn">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
