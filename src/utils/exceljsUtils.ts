import Exceljs, { Workbook, Worksheet } from 'exceljs';

const initExcel: () => [Workbook, Worksheet] = () => {
  const workbook = new Exceljs.Workbook();
  const sheet = workbook.addWorksheet('info');
  sheet.columns = [
    { header: '키워드' },
    { header: '상호' },
    { header: '도메인' },
    { header: '상세설명문구' },
    { header: '홈페이지 내 TEL/연락처/전화' },
    { header: '홈페이지 내 상호' },
    { header: '홈페이지 내 대표' },
    { header: '홈페이지 내 주소/소재' },
    { header: '홈페이지 내 사업자번호/사업자등록번호' },
  ];
  return [workbook, sheet];
};

export { initExcel };
