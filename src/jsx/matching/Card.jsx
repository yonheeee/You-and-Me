// src/jsx/matching/MatchingPage.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import Card from "./Card";

export default function MatchingPage() {
  const [previousList, setPreviousList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // ✅ /match/previous 호출
        const res = await api.get("/match/previous");

        // 응답 구조: { candidates: [...] }
        setPreviousList(res.data?.candidates ?? []);
      } catch (err) {
        console.error("이전 매칭 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "5rem" }}>불러오는 중...</div>;
  }

  if (!previousList.length) {
    return <div style={{ textAlign: "center", marginTop: "5rem" }}>이전 매칭 결과가 없습니다.</div>;
  }

  return (
    <div>
      {/* ✅ Card.jsx에 initialCandidates로 넘겨주기 */}
      <Card initialCandidates={previousList} />
    </div>
  );
}
