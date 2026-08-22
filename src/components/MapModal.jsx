// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

// 카카오 디벨로퍼스 공인 키
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

    // 1. 진짜 카카오 지도(Kakao Maps SDK) 렌더링 함수
    const renderKakaoMap = () => {
      if (!mapContainerRef.current || !window.kakao || !window.kakao.maps || isMapRendered) return false;

      try {
        const kakao = window.kakao;
        const centerLatLng = new kakao.maps.LatLng(coords.lat, coords.lng);

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: centerLatLng,
          level: 2,
        });

        // 카카오 스카이뷰(위성사진 + 지명)
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

        // 중심점 초록 핀
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

        isMapRendered = true;
        return true;
      } catch (err) {
        console.warn('Kakao Map SDK 렌더링 미승인, 고해상도 위성 엔진으로 자동 가동:', err);
        return false;
      }
    };

    // 2. 100% 무조건 보장되는 워터마크 없는 고해상도 위성 지도 엔진
    const renderHighResSatelliteMap = () => {
      if (!mapContainerRef.current || isMapRendered) return;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const drawMap = () => {
        if (!mapContainerRef.current || mapContainerRef.current._leaflet_id) return;
        const L = window.L;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false, // 워터마크 글자 완전 제거!
          maxZoom: 18.5,
        }).setView([coords.lat, coords.lng], 18);

        // 고해상도 실제 항공 위성사진 타일
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18.5,
        }).addTo(map);

        // 지명/도로 레이어
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18.5,
        }).addTo(map);

        // 반경 11.3m 원 그리기
        L.circle([coords.lat, coords.lng], {
          color: '#FF0000',
          fillColor: '#FF0000',
          fillOpacity: 0.12,
          radius: 11.3,
          weight: 2.5,
        }).addTo(map);

        // 중심점 초록 핀
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
        drawMap();
      } else {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => drawMap();
        document.head.appendChild(script);
      }
    };

    // 🌟 실행 순서: 카카오 지도 렌더링 시도 ➡️ 미승인 시 100% 무조건 고해상도 위성 지도로 화면을 꽉 채움!
    const success = renderKakaoMap();
    if (!success) {
      // 0.3초 대기 후 카카오 스크립트 로딩 재검토, 실패 시 즉시 위성 엔진 구동
      const timer = setTimeout(() => {
        const retrySuccess = renderKakaoMap();
        if (!retrySuccess) {
          renderHighResSatelliteMap();
        }
      }, 300);
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
              표본점 <span className="highlight-id">{item.sampleId}</span> 위성 지도
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

        {/* 🌟 100% 빈 화면 0% 무조건 가득 채워지는 위성 지도 뷰포트 */}
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
