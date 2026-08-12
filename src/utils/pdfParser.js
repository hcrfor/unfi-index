import * as pdfjsLib from 'pdfjs-dist';

// Vite 환경에서 PDF.js Worker를 정상적으로 로드하기 위한 CDN 설정
// pdfjs-dist 라이브러리 버전에 맞춰 Worker를 설정합니다.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * PDF 파일을 읽어서 각 페이지별 표본점 데이터를 추출하는 함수
 * @param {File} file - 사용자가 업로드한 PDF 파일 객체
 * @param {Function} onProgress - 파싱 진행률 콜백 함수 (progress => {})
 * @returns {Promise<Array>} 파싱된 표본점 데이터 목록
 */
export const parseForestPdf = async (file, onProgress) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const parsedData = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 텍스트 아이템들로부터 문자 배열 생성 (공백 제거 후 트림)
      const items = textContent.items.map(item => item.str.trim()).filter(str => str !== '');
      
      // 파싱을 디버깅하기 위한 콘솔 출력
      console.log(`[Page ${pageNum}] Extracted text items:`, items);

      // 데이터 추출 객체 초기화
      let sampleId = '';
      let type = '';
      let surveyId = '';
      let address = '';
      let coordX = '';
      let coordY = '';
      let evValue = '';

      // PDF 구조에서 텍스트의 순서나 배치가 가변적일 수 있으므로 키워드 기반 근접 탐색을 사용합니다.
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 1. 표본점번호 탐색
        if (item.includes('표본점번호')) {
          // "표본점번호" 텍스트 자체에 숫자가 붙어 있는 경우 (예: "표본점번호 411002219785" 또는 "표본점번호:411002219785")
          const inlineMatch = item.match(/\d{10,12}/);
          if (inlineMatch) {
            sampleId = inlineMatch[0];
          } else {
            // 다음에 오는 아이템 중에서 10~12자리 숫자를 찾음 (인근 3개 아이템 범위 탐색)
            for (let j = 1; j <= 3 && (i + j) < items.length; j++) {
              const nextItem = items[i + j];
              if (/^\d{10,12}$/.test(nextItem)) {
                sampleId = nextItem;
                break;
              }
            }
          }
        }

        // 2. 유형 탐색
        if (item === '유형') {
          if (i + 1 < items.length) {
            type = items[i + 1];
          }
        }

        // 3. 조사번호 탐색
        if (item === '조사번호') {
          if (i + 1 < items.length) {
            surveyId = items[i + 1];
          }
        }

        // 4. Ev값 탐색
        // 예: "Ev값:", "Ev값", "Ev:" 등
        if (item.includes('Ev값') || item.includes('Ev')) {
          const inlineMatch = item.match(/\d+/);
          if (inlineMatch) {
            evValue = inlineMatch[0];
          } else {
            for (let j = 1; j <= 3 && (i + j) < items.length; j++) {
              const nextItem = items[i + j];
              if (/^\d+$/.test(nextItem)) {
                evValue = nextItem;
                break;
              }
            }
          }
        }

        // 5. 주소 탐색
        if (item === '주소') {
          if (i + 1 < items.length) {
            // 보통 "주소" 바로 뒤에 주소 텍스트가 나옴
            address = items[i + 1];
          }
        }

        // 6. 좌표X 탐색
        if (item === '좌표X') {
          if (i + 1 < items.length) {
            const val = items[i + 1];
            if (/^\d+$/.test(val)) {
              coordX = val;
            }
          }
        }

        // 7. 좌표Y 탐색
        if (item === '좌표Y') {
          if (i + 1 < items.length) {
            const val = items[i + 1];
            if (/^\d+$/.test(val)) {
              coordY = val;
            }
          }
        }
      }

      // 혹시 키워드 기반 탐색으로 일부 누락된 경우를 대비한 2차 정규식 백업 매칭 (전체 텍스트 결합 후 파싱)
      const fullText = items.join(' ');
      
      if (!sampleId) {
        const idMatch = fullText.match(/(?:표본점번호|번호)\s*[:]?\s*(\d{10,12})/);
        if (idMatch) sampleId = idMatch[1];
      }
      if (!type) {
        const typeMatch = fullText.match(/유형\s+([가-힣a-zA-Z0-9]+)/);
        if (typeMatch) type = typeMatch[1];
      }
      if (!surveyId) {
        const surveyMatch = fullText.match(/조사번호\s+([가-힣a-zA-Z0-9_]+)/);
        if (surveyMatch) surveyId = surveyMatch[1];
      }
      if (!evValue) {
        const evMatch = fullText.match(/(?:Ev값|Ev)\s*[:]?\s*(\d+)/i);
        if (evMatch) evValue = evMatch[1];
      }
      if (!address) {
        // "주소" 단어 이후 첫 한글 주소 패턴 매칭 (보통 "시/도" "구/군" "동/읍/면" 구조)
        const addrMatch = fullText.match(/주소\s+([가-힣]+[가-힣\s0-9~-]+)/);
        if (addrMatch) address = addrMatch[1].trim();
      }
      if (!coordX) {
        const xMatch = fullText.match(/좌표X\s*[:]?\s*(\d+)/);
        if (xMatch) coordX = xMatch[1];
      }
      if (!coordY) {
        const yMatch = fullText.match(/좌표Y\s*[:]?\s*(\d+)/);
        if (yMatch) coordY = yMatch[1];
      }

      // 필수 정보가 최소한 표본점번호라도 파싱된 경우만 목록에 추가
      if (sampleId) {
        parsedData.push({
          page: pageNum,
          sampleId,
          type: type || '미지정',
          surveyId: surveyId || '미지정',
          address: address || '주소 정보 없음',
          coordX: coordX || '-',
          coordY: coordY || '-',
          evValue: evValue || '0'
        });
      } else {
        console.warn(`[Page ${pageNum}] 표본점번호 파싱 실패. 데이터를 건너뜁니다.`);
      }
    } catch (pageError) {
      console.error(`[Page ${pageNum}] 파싱 중 오류 발생:`, pageError);
    }

    // 진행률 업데이트 계산 (0 ~ 100%)
    if (onProgress) {
      onProgress(Math.round((pageNum / totalPages) * 100));
    }
  }

  return parsedData;
};
