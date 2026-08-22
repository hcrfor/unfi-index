// c:\Users\han\development\antigraviy\unfi-index\src\utils\coordinate.js
import proj4 from 'proj4';

proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

/**
 * 🌟 어떠한 보정이나 변환 없이 2026 전국 인덱스.xlsx 파일의 'EPSG4326' 열 좌표값을 100% 그대로 추출합니다.
 */
export function getDirectExcelCoordinates(item) {
  // 1순위: 엑셀 파일의 'EPSG4326' 열 원본 문자열 (예: "37.5251084278, 126.7168507097")
  if (item && item.epsg4326 && typeof item.epsg4326 === 'string' && item.epsg4326.includes(',')) {
    const parts = item.epsg4326.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());

      if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0) {
        return {
          lat: lat, // 🌟 보정 0%! 엑셀 EPSG4326 열의 수치 그대로!
          lng: lng, // 🌟 보정 0%! 엑셀 EPSG4326 열의 수치 그대로!
          isValid: true,
          source: 'EXCEL_EPSG4326_PURE',
        };
      }
    }
  }

  // 예비용 (EPSG4326이 비어있을 때만)
  const numericX = parseFloat(item.coordX);
  const numericY = parseFloat(item.coordY);

  if (isNaN(numericX) || isNaN(numericY)) {
    return { lat: 37.5665, lng: 126.9780, isValid: false, source: 'DEFAULT' };
  }

  const [lng, lat] = proj4('EPSG:5179', 'WGS84', [numericX, numericY]);
  return { lat, lng, isValid: true, source: 'UTMK_CONVERTED' };
}

export function convertUtmkToWgs84(coordX, coordY, epsg4326Str) {
  return getDirectExcelCoordinates({ coordX, coordY, epsg4326: epsg4326Str });
}
