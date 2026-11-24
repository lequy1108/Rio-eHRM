/** Kiểu chữ văn bản hành chính dùng cho trang in và xem trước mẫu hợp đồng */
export const SHEET_CSS = `
.contract-sheet{font-family:"Times New Roman",Times,serif;font-size:13pt;line-height:1.5;color:#000;background:#fff}
.contract-sheet h1{font-size:16pt;font-weight:bold;text-align:center;margin:12pt 0 4pt}
.contract-sheet h2{font-size:13pt;font-weight:bold;margin:12pt 0 4pt}
.contract-sheet p{margin:4pt 0;text-align:justify}
.contract-sheet .center{text-align:center}
.contract-sheet ol,.contract-sheet ul{margin:2pt 0 2pt 18pt;padding:0}
.contract-sheet ol{list-style:decimal}.contract-sheet ul{list-style:disc}
.contract-sheet li{margin:2pt 0;text-align:justify}
.contract-sheet table{width:100%;border-collapse:collapse}
.contract-sheet table.info td{padding:1pt 0;vertical-align:top}
.contract-sheet table.info td:first-child{width:32%}
.contract-sheet table.bordered td,.contract-sheet table.bordered th{border:1px solid #000;padding:3pt 6pt}
.contract-sheet table.sign{margin-top:24pt}
.contract-sheet table.sign td{width:50%;text-align:center;vertical-align:top}
.contract-sheet .blank{color:#999}
.contract-sheet mark{background:#fff3bf;color:#000}
@page{size:A4;margin:20mm 20mm 20mm 25mm}
@media print{.contract-sheet .blank{color:#000}.contract-sheet mark{background:none}}
`;
