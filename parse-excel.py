import os
import json
import pandas as pd

# 입출력 파일 경로 정의
EXCEL_FILE = '2026 전국 인덱스.xlsx'
OUTPUT_JSON = './public/data.json'

# public 폴더가 없을 경우 자동 생성
os.makedirs('./public', exist_ok=True)

def safe_str_convert(val):
    """
    Excel에서 값을 읽을 때 발생할 수 있는 결측치(NaN)나
    실수형(.0) 표현을 깨끗한 문자열로 안전하게 변환합니다.
    """
    if pd.isna(val):
        return '-'
    
    try:
        # float 형태인 경우 (예: 511121819730.0) 소수점을 버리고 정수 문자열로 처리
        val_float = float(val)
        if val_float.is_integer():
            return str(int(val_float))
        return str(val)
    except (ValueError, TypeError):
        # 숫자로 변환이 불가능한 일반 텍스트는 좌우 공백만 제거하여 반환
        return str(val).strip()

def main():
    print("======================================================")
    print(f"[시작] '{EXCEL_FILE}' 파일 분석을 시작합니다.")
    print("======================================================")

    if not os.path.exists(EXCEL_FILE):
        print(f"[오류] {EXCEL_FILE} 파일이 루트 폴더에 존재하지 않습니다!")
        print("파일명을 다시 한 번 확인해 주세요.")
        return

    try:
        # Excel 파일을 읽어옵니다. (모든 열은 일관성을 위해 기본 로드 후 가공)
        df = pd.read_excel(EXCEL_FILE)
        
        # X 좌표, Y 좌표 컬럼명 유연하게 매핑 (기존 'X 좌표' -> 신규 'POINT_X' 대응)
        x_col = next((c for c in ['POINT_X', 'X 좌표', 'X좌표', 'X'] if c in df.columns), None)
        y_col = next((c for c in ['POINT_Y', 'Y 좌표', 'Y좌표', 'Y'] if c in df.columns), None)
        
        # 실제 컬럼명 검증 (데이터 정합성 체크)
        required_cols = ['표본점번호', '유형', '주소', '조사번호', '표고']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if not x_col:
            missing_cols.append('X 좌표 (or POINT_X)')
        if not y_col:
            missing_cols.append('Y 좌표 (or POINT_Y)')
        
        if missing_cols:
            print(f"[오류] 엑셀 파일 내 필수 컬럼이 부족합니다: {missing_cols}")
            return

        results = []
        for index, row in df.iterrows():
            # 엑셀 데이터의 각 컬럼을 JSON 필드 형식으로 변환
            sample_id = safe_str_convert(row['표본점번호'])
            
            # 표본점번호가 비어있다면 비정상 데이터이므로 스킵
            if not sample_id or sample_id == '-':
                continue
                
            parsed_item = {
                'sampleId': sample_id,
                'type': safe_str_convert(row['유형']),
                'coordX': safe_str_convert(row[x_col]),
                'coordY': safe_str_convert(row[y_col]),
                'address': safe_str_convert(row['주소']),
                'surveyId': safe_str_convert(row['조사번호']),
                'elevation': safe_str_convert(row['표고']),
                'sourceFile': EXCEL_FILE  # 출처 명시
            }
            results.append(parsed_item)

        # 수집된 데이터를 JSON 파일로 보기 좋게 인덴트를 주어 저장
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        print("\n======================================================")
        print(f"[완료] 총 {len(results)}개의 표본점 데이터를 성공적으로 변환했습니다!")
        print(f"저장 경로: {OUTPUT_JSON}")
        print("======================================================\n")

    except Exception as e:
        print(f"[치명적 오류] 엑셀 변환 중 에러가 발생했습니다: {str(e)}")

if __name__ == '__main__':
    main()
