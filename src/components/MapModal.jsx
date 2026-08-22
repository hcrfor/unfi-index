// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

// 카카오 디벨로퍼스 자바스크립트 키
const KAKAO_APP_KEY = '0ea4ab488acf316bce60726d53c59413';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // UTM-K 좌표 ➡️ WGS84 위경도 정밀 변환
  const coords = convertUtmkToWgs84(item.coordX, item.coordY);

  // 카카오맵 모바일/PC 전용 지도 뷰어 URL
  const kakaoMapEmbedUrl = `https://m.map.kakao.com/actions/searchView?q=${encodeURIComponent(item.address || item.sampleId)}&wx=${item.coordX}&wy=${item.coordY}`;
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  useEffect(() => {
    if (!coords.isValid) return;

    let isMounted = true;

    // 카카오 지도 SDK 로드 및 초기화
    const initKakaoMap = () => {
      if (!mapContainerRef.current) return;

      const kakao = window.kakao;
      const centerLatLng = new kakao.maps.LatLng(coords.lat, coords.lng);

      const map = new kakao.maps.Map(mapContainerRef.current, {
        center: centerLatLng,
        level: 2,
      });

      // 진짜 카카오 위성사진 적용 (스카이뷰 + 지명 하이브리드)
      map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

      // 지도 컨트롤러
      map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      // 중심점 기준 반경 11.3m 원 그리기
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

      // 중심점 마커 핀
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

    // 카카오 SDK 로딩 처리
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        try {
          initKakaoMap();
        } catch (err) {
          if (isMounted) setUseIframeFallback(true);
        }
      });
    } else {
      const script = document.createElement('script');
      script.id = 'kakao-map-sdk';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
      script.async = true;

      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            try {
              initKakaoMap();
            } catch (err) {
              if (isMounted) setUseIframeFallback(true);
            }
          });
        } else {
          if (isMounted) setUseIframeFallback(true);
        }
      };

      script.onerror = () => {
        // 도메인 승인 차단 시에도 팝업 안에서 100% 진짜 카카오 지도 뷰어로 즉시 전환!
        if (isMounted) setUseIframeFallback(true);
      };

      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lng, coords.isValid]);

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="map-modal-header">
          <div className="modal-title-box">
            <div className="modal-subtitle">
              표본점 <span className="highlight-id">{item.sampleId}</span> 카카오 지도
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

        {/* 메인 지도 뷰포트 (도메인 차단 시에도 팝업 안에서 100% 카카오 지도 웹 뷰어로 즉시 표시) */}
        <div className="map-viewport-wrapper">
          {!useIframeFallback ? (
            <div ref={mapContainerRef} className="map-viewport" />
          ) : (
            <iframe
              src={kakaoMapEmbedUrl}
              className="kakao-iframe-viewport"
              title="카카오 지도 뷰어"
            />
          )}
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
            <span>카카오맵 앱/웹으로 크게 열기</span>
          </a>

          <button className="confirm-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
