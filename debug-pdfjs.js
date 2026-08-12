import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  // 프로젝트 내 PDF 파일 찾기
  let pdfFile = null;
  for (const f of fs.readdirSync('.')) {
    if (f.toLowerCase().endsWith('.pdf') && fs.statSync(f).isFile()) {
      pdfFile = f;
      break;
    }
  }

  if (!pdfFile) {
    print("PDF 파일을 찾을 수 없습니다.");
    return;
  }

  console.log(`분석 대상 파일: ${pdfFile}`);
  const dataBuffer = fs.readFileSync(pdfFile);
  const arrayBuffer = new Uint8Array(dataBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const text = textContent.items.map(item => item.str).join(' ');

  fs.writeFileSync('./public/sample_text_pdfjs.txt', text, 'utf-8');
  console.log("pdfjs-dist를 활용하여 sample_text_pdfjs.txt 파일에 추출을 성공했습니다.");
  
  await pdf.destroy();
}

main().catch(err => console.error("디버그 중 오류:", err));
