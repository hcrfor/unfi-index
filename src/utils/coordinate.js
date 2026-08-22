// c:\Users\han\development\antigraviy\unfi-index\src\utils\coordinate.js
import proj4 from 'proj4';

/**
 * 대한민국 표준 UTM-K (EPSG:5179 - GRS80 타원체) 좌표계 정의
 * 국토교통부, 산림청, 카카오/네이버지도에서 사용하는 공인 표준 좌표계
 */
proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

/**
 * UTM-K 좌표(X, Y)를 WGS84 위경도 좌표로 100% 공인 표준 변환합니다.
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

    // 🌟 국토교통부 및 공공데이터 공인 100% 표준 UTM-K (EPSG:5179) ➡️ WGS84 변환
    const [lng, lat] = proj4('EPSG:5179', 'WGS84', [numericX, numericY]);

    return {
      lat: Number(lat.toFixed(7)),
      lng: Number(lng.toFixed(7)),
      isValid: true,
    };
  } catch (error) {
    console.error('❌ 좌표 변환 중 오류 발생:', error);
    return { lat: 37.5665, lng: 126.9780, isValid: false };
  }
}
