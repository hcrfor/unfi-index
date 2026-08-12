import os
from pypdf import PdfReader

# 프로젝트 내 PDF 파일 찾기
pdf_file = None
for f in os.listdir('.'):
    if f.lower().endswith('.pdf') and os.path.isfile(f):
        pdf_file = f
        break

if not pdf_file:
    print("PDF 파일을 찾을 수 없습니다.")
    exit(1)

print(f"분석 대상 파일: {pdf_file}")
reader = PdfReader(pdf_file)
first_page_text = reader.pages[0].extract_text()

# 파일로 추출
output_path = './public/sample_text.txt'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(first_page_text)

print(f"성공적으로 첫 페이지 텍스트를 추출했습니다: {output_path}")
