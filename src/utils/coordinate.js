// c:\Users\han\development\antigraviy\unfi-index\src\utils\coordinate.js
import proj4 from 'proj4';

/**
 * 대한민국 표준 UTM-K (EPSG:5179 - GRS80 타원체) 좌표계 정의
 */
proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

/**
 * 엑셀 파일 내의 'EPSG4326' 열 좌표 또는 UTM-K(X, Y) 좌표를 WGS84 위경도 좌표로 무손실 정밀 변환합니다.
 * @param {number|string} coordX - UTM-K X 좌표
 * @param {number|string} coordY - UTM-K Y 좌표
 * @param {string} [epsg4326Str] - 엑셀에 직접 기재된 EPSG4326 위경도 문자열 (예: "37.5251084278, 126.7168507097")
 * @returns {{lat: number, lng: number, isValid: boolean, source: string}} 변환된 위도(lat), 경도(lng) 객체
 */
export function convertUtmkToWgs84(coordX, coordY, epsg4326Str) {
  try {
    // 🌟 1순위: 엑셀 파일의 'EPSG4326' 열 원본 위경도 실수값을 반올림 손실 0% 그대로 직접 100% 대입!
    if (epsg4326Str && typeof epsg4326Str === 'string' && epsg4326Str.includes(',')) {
      const parts = epsg4326Str.split(',');
      if (parts.length >= 2) {
        const rawLat = parseFloat(parts[0].trim());
        const rawLng = parseFloat(parts[1].trim());

        if (!isNaN(rawLat) && !isNaN(rawLng) && rawLat > 0 && rawLng > 0) {
          return {
            lat: rawLat, // 소수점 반올림 전연 없이 엑셀 원본 실수 그대로!
            lng: rawLng, // 소수점 반올림 전혀 없이 엑셀 원본 실수 그대로!
            isValid: true,
            source: 'EXCEL_EPSG4326_RAW',
          };
        }
      }
    }

    // 2순위: UTM-K (EPSG:5179) 좌표 표준 변환
    const numericX = parseFloat(coordX);
    const numericY = parseFloat(coordY);

    if (isNaN(numericX) || isNaN(numericY)) {
      console.warn('⚠️ 유효하지 않은 좌표 입력값입니다:', { coordX, coordY });
      return { lat: 37.5665, lng: 126.9780, isValid: false, source: 'DEFAULT' };
    }

    const [lng, lat] = proj4('EPSG:5179', 'WGS84', [numericX, numericY]);

    return {
      lat: lat,
      lng: lng,
      isValid: true,
      source: 'UTMK_CONVERTED',
    };
  } catch (error) {
    console.error('❌ 좌표 변환 중 오류 발생:', error);
    return { lat: 37.5665, lng: 126.9780, isValid: false, source: 'ERROR' };
  }
}
