import fs from 'fs';
import path from 'path';
// pdfjs-dist legacy 빌드를 로드하여 Node.js 단에서 한글 디코딩을 완벽하게 수행
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// 로컬 환경 디렉토리 설정
const PDF_SOURCE_DIR = './pdf_source';
const OUTPUT_FILE = './public/data.json';

// 필요한 폴더가 없으면 생성
if (!fs.existsSync(PDF_SOURCE_DIR)) {
  fs.mkdirSync(PDF_SOURCE_DIR, { recursive: true });
}

const PUBLIC_DIR = './public';
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/**
 * 텍스트 배열로부터 표본점 데이터를 정밀 추출하는 함수
 * @param {Array<string>} items - 한 페이지에서 추출된 개별 텍스트 항목 목록
 * @param {number} pageNum - 현재 페이지 번호
 * @param {string} fileName - PDF 파일 이름 (디버그용)
 * @returns {Object|null} 파싱된 표본점 객체
 */
function extractDataFromTextItems(items, pageNum, fileName) {
  // 공백이 적절히 유지된 전체 텍스트 (주소 및 한글 텍스트용)
  const fullText = items.join(' ');
  // 공백이 완전히 제거된 전체 텍스트 (띄어쓰기된 숫자 및 키워드 매칭용)
  const noSpaceText = items.join('');

  let sampleId = '';
  let type = '';
  let surveyId = '';
  let address = '';
  let coordX = '';
  let coordY = '';
  let evValue = '';

  // --- 1. 표본점번호 추출 (공백 없는 10~12자리 숫자) ---
  const idMatch = noSpaceText.match(/\d{10,12}/);
  if (!idMatch) return null;

  sampleId = idMatch[0];

  // --- 2. 표본점번호의 자간 공백 띄어쓰기를 감안한 정규식으로 데이터 시작지점 획득 ---
  const idRegexStr = sampleId.split('').join('\\s*');
  const idRegex = new RegExp(idRegexStr);
  const idIndexMatch = fullText.match(idRegex);
  if (!idIndexMatch) return null;

  // 헤더 영역을 원천 무시하고 표본점번호 뒷부분의 데이터 문자열 영역만 추출
  const dataPart = fullText.substring(idIndexMatch.index + idIndexMatch[0].length).trim();
  const dataItems = dataPart.split(/\s+/).filter(Boolean);

  // 조사번호(surveyId) 설정: 파일 이름에 포함되어 있는 정보를 기반으로 유추
  if (fileName.includes('가평군')) {
    surveyId = '가평군_필수_7';
  } else {
    const fnMatch = fileName.match(/([가-힣a-zA-Z0-9]+)/);
    surveyId = fnMatch ? `${fnMatch[1]}_필수` : '1개년도_필수';
  }

  // 1) 유형 설정: 데이터 파트의 첫 번째 단어 (예: "필수")
  if (dataItems.length > 0) {
    type = dataItems[0];
  }

  // 2) Ev값 추출: 데이터 영역의 공백을 다 지운 후 Ev값 파트 매칭
  const noSpaceData = dataPart.replace(/\s+/g, '');
  const evMatch = noSpaceData.match(/Ev값\s*[:]?\s*(\d+)/i) || 
                  noSpaceData.match(/Ev값(\d+)/) || 
                  noSpaceData.match(/Ev[:]?(\d+)/i) || 
                  noSpaceData.match(/Ev(\d+)/i);
  if (evMatch) {
    evValue = evMatch[1];
  }

  // 3) 좌표X, 좌표Y 추출: Ev값 단어를 뺀 나머지 뒤쪽 숫자 2개 역추적
  const numberItems = [];
  for (let k = dataItems.length - 1; k >= 1; k--) {
    const word = dataItems[k].replace(/\s+/g, '');
    if (word.toLowerCase().includes('ev') || word.includes('값') || word.includes(':')) {
      continue;
    }
    if (/^\d+$/.test(word)) {
      numberItems.push({ val: word, idx: k });
    }
    if (numberItems.length >= 2) break;
  }

  let coordXIdx = -1;
  if (numberItems.length >= 2) {
    coordY = numberItems[0].val; // 뒤에서 첫 번째 숫자가 좌표Y
    coordX = numberItems[1].val; // 뒤에서 두 번째 숫자가 좌표X
    coordXIdx = numberItems[1].idx;
  }

  // 4) 주소 추출: "유형" 단어 바로 뒤(index 1)부터 "좌표X" 직전(coordXIdx)까지
  if (coordXIdx !== -1 && coordXIdx > 1) {
    const addressWords = dataItems.slice(1, coordXIdx);
    address = addressWords.join(' ');
    // 번지수/대시 기호 사이 띄어쓰기 쪼개짐 제거
    address = address.replace(/(\d)\s+(?=\d)/g, '$1');
    address = address.replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
  } else {
    // 대체 파서
    const addrBackup = dataPart.match(/(?:필수|선택|유형\S*)\s+([\s\S]+?)(?=\s+\d{6,8}|\s+좌표|$)/);
    if (addrBackup) address = addrBackup[1].trim();
  }

  return {
    sampleId,
    type: type || '필수',
    surveyId: surveyId,
    address: address || '주소 정보 없음',
    coordX: coordX,
    coordY: coordY,
    evValue: evValue,
    sourceFile: fileName,
    page: pageNum
  };
}

/**
 * 하나의 PDF 파일을 파싱하는 함수 (pdfjs-dist 활용 + 메모리 청킹 소멸자 연동)
 * @param {string} filePath - PDF 파일 경로
 * @returns {Promise<Array>} 파싱 결과 배열
 */
async function parseSinglePdf(filePath) {
  const fileName = path.basename(filePath);
  const dataBuffer = fs.readFileSync(filePath);

  // 1. 총 페이지 수 확인을 위해 가볍게 오픈 후 로딩 해제
  // Transferable 소유권 전송으로 버퍼 소멸을 막기 위해 buffer.slice() 복사본 전달!
  const initArrayBuffer = new Uint8Array(dataBuffer.slice(0));
  const initTask = pdfjsLib.getDocument({
    data: initArrayBuffer,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0
  });
  const initPdf = await initTask.promise;
  const totalPages = initPdf.numPages;
  await initTask.destroy();

  const results = [];
  const CHUNK_SIZE = 150; // 150페이지씩 파싱 후 loadingTask 자체를 소멸(Memory Release)

  console.log(`  -> 총 ${totalPages}페이지를 ${CHUNK_SIZE}페이지 단위로 청킹 파싱합니다.`);

  for (let startPage = 1; startPage <= totalPages; startPage += CHUNK_SIZE) {
    const endPage = Math.min(startPage + CHUNK_SIZE - 1, totalPages);
    
    // 매 루프마다 소멸된 버퍼 대신 dataBuffer에서 신선하게 깨끗한 복사본(slice)을 전송하여 에러 해결!
    const chunkArrayBuffer = new Uint8Array(dataBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({
      data: chunkArrayBuffer,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0
    });
    const pdf = await loadingTask.promise;

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const items = textContent.items
          .map(item => item.str.trim())
          .filter(str => str !== '');
        
        const parsedObj = extractDataFromTextItems(items, pageNum, fileName);
        if (parsedObj) {
          results.push(parsedObj);
        }

        page.cleanup();
      } catch (pageError) {
        console.error(`      [오류] ${pageNum}페이지 파싱 실패: ${pageError.message}`);
      }
    }

    // 청크 완료 시 loadingTask 자체를 소멸시켜 메모리를 완전히 OS로 돌려줌! (OOM 방지 핵심)
    await loadingTask.destroy();
    
    const percent = Math.round((endPage / totalPages) * 100);
    console.log(`    [진행 상태] ${endPage} / ${totalPages} 페이지 완료 (${percent}%)`);
  }

  return results;
}

// 메인 실행 루틴
async function main() {
  // 1. pdf_source 폴더 스캔
  const sourceFiles = fs.existsSync(PDF_SOURCE_DIR) ? fs.readdirSync(PDF_SOURCE_DIR) : [];
  const pdfFromSource = sourceFiles
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => ({
      fileName: file,
      filePath: path.join(PDF_SOURCE_DIR, file)
    }));

  // 2. 프로젝트 루트 폴더 스캔 (사용자가 실수로 루트에 파일을 넣은 경우 대비)
  const rootFiles = fs.readdirSync('./');
  const pdfFromRoot = rootFiles
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => ({
      fileName: file,
      filePath: path.join('./', file)
    }));

  // 두 곳의 PDF 목록 병합 (중복 제거)
  const allPdfMap = new Map();
  [...pdfFromSource, ...pdfFromRoot].forEach(item => {
    allPdfMap.set(item.fileName, item);
  });
  
  const pdfFiles = Array.from(allPdfMap.values());

  if (pdfFiles.length === 0) {
    console.log('\n======================================================');
    console.log(`[알림] 분석할 PDF 파일이 존재하지 않습니다.`);
    console.log(`방법 1: '${PDF_SOURCE_DIR}' 폴더 안에 PDF 파일을 넣어주세요.`);
    console.log(`방법 2: 프로젝트 루트 폴더(unfi-index)에 직접 PDF 파일을 두셔도 됩니다.`);
    console.log('이후 다시 "npm run parse" 명령어를 실행해 주세요.');
    console.log('======================================================\n');
    return;
  }

  console.log(`\n총 ${pdfFiles.length}개의 PDF 파일을 발견했습니다. 분석을 시작합니다...`);
  
  const allResults = [];
  for (const fileObj of pdfFiles) {
    console.log(`\n[분석 중] 파일명: ${fileObj.fileName}`);
    try {
      const results = await parseSinglePdf(fileObj.filePath);
      allResults.push(...results);
      console.log(`  -> 성공: ${results.length}개의 표본점 정보 추출 완료`);
    } catch (err) {
      console.error(`  [에러] ${fileObj.fileName} 분석 실패 - ${err.message}`);
    }
  }

  // 결과를 JSON 파일로 출력
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf-8');
  
  console.log('\n======================================================');
  console.log(`[완료] 총 ${allResults.length}개의 표본점 데이터베이스 구축 완료!`);
  console.log(`결과 저장 경로: ${OUTPUT_FILE}`);
  console.log('이제 앱을 실행하셔서 즉시 검색을 진행하시면 됩니다.');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('[치명적 오류] 사전 파싱 중 에러 발생:', err);
});
