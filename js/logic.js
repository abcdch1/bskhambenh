/**
 * PHẦN MỀM PHÂN CÔNG ĐOÀN KHÁM & CHẤM CÔNG BÁC SỸ – xử lý dữ liệu.
 * Chạy hoàn toàn trên trình duyệt. Dữ liệu nằm trong biến DB (mỗi bảng là 1 mảng),
 * được store.js đọc / ghi vào 1 file .json trên máy.
 * Mọi giá trị lưu dạng văn bản (ngày theo dạng yyyy-mm-dd) để tránh lỗi múi giờ / định dạng.
 */

// ===================== HẰNG SỐ & CẤU TRÚC DỮ LIỆU =====================

const KHUNG = [
  { ma: 'S', ten: 'Sáng', gio: '7h30 – 11h30' },
  { ma: 'C', ten: 'Chiều', gio: '12h00 – 16h00' },
  { ma: 'T', ten: 'Tối', gio: '16h00 – 20h00' },
];
const MA_KHUNG = KHUNG.map(k => k.ma);
const TRANG_THAI_DOAN = ['Nháp', 'Đã chốt', 'Hoàn thành', 'Huỷ'];
const HUY = 'Huỷ';
const HOAN_THANH = 'Hoàn thành';
const DA_CHOT = 'Đã chốt';
const TRANG_THAI_BS = ['Đang hợp tác', 'Ngừng hợp tác'];

// Mỗi trang tính: danh sách [khoá dùng trong mã, tiêu đề cột hiển thị]
const SCHEMA = {
  BacSy: [['Ma', 'Mã'], ['HoTen', 'Họ tên'], ['SDT', 'Số điện thoại'], ['HocVi', 'Học vị'],
    ['SoTaiKhoan', 'Số tài khoản'], ['NganHang', 'Ngân hàng'],
    ['ChuyenKhoa', 'Chuyên khoa (mã, cách nhau dấu phẩy)'], ['Sao', 'Mức ưu tiên (1-5)'],
    ['TrangThai', 'Trạng thái'], ['GhiChu', 'Ghi chú']],
  ChuyenKhoa: [['Ma', 'Mã'], ['Ten', 'Tên chuyên khoa'], ['ThuTu', 'Thứ tự'], ['HoatDong', 'Hoạt động (1/0)']],
  LichBan: [['ID', 'ID'], ['MaBS', 'Mã bác sỹ'], ['Ngay', 'Ngày'], ['Khung', 'Khung giờ'], ['LyDo', 'Lý do']],
  Doan: [['ID', 'ID'], ['TenDoan', 'Tên đoàn / đơn vị'], ['DiaDiem', 'Địa điểm'], ['Ngay', 'Ngày'],
    ['Buoi', 'Các buổi'], ['SoNguoi', 'Số người dự kiến'], ['TruongDoan', 'Trưởng đoàn'],
    ['LienHe', 'Người liên hệ'], ['GhiChu', 'Ghi chú'], ['TrangThai', 'Trạng thái'], ['CapNhat', 'Cập nhật lúc']],
  NhuCau: [['DoanID', 'ID đoàn'], ['Khung', 'Khung giờ'], ['MaCK', 'Mã chuyên khoa'], ['SoLuong', 'Số lượng']],
  PhanCong: [['DoanID', 'ID đoàn'], ['Ngay', 'Ngày'], ['Khung', 'Khung giờ'], ['MaCK', 'Mã chuyên khoa'],
    ['ViTri', 'Vị trí'], ['MaBS', 'Mã bác sỹ']],
  DonGia: [['Khung', 'Khung giờ (trống = mọi khung)'], ['MaCK', 'Mã chuyên khoa (trống = mọi CK)'],
    ['TuNgay', 'Áp dụng từ ngày'], ['DonGia', 'Đơn giá (đồng/buổi)'], ['GhiChu', 'Ghi chú']],
  CauHinh: [['Khoa', 'Khoá'], ['GiaTri', 'Giá trị'], ['MoTa', 'Mô tả']],
};

const CK_MAC_DINH = [
  ['NND', 'Nội - Ngoại - Da liễu'], ['SAN', 'Sản'], ['MAT', 'Mắt'],
  ['TMH', 'Tai Mũi Họng'], ['RHM', 'Răng Hàm Mặt'], ['SA', 'Siêu âm'],
];
const CAU_HINH_MAC_DINH = [
  ['SoNgayTinhChamChi', '90', 'Số ngày gần nhất dùng để đếm số buổi đã khám khi gợi ý bác sỹ'],
];
const DATE_KEYS = ['Ngay', 'TuNgay'];

// ===================== KHO DỮ LIỆU =====================

const UNG_DUNG = 'PhanCongDoanKham';
let DB = {};

/** Nạp dữ liệu từ nội dung file JSON (đã parse). Bảng thiếu sẽ được tạo rỗng. */
function napDuLieu(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('File không đúng định dạng dữ liệu của phần mềm.');
  if (obj.UngDung && obj.UngDung !== UNG_DUNG) throw new Error('File này là dữ liệu của phần mềm khác ("' + obj.UngDung + '").');
  if (!obj.UngDung && !Array.isArray(obj.BacSy)) throw new Error('File không có dữ liệu bác sỹ – có thể chọn nhầm file.');
  DB = {};
  Object.keys(SCHEMA).forEach(name => { DB[name] = []; write_(name, Array.isArray(obj[name]) ? obj[name] : []); });
  khoiTao();
}

/** Nội dung để ghi ra file. */
function xuatDuLieu() {
  const o = { UngDung: UNG_DUNG, PhienBan: 1, LuuLuc: nowText_() };
  Object.keys(SCHEMA).forEach(name => { o[name] = DB[name] || []; });
  return o;
}

/** Tạo các bảng còn thiếu và dữ liệu mặc định. Chạy nhiều lần không sao. */
function khoiTao() {
  Object.keys(SCHEMA).forEach(name => { if (!Array.isArray(DB[name])) DB[name] = []; });
  if (!read_('ChuyenKhoa').length) {
    write_('ChuyenKhoa', CK_MAC_DINH.map((c, i) => ({ Ma: c[0], Ten: c[1], ThuTu: i + 1, HoatDong: '1' })));
  }
  if (!read_('DonGia').length) {
    write_('DonGia', KHUNG.map(k => ({ Khung: k.ma, MaCK: '', TuNgay: '2020-01-01', DonGia: '0', GhiChu: 'Giá chung buổi ' + k.ten })));
  }
  const ch = read_('CauHinh');
  CAU_HINH_MAC_DINH.forEach(c => {
    if (!ch.some(x => x.Khoa === c[0])) ch.push({ Khoa: c[0], GiaTri: c[1], MoTa: c[2] });
  });
  write_('CauHinh', ch);
}

function taoDuLieuMau() {
  khoiTao();
  if (read_('BacSy').length) return 0;
  const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
  const dem = ['Văn', 'Thị', 'Minh', 'Thanh', 'Quốc', 'Ngọc', 'Hữu', 'Thu'];
  const ten = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hùng', 'Lan', 'Long',
    'Mai', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Vy'];
  const hv = ['BS', 'BSCKI', 'BSCKII', 'ThS.BS'];
  const cks = CK_MAC_DINH.map(c => c[0]);
  const list = [];
  for (let i = 0; i < 30; i++) {
    const ck = i < 12 ? ['NND'] : [cks[1 + (i % 5)]];
    if (i % 5 === 0) ck.push('SA');
    list.push({
      Ma: 'BS' + String(i + 1).padStart(3, '0'),
      HoTen: ho[i % 10] + ' ' + dem[(i * 3) % 8] + ' ' + ten[(i * 7) % 20],
      SDT: '09' + String(10000000 + ((i * 7654321) % 89999999)).slice(0, 8),
      HocVi: hv[i % 4], SoTaiKhoan: '', NganHang: '',
      ChuyenKhoa: ck.filter((x, j) => ck.indexOf(x) === j).join(','),
      Sao: String(1 + ((i * 7) % 5)), TrangThai: TRANG_THAI_BS[0], GhiChu: 'Dữ liệu mẫu',
    });
  }
  write_('BacSy', list);
  return list.length;
}

// ===================== TIỆN ÍCH ĐỌC / GHI =====================

/** Trả về bản sao các dòng của 1 bảng (sửa thoải mái, chỉ có hiệu lực khi write_). */
function read_(name) {
  return (DB[name] || []).map(o => Object.assign({}, o));
}

/** Ghi đè cả bảng; mọi giá trị chuyển về chuỗi đã cắt khoảng trắng, chỉ giữ các cột trong SCHEMA. */
function write_(name, rows) {
  const cols = SCHEMA[name];
  DB[name] = rows.map(src => {
    const o = {};
    cols.forEach(c => {
      const v = String(src[c[0]] == null ? '' : src[c[0]]).trim();
      o[c[0]] = DATE_KEYS.indexOf(c[0]) >= 0 ? normDate_(v) : v;
    });
    return o;
  }).filter(o => cols.some(c => o[c[0]] !== ''));
}

function withLock_(fn) { return fn(); }

function uuid_() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function fmtTime_(d, f) {
  return f.replace('yyyy', d.getFullYear()).replace('yy', String(d.getFullYear()).slice(2))
    .replace('MM', pad2_(d.getMonth() + 1)).replace('dd', pad2_(d.getDate()))
    .replace('HH', pad2_(d.getHours())).replace('mm', pad2_(d.getMinutes())).replace('ss', pad2_(d.getSeconds()));
}

function num_(v) { const n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; }
function pad2_(v) { return String(v).padStart(2, '0'); }
function mapBy_(list, key) { const m = {}; list.forEach(x => { m[x[key]] = x; }); return m; }
function splitList_(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }
function splitBuoi_(s) { const a = splitList_(s); return MA_KHUNG.filter(k => a.indexOf(k) >= 0); }
function khungIdx_(k) { return MA_KHUNG.indexOf(k); }
function tenKhung_(k) { const x = KHUNG.find(z => z.ma === k); return x ? x.ten : k; }
function inRange_(d, tu, den) { return (!tu || d >= tu) && (!den || d <= den); }
function nowText_() { return fmtTime_(new Date(), 'yyyy-MM-dd HH:mm'); }

function normDate_(s) {
  s = String(s || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return m[1] + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return m[3] + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  return s;
}

function addDays_(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function ngayVN_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const thu = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(s + 'T00:00:00Z').getUTCDay()];
  return thu + ', ' + s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
}

function cauHinh_() {
  const o = {};
  CAU_HINH_MAC_DINH.forEach(c => { o[c[0]] = c[1]; });
  read_('CauHinh').forEach(x => { o[x.Khoa] = x.GiaTri; });
  return o;
}

function ckSorted_() {
  return read_('ChuyenKhoa').sort((a, b) => num_(a.ThuTu) - num_(b.ThuTu));
}

// ===================== KHỞI ĐỘNG GIAO DIỆN =====================

function getBootstrap() {
  return {
    khung: KHUNG,
    trangThaiDoan: TRANG_THAI_DOAN,
    trangThaiBS: TRANG_THAI_BS,
    chuyenKhoa: ckSorted_(),
    bacSy: read_('BacSy'),
    donGia: read_('DonGia'),
    cauHinh: cauHinh_(),
  };
}

// ===================== BÁC SỸ =====================

function saveBacSy(bs, laMoi) {
  return withLock_(() => {
    const list = read_('BacSy');
    const o = {};
    SCHEMA.BacSy.forEach(c => { o[c[0]] = String(bs[c[0]] == null ? '' : bs[c[0]]).trim(); });
    if (!o.HoTen) throw new Error('Chưa nhập họ tên bác sỹ.');
    o.Ma = o.Ma.toUpperCase();
    o.Sao = String(Math.min(5, Math.max(1, Math.round(num_(o.Sao)) || 3)));
    if (TRANG_THAI_BS.indexOf(o.TrangThai) < 0) o.TrangThai = TRANG_THAI_BS[0];
    o.ChuyenKhoa = splitList_(o.ChuyenKhoa).join(',');
    if (laMoi) {
      if (!o.Ma) o.Ma = maTiepTheo_(list);
      if (list.some(x => x.Ma === o.Ma)) throw new Error('Mã ' + o.Ma + ' đã tồn tại.');
      list.push(o);
    } else {
      const i = list.findIndex(x => x.Ma === o.Ma);
      if (i < 0) throw new Error('Không tìm thấy bác sỹ mã ' + o.Ma);
      list[i] = o;
    }
    write_('BacSy', list);
    return { bacSy: list, ma: o.Ma };
  });
}

function maTiepTheo_(list) {
  let max = 0;
  list.forEach(x => { const m = /^BS(\d+)$/.exec(x.Ma); if (m) max = Math.max(max, Number(m[1])); });
  return 'BS' + String(max + 1).padStart(3, '0');
}

function deleteBacSy(ma) {
  return withLock_(() => {
    if (read_('PhanCong').some(p => p.MaBS === ma)) {
      throw new Error('Bác sỹ này đã có lịch phân công nên không xoá được. Hãy chuyển trạng thái sang "Ngừng hợp tác".');
    }
    const list = read_('BacSy').filter(x => x.Ma !== ma);
    write_('BacSy', list);
    write_('LichBan', read_('LichBan').filter(x => x.MaBS !== ma));
    return { bacSy: list };
  });
}

function getLichBan(ma) {
  return read_('LichBan').filter(x => x.MaBS === ma)
    .sort((a, b) => b.Ngay.localeCompare(a.Ngay) || khungIdx_(a.Khung) - khungIdx_(b.Khung));
}

/** p = { MaBS, Ngay, Khungs: ['S','C'], LyDo } */
function addLichBan(p) {
  return withLock_(() => {
    const ngay = normDate_(p.Ngay);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) throw new Error('Ngày không hợp lệ.');
    const khungs = (p.Khungs || []).filter(k => MA_KHUNG.indexOf(k) >= 0);
    if (!khungs.length) throw new Error('Chọn ít nhất 1 khung giờ bận.');
    const list = read_('LichBan');
    khungs.forEach(k => {
      if (list.some(x => x.MaBS === p.MaBS && x.Ngay === ngay && x.Khung === k)) return;
      list.push({ ID: uuid_().slice(0, 8), MaBS: p.MaBS, Ngay: ngay, Khung: k, LyDo: String(p.LyDo || '').trim() });
    });
    write_('LichBan', list);
    return getLichBan(p.MaBS);
  });
}

function deleteLichBan(id, ma) {
  return withLock_(() => {
    write_('LichBan', read_('LichBan').filter(x => x.ID !== id));
    return getLichBan(ma);
  });
}

/** Các buổi bác sỹ đã/đang được phân công (không tính đoàn Huỷ). */
function getLichSuBS(ma) {
  const doanMap = mapBy_(read_('Doan'), 'ID');
  const ckMap = mapBy_(read_('ChuyenKhoa'), 'Ma');
  const s = {};
  read_('PhanCong').forEach(p => {
    if (p.MaBS !== ma) return;
    const d = doanMap[p.DoanID];
    if (!d || d.TrangThai === HUY) return;
    const k = p.DoanID + '|' + p.Khung;
    if (!s[k]) s[k] = { DoanID: d.ID, Ngay: d.Ngay, Khung: p.Khung, TenDoan: d.TenDoan, DiaDiem: d.DiaDiem, TrangThai: d.TrangThai, ck: [] };
    s[k].ck.push((ckMap[p.MaCK] || {}).Ten || p.MaCK);
  });
  return Object.keys(s).map(k => { const x = s[k]; x.ck = x.ck.join(', '); return x; })
    .sort((a, b) => b.Ngay.localeCompare(a.Ngay) || khungIdx_(a.Khung) - khungIdx_(b.Khung));
}

// ===================== ĐOÀN KHÁM =====================

function listDoan(tu, den) {
  tu = normDate_(tu); den = normDate_(den);
  const doan = read_('Doan').filter(d => inRange_(d.Ngay, tu, den));
  const ids = mapBy_(doan, 'ID');
  const can = {}, da = {};
  read_('NhuCau').forEach(x => { if (ids[x.DoanID]) can[x.DoanID] = (can[x.DoanID] || 0) + num_(x.SoLuong); });
  read_('PhanCong').forEach(x => { if (ids[x.DoanID]) da[x.DoanID] = (da[x.DoanID] || 0) + 1; });
  return doan.map(d => Object.assign({}, d, { soCan: can[d.ID] || 0, soDaXep: da[d.ID] || 0 }))
    .sort((a, b) => a.Ngay.localeCompare(b.Ngay) || a.TenDoan.localeCompare(b.TenDoan));
}

function getDoan(id) {
  const doan = read_('Doan').find(d => d.ID === id);
  if (!doan) throw new Error('Không tìm thấy đoàn khám (có thể đã bị xoá).');
  return {
    doan: doan,
    nhuCau: read_('NhuCau').filter(x => x.DoanID === id),
    phanCong: read_('PhanCong').filter(x => x.DoanID === id),
  };
}

/**
 * Thông tin cần để gợi ý bác sỹ cho 1 ngày:
 * - ban: lịch bận đã đăng ký; - daXep: đã được xếp ở đoàn khác (cùng ngày)
 * - soBuoi: số buổi đã khám trong N ngày trước ngày này (để ưu tiên người chăm chỉ)
 */
function getNgayContext(ngay, doanId) {
  ngay = normDate_(ngay);
  const doanMap = mapBy_(read_('Doan'), 'ID');
  const pcAll = read_('PhanCong');
  const daXep = [];
  pcAll.forEach(p => {
    const d = doanMap[p.DoanID];
    if (p.Ngay !== ngay || p.DoanID === doanId || !d || d.TrangThai === HUY) return;
    daXep.push({ MaBS: p.MaBS, Khung: p.Khung, DoanID: p.DoanID, TenDoan: d.TenDoan });
  });
  const ban = read_('LichBan').filter(b => b.Ngay === ngay).map(b => ({ MaBS: b.MaBS, Khung: b.Khung, LyDo: b.LyDo }));
  const tu = addDays_(ngay, -(num_(cauHinh_().SoNgayTinhChamChi) || 90));
  const seen = {}, soBuoi = {};
  pcAll.forEach(p => {
    const d = doanMap[p.DoanID];
    if (!d || d.TrangThai === HUY || p.Ngay < tu || p.Ngay >= ngay) return;
    const k = p.MaBS + '|' + p.DoanID + '|' + p.Khung;
    if (seen[k]) return;
    seen[k] = 1;
    soBuoi[p.MaBS] = (soBuoi[p.MaBS] || 0) + 1;
  });
  return { ngay: ngay, ban: ban, daXep: daXep, soBuoi: soBuoi };
}

/** p = { doan: {...}, nhuCau: [{Khung, MaCK, SoLuong}], phanCong: [{Khung, MaCK, ViTri, MaBS}] } */
function saveDoan(p) {
  return withLock_(() => {
    const src = p.doan || {};
    const doan = {};
    SCHEMA.Doan.forEach(c => { doan[c[0]] = String(src[c[0]] == null ? '' : src[c[0]]).trim(); });
    doan.Ngay = normDate_(doan.Ngay);
    if (!doan.TenDoan) throw new Error('Chưa nhập tên đoàn / đơn vị.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doan.Ngay)) throw new Error('Ngày khám không hợp lệ.');
    const buoi = splitBuoi_(doan.Buoi);
    if (!buoi.length) throw new Error('Chọn ít nhất 1 buổi khám.');
    doan.Buoi = buoi.join(',');
    if (TRANG_THAI_DOAN.indexOf(doan.TrangThai) < 0) doan.TrangThai = TRANG_THAI_DOAN[0];
    if (!doan.ID) doan.ID = 'D' + fmtTime_(new Date(), 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    doan.CapNhat = nowText_();

    const need = {};
    const nhuCau = [];
    (p.nhuCau || []).forEach(x => {
      const n = Math.floor(num_(x.SoLuong));
      if (buoi.indexOf(x.Khung) < 0 || n <= 0 || !x.MaCK) return;
      need[x.Khung + '|' + x.MaCK] = n;
      nhuCau.push({ DoanID: doan.ID, Khung: x.Khung, MaCK: x.MaCK, SoLuong: n });
    });

    const bsMap = mapBy_(read_('BacSy'), 'Ma');
    const phanCong = [];
    const seen = {};
    (p.phanCong || []).forEach(x => {
      const vt = Math.floor(num_(x.ViTri));
      if (!x.MaBS || vt < 1 || vt > (need[x.Khung + '|' + x.MaCK] || 0)) return;
      const bs = bsMap[x.MaBS];
      if (!bs) throw new Error('Không tìm thấy bác sỹ mã ' + x.MaBS + '.');
      const k = x.MaBS + '|' + x.Khung + '|' + x.MaCK;
      if (seen[k]) throw new Error(bs.HoTen + ' bị xếp 2 vị trí cùng chuyên khoa trong buổi ' + tenKhung_(x.Khung) + '.');
      seen[k] = 1;
      phanCong.push({ DoanID: doan.ID, Ngay: doan.Ngay, Khung: x.Khung, MaCK: x.MaCK, ViTri: vt, MaBS: x.MaBS });
    });

    const allDoan = read_('Doan');
    const allPC = read_('PhanCong');
    if (doan.TrangThai !== HUY) {
      // Một bác sỹ không thể ở 2 đoàn khác nhau trong cùng 1 khung giờ
      const doanMap = mapBy_(allDoan, 'ID');
      const loi = {};
      allPC.forEach(o => {
        if (o.DoanID === doan.ID || o.Ngay !== doan.Ngay) return;
        const od = doanMap[o.DoanID];
        if (!od || od.TrangThai === HUY) return;
        if (phanCong.some(x => x.MaBS === o.MaBS && x.Khung === o.Khung)) {
          loi['• ' + ((bsMap[o.MaBS] || {}).HoTen || o.MaBS) + ' – buổi ' + tenKhung_(o.Khung) + ' đã ở đoàn "' + od.TenDoan + '"'] = 1;
        }
      });
      if (Object.keys(loi).length) throw new Error('Trùng lịch, chưa lưu được:\n' + Object.keys(loi).join('\n'));
    }

    const i = allDoan.findIndex(x => x.ID === doan.ID);
    if (i >= 0) allDoan[i] = doan; else allDoan.push(doan);
    write_('Doan', allDoan);
    write_('NhuCau', read_('NhuCau').filter(x => x.DoanID !== doan.ID).concat(nhuCau));
    write_('PhanCong', allPC.filter(x => x.DoanID !== doan.ID).concat(phanCong));
    return { ID: doan.ID, CapNhat: doan.CapNhat };
  });
}

function deleteDoan(id) {
  return withLock_(() => {
    write_('Doan', read_('Doan').filter(x => x.ID !== id));
    write_('NhuCau', read_('NhuCau').filter(x => x.DoanID !== id));
    write_('PhanCong', read_('PhanCong').filter(x => x.DoanID !== id));
    return true;
  });
}

// ===================== BẢNG PHÂN CÔNG =====================

function bangData_(tu, den, tts) {
  tu = normDate_(tu); den = normDate_(den);
  tts = tts && tts.length ? tts : TRANG_THAI_DOAN.filter(t => t !== HUY);
  const doans = read_('Doan').filter(d => inRange_(d.Ngay, tu, den) && tts.indexOf(d.TrangThai) >= 0)
    .sort((a, b) => a.Ngay.localeCompare(b.Ngay) || a.TenDoan.localeCompare(b.TenDoan));
  const ids = mapBy_(doans, 'ID');
  const pcs = read_('PhanCong').filter(p => ids[p.DoanID]);
  const ncs = read_('NhuCau').filter(x => ids[x.DoanID]);
  const bsMap = mapBy_(read_('BacSy'), 'Ma');
  const dung = {};
  ncs.concat(pcs).forEach(x => { dung[x.MaCK] = 1; });
  const cks = ckSorted_().filter(c => c.HoatDong !== '0' || dung[c.Ma]);

  const cot = doans.map(d => {
    const buoi = splitBuoi_(d.Buoi);
    const o = {}, thieu = {};
    cks.forEach(ck => {
      const p = pcs.filter(x => x.DoanID === d.ID && x.MaCK === ck.Ma);
      o[ck.Ma] = oBang_(buoi, p, bsMap);
      const t = [];
      buoi.forEach(k => {
        const can = ncs.filter(x => x.DoanID === d.ID && x.MaCK === ck.Ma && x.Khung === k)
          .reduce((s, x) => s + num_(x.SoLuong), 0);
        const co = p.filter(x => x.Khung === k).length;
        if (co < can) t.push(tenKhung_(k) + ' ' + (can - co));
      });
      thieu[ck.Ma] = t.join(', ');
    });
    return { doan: d, buoiText: buoi.map(tenKhung_).join(', '), o: o, thieu: thieu };
  });
  return { tu: tu, den: den, chuyenKhoa: cks, cot: cot };
}

/**
 * Nội dung 1 ô (1 đoàn × 1 chuyên khoa).
 * Đoàn nhiều buổi: "Nguyễn A (S-C)" nếu 1 người làm cả 2 buổi; "Trần B (S)", "Lê C (C)" nếu 2 người.
 */
function oBang_(buoi, pcs, bsMap) {
  const order = [], map = {};
  pcs.slice().sort((a, b) => num_(a.ViTri) - num_(b.ViTri) || khungIdx_(a.Khung) - khungIdx_(b.Khung))
    .forEach(p => {
      if (!map[p.MaBS]) { map[p.MaBS] = {}; order.push(p.MaBS); }
      map[p.MaBS][p.Khung] = 1;
    });
  return order.map(ma => {
    const ten = (bsMap[ma] || {}).HoTen || ma;
    if (buoi.length <= 1) return ten;
    return ten + ' (' + MA_KHUNG.filter(k => map[ma][k]).join('-') + ')';
  }).join('\n');
}

function getBangPhanCong(tu, den, tts) {
  return bangData_(tu, den, tts);
}

async function xuatBangPhanCong(tu, den, tts) {
  const data = bangData_(tu, den, tts);
  if (!data.cot.length) throw new Error('Không có đoàn nào trong khoảng thời gian đã chọn.');
  const rows = [
    ['Tên đoàn'].concat(data.cot.map(c => c.doan.TenDoan)),
    ['Ngày'].concat(data.cot.map(c => ngayVN_(c.doan.Ngay))),
    ['Địa điểm'].concat(data.cot.map(c => c.doan.DiaDiem)),
    ['Buổi'].concat(data.cot.map(c => c.buoiText)),
    ['Số người dự kiến'].concat(data.cot.map(c => c.doan.SoNguoi)),
    ['Trưởng đoàn'].concat(data.cot.map(c => c.doan.TruongDoan)),
  ];
  const soDauBang = rows.length;
  data.chuyenKhoa.forEach(ck => { rows.push([ck.Ten].concat(data.cot.map(c => c.o[ck.Ma]))); });
  const nCol = rows[0].length;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bảng phân công', { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] });
  ws.getCell(1, 1).value = 'BẢNG PHÂN CÔNG ĐOÀN KHÁM  (' + ngayVN_(data.tu) + ' – ' + ngayVN_(data.den) + ')';
  ws.getCell(1, 1).font = { bold: true, size: 13 };
  rows.forEach((r, i) => r.forEach((v, j) => {
    const c = ws.getCell(3 + i, 1 + j);
    c.value = v == null ? '' : String(v);
    c.alignment = { wrapText: true, vertical: 'top' };
    c.border = VIEN_;
    if (j === 0) { c.font = { bold: true }; c.fill = nen_('DBEAFE'); }
    else if (i < soDauBang) c.fill = nen_('EEF4FF');
    if (i === 0) c.font = { bold: true };
  }));
  ws.getColumn(1).width = 22;
  for (let j = 2; j <= nCol; j++) ws.getColumn(j).width = 30;
  await taiExcel_(wb, 'Bang phan cong ' + ddmm_(data.tu) + ' den ' + ddmm_(data.den) + '.xlsx');
  return true;
}

function ddmm_(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : s; }

const VIEN_ = { top: { style: 'thin', color: { argb: 'FFC9D2E0' } }, left: { style: 'thin', color: { argb: 'FFC9D2E0' } },
  bottom: { style: 'thin', color: { argb: 'FFC9D2E0' } }, right: { style: 'thin', color: { argb: 'FFC9D2E0' } } };
function nen_(hex) { return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } }; }

/** Ghi 1 bảng (tiêu đề + dòng) vào trang tính, bắt đầu ở dòng 3. */
function bangExcel_(ws, tieuDe, head, rows, opt) {
  ws.getCell(1, 1).value = tieuDe;
  ws.getCell(1, 1).font = { bold: true, size: 13 };
  [head].concat(rows).forEach((r, i) => r.forEach((v, j) => {
    const c = ws.getCell(3 + i, 1 + j);
    c.value = (opt.so || []).indexOf(j) >= 0 && i > 0 && v !== '' ? Number(v) : (v == null ? '' : String(v));
    c.border = VIEN_;
    c.alignment = { vertical: 'top', wrapText: true };
    if ((opt.tien || []).indexOf(j) >= 0) c.numFmt = '#,##0';
    if (i === 0) { c.font = { bold: true }; c.fill = nen_('DBEAFE'); }
  }));
  (opt.rong || []).forEach((w, j) => { ws.getColumn(j + 1).width = w; });
}

async function taiExcel_(wb, ten) {
  if (typeof ExcelJS === 'undefined') throw new Error('Chưa tải được thư viện Excel (cần kết nối mạng).');
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ===================== BÁO CÁO CÔNG =====================

/** Đơn giá cho 1 buổi: ưu tiên dòng cụ thể nhất (đúng CK > đúng khung), rồi dòng áp dụng gần nhất. */
function giaCho_(bang, khung, ck, ngay) {
  let best = null, bestScore = -1;
  bang.forEach(g => {
    if (g.Khung && g.Khung !== khung) return;
    if (g.MaCK && g.MaCK !== ck) return;
    const tuNgay = g.TuNgay || '0000-00-00';
    if (tuNgay > ngay) return;
    const score = (g.MaCK ? 2 : 0) + (g.Khung ? 1 : 0);
    if (score > bestScore || (score === bestScore && tuNgay > (best.TuNgay || '0000-00-00'))) {
      best = g; bestScore = score;
    }
  });
  return best ? num_(best.DonGia) : 0;
}

function baoCaoData_(tu, den, gomDaChot) {
  tu = normDate_(tu); den = normDate_(den);
  const tts = gomDaChot ? [HOAN_THANH, DA_CHOT] : [HOAN_THANH];
  const doanMap = {};
  read_('Doan').forEach(d => { if (inRange_(d.Ngay, tu, den) && tts.indexOf(d.TrangThai) >= 0) doanMap[d.ID] = d; });
  const ckMap = mapBy_(read_('ChuyenKhoa'), 'Ma');
  const bsMap = mapBy_(read_('BacSy'), 'Ma');
  const bangGia = read_('DonGia');

  // 1 bác sỹ × 1 đoàn × 1 khung = 1 công (dù khám kiêm nhiều chuyên khoa)
  const buoi = {};
  read_('PhanCong').forEach(p => {
    const d = doanMap[p.DoanID];
    if (!d) return;
    const k = p.MaBS + '|' + p.DoanID + '|' + p.Khung;
    if (!buoi[k]) buoi[k] = { MaBS: p.MaBS, Ngay: d.Ngay, Khung: p.Khung, TenDoan: d.TenDoan, DiaDiem: d.DiaDiem, TrangThai: d.TrangThai, cks: [] };
    buoi[k].cks.push(p.MaCK);
  });
  const chiTiet = Object.keys(buoi).map(k => {
    const b = buoi[k];
    b.DonGia = Math.max.apply(null, b.cks.map(ck => giaCho_(bangGia, b.Khung, ck, b.Ngay)));
    b.ChuyenKhoa = b.cks.map(ck => (ckMap[ck] || {}).Ten || ck).join(', ');
    delete b.cks;
    b.HoTen = (bsMap[b.MaBS] || {}).HoTen || b.MaBS;
    return b;
  }).sort((a, b) => a.HoTen.localeCompare(b.HoTen, 'vi') || a.Ngay.localeCompare(b.Ngay) || khungIdx_(a.Khung) - khungIdx_(b.Khung));

  const th = {};
  chiTiet.forEach(c => {
    if (!th[c.MaBS]) {
      const bs = bsMap[c.MaBS] || {};
      th[c.MaBS] = { MaBS: c.MaBS, HoTen: c.HoTen, HocVi: bs.HocVi || '', SDT: bs.SDT || '',
        SoTaiKhoan: bs.SoTaiKhoan || '', NganHang: bs.NganHang || '', S: 0, C: 0, T: 0, Tong: 0, ThanhTien: 0 };
    }
    const t = th[c.MaBS];
    t[c.Khung]++; t.Tong++; t.ThanhTien += c.DonGia;
  });
  const tongHop = Object.keys(th).map(k => th[k]).sort((a, b) => a.HoTen.localeCompare(b.HoTen, 'vi'));
  return { tu: tu, den: den, tts: tts, tongHop: tongHop, chiTiet: chiTiet };
}

function getBaoCao(tu, den, gomDaChot) {
  return baoCaoData_(tu, den, gomDaChot);
}

async function xuatBaoCao(tu, den, gomDaChot) {
  const d = baoCaoData_(tu, den, gomDaChot);
  if (!d.tongHop.length) throw new Error('Không có công khám nào trong khoảng thời gian đã chọn.');
  const tieuDe = '(' + ngayVN_(d.tu) + ' – ' + ngayVN_(d.den) + ' · trạng thái: ' + d.tts.join(', ') + ')';
  const wb = new ExcelJS.Workbook();

  const h1 = ['STT', 'Mã', 'Họ tên', 'Học vị', 'Số điện thoại', 'Số tài khoản', 'Ngân hàng',
    'Buổi sáng', 'Buổi chiều', 'Buổi tối', 'Tổng buổi', 'Thành tiền'];
  const r1 = d.tongHop.map((t, i) => [i + 1, t.MaBS, t.HoTen, t.HocVi, t.SDT, t.SoTaiKhoan, t.NganHang, t.S, t.C, t.T, t.Tong, t.ThanhTien]);
  const tong = ['', '', 'TỔNG CỘNG', '', '', '', ''];
  [7, 8, 9, 10, 11].forEach(j => { tong.push(r1.reduce((s, r) => s + r[j], 0)); });
  r1.push(tong);
  const ws1 = wb.addWorksheet('Tổng hợp', { views: [{ state: 'frozen', ySplit: 3 }] });
  bangExcel_(ws1, 'BÁO CÁO CÔNG KHÁM – TỔNG HỢP ' + tieuDe, h1, r1,
    { so: [0, 7, 8, 9, 10, 11], tien: [11], rong: [6, 9, 28, 9, 14, 18, 30, 10, 10, 10, 10, 14] });
  ws1.getRow(3 + r1.length).eachCell(c => { c.font = { bold: true }; c.fill = nen_('F1F5F9'); });

  const h2 = ['Mã', 'Họ tên', 'Ngày', 'Khung giờ', 'Đoàn', 'Địa điểm', 'Chuyên khoa', 'Trạng thái', 'Đơn giá'];
  const r2 = d.chiTiet.map(c => [c.MaBS, c.HoTen, ngayVN_(c.Ngay), tenKhung_(c.Khung), c.TenDoan, c.DiaDiem, c.ChuyenKhoa, c.TrangThai, c.DonGia]);
  const ws2 = wb.addWorksheet('Chi tiết', { views: [{ state: 'frozen', ySplit: 3 }] });
  bangExcel_(ws2, 'BÁO CÁO CÔNG KHÁM – CHI TIẾT TỪNG BUỔI ' + tieuDe, h2, r2,
    { so: [8], tien: [8], rong: [9, 28, 16, 10, 30, 26, 22, 12, 12] });

  await taiExcel_(wb, 'Bao cao cong ' + ddmm_(d.tu) + ' den ' + ddmm_(d.den) + '.xlsx');
  return true;
}

// ===================== CÀI ĐẶT =====================

function saveChuyenKhoa(list) {
  return withLock_(() => {
    const out = [], ma = {};
    (list || []).forEach((c, i) => {
      const o = { Ma: String(c.Ma || '').trim().toUpperCase(), Ten: String(c.Ten || '').trim(),
        ThuTu: String(num_(c.ThuTu) || i + 1), HoatDong: c.HoatDong === '0' ? '0' : '1' };
      if (!o.Ma && !o.Ten) return;
      if (!o.Ma || !o.Ten) throw new Error('Mỗi chuyên khoa cần có cả Mã và Tên.');
      if (/[,|]/.test(o.Ma)) throw new Error('Mã chuyên khoa không được chứa dấu phẩy hoặc |.');
      if (ma[o.Ma]) throw new Error('Trùng mã chuyên khoa ' + o.Ma + '.');
      ma[o.Ma] = 1;
      out.push(o);
    });
    const dung = {};
    read_('NhuCau').concat(read_('PhanCong')).forEach(x => { dung[x.MaCK] = 1; });
    read_('BacSy').forEach(b => splitList_(b.ChuyenKhoa).forEach(m => { dung[m] = 1; }));
    read_('ChuyenKhoa').forEach(c => {
      if (!ma[c.Ma] && dung[c.Ma]) throw new Error('Chuyên khoa "' + c.Ten + '" đang được dùng nên không xoá được. Hãy bỏ chọn "Hoạt động" thay vì xoá.');
    });
    write_('ChuyenKhoa', out);
    return ckSorted_();
  });
}

function saveDonGia(list) {
  return withLock_(() => {
    const out = (list || []).map(g => {
      const o = { Khung: String(g.Khung || '').trim(), MaCK: String(g.MaCK || '').trim(),
        TuNgay: normDate_(g.TuNgay) || '2020-01-01', DonGia: String(num_(g.DonGia)), GhiChu: String(g.GhiChu || '').trim() };
      if (o.Khung && MA_KHUNG.indexOf(o.Khung) < 0) throw new Error('Khung giờ không hợp lệ: ' + o.Khung);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(o.TuNgay)) throw new Error('Ngày áp dụng không hợp lệ: ' + g.TuNgay);
      if (num_(o.DonGia) < 0) throw new Error('Đơn giá không được âm.');
      return o;
    });
    write_('DonGia', out);
    return read_('DonGia');
  });
}

function saveCauHinh(obj) {
  return withLock_(() => {
    const list = read_('CauHinh');
    Object.keys(obj || {}).forEach(k => {
      const x = list.find(c => c.Khoa === k);
      if (x) x.GiaTri = String(obj[k]); else list.push({ Khoa: k, GiaTri: String(obj[k]), MoTa: '' });
    });
    write_('CauHinh', list);
    return cauHinh_();
  });
}
