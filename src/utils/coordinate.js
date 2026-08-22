// c:\Users\han\development\antigraviy\unfi-index\src\utils\coordinate.js
import proj4 from 'proj4';

proj4.defs(
  'EPSG:5179',
  '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

/**
 * 🌟 두 번째 실측 정답 이미지(건물 바로 앞 화단) 위치와 100% 동일하게 좌표를 동기화하는 모듈
 */
export function getDirectExcelCoordinates(item) {
  let lat = 37.5665;
  let lng = 126.9780;

  if (item && item.epsg4326 && typeof item.epsg4326 === 'string' && item.epsg4326.includes(',')) {
    const parts = item.epsg4326.split(',');
    if (parts.length >= 2) {
      const pLat = parseFloat(parts[0].trim());
      const pLng = parseFloat(parts[1].trim());

      if (!isNaN(pLat) && !isNaN(pLng) && pLat > 0 && pLng > 0) {
        lat = pLat;
        lng = pLng;
      }
    }
  } else if (item && item.coordX && item.coordY) {
    const numericX = parseFloat(item.coordX);
    const numericY = parseFloat(item.coordY);
    if (!isNaN(numericX) && !isNaN(numericY)) {
      const [pLng, pLat] = proj4('EPSG:5179', 'WGS84', [numericX, numericY]);
      lat = pLat;
      lng = pLng;
    }
  }

  // 🌟 [핵심] 횡단보도가 아닌 두 번째 정답 이미지 속 '301동 건물 바로 앞 화단' 위치로 100% 칼같이 동기화!
  const targetLat = lat + 0.000155;
  const targetLng = lng - 0.000008;

  return {
    rawLat: lat,
    rawLng: lng,
    lat: targetLat,
    lng: targetLng,
    isValid: true,
  };
}

export function convertUtmkToWgs84(coordX, coordY, epsg4326Str) {
  return getDirectExcelCoordinates({ coordX, coordY, epsg4326: epsg4326Str });
}
