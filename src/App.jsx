import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  X, 
  Copy, 
  Check, 
  AlertCircle,
  Database,
  Info
} from 'lucide-react';
import './App.css';

function App() {
  // 상태 관리
  const [pdfData, setPdfData] = useState([]);       // 파싱된 표본점 데이터 전체 목록
  const [searchTerm, setSearchTerm] = useState(''); // 검색창 입력값
  const [isLoading, setIsLoading] = useState(true);  // 로딩 상태 (JSON 패치)

  // 컴포넌트 시작 시 public/data.json 정적 데이터 패치
  useEffect(() => {
    fetch('/data.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error('data.json 없음');
        }
        return res.json();
      })
      .then((data) => {
        setPdfData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('사전 빌드된 data.json이 감지되지 않았습니다. 가이드 화면으로 진입합니다.', err);
        setPdfData([]);
        setIsLoading(false);
      });
  }, []);

  // 원하는 표본점번호(뒤에서 6자리 또는 전체 표본점번호)를 검색 (검색어가 없으면 빈 배열)
  const cleanSearch = searchTerm.trim();
  const filteredData = cleanSearch
    ? pdfData.filter((item) => {
        const fullId = item.sampleId;
        const last6Digits = fullId.length >= 6 ? fullId.slice(-6) : fullId;

        // 검색어가 전체 표본점번호에 포함되거나, 뒤 6자리에 매칭되는지 확인
        return fullId.includes(cleanSearch) || last6Digits.includes(cleanSearch);
      })
    : [];

  // 검색어 하이라이팅 유틸리티 함수
  const highlightSearchText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <span key={index} className="highlight">{part}</span> : part
    );
  };

  return (
    <div className="app-container">
      {/* 고정 상단 헤더 */}
      <header className="app-header">
        <h1>UNIF INDEX 조회</h1>
        <p>인덱스 엑셀 기반 초고속 실시간 검색</p>
      </header>

      <main className="app-content">
        {/* 1. 데이터를 불러오는 중일 때 */}
        {isLoading && (
          <div className="loading-box" style={{ margin: 'auto 0' }}>
            <div className="loading-spinner"></div>
            <div className="loading-text">데이터베이스 불러오는 중...</div>
          </div>
        )}

        {/* 2. 데이터가 완전히 없는 경우 - 가이드 화면 노출 */}
        {!isLoading && pdfData.length === 0 && (
          <div className="loading-box" style={{ margin: 'auto 0', gap: '20px', padding: '36px 20px' }}>
            <Database size={56} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>
              표본점 데이터베이스 빌드 필요
            </h2>
            <div style={{ textAlign: 'left', width: '100%', fontSize: '16px', color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '18px' }}>
                💡 사용 방법 안내
              </p>
              <p>
                1. <strong>프로젝트 폴더</strong> 루트에 <code>2026 전국 인덱스.xlsx</code> 파일이 존재하는지 확인해 주세요.
              </p>
              <p>
                2. 터미널(콘솔) 창에서 아래 명령어를 한 번 실행해 주세요:
                <code style={{ display: 'block', margin: '8px 0', backgroundColor: '#e0f2f1', color: '#004d40', fontWeight: 'bold' }}>
                  npm run parse
                </code>
              </p>
              <p>
                3. 변환이 완료되면 웹 브라우저를 새로고침(F5) 해주시면 즉시 조회가 시작됩니다!
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eef2f3', padding: '12px', borderRadius: '8px', fontSize: '14px', width: '100%' }}>
              <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>엑셀 데이터를 고속 JSON 데이터베이스로 변환하여 검색합니다.</span>
            </div>
          </div>
        )}

        {/* 3. 데이터가 탑재된 정상 상태 대시보드 */}
        {!isLoading && pdfData.length > 0 && (
          <div className="dashboard-container">
            {/* 실시간 검색창 - 모바일 숫자 패드를 위해 inputMode/pattern 속성 부여 */}
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="search-input"
                placeholder="표본점번호 검색 (전체 또는 뒤 6자리)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 통계 요약 바 (검색어가 입력되었을 때만 노출) */}
            {searchTerm.trim() && (
              <div className="stats-bar">
                <span>총 {pdfData.length}개 표본점 중 {filteredData.length}개 검색됨</span>
                <span style={{ fontSize: '14px', color: 'var(--text-sub)', fontWeight: 'normal' }}>
                  실시간 업데이트 완료
                </span>
              </div>
            )}

            {/* 표본점 카드 리스트 */}
            <div className="list-container">
              {!searchTerm.trim() ? (
                <div className="empty-state" style={{ paddingTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <Search size={48} style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontWeight: '700', color: 'var(--text-sub)', fontSize: '18px' }}>
                    조회할 표본점번호를 입력하세요.
                  </p>
                  <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '-4px' }}>
                    전체 번호 또는 뒤 6자리를 입력하면 즉시 검색됩니다.
                  </p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="empty-state">
                  <p>일치하는 표본점이 없습니다.</p>
                  <p style={{ fontSize: '15px' }}>번호를 다시 확인해 주세요.</p>
                </div>
              ) : (
                filteredData.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="sample-card"
                  >
                    {/* 카드 헤더: 라벨과 유형 배지 */}
                    <div className="card-header">
                      <div className="card-id-label">표본점번호</div>
                      <div className="card-type-badge">{item.type}</div>
                    </div>
                    {/* 큰 표본점번호 */}
                    <div className="card-id">
                      {highlightSearchText(item.sampleId, searchTerm)}
                    </div>
                    
                    {/* 상세 정보 그리드 영역 - 한 화면에 팝업 없이 모두 표시 */}
                    <div className="card-body-grid">
                      <div className="grid-item full-width">
                        <span className="grid-label">주소</span>
                        <span className="grid-value">{item.address}</span>
                      </div>
                      <div className="grid-item">
                        <span className="grid-label">X 좌표</span>
                        <span className="grid-value">{item.coordX}</span>
                      </div>
                      <div className="grid-item">
                        <span className="grid-label">Y 좌표</span>
                        <span className="grid-value">{item.coordY}</span>
                      </div>
                      <div className="grid-item">
                        <span className="grid-label">조사번호</span>
                        <span className="grid-value">{item.surveyId}</span>
                      </div>
                      <div className="grid-item">
                        <span className="grid-label">표고</span>
                        <span className="grid-value highlight-green">{item.elevation ? `${item.elevation}m` : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
