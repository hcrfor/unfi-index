import os
import json
import re
from pypdf import PdfReader

# 로컬 환경 디렉토리 설정
PDF_SOURCE_DIR = './pdf_source'
OUTPUT_FILE = './public/data.json'

# 필요한 폴더 생성
os.makedirs(PDF_SOURCE_DIR, exist_ok=True)
os.makedirs('./public', exist_ok=True)

def extract_data_from_text_items(items, page_num, file_name):
    """
    텍스트 항목 리스트에서 표본점 데이터를 정밀 분석하여 추출하는 함수
    """
    sample_id = ''
    type_name = ''
    survey_id = ''
    address = ''
    coord_x = ''
    coord_y = ''
    ev_value = ''

    # 1차 패스: 순차 키워드 및 근접 매칭 탐색
    for i, item in enumerate(items):
        # 표본점번호 탐색
        if '표본점번호' in item:
            inline_match = re.search(r'\d{10,12}', item)
            if inline_match:
                sample_id = inline_match.group(0)
            else:
                for j in range(1, 4):
                    if i + j < len(items):
                        next_item = items[i + j]
                        if re.match(r'^\d{10,12}$', next_item):
                            sample_id = next_item
                            break

        # 유형 탐색
        if item == '유형':
            if i + 1 < len(items):
                type_name = items[i + 1]

        # 조사번호 탐색
        if item == '조사번호':
            if i + 1 < len(items):
                survey_id = items[i + 1]

        # Ev값 탐색
        if 'Ev값' in item or 'Ev' in item:
            inline_match = re.search(r'\d+', item)
            if inline_match:
                ev_value = inline_match.group(0)
            else:
                for j in range(1, 4):
                    if i + j < len(items):
                        next_item = items[i + j]
                        if re.match(r'^\d+$', next_item):
                            ev_value = next_item
                            break

        # 주소 탐색
        if item == '주소':
            if i + 1 < len(items):
                address = items[i + 1]

        # 좌표X 탐색
        if item == '좌표X':
            if i + 1 < len(items):
                val = items[i + 1]
                if re.match(r'^\d+$', val):
                    coord_x = val

        # 좌표Y 탐색
        if item == '좌표Y':
            if i + 1 < len(items):
                val = items[i + 1]
                if re.match(r'^\d+$', val):
                    coord_y = val

    # 2차 패스: 전체 결합 텍스트 기반 정규식 백업 매칭 (1차 누락 시)
    full_text = ' '.join(items)

    if not sample_id:
        id_match = re.search(r'(?:표본점번호|번호)\s*[:]?\s*(\d{10,12})', full_text)
        if id_match:
            sample_id = id_match.group(1)
            
    if not type_name:
        type_match = re.search(r'유형\s+([가-힣a-zA-Z0-9]+)', full_text)
        if type_match:
            type_name = type_match.group(1)

    if not survey_id:
        survey_match = re.search(r'조사번호\s+([가-힣a-zA-Z0-9_]+)', full_text)
        if survey_match:
            survey_id = survey_match.group(1)

    if not ev_value:
        ev_match = re.search(r'(?:Ev값|Ev)\s*[:]?\s*(\d+)', full_text, re.IGNORECASE)
        if ev_match:
            ev_value = ev_match.group(1)

    if not address:
        addr_match = re.search(r'주소\s+([가-힣]+[가-힣\s0-9~-]+)', full_text)
        if addr_match:
            address = addr_match.group(1).strip()

    if not coord_x:
        x_match = re.search(r'좌표X\s*[:]?\s*(\d+)', full_text)
        if x_match:
            coord_x = x_match.group(1)

    if not coord_y:
        y_match = re.search(r'좌표Y\s*[:]?\s*(\d+)', full_text)
        if y_match:
            coord_y = y_match.group(1)

    # 최소한 표본점번호는 있어야 유효 데이터로 처리
    if sample_id:
        return {
            'sampleId': sample_id,
            'type': type_name if type_name else '미지정',
            'surveyId': survey_id if survey_id else '미지정',
            'address': address if address else '주소 정보 없음',
            'coordX': coord_x if coord_x else '-',
            'coordY': coord_y if coord_y else '-',
            'evValue': ev_value if ev_value else '0',
            'sourceFile': file_name,
            'page': page_num
        }
    return None

def parse_single_pdf(file_path):
    """
    단일 PDF 파일을 파딩하여 표본점 데이터를 수집하는 함수
    """
    file_name = os.path.basename(file_path)
    print("  -> PDF 파일을 로딩 중입니다...")
    
    # pypdf는 내부 스트림 방식으로 문서를 아주 가볍게 읽어와 OOM이 없습니다.
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    print(f"  -> 총 {total_pages}페이지 해독을 시작합니다.")

    results = []
    for i in range(total_pages):
        page_num = i + 1
        
        # 200페이지 단위로 로그 출력
        if page_num % 200 == 0 or page_num == total_pages:
            print(f"    [진행 상태] {page_num} / {total_pages} 페이지 완료...")
            
        try:
            page = reader.pages[i]
            text = page.extract_text()
            
            if not text:
                continue
                
            # 단어별 쪼개기
            items = [w.strip() for w in re.split(r'[\s\t\n]+', text) if w.strip()]
            
            parsed_obj = extract_data_from_text_items(items, page_num, file_name)
            if parsed_obj:
                results.append(parsed_obj)
        except Exception as page_err:
            print(f"      [오류] {page_num}페이지 해독 실패: {str(page_err)}")
            
    return results

def main():
    # pdf_source 폴더 내 PDF 스캔
    pdf_from_source = []
    if os.path.exists(PDF_SOURCE_DIR):
        for f in os.listdir(PDF_SOURCE_DIR):
            if f.lower().endswith('.pdf'):
                pdf_from_source.append({
                    'fileName': f,
                    'filePath': os.path.join(PDF_SOURCE_DIR, f)
                })

    # 프로젝트 루트 폴더 내 PDF 스캔
    pdf_from_root = []
    for f in os.listdir('.'):
        if f.lower().endswith('.pdf') and os.path.isfile(f):
            pdf_from_root.append({
                'fileName': f,
                'filePath': f
            })

    # 병합 및 중복 파일 제거
    all_pdf = {}
    for item in pdf_from_source + pdf_from_root:
        all_pdf[item['fileName']] = item

    pdf_files = list(all_pdf.values())

    if not pdf_files:
        print("\n======================================================")
        print("[알림] 분석할 PDF 파일이 존재하지 않습니다.")
        print(f"방법 1: '{PDF_SOURCE_DIR}' 폴더 안에 PDF 파일을 넣어주세요.")
        print("방법 2: 프로젝트 루트 폴더(unfi-index)에 직접 PDF 파일을 두셔도 됩니다.")
        print("이후 다시 \"npm run parse\" 명령어를 실행해 주세요.")
        print("======================================================\n")
        return

    print(f"\n총 {len(pdf_files)}개의 PDF 파일을 발견했습니다. 분석을 시작합니다...")

    all_results = []
    for file_obj in pdf_files:
        print(f"\n[분석 중] 파일명: {file_obj['fileName']}")
        try:
            results = parse_single_pdf(file_obj['filePath'])
            all_results.extend(results)
            print(f"  -> 성공: {len(results)}개의 표본점 정보 추출 완료")
        except Exception as err:
            print(f"  [에러] {file_obj['fileName']} 분석 실패 - {str(err)}")

    # JSON 저장
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    print("\n======================================================")
    print(f"[완료] 총 {len(all_results)}개의 표본점 데이터베이스 구축 완료!")
    print(f"결과 저장 경로: {OUTPUT_FILE}")
    print("이제 앱을 실행하셔서 즉시 검색을 진행하시면 됩니다.")
    print("======================================================\n")

if __name__ == '__main__':
    main()
