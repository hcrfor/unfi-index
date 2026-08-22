// c:\Users\han\development\antigraviy\unfi-index\src\components\MapModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { convertUtmkToWgs84 } from '../utils/coordinate';
import './MapModal.css';

// 카카오 디벨로퍼스 자바스크립트 키
const KAKAO_APP_KEY = '0ea4ab488acf316bce60726d53c59413';

export default function MapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);
  const [kakaoMapSuccess, setKakaoMapSuccess] = useState(false);
  const [kakaoErrorMsg, setKakaoErrorMsg] = useState(null);

  // 🌟 엑셀 실측 EPSG4326 열 1순위 활용 ➡️ WGS84 위경도 정밀 좌표 변환
  const coords = convertUtmkToWgs84(item.coordX, item.coordY, item.epsg4326);

  // 카카오맵 외부 이동 URL
  const kakaoMapDirectUrl = `https://map.kakao.com/link/map/${encodeURIComponent(item.address || item.sampleId)},${coords.lat},${coords.lng}`;

  useEffect(() => {
    if (!coords.isValid) return;

    let isMounted = true;

    // 🌟 [핵심] 진짜 100% 카카오 지도 (Kakao Maps SDK) 스카이뷰 렌더링
    const initKakaoMap = () => {
      if (!mapContainerRef.current || !window.kakao || !window.kakao.maps) return false;

      try {
        const kakao = window.kakao;
        const centerLatLng = new kakao.maps.LatLng(coords.lat, coords.lng);

        // 진짜 카카오 지도 생성 (레벨 2: 큼직하고 뚜렷한 확대 뷰)
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: centerLatLng,
          level: 2,
        });

        // 🌟 [핵심] 카카오 스카이뷰 (위성사진 + 지명/도로 하이브리드)
        map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);

        // 지도 컨트롤러 추가
        map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

        // 🌟 [핵심] 중심점 기준 반경 11.3m 빨간 선 테두리 원
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

        // 🌟 [핵심] 중심점 초록색 마커 핀
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

        if (isMounted) setKakaoMapSuccess(true);
        return true;
      } catch (err) {
        console.error('Kakao map render error:', err);
        return false;
      }
    };

    // 카카오 지도 SDK 동적 로더
    const loadKakaoSDK = () => {
      if (window.kakao && window.kakao.maps) {
        if (window.kakao.maps.load) {
          window.kakao.maps.load(() => {
            const ok = initKakaoMap();
            if (!ok && isMounted) setKakaoErrorMsg('Kakao Maps API 로드 중 실패');
          });
        } else {
          const ok = initKakaoMap();
          if (!ok && isMounted) setKakaoErrorMsg('Kakao Maps API 로드 중 실패');
        }
        return;
      }

      // 스크립트 주입
      const script = document.createElement('script');
      script.id = 'kakao-map-sdk-script';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer,drawing&autoload=false`;
      script.async = true;

      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            const ok = initKakaoMap();
            if (!ok && isMounted) setKakaoErrorMsg('Kakao Maps API 도메인 차단됨');
          });
        }
      };

      script.onerror = () => {
        if (isMounted) setKakaoErrorMsg('Kakao Maps SDK 스크립트 연결 거부 (401)');
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
            <span className="coord-label">WGS84 (EPSG:4326):</span>
            <span className="coord-val">{coords.lat}°, {coords.lng}°</span>
          </div>
          <div className="coord-tag radius">
            <span className="coord-label">시각화:</span>
            <span className="coord-val">반경 11.3m 원</span>
          </div>
        </div>

        {/* 🌟 진짜 100% 카카오 지도 (Kakao Maps) 메인 뷰포트 */}
        <div className="map-viewport-wrapper">
          <div ref={mapContainerRef} className="map-viewport" />

          {/* 카카오 API 차단 시 점검 안내 배너 */}
          {kakaoErrorMsg && (
            <div className="domain-guide-overlay">
              <AlertCircle size={44} style={{ color: '#FEE500' }} />
              <h3>카카오 지도 API 도메인 승인 확인 필요</h3>
              <p>
                카카오 디벨로퍼스에서 발급받은 <strong>JavaScript 키</strong> (<code>{KAKAO_APP_KEY}</code>)가 
                현재 접속 주소(<code>{window.location.origin}</code>)에서 카카오 지도를 띄우도록 승인 상태인지 확인이 필요합니다.
              </p>
              <a
                href={kakaoMapDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kakao-direct-large-btn"
              >
                <ExternalLink size={18} />
                <span>카카오맵 앱/웹으로 즉시 크게 보기</span>
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
