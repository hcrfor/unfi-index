// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

// 카카오 디벨로퍼스 자바스크립트 키
const KAKAO_APP_KEY = '0ea4ab488acf316bce60726d53c59413';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);

  // UTM-K 좌표 ➡️ WGS84 위경도 정밀 변환
  const coords = convertUtmkToWgs84(item.coordX, item.coordY);

  // 카카오맵 전용 이동 URL
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  useEffect(() => {
    if (!coords.isValid) return;

    // 🌟 오직 100% 진짜 카카오맵만 렌더링하도록 일원화!
    const initKakaoMapDirectly = () => {
      if (!mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

      const kakao = window.kakao;
      const centerLatLng = new kakao.maps.LatLng(coords.lat, coords.lng);

      // 카카오 지도 객체 생성 (레벨 2: 큼직하고 선명한 뷰)
      const map = new kakao.maps.Map(mapContainerRef.current, {
        center: centerLatLng,
        level: 2,
      });

      // 🌟 진짜 카카오 위성사진 (스카이뷰 + 지명/도로 하이브리드)
      map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

      // 지도 컨트롤러 (지도/위성 전환, 확대/축소)
      map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      // 🌟 중심점 기준 반경 11.3m 빨간 선 테두리 원
      const circle = new kakao.maps.Circle({
        center: centerLatLng,
        radius: 11.3,
        strokeWeight: 2.5,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        fillColor: '#FF0000',
        fillOpacity: 0.12,
      });
      circle.setMap(map);

      // 🌟 중심점 초록색 마커 핀
      const markerContent = `
        <div style="
          width: 14px;
          height: 14px;
          background-color: #00FF00;
          border: 2px solid #000000;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 8px rgba(0,255,0,0.8);
        "></div>
      `;

      const customOverlay = new kakao.maps.CustomOverlay({
        position: centerLatLng,
        content: markerContent,
        xAnchor: 0,
        yAnchor: 0,
      });
      customOverlay.setMap(map);
    };

    // 카카오 SDK 스크립트 동적 로드 (autoload=false 정석 규칙 준수)
    if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
      window.kakao.maps.load(initKakaoMapDirectly);
    } else {
      const script = document.createElement('script');
      script.id = 'kakao-map-sdk';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
      script.async = true;

      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(initKakaoMapDirectly);
        }
      };

      document.head.appendChild(script);
    }
  }, [coords.lat, coords.lng, coords.isValid]);

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="map-modal-header">
          <div className="modal-title-box">
            <div className="modal-subtitle">
              표본점 <span className="highlight-id">{item.sampleId}</span> 카카오 위성 지도 (스카이뷰)
            </div>
            <h2 className="modal-title">{item.address || '주소 정보 없음'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">
            <X size={22} />
          </button>
        </div>

        {/* 좌표 정보 바 */}
        <div className="modal-coords-bar">
          <div className="coord-tag">
            <span className="coord-label">UTM-K:</span>
            <span className="coord-val">X {item.coordX} / Y {item.coordY}</span>
          </div>
          <div className="coord-tag highlight">
            <span className="coord-label">WGS84:</span>
            <span className="coord-val">{coords.lat}°, {coords.lng}°</span>
          </div>
          <div className="coord-tag radius">
            <span className="coord-label">시각화:</span>
            <span className="coord-val">반경 11.3m 원</span>
          </div>
        </div>

        {/* 🌟 100% 진짜 카카오맵 전용 메인 뷰포트 */}
        <div className="map-viewport-wrapper">
          <div ref={mapContainerRef} className="map-viewport" />
        </div>

        {/* 모달 푸터 */}
        <div className="map-modal-footer">
          <a
            href={kakaoMapDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="external-map-btn"
          >
            <ExternalLink size={16} />
            <span>카카오맵 앱/웹으로 직접 열기</span>
          </a>

          <button className="confirm-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
