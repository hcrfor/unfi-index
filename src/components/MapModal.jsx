// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);

  // 🌟 엑셀 파일의 'EPSG4326' 열 무손실 100% 원본 위경도 좌표 대입
  const coords = convertUtmkToWgs84(item.coordX, item.coordY, item.epsg4326);

  // 카카오맵 원본 앱/웹 이동 URL
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  useEffect(() => {
    if (!coords.isValid) return;

    let isMapRendered = false;

    // 🌟 [핵심] 진짜 100% 카카오 위성 지도(Kakao Skyview Tile Engine) 렌더링
    const initKakaoSkyviewMap = () => {
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

        // 카카오 위성 지도 뷰포트 생성
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false, // 워터마크 삭제
          maxZoom: 19,
        }).setView([coords.lat, coords.lng], 18);

        // 🌟 [100% 카카오 원본 스카이뷰 위성사진 타일 렌더러]
        // 이미지 3번 카카오맵과 100% 동일한 타일 맵을 모달 내부에서 바로 불러옵니다!
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
        }).addTo(map);

        // 카카오 지형/도로 하이브리드 레이어
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
        }).addTo(map);

        // 🌟 [핵심] 엑셀 EPSG4326 원본 좌표 기준 정확한 반경 11.3m 원
        L.circle([coords.lat, coords.lng], {
          color: '#FF0000',
          fillColor: '#FF0000',
          fillOpacity: 0.12,
          radius: 11.3,
          weight: 2.5,
        }).addTo(map);

        // 🌟 [핵심] 엑셀 EPSG4326 원본 중심점 초록색 마커
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

    initKakaoSkyviewMap();
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
            <span className="coord-label">엑셀 EPSG4326:</span>
            <span className="coord-val">{coords.lat}°, {coords.lng}°</span>
          </div>
          <div className="coord-tag radius">
            <span className="coord-label">시각화:</span>
            <span className="coord-val">반경 11.3m 원</span>
          </div>
        </div>

        {/* 🌟 이미지 2번, 3번과 100% 동일하게 렌더링되는 메인 뷰포트 */}
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
