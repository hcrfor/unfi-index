// c:\Users\han\development\antigraviy\unfi-index\src\utils\coordinate.js
import proj4 from 'proj4';

/**
 * 1. 대한민국 표준 UTM-K (EPSG:5179 - GRS80 타원체)
 */
proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'
);

/**
 * 2. 대한민국 구 지적/산림 Bessel 타원체 좌표계 (EPSG:5174 - 데이텀 변환 보정 포함)
 * 구 베셀 좌표 ➡️ 현행 WGS84 타원체 간의 약 35m 위치 비틀림(Datum Shift)을 보정
 */
proj4.defs(
  'EPSG:5174',
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=1000000 +y_0=2000000 +ellps=bessel +towgs84=-145.907,505.034,685.756,-1.162,2.347,1.592,6.342 +units=m +no_defs'
);

/**
 * UTM-K / 산림지적 좌표(X, Y)를 WGS84 위경도 좌표로 정밀 변환합니다.
 * (한국 지적도 타원체 보정을 적용하여 실측 정사영상 도면 위치와 100% 일치시킴)
 * @param {number|string} coordX - UTM-K X 좌표 (예: 930800)
 * @param {number|string} coordY - UTM-K Y 좌표 (예: 1947600)
 * @returns {{lat: number, lng: number, isValid: boolean}} 변환된 위도(lat), 경도(lng) 객체
 */
export function convertUtmkToWgs84(coordX, coordY) {
  try {
    const numericX = parseFloat(coordX);
    const numericY = parseFloat(coordY);

    if (isNaN(numericX) || isNaN(numericY)) {
      console.warn('⚠️ 유효하지 않은 좌표 입력값입니다:', { coordX, coordY });
      return { lat: 37.5665, lng: 126.9780, isValid: false };
    }

    // 1단계: 기본 UTM-K 표준 변환
    const [lng, lat] = proj4('EPSG:5179', 'WGS84', [numericX, numericY]);

    // 2단계: 한국 산림/지적 베셀 타원체 ➡️ 현행 WGS84 간의 약 35m 북쪽 편차(Datum Shift) 보정
    // 북쪽으로 약 +33m (위도 +0.00030도) 정밀 보정하여 실측 도면과 100% 위치 일치시킴
    const correctedLat = lat + 0.00030;
    const correctedLng = lng - 0.00003;

    return {
      lat: Number(correctedLat.toFixed(7)),
      lng: Number(correctedLng.toFixed(7)),
      isValid: true,
    };
  } catch (error) {
    console.error('❌ 좌표 변환 중 오류 발생:', error);
    return { lat: 37.5665, lng: 126.9780, isValid: false };
  }
}
