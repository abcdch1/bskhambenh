/**
 * Lưu dữ liệu vào 1 file .json trên máy.
 * - Chrome / Edge trên máy tính: ghi thẳng vào file đã chọn (File System Access API),
 *   nhớ file lần trước để lần sau chỉ cần bấm "Mở lại".
 * - Trình duyệt khác: mở file bằng hộp chọn file, khi lưu thì tải file mới về máy.
 * Trước mỗi thao tác, nếu file trên máy đã bị thay đổi (ví dụ người khác sửa qua thư mục
 * Google Drive / OneDrive dùng chung) thì tải lại dữ liệu mới nhất rồi mới thực hiện.
 */
const Kho = (() => {
  const GHI = ['saveBacSy', 'deleteBacSy', 'addLichBan', 'deleteLichBan', 'saveDoan', 'deleteDoan',
    'saveChuyenKhoa', 'saveDonGia', 'saveCauHinh'];
  const HO_TRO = typeof window.showOpenFilePicker === 'function';
  const LOAI_FILE = [{ description: 'Dữ liệu phân công (.json)', accept: { 'application/json': ['.json'] } }];
  const TEN_MAC_DINH = 'DuLieuPhanCong.json';

  let handle = null;      // FileSystemFileHandle (chế độ ghi thẳng)
  let tenFile = '';
  let mtime = 0;          // lastModified của file lúc mình đọc / ghi gần nhất
  let chuaLuu = false;    // chế độ tải về: có thay đổi chưa tải file
  let luuLuc = '';
  let hangDoi = Promise.resolve();
  const nghe = { doi: [], taiLai: [] };
  const bao = (loai, x) => nghe[loai].forEach(f => { try { f(x); } catch (e) { console.error(e); } });

  // ---------- Nhớ file lần trước (IndexedDB) ----------
  function idb(mode, fn) {
    return new Promise((ok, loi) => {
      const rq = indexedDB.open('phan-cong-doan-kham', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onerror = () => loi(rq.error);
      rq.onsuccess = () => {
        const tx = rq.result.transaction('kv', mode);
        const r = fn(tx.objectStore('kv'));
        tx.oncomplete = () => ok(r && r.result);
        tx.onerror = () => loi(tx.error);
      };
    });
  }
  const nhoHandle = h => idb('readwrite', s => s.put(h, 'file')).catch(() => {});
  const layHandleCu = () => (HO_TRO ? idb('readonly', s => s.get('file')).catch(() => null) : Promise.resolve(null));

  // ---------- Đọc / ghi ----------
  async function docTuHandle(h) {
    const f = await h.getFile();
    const text = await f.text();
    let obj;
    try { obj = text.trim() ? JSON.parse(text) : { UngDung: UNG_DUNG }; } catch (e) { throw new Error('File "' + f.name + '" không phải file JSON hợp lệ.'); }
    napDuLieu(obj);
    mtime = f.lastModified;
    tenFile = f.name;
  }

  async function quyenGhi(h) {
    const o = { mode: 'readwrite' };
    if ((await h.queryPermission(o)) === 'granted') return true;
    return (await h.requestPermission(o)) === 'granted';
  }

  async function ghiFile() {
    const text = JSON.stringify(xuatDuLieu(), null, 1);
    if (handle) {
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      mtime = (await handle.getFile()).lastModified;
    } else {
      chuaLuu = true;
    }
    luuLuc = fmtTime_(new Date(), 'HH:mm');
    bao('doi');
  }

  /** Nếu file đã bị chương trình / người khác sửa thì nạp lại. Trả về true nếu có nạp lại. */
  async function dongBo() {
    if (!handle) return false;
    const f = await handle.getFile();
    if (f.lastModified === mtime) return false;
    await docTuHandle(handle);
    bao('taiLai');
    return true;
  }

  // ---------- Các cách bắt đầu ----------
  async function moFile() {
    const [h] = await window.showOpenFilePicker({ types: LOAI_FILE, multiple: false });
    if (!(await quyenGhi(h))) throw new Error('Cần cho phép phần mềm lưu vào file này.');
    await docTuHandle(h);
    handle = h;
    await nhoHandle(h);
    bao('doi');
  }

  async function taoFile() {
    const h = await window.showSaveFilePicker({ suggestedName: TEN_MAC_DINH, types: LOAI_FILE });
    napDuLieu({ UngDung: UNG_DUNG });
    handle = h;
    tenFile = h.name;
    await ghiFile();
    await nhoHandle(h);
  }

  async function moLai(h) {
    if (!(await quyenGhi(h))) throw new Error('Chưa được cho phép mở file "' + h.name + '".');
    await docTuHandle(h);
    handle = h;
    bao('doi');
  }

  /** Chế độ không ghi thẳng được: đọc từ file người dùng chọn (input type=file). */
  async function moFileTaiVe(file) {
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { throw new Error('File "' + file.name + '" không phải file JSON hợp lệ.'); }
    napDuLieu(obj);
    handle = null;
    tenFile = file.name;
    chuaLuu = false;
    bao('doi');
  }

  function taoMoiTaiVe() {
    napDuLieu({ UngDung: UNG_DUNG });
    handle = null;
    tenFile = TEN_MAC_DINH;
    chuaLuu = true;
    bao('doi');
  }

  /** Tải file dữ liệu về máy (chế độ tải về, hoặc tạo bản sao lưu). */
  function taiVe(ten) {
    const blob = new Blob([JSON.stringify(xuatDuLieu(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ten || tenFile || TEN_MAC_DINH;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    if (!ten && !handle) { chuaLuu = false; bao('doi'); }
  }

  /** Gọi 1 hàm xử lý dữ liệu (trong logic.js). Các lần gọi chạy lần lượt, không chen nhau. */
  function call(fn, args) {
    const viec = hangDoi.then(async () => {
      if (typeof window[fn] !== 'function') throw new Error('Không có chức năng ' + fn);
      await dongBo();
      const truoc = GHI.includes(fn) ? JSON.stringify(DB) : null;
      try {
        const r = await window[fn](...JSON.parse(JSON.stringify(args)));
        if (truoc) await ghiFile();
        return r === undefined ? r : JSON.parse(JSON.stringify(r));
      } catch (e) {
        if (truoc) DB = JSON.parse(truoc);   // lỗi thì trả dữ liệu về như cũ
        if (e && e.name === 'NotAllowedError') throw new Error('Trình duyệt chưa cho phép ghi vào file dữ liệu. Bấm "Đổi file" và mở lại file.');
        throw e;
      }
    });
    hangDoi = viec.catch(() => {});
    return viec;
  }

  return {
    HO_TRO, call, dongBo: () => (hangDoi = hangDoi.then(dongBo).catch(() => false)),
    moFile, taoFile, moLai, layHandleCu, moFileTaiVe, taoMoiTaiVe, taiVe,
    on: (loai, f) => nghe[loai].push(f),
    get tenFile() { return tenFile; },
    get ghiThang() { return !!handle; },
    get chuaLuu() { return chuaLuu; },
    get luuLuc() { return luuLuc; },
  };
})();
