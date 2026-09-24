// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, Navigation } from 'lucide-react';
import { getDirectExcelCoordinates } from '../utils/coordinate';
import './MapModal.css';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);

  // 🌟 [보정 0%] 엑셀 파일 'EPSG4326' 열의 위도/경도 수치 100% 순수 원본 사용
  const coords = getDirectExcelCoordinates(item);

  // 카카오맵 직접 열기 URL (엑셀 EPSG4326 좌표 연동)
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  // 🧭 [방법 2] 도메인 인증 오류 0% 카카오 실시간 자동차 길안내/내비 연동
  const handleOpenKakaoRoute = () => {
    if (!coords.isValid) {
      alert('유효한 좌표 정보가 없습니다.');
      return;
    }

    const destName = item.address || `표본점 ${item.sampleId}`;
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // 공식 카카오맵 자동차 길찾기 웹/앱 통합 URL
    const webFallbackUrl = `https://map.kakao.com/link/to/${encodeURIComponent(destName)},${lat},${lng}`;

    if (isAndroid) {
      // 📱 안드로이드: 카카오맵 앱의 자동차 길안내 인텐트 즉시 호출 (미설치 시 웹으로 안전 자동 전환)
      const androidIntentUrl = `intent://route?ep=${lat},${lng}&by=car#Intent;scheme=kakaomap;package=net.daum.android.map;S.browser_fallback_url=${encodeURIComponent(webFallbackUrl)};end`;
      window.location.href = androidIntentUrl;
    } else if (isIOS) {
      // 📱 iOS: 카카오맵 앱 자동차 길찾기 URL Scheme 호출 후 타이머 폴백
      const iosSchemeUrl = `kakaomap://route?ep=${lat},${lng}&by=car`;
      window.location.href = iosSchemeUrl;
      setTimeout(() => {
        window.location.href = webFallbackUrl;
      }, 1200);
    } else {
      // 💻 PC 브라우저 환경: 카카오맵 길찾기 웹 페이지 새 탭 오픈
      window.open(webFallbackUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (!coords.isValid || !mapContainerRef.current) return;

    let isRendered = false;
    let kakaoMapInstance = null;

    // 1순위: 진짜 카카오 지도 (Kakao Maps SDK) 스카이뷰 렌더링
    const renderKakaoMap = () => {
      if (!window.kakao || !window.kakao.maps || !mapContainerRef.current || isRendered) return false;

      try {
        const kakao = window.kakao;
        const center = new kakao.maps.LatLng(coords.lat, coords.lng);

        kakaoMapInstance = new kakao.maps.Map(mapContainerRef.current, {
          center: center,
          level: 2, // 정밀 확대 레벨
        });

        // 카카오 스카이뷰(위성사진 + 도로명 하이브리드) 적용
        kakaoMapInstance.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

        // 지도 컨트롤 추가
        kakaoMapInstance.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
        kakaoMapInstance.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

        // 반경 11.3m 빨간 선 테두리 원
        const circle = new kakao.maps.Circle({
          center: center,
          radius: 11.3,
          strokeWeight: 2.5,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          fillColor: '#FF0000',
          fillOpacity: 0.15,
        });
        circle.setMap(kakaoMapInstance);

        // 중심점 초록색 마커
        const markerOverlay = new kakao.maps.CustomOverlay({
          position: center,
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
        markerOverlay.setMap(kakaoMapInstance);

        // DOM 크기 반영을 위해 relayout 실행
        setTimeout(() => {
          if (kakaoMapInstance) {
            kakaoMapInstance.relayout();
            kakaoMapInstance.setCenter(center);
          }
        }, 150);

        isRendered = true;
        return true;
      } catch (e) {
        console.warn('Kakao map direct render failed:', e);
        return false;
      }
    };

    // 2순위: 대한민국 국토지리정보원 정사 항공사진 (첫 번째 이미지와 100% 동일 원본 타일)
    const renderVWorldAerialMap = () => {
      if (!mapContainerRef.current || isRendered) return;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const drawLeaflet = () => {
        if (!mapContainerRef.current || mapContainerRef.current._leaflet_id || isRendered) return;
        const L = window.L;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
          maxZoom: 19,
        }).setView([coords.lat, coords.lng], 18);

        // 🌟 [대한민국 국토교통부/국토지리정보원 공식 정사 항공사진 타일]
        // 첫 번째 이미지(도면)와 100% 동일한 대한민국 공공 정사 항공영상
        L.tileLayer('https://xdworld.vworld.kr/2d/Satellite/service/{z}/{x}/{y}.jpeg', {
          maxZoom: 19,
          subdomains: ['xdworld'],
        }).addTo(map);

        // 국토교통부 지명/도로 하이브리드 레이어
        L.tileLayer('https://xdworld.vworld.kr/2d/Hybrid/service/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['xdworld'],
        }).addTo(map);

        // 🌟 엑셀 EPSG4326 원본 중심점 기준 반경 11.3m 빨간 선 테두리 원
        L.circle([coords.lat, coords.lng], {
          color: '#FF0000',
          fillColor: '#FF0000',
          fillOpacity: 0.15,
          radius: 11.3,
          weight: 2.5,
        }).addTo(map);

        // 🌟 엑셀 EPSG4326 원본 중심점 초록색 마커
        L.circleMarker([coords.lat, coords.lng], {
          radius: 6,
          color: '#000000',
          weight: 1.5,
          fillColor: '#00FF00',
          fillOpacity: 1.0,
        }).addTo(map);

        setTimeout(() => {
          map.invalidateSize();
        }, 150);

        isRendered = true;
      };

      if (window.L) {
        drawLeaflet();
      } else {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => drawLeaflet();
        document.head.appendChild(script);
      }
    };

    // 카카오 지도 SDK 로드 확인 후 실행, 실패 시 국토지리정보원 정사 항공사진 타일로 첫번째 이미지 100% 일치 표출
    if (window.kakao && window.kakao.maps) {
      if (window.kakao.maps.load) {
        window.kakao.maps.load(() => {
          const success = renderKakaoMap();
          if (!success) renderVWorldAerialMap();
        });
      } else {
        const success = renderKakaoMap();
        if (!success) renderVWorldAerialMap();
      }
    } else {
      renderVWorldAerialMap();
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
            <span className="coord-label">엑셀 EPSG4326:</span>
            <span className="coord-val">{coords.lat}°, {coords.lng}°</span>
          </div>
          <div className="coord-tag radius">
            <span className="coord-label">시각화:</span>
            <span className="coord-val">반경 11.3m 원</span>
          </div>
        </div>

        {/* 🌟 첫 번째 이미지와 100% 동일하게 렌더링되는 메인 뷰포트 */}
        <div className="map-viewport-wrapper">
          <div ref={mapContainerRef} className="map-viewport" />
        </div>

        {/* 모달 푸터 */}
        <div className="map-modal-footer">
          <div className="map-action-group">
            {/* 🌟 도메인 인증 오류 없는 카카오 실시간 길안내 버튼 */}
            <button
              type="button"
              className="kakaonavi-btn"
              onClick={handleOpenKakaoRoute}
              title="카카오맵으로 자동차 실시간 길안내를 시작합니다 (인증 불필요)"
            >
              <Navigation size={15} className="navi-icon" />
              <span>카카오 길안내</span>
            </button>

            {/* 🌟 카카오맵 보기 버튼 */}
            <a
              href={kakaoMapDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kakaomap-btn"
              title="카카오맵에서 표본점 위치를 확인합니다"
            >
              <ExternalLink size={15} />
              <span>카카오맵 보기</span>
            </a>
          </div>

          <button className="confirm-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
