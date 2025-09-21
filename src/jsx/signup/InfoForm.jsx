// InfoForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import "../../css/signup/InfoForm.css";

/** 서버 스펙: GET /users/me/name/check?name=닉네임  */
async function checkNicknameAPI(name, signal) {
  try {
    const resp = await api.get(`/users/me/name/check`, {
      params: { name },
      signal, // ✅ AbortController 취소 지원
    });
    const data = resp.data || {};
    const available =
      typeof data.available === "boolean" ? data.available : true;
    return { ok: true, available };
  } catch (err) {
    if (err?.response?.status === 409) return { ok: true, available: false };
    if (err?.name === "CanceledError" || err?.name === "AbortError")
      return { ok: false, canceled: true };
    return { ok: false };
  }
}

export default function InfoForm() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [birthYear, setBirthYear] = useState(""); // 출생년도 (4자리)
  const [year, setYear] = useState(""); // 학번 (2자리)
  const [gender, setGender] = useState("남자");
  const [major, setMajor] = useState("");

  // ✅ MBTI
  const [mbti, setMbti] = useState(""); // 최종 선택 결과 (예: "ENFJ")
  const [sheetOpenMbti, setSheetOpenMbti] = useState(false);
  // 각 축의 slider 값 (-100 ~ 100) : 0=중앙, 음수=왼쪽, 양수=오른쪽
  const [axes, setAxes] = useState({ ie: 0, ns: 0, ft: 0, pj: 0 });

  const nickMax = 8;
  const [dupState, setDupState] = useState("idle"); // idle|checking|ok|taken|error
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [sheetOpen, setSheetOpen] = useState(false); // 학과 시트
  const [expanded, setExpanded] = useState({});
  const [majorQuery, setMajorQuery] = useState(""); // ✅ 학과 빠른검색

  // ✅ 최신 공유본 반영: 학부/학과 목록 정리
  const FACULTIES = useMemo(
    () => [
      {
        name: "항공학부",
        majors: [
          "항공교통물류학과",
          "항공운항학과",
          "헬리콥터조종학과",
          "항공정비학과",
          "항공보안학과",
        ],
      },
      {
        name: "항공우주공학부",
        majors: [
          "항공기계공학과",
          "항공전자공학과",
          "무인항공기학과",
          "항공산업공학과",
          "신소재화학공학과",
          "환경·토목·건축학과",
        ],
      },
      {
        name: "AI·SW 학부",
        majors: ["항공AI소프트웨어공학과", "AI로보틱스학과", "AI모빌리티학과"],
      },
      {
        name: "항공관광학부",
        majors: ["항공관광학과", "항공외국어학과", "호텔카지노관광학과"],
      },
      {
        name: "문화콘텐츠학부",
        majors: ["문화재보존학과", "미디어문예창작학과", "실용음악과", "영화영상학과"],
      },
      {
        name: "보건학부",
        majors: [
          "사회복지학과",
          "간호학과",
          "물리치료학과",
          "작업치료학과",
          "방사선학과",
          "치위생학과",
          // 아래 전공들은 기존 코드 유지
          "의료재활학과",
          "수산생명의학과",
          "뷰티바이오산업학과",
          "안전보건학과",
        ],
      },
      {
        name: "디자인융합학부",
        majors: ["영상애니메이션학과", "공간디자인학과", "산업디자인학과", "시각디자인학과", "패션디자인학과"],
      },
      {
        name: "해양·스포츠학부",
        majors: ["해양경찰학과", "경호비서학과", "레저해양스포츠학과"],
      },
      {
        name: "자유전공학부",
        majors: [
          "자유전공학과",
          "인문사회전공자율학과",
          "공학전공자율학과",
          "자연과학전공자율학과",
          "예체능전공자율학과",
        ],
      },
      {
        name: "충남RISE융합학부(계약학과)",
        majors: ["첨단항공학과", "항공서비스경영학과", "모빌리티융합디자인학과", "디지털융합학과(성인학습자)"],
      },
    ],
    []
  );

  const YEAR_NOW = new Date().getFullYear();
  const BIRTHYEAR_MIN = YEAR_NOW - 35;
  const BIRTHYEAR_MAX = YEAR_NOW - 19;

  // ✅ 학번 유효 범위
  const HAKBEON_MIN = 15;
  const HAKBEON_MAX = 25;

  const toggleFaculty = (name) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  const onNicknameChange = (v) => {
    const next = (v || "").slice(0, nickMax);
    setNickname(next);
  };

  // ✅ 닉네임 자동 중복확인 (디바운스 + 취소)
  useEffect(() => {
    const trimmed = nickname.trim();

    // 상태/타이머/요청 초기화
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }

    // 길이 0이거나 1글자면 초기 상태로
    if (trimmed.length < 2) {
      setDupState(trimmed.length === 0 ? "idle" : "idle");
      return;
    }

    // 450ms 디바운스 후 검사 시작
    debounceRef.current = setTimeout(async () => {
      setDupState("checking");
      const controller = new AbortController();
      abortRef.current = controller;
      const { ok, available, canceled } = await checkNicknameAPI(
        trimmed,
        controller.signal
      );
      if (canceled) return;
      if (!ok) {
        setDupState("error");
        return;
      }
      setDupState(available ? "ok" : "taken");
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname]);

  // 수동 버튼 클릭(즉시 확인용)
  const handleCheckNickname = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) return;
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }
    setDupState("checking");
    const controller = new AbortController();
    abortRef.current = controller;
    const { ok, available } = await checkNicknameAPI(trimmed, controller.signal);
    if (!ok) {
      setDupState("error");
      return;
    }
    setDupState(available ? "ok" : "taken");
  };

  // ✅ MBTI 바텀시트: 확인
  const THRESHOLD = 10; // 중앙에서 ±10 넘어가면 선택으로 간주
  const isAxisChosen = (v) => Math.abs(v) > THRESHOLD;

  const allChosen =
    isAxisChosen(axes.ie) &&
    isAxisChosen(axes.ns) &&
    isAxisChosen(axes.ft) &&
    isAxisChosen(axes.pj);

  const composeMbti = () => {
    const pick = (v, left, right) => (v < 0 ? left : right);
    return (
      pick(axes.ie, "I", "E") +
      pick(axes.ns, "N", "S") +
      pick(axes.ft, "F", "T") +
      pick(axes.pj, "P", "J")
    );
  };

  const confirmMbti = () => {
    if (!allChosen) return;
    const result = composeMbti();
    setMbti(result);
    setSheetOpenMbti(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const by = Number(birthYear);
    const y = Number(year);

    if (!by || by < BIRTHYEAR_MIN || by > BIRTHYEAR_MAX) {
      alert(`출생년도는 ${BIRTHYEAR_MIN} ~ ${BIRTHYEAR_MAX} 사이여야 합니다.`);
      return;
    }
    if (!y || y < HAKBEON_MIN || y > HAKBEON_MAX) {
      alert("학번을 확인해주세요.");
      return;
    }
    if (dupState !== "ok") {
      alert("닉네임 중복 확인을 완료해주세요.");
      return;
    }

    const baseInfo = {
      name: nickname.trim(),
      department: major,
      studentNo: String(year),
      birthYear: String(birthYear),
      gender: gender === "남자" ? "MALE" : "FEMALE",
      mbti,
    };

    window.scrollTo(0, 0);
    navigate("/qpage", { replace: true, state: { baseInfo } });
  };

  // ✅ 학번 유효성 플래그
  const yearNum = Number(year);
  const isYearInvalid =
    !!year && (yearNum < HAKBEON_MIN || yearNum > HAKBEON_MAX);

  // ✅ 학과 빠른검색: 필터링된 목록
  const filteredFaculties = useMemo(() => {
    const q = majorQuery.trim().toLowerCase();
    if (!q) return FACULTIES;

    return FACULTIES.map((f) => ({
      ...f,
      majors: f.majors.filter((m) => m.toLowerCase().includes(q)),
    })).filter((f) => f.majors.length > 0);
  }, [FACULTIES, majorQuery]);

  // ✅ 선택된 학과가 속한 학부 자동 펼침
  useEffect(() => {
    if (!major) return;
    const entry = FACULTIES.find((f) => f.majors.includes(major));
    if (entry?.name) {
      setExpanded((prev) => ({ ...prev, [entry.name]: true }));
    }
  }, [major, FACULTIES]);

  // ✅ 바텀시트 열릴 때 검색 초기화
  useEffect(() => {
    if (sheetOpen) setMajorQuery("");
  }, [sheetOpen]);

  // 키보드 접근성: Enter/Space로 아코디언 토글
  const onHeaderKeyDown = (e, name) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFaculty(name);
    }
  };

  return (
    <main className="profile-root">
      <div className="form-shell">
        <h1 className="page-title">정보를 입력하고 시작하세요</h1>
        <p className="page-subtitle">최초 가입 후 수정이 불가합니다</p>

        <form className="info-form" onSubmit={handleSubmit} noValidate>
          {/* 닉네임 */}
          <div className="field">
            <label className="field-label" htmlFor="nickname">
              닉네임
            </label>
            <div className="nick-row">
              <div className="input-wrap">
                <input
                  id="nickname"
                  className="text-input"
                  type="text"
                  maxLength={nickMax}
                  placeholder="닉네임을 입력하세요."
                  value={nickname}
                  onChange={(e) => onNicknameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCheckNickname();
                    }
                  }}
                  aria-describedby="nickname-hint"
                />
                <span className="count-badge">
                  {nickname.length}/{nickMax}
                </span>
              </div>

              <button
                type="button"
                className="pill-btn"
                onClick={handleCheckNickname}
                disabled={nickname.trim().length < 2 || dupState === "checking"}
                aria-live="polite"
              >
                {dupState === "checking" ? "확인중..." : "중복확인"}
              </button>
            </div>

            <div className="hint-box" id="nickname-hint" role="status" aria-live="polite">
              {nickname.length > 0 && nickname.length < 2 && (
                <span className="hint-error">최소 두글자 이상 지어주세요.</span>
              )}
              {dupState === "checking" && (
                <span className="hint-info">중복 확인 중…</span>
              )}
              {dupState === "ok" && nickname.trim().length >= 2 && (
                <span className="hint-success">사용 가능한 닉네임이에요.</span>
              )}
              {dupState === "taken" && (
                <span className="hint-error">중복된 닉네임입니다.</span>
              )}
              {dupState === "error" && (
                <span className="hint-error">
                  확인에 실패했어요. 잠시 후 다시 시도해주세요.
                </span>
              )}
            </div>
          </div>

          {/* 출생년도 / 학번 / 성별 */}
          <div className="grid-3">
            <div className="field">
              <label className="field-label" htmlFor="birthYear">
                출생년도
              </label>
              <div className="input-wrap">
                <input
                  id="birthYear"
                  className="text-input"
                  inputMode="numeric"
                  placeholder={`${BIRTHYEAR_MIN}~${BIRTHYEAR_MAX}`}
                  value={birthYear}
                  onChange={(e) =>
                    setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
                <span className="suffix">년</span>
              </div>
              <div className="hint-box">
                {birthYear &&
                  (Number(birthYear) < BIRTHYEAR_MIN ||
                    Number(birthYear) > BIRTHYEAR_MAX) && (
                    <span className="hint-error">
                      {BIRTHYEAR_MIN} ~ {BIRTHYEAR_MAX} 사이여야 합니다.
                    </span>
                  )}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="year">
                학번
              </label>
              <div className="input-wrap has-suffix">
                <input
                  id="year"
                  className="text-input"
                  inputMode="numeric"
                  placeholder="예: 25"
                  value={year}
                  onChange={(e) =>
                    setYear(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                />
                <span className="suffix">학번</span>
              </div>
              <div className="hint-box1">
                {isYearInvalid && (
                  <span className="hint-error">학번을 확인해주세요.</span>
                )}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="gender">
                성별
              </label>
              <div className="input-wrap">
                <select
                  id="gender"
                  className="select-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="남자">남자</option>
                  <option value="여자">여자</option>
                </select>
              </div>
              <div className="hint-box" />
            </div>
          </div>

          {/* ✅ MBTI: 바텀시트 트리거 (회색 입력창에 결과 표시) */}
          <div className="field">
            <label className="field-label" htmlFor="mbtiBtn">
              MBTI
            </label>
            <div
              id="mbtiBtn"
              role="button"
              tabIndex={0}
              className={`input-wrap input-clickable ${!mbti ? "placeholder" : ""}`}
              onClick={() => setSheetOpenMbti(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSheetOpenMbti(true);
                }
              }}
              aria-haspopup="dialog"
              aria-expanded={sheetOpenMbti}
            >
              <span className="text-input as-text">
                {mbti || "슬라이더로 MBTI를 선택하세요."}
              </span>
              <span className="chev" aria-hidden>
                ▾
              </span>
            </div>
          </div>

          {/* 학과: 바텀시트 트리거 */}
          <div className="field">
            <label className="field-label" htmlFor="majorBtn">
              학과
            </label>
            <div
              id="majorBtn"
              role="button"
              tabIndex={0}
              className={`input-wrap input-clickable ${!major ? "placeholder" : ""}`}
              onClick={() => setSheetOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSheetOpen(true);
                }
              }}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
            >
              <span className="text-input as-text">
                {major || "학과를 선택하세요."}
              </span>
              <span className="chev" aria-hidden>
                ▾
              </span>
            </div>
          </div>

          {/* 제출 */}
          <div className="sticky-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={
                !nickname ||
                nickname.trim().length < 2 ||
                !birthYear ||
                birthYear.length !== 4 ||
                !year ||
                year.length !== 2 ||
                isYearInvalid ||
                !gender ||
                !major ||
                dupState !== "ok"
                // || !mbti    // MBTI를 필수로 만들고 싶다면 주석 해제
              }
            >
              다음으로
            </button>
          </div>
        </form>
      </div>

      {/* 학과 바텀시트 */}
      {sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="학과 선택">
            <div className="sheet-header">
              <strong>학과 선택</strong>
              <button
                className="sheet-close"
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* ✅ 빠른 검색 */}
            <div className="sheet-body">
              <div className="field" style={{ marginBottom: "1rem" }}>
                <div className="input-wrap">
                  <input
                    className="text-input"
                    type="text"
                    placeholder="학과명 검색 (예: 항공전자)"
                    value={majorQuery}
                    onChange={(e) => setMajorQuery(e.target.value)}
                    aria-label="학과 검색"
                  />
                </div>
              </div>

              <ul className="acc-list">
                {filteredFaculties.map(({ name, majors }) => {
                  const open = !!expanded[name] || !!majorQuery; // 검색 중엔 자동 펼침
                  const panelId = `acc-panel-${name}`;
                  const headerId = `acc-header-${name}`;
                  return (
                    <li key={name} className="acc-item">
                      <button
                        id={headerId}
                        type="button"
                        className={`acc-header ${open ? "is-open" : ""}`}
                        onClick={() => !majorQuery && toggleFaculty(name)}
                        onKeyDown={(e) => onHeaderKeyDown(e, name)}
                        aria-expanded={open}
                        aria-controls={panelId}
                      >
                        <span className="caret" aria-hidden />
                        <span className="acc-title">{name}</span>
                      </button>
                      <div
                        id={panelId}
                        className={`acc-body ${open ? "open" : ""}`}
                        role="region"
                        aria-labelledby={headerId}
                      >
                        <ul className="program-list">
                          {majors.map((m) => (
                            <li key={m}>
                              <button
                                type="button"
                                className={`program-item ${major === m ? "is-selected" : ""}`}
                                onClick={() => {
                                  setMajor(m);
                                  setSheetOpen(false);
                                }}
                              >
                                {m}
                                {major === m && <span className="check">✓</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}

                {/* 검색 결과 없음 */}
                {filteredFaculties.length === 0 && (
                  <li className="acc-item">
                    <div className="acc-body open">
                      <div className="hint-box">
                        <span className="hint-info">검색 결과가 없습니다.</span>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* ✅ MBTI 바텀시트 (슬라이더 UI) */}
      {sheetOpenMbti && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpenMbti(false)} />
          <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="MBTI 선택">
            <div className="sheet-header">
              <strong>MBTI 선택</strong>
              <button
                className="sheet-close"
                type="button"
                onClick={() => setSheetOpenMbti(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="sheet-body">
              <div className="mbti-slider-group">
                {/* I — E */}
                <div className="mbti-row">
                  <span className={`mbti-end ${axes.ie < -THRESHOLD ? "is-picked" : ""}`}>I</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={axes.ie}
                    onChange={(e) => setAxes((s) => ({ ...s, ie: Number(e.target.value) }))}
                    className="mbti-range"
                    aria-label="I-E"
                  />
                  <span className={`mbti-end ${axes.ie > THRESHOLD ? "is-picked" : ""}`}>E</span>
                </div>

                {/* N — S */}
                <div className="mbti-row">
                  <span className={`mbti-end ${axes.ns < -THRESHOLD ? "is-picked" : ""}`}>N</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={axes.ns}
                    onChange={(e) => setAxes((s) => ({ ...s, ns: Number(e.target.value) }))}
                    className="mbti-range"
                    aria-label="N-S"
                  />
                  <span className={`mbti-end ${axes.ns > THRESHOLD ? "is-picked" : ""}`}>S</span>
                </div>

                {/* F — T */}
                <div className="mbti-row">
                  <span className={`mbti-end ${axes.ft < -THRESHOLD ? "is-picked" : ""}`}>F</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={axes.ft}
                    onChange={(e) => setAxes((s) => ({ ...s, ft: Number(e.target.value) }))}
                    className="mbti-range"
                    aria-label="F-T"
                  />
                  <span className={`mbti-end ${axes.ft > THRESHOLD ? "is-picked" : ""}`}>T</span>
                </div>

                {/* P — J */}
                <div className="mbti-row">
                  <span className={`mbti-end ${axes.pj < -THRESHOLD ? "is-picked" : ""}`}>P</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={axes.pj}
                    onChange={(e) => setAxes((s) => ({ ...s, pj: Number(e.target.value) }))}
                    className="mbti-range"
                    aria-label="P-J"
                  />
                  <span className={`mbti-end ${axes.pj > THRESHOLD ? "is-picked" : ""}`}>J</span>
                </div>
              </div>

              <button
                type="button"
                className={`mbti-confirm ${allChosen ? "is-enabled" : "is-disabled"}`}
                onClick={confirmMbti}
                disabled={!allChosen}
              >
                확인
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
