// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, MapPin, AlertCircle } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

// 사용자님의 카카오 디벨로퍼스 공인 JavaScript 키
const KAKAO_APP_KEY = '0ea4ab488acf316bce60726d53c59413';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);
  const [mapStatus, setMapStatus] = useState('loading'); // 'loading' | 'success' | 'domain_error'

  // UTM-K 좌표 ➡️ WGS84 위경도 정밀 변환
  const coords = convertUtmkToWgs84(item.coordX, item.coordY);

  // 카카오맵 외부 링크 (카카오맵 공식 웹/앱 직접 이동)
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  useEffect(() => {
    if (!coords.isValid) return;

    let isMounted = true;

    // 진짜 카카오 지도(Kakao Maps SDK) 초기화 함수
    const initKakaoMap = () => {
      if (!mapContainerRef.current) return;

      const kakao = window.kakao;
      const centerLatLng = new kakao.maps.LatLng(coords.lat, coords.lng);

      const map = new kakao.maps.Map(mapContainerRef.current, {
        center: centerLatLng,
        level: 2,
      });

      // 진짜 카카오 위성사진 (스카이뷰 + 지명/도로 하이브리드)
      map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

      // 컨트롤러 추가
      map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

      // 중심점 기준 반경 11.3m 빨간 선 테두리 원
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

      // 중심점 초록색 마커 핀
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

      if (isMounted) setMapStatus('success');
    };

    // 카카오 지도 스크립트 동적 로드
    const loadKakaoSDK = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          try {
            initKakaoMap();
          } catch (err) {
            console.error('Kakao map init error:', err);
            if (isMounted) setMapStatus('domain_error');
          }
        });
        return;
      }

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
              if (isMounted) setMapStatus('domain_error');
            }
          });
        }
      };

      script.onerror = () => {
        if (isMounted) setMapStatus('domain_error');
      };

      document.head.appendChild(script);
    };

    loadKakaoSDK();

    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lng, coords.isValid]);

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 (모바일 반응형 밀림 방지 패딩 적용) */}
        <div className="map-modal-header">
          <div className="modal-title-box">
            <div className="modal-subtitle">
              표본점 <span className="highlight-id">{item.sampleId}</span> 카카오 위성지도
            </div>
            <h2 className="modal-title">{item.address || '주소 정보 없음'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">
            <X size={22} />
          </button>
        </div>

        {/* 좌표 정보 바 (모바일 밀림 방지 정렬) */}
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

        {/* 지도가 표시되는 메인 뷰포트 영역 */}
        <div className="map-viewport-wrapper">
          <div ref={mapContainerRef} className="map-viewport" />

          {/* 도메인 승인 적용 안내 오버레이 (모바일 깔끔 반응형 레이아웃) */}
          {mapStatus === 'domain_error' && (
            <div className="domain-guide-overlay">
              <AlertCircle size={40} style={{ color: '#FEE500', flexShrink: 0 }} />
              <h3>카카오 지도 도메인 승인 적용 중</h3>
              <p className="guide-desc">
                카카오 디벨로퍼스에 등록하신 도메인(<code>http://localhost:5173</code> / <code>https://unfi-index.vercel.app</code>)의 카카오 서버 승인 반영 중입니다.
              </p>
              <div className="domain-help-box">
                💡 <strong>1분 후 새로고침(F5)</strong>을 하시면 100% 카카오 위성 지도가 구동됩니다!
              </div>
              <a
                href={kakaoMapDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kakao-direct-large-btn"
              >
                <ExternalLink size={18} />
                <span>카카오맵 앱/웹으로 즉시 위치 보기</span>
              </a>
            </div>
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
