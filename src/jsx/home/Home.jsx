import "../../css/home/Home.css";
import FlirtingTabs from "./FlirtingTabs";
import Logo from "../../image/loginPage/logo2.png";
import MatchingBanner from "../../image/home/match.svg";
import Map from "../../image/home/map.png"; // ✅ 위치 지도
import MapInfo from "../../image/home/mapinfo.png"; // ✅ 번호 안내
import QandA from "../../image/home/q&a.svg";

import { ReactComponent as InstaIcon } from "../../image/home/instagram.svg";

import DrinkMenu from "../home/DrinkMenu";
import PopUp from "./PopUp";
import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Loader from "../common/Loader";

function Home() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 첫 렌더 로딩 효과
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.35 } },
    exit: { opacity: 0, transition: { duration: 0.35 } },
  };

  // 팀 데이터
  const TEAM = [
    {
      role: "행사 총괄",
      major: "항공소프트웨어공학과",
      person: "21학번 김연희",
      ig: "https://instagram.com/yonhee0706",
    },
    {
      role: "개발 PM",
      major: "항공소프트웨어공학과",
      person: "21학번 최지인",
      ig: "https://instagram.com/choijiin_02",
    },
    {
      role: "DE",
      major: "시각디자인학과",
      person: "23학번 문지원",
      ig: "https://instagram.com/1m0zi",
    },
    {
      role: "FE",
      major: "항공소프트웨어공학과",
      person: "22학번 김형석",
      ig: "https://instagram.com/bro_stone_03",
    },
    {
      role: "BE",
      major: "항공소프트웨어공학과",
      person: "22학번 박찬우",
      ig: "https://instagram.com/chanwoo0321",
    },
  ];

  return (
    <>
      <AnimatePresence mode="sync">
        {!loading && (
          <motion.div key="home" {...fade}>
            <section className="hero">
              <div className="hero-bg"></div>
              <div className="hero-content">
                <p className="hero-subtitle">
                  평범한 축제가 <span className="highlight">특별</span>해지는
                  순간! <br />
                  당신의 옆자리를 채울{" "}
                  <span className="highlight">한 사람</span>을 찾아보세요.
                </p>
                <img
                  src={Logo}
                  alt="너랑 나랑 로고"
                  className="hero-logo-img"
                />
              </div>
            </section>

            {/* 매칭 배너 */}
            <Link to="/matching" className="home-matching-banner">
              <img
                src={MatchingBanner}
                alt="매칭 배너 이미지"
                className="matching-banner-img"
              />
              <div className="matching-banner-text">
                <h2>매칭하기</h2>
                <p>당신의 인연을 찾아보세요</p>
              </div>
            </Link>

            <FlirtingTabs />

            {/* 음료 메뉴 + 부스 위치 (항상 세로로, 지도는 아래) */}
            <section className="drink-and-map">
              <div className="drink-menu-block">
                <DrinkMenu />
              </div>

              <div className="booth-location">
                <h3>
                  멋사부스는 <span className="highlight">이곳</span>에 있어요
                </h3>
                <div className="booth-map">
                  <img src={Map} alt="부스 위치 이미지" />
                </div>
                <div className="booth-map-info">
                  <img src={MapInfo} alt="부스 번호 안내 이미지" />
                </div>
              </div>
            </section>

            {/* 팀 크레딧 박스 */}
            <section className="credits-section">
              <div className="credits-card">
                <h3 className="credits-title">
                  <img
                    src={`${process.env.PUBLIC_URL}/멋사로고.png`}
                    alt="멋사 로고"
                    className="credits-logo"
                  />
                  멋쟁이사자처럼
                  <span className="credits-badge">TEAM</span>
                </h3>

                <dl className="credits-list">
                  {TEAM.map((m) => (
                    <div className="credits-item" key={m.role}>
                      {/* 라벨 */}
                      <dt className="credits-label">{m.role}</dt>

                      {/* dd 묶음 (세로) */}
                      <div className="credits-info">
                        <dd className="credit-value">{m.major}</dd>
                        <dd className="credits-value">{m.person}</dd>
                      </div>

                      {/* 우측 인스타 아이콘 */}
                      {m.ig && (
                        <a
                          className="credits-ig"
                          href={m.ig}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${m.role} 인스타그램 열기`}
                          title="Instagram"
                        >
                          <InstaIcon className="ig-icon" />
                        </a>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* Q&A 버튼 */}
            <section className="QandA-home">
              <button
                className="QandA-btn"
                onClick={() => setIsPopupOpen(true)}
                type="button"
              >
                <div className="QandA-text">
                  <div
                    className="Q-title"
                    style={{ fontSize: "20px", fontWeight: "bold" }}
                  >
                    FAQ
                  </div>
                  <div className="Q-subtitle" style={{ fontSize: "14px" }}>
                    자주 묻는 질문 및 개인정보 처리방침
                  </div>
                </div>
                <img src={QandA} alt="큐앤에이 이미지" />
              </button>
            </section>

            {/* 팝업 */}
            <PopUp open={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로딩 오버레이 */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2000,
          }}
        >
          <Loader />
        </div>
      )}
    </>
  );
}

export default Home;
