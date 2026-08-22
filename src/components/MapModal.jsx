// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

// 카카오 디벨로퍼스 키
const KAKAO_APP_KEY = '0ea4ab488acf316bce60726d53c59413';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);

  // UTM-K 좌표 ➡️ WGS84 위경도 정밀 변환
  const coords = convertUtmkToWgs84(item.coordX, item.coordY);

  // 카카오맵 전용 이동 URL
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  useEffect(() => {
    if (!coords.isValid) return;

    let isMapRendered = false;

    // 1. 카카오 지도 SDK 렌더링 시도
    const initKakaoMap = () => {
      if (!mapContainerRef.current || !window.kakao || !window.kakao.maps || isMapRendered) return false;

      try {
        const kakao = window.kakao;
        const centerLatLng = new kakao.maps.LatLng(coords.lat, coords.lng);

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: centerLatLng,
          level: 2,
        });

        // 카카오 스카이뷰 적용
        map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

        map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

        // 반경 11.3m 원 그리기
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

        // 중심점 마커
        const customOverlay = new kakao.maps.CustomOverlay({
          position: centerLatLng,
          content: `
            <div style="
              width: 14px;
              height: 14px;
              background-color: #00FF00;
              border: 2px solid #000000;
              border-radius: 50%;
              transform: translate(-50%, -50%);
              box-shadow: 0 0 8px rgba(0,255,0,0.8);
            "></div>
          `,
          xAnchor: 0,
          yAnchor: 0,
        });
        customOverlay.setMap(map);

        isMapRendered = true;
        return true;
      } catch (err) {
        return false;
      }
    };

    // 🌟 [2. 구글 위성 지도 렌더링 지원 (Google Maps Satellite Engine)]
    const initGoogleSatelliteMap = () => {
      if (!mapContainerRef.current || isMapRendered) return;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const drawGoogleMap = () => {
        if (!mapContainerRef.current || mapContainerRef.current._leaflet_id) return;
        const L = window.L;

        // 구글 맵 뷰포트 생성
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false, // 워터마크 완전 제거!
          maxZoom: 20,
        }).setView([coords.lat, coords.lng], 19);

        // 🌟 [핵심] 고해상도 구글 하이브리드 위성 지도 타일 (Google Satellite + Hybrid)
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }).addTo(map);

        // 🌟 [핵심] 반경 11.3m 원 그리기
        L.circle([coords.lat, coords.lng], {
          color: '#FF0000',
          fillColor: '#FF0000',
          fillOpacity: 0.12,
          radius: 11.3,
          weight: 2.5,
        }).addTo(map);

        // 🌟 [핵심] 중심점 초록색 마커
        L.circleMarker([coords.lat, coords.lng], {
          radius: 6,
          color: '#000000',
          weight: 1.5,
          fillColor: '#00FF00',
          fillOpacity: 1.0,
        }).addTo(map);

        isMapRendered = true;
      };

      if (window.L) {
        drawGoogleMap();
      } else {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => drawGoogleMap();
        document.head.appendChild(script);
      }
    };

    // 실행 분기: 카카오 지도 렌더링 시도 ➡️ 카카오 차단 시 100% '구글 위성 지도 (Google Maps)'로 즉시 렌더링!
    const success = initKakaoMap();
    if (!success) {
      const timer = setTimeout(() => {
        const retrySuccess = initKakaoMap();
        if (!retrySuccess) {
          initGoogleSatelliteMap();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [coords.lat, coords.lng, coords.isValid]);

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="map-modal-header">
          <div className="modal-title-box">
            <div className="modal-subtitle">
              표본점 <span className="highlight-id">{item.sampleId}</span> 위성 지도 (구글/카카오)
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

        {/* 🌟 구글 위성 지도 (Google Satellite Maps) 뷰포트 */}
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
