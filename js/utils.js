/**
 * ============================================================
 * FILE: js/utils.js
 * MÔ TẢ: Chứa các hàm tiện ích dùng chung cho toàn bộ dự án
 *        FoodieMenu - Website thực đơn nhà hàng
 * TÁC GIẢ: [Tên của bạn]
 * NGÀY TẠO: 2025
 * ============================================================
 */

"use strict";

// ================================================================
// PHẦN 1: CẤU HÌNH VÀ HẰNG SỐ
// ================================================================

/**
 * Cấu hình mặc định cho Toast notification
 * Có thể override khi gọi hàm
 */
const TOAST_CONFIG = {
  DEFAULT_DURATION: 3000,   // Thời gian hiển thị toast (ms)
  ANIMATION_SPEED: 300,      // Tốc độ animation fade (ms)
  POSITION: "top-end",       // Vị trí mặc định của toast container
};

/**
 * Định nghĩa các loại thông báo và icon tương ứng
 * Dùng chung cho cả Toast và Alert
 */
const NOTIFICATION_TYPES = {
  success: {
    bgClass: "bg-success",
    textClass: "text-white",
    icon: "bi bi-check-circle-fill",
    alertClass: "alert-success",
    label: "Thành công",
  },
  error: {
    bgClass: "bg-danger",
    textClass: "text-white",
    icon: "bi bi-x-circle-fill",
    alertClass: "alert-danger",
    label: "Lỗi",
  },
  warning: {
    bgClass: "bg-warning",
    textClass: "text-dark",
    icon: "bi bi-exclamation-triangle-fill",
    alertClass: "alert-warning",
    label: "Cảnh báo",
  },
  info: {
    bgClass: "bg-info",
    textClass: "text-white",
    icon: "bi bi-info-circle-fill",
    alertClass: "alert-info",
    label: "Thông tin",
  },
};


// ================================================================
// PHẦN 2: ĐỊNH DẠNG DỮ LIỆU
// ================================================================

/**
 * Định dạng số thành tiền tệ Việt Nam Đồng (VND)
 *
 * @param {number|string} amount - Số tiền cần định dạng
 * @param {object} [options] - Tùy chọn bổ sung
 * @param {boolean} [options.showSymbol=true] - Có hiển thị ký hiệu "đ" không
 * @param {boolean} [options.compact=false] - Rút gọn số lớn (1.000.000 → 1 Triệu)
 * @returns {string} Chuỗi tiền tệ đã được định dạng, VD: "150.000 ₫"
 *
 * @example
 * formatCurrency(150000)          // → "150.000 ₫"
 * formatCurrency(150000, { showSymbol: false }) // → "150.000"
 * formatCurrency(1500000, { compact: true })    // → "1,5 Triệu ₫"
 * formatCurrency("abc")           // → "Không hợp lệ"
 */
function formatCurrency(amount, options = {}) {
  const { showSymbol = true, compact = false } = options;

  // Chuyển đổi và kiểm tra giá trị đầu vào
  const number = parseFloat(amount);

  if (isNaN(number) || amount === null || amount === undefined) {
    console.warn(`[formatCurrency] Giá trị không hợp lệ: "${amount}"`);
    return "Không hợp lệ";
  }

  // Chế độ rút gọn số lớn
  if (compact) {
    if (number >= 1_000_000_000) {
      const val = (number / 1_000_000_000).toFixed(1).replace(".", ",");
      return `${val} Tỷ${showSymbol ? " ₫" : ""}`;
    }
    if (number >= 1_000_000) {
      const val = (number / 1_000_000).toFixed(1).replace(".", ",");
      return `${val} Triệu${showSymbol ? " ₫" : ""}`;
    }
    if (number >= 1_000) {
      const val = (number / 1_000).toFixed(0);
      return `${val} Nghìn${showSymbol ? " ₫" : ""}`;
    }
  }

  // Định dạng chuẩn với Intl.NumberFormat (chuẩn quốc tế)
  const formatted = new Intl.NumberFormat("vi-VN", {
    style: showSymbol ? "currency" : "decimal",
    currency: "VND",
    // Không hiển thị chữ số thập phân cho VND
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);

  return formatted;
}

/**
 * Định dạng ngày tháng theo chuẩn Việt Nam
 *
 * @param {string|Date} dateInput - Chuỗi ngày hoặc object Date
 * @param {boolean} [includeTime=false] - Có kèm giờ phút không
 * @returns {string} Chuỗi ngày đã định dạng, VD: "25/12/2025" hoặc "25/12/2025 14:30"
 *
 * @example
 * formatDate("2025-12-25")               // → "25/12/2025"
 * formatDate("2025-12-25T14:30", true)   // → "25/12/2025 14:30"
 */
function formatDate(dateInput, includeTime = false) {
  if (!dateInput) return "Không có ngày";

  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    console.warn(`[formatDate] Ngày không hợp lệ: "${dateInput}"`);
    return "Ngày không hợp lệ";
  }

  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return new Intl.DateTimeFormat("vi-VN", options).format(date);
}

/**
 * Rút gọn chuỗi văn bản dài
 *
 * @param {string} text - Văn bản gốc
 * @param {number} [maxLength=100] - Độ dài tối đa
 * @returns {string} Văn bản đã rút gọn với "..." nếu quá dài
 *
 * @example
 * truncateText("Món ăn rất ngon và hấp dẫn", 10) // → "Món ăn rấ..."
 */
function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + "...";
}

/**
 * Tạo slug từ tên món ăn (dùng cho URL hoặc CSS class)
 *
 * @param {string} text - Văn bản gốc (VD: "Phở Bò Hà Nội")
 * @returns {string} Slug đã xử lý (VD: "pho-bo-ha-noi")
 */
function slugify(text) {
  if (!text) return "";

  // Bảng chuyển đổi ký tự tiếng Việt → không dấu
  const vietnameseMap = {
    à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
    ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
    â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
    è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
    ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
    ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
    ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
    ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
    ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
    ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
    ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
    ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
    đ: "d",
  };

  return text
    .toLowerCase()
    .replace(/./g, (char) => vietnameseMap[char] || char)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}


// ================================================================
// PHẦN 3: QUẢN LÝ LOADING SPINNER
// ================================================================

/**
 * Hiển thị màn hình loading overlay toàn trang
 * Thường dùng khi đang gọi API hoặc xử lý dữ liệu nặng
 *
 * @param {string} [message="Đang tải..."] - Thông điệp hiển thị kèm spinner
 *
 * @example
 * showLoading("Đang lưu dữ liệu...");
 */
function showLoading(message = "Đang tải...") {
  // Xóa loading cũ nếu tồn tại (tránh trùng lặp)
  hideLoading();

  const loadingHTML = `
    <div id="foodie-loading-overlay"
         class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
         style="background: rgba(0, 0, 0, 0.55); z-index: 9999; backdrop-filter: blur(3px);"
         role="status"
         aria-live="polite"
         aria-label="${message}">
      <div class="text-center text-white p-4">
        <!-- Spinner vòng quay Bootstrap 5 -->
        <div class="spinner-border text-warning mb-3"
             style="width: 3.5rem; height: 3.5rem; border-width: 4px;"
             role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="fs-5 fw-semibold mb-0 mt-2">${message}</p>
        <small class="opacity-75">Vui lòng chờ trong giây lát</small>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", loadingHTML);
}

/**
 * Ẩn màn hình loading overlay
 * Luôn gọi hàm này sau khi hoàn thành tác vụ bất đồng bộ
 *
 * @example
 * hideLoading();
 */
function hideLoading() {
  const overlay = document.getElementById("foodie-loading-overlay");
  if (overlay) {
    // Fade out trước khi xóa DOM để tạo hiệu ứng mượt
    overlay.style.transition = `opacity ${TOAST_CONFIG.ANIMATION_SPEED}ms ease`;
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), TOAST_CONFIG.ANIMATION_SPEED);
  }
}

/**
 * Hiển thị/ẩn trạng thái loading trên một nút bấm cụ thể
 * Vô hiệu hóa nút và thay đổi text trong khi đang xử lý
 *
 * @param {HTMLElement|jQuery} btnElement - Element nút bấm
 * @param {boolean} isLoading - true = đang loading, false = đã xong
 * @param {string} [loadingText="Đang xử lý..."] - Text hiển thị khi loading
 *
 * @example
 * // Khi bắt đầu gọi API
 * setButtonLoading(document.getElementById("btnSave"), true);
 * // Khi hoàn thành
 * setButtonLoading(document.getElementById("btnSave"), false);
 */
function setButtonLoading(btnElement, isLoading, loadingText = "Đang xử lý...") {
  // Hỗ trợ cả jQuery object và DOM element thuần
  const btn = btnElement instanceof $ ? btnElement[0] : btnElement;
  if (!btn) return;

  if (isLoading) {
    // Lưu lại text gốc để khôi phục sau
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"
            role="status" aria-hidden="true"></span>
      ${loadingText}
    `;
  } else {
    btn.disabled = false;
    // Khôi phục text gốc nếu có
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    delete btn.dataset.originalText;
  }
}


// ================================================================
// PHẦN 4: TOAST NOTIFICATION
// ================================================================

/**
 * Tạo container cho Toast nếu chưa tồn tại trong DOM
 * Container được đặt ở góc trên bên phải màn hình
 *
 * @returns {HTMLElement} Element container của toast
 * @private
 */
function _getOrCreateToastContainer() {
  let container = document.getElementById("foodie-toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "foodie-toast-container";

    // Sử dụng Bootstrap 5 position utilities
    container.className = `
      toast-container position-fixed top-0 end-0 p-3
    `.trim();

    // Đảm bảo toast luôn hiển thị trên mọi element khác
    container.style.zIndex = "11000";

    document.body.appendChild(container);
  }

  return container;
}

/**
 * Hiển thị thông báo Toast Bootstrap 5
 *
 * @param {string} message - Nội dung thông báo
 * @param {string} [type="info"] - Loại thông báo: "success" | "error" | "warning" | "info"
 * @param {number} [duration=3000] - Thời gian tự đóng (ms), 0 = không tự đóng
 * @param {string} [title=""] - Tiêu đề toast (nếu muốn custom, mặc định dùng label của type)
 *
 * @example
 * showToast("Thêm món ăn thành công!", "success");
 * showToast("Không thể kết nối máy chủ!", "error", 5000);
 * showToast("Vui lòng điền đầy đủ thông tin", "warning", 4000);
 * showToast("Có 3 món mới hôm nay", "info", 0); // Không tự đóng
 */
function showToast(message, type = "info", duration = TOAST_CONFIG.DEFAULT_DURATION, title = "") {
  // Lấy cấu hình style theo type
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
  const toastTitle = title || config.label;
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const autohide = duration > 0;

  const toastHTML = `
    <div id="${toastId}"
         class="toast align-items-center border-0 shadow-lg mb-2"
         role="alert"
         aria-live="assertive"
         aria-atomic="true"
         data-bs-autohide="${autohide}"
         data-bs-delay="${duration}">

      <!-- Header của Toast -->
      <div class="toast-header ${config.bgClass} ${config.textClass}">
        <i class="${config.icon} me-2 fs-5" aria-hidden="true"></i>
        <strong class="me-auto">${toastTitle}</strong>
        <small class="opacity-75 me-2">Vừa xong</small>
        <button type="button"
                class="btn-close ${type !== "warning" ? "btn-close-white" : ""}"
                data-bs-dismiss="toast"
                aria-label="Đóng thông báo">
        </button>
      </div>

      <!-- Body của Toast -->
      <div class="toast-body ${config.bgClass} ${config.textClass} bg-opacity-10 fw-medium">
        ${message}
      </div>
    </div>
  `;

  // Thêm toast vào container
  const container = _getOrCreateToastContainer();
  container.insertAdjacentHTML("beforeend", toastHTML);

  // Khởi tạo và hiển thị Toast bằng Bootstrap 5 JS API
  const toastElement = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastElement, {
    autohide: autohide,
    delay: duration,
  });

  bsToast.show();

  // Xóa element khỏi DOM sau khi toast ẩn đi (dọn dẹp bộ nhớ)
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
    // Xóa container nếu không còn toast nào
    const remainingToasts = container.querySelectorAll(".toast");
    if (remainingToasts.length === 0) {
      // Giữ lại container để tái sử dụng (performance)
    }
  });

  return bsToast; // Trả về instance để có thể control thủ công
}


// ================================================================
// PHẦN 5: ALERT NOTIFICATION (INLINE)
// ================================================================

/**
 * Hiển thị thông báo Alert Bootstrap 5 trong một container cụ thể
 * Khác Toast, Alert hiển thị inline trong layout trang
 *
 * @param {string} message - Nội dung thông báo
 * @param {string} [type="info"] - Loại: "success" | "error" | "warning" | "info"
 * @param {string|HTMLElement} [container="#alert-container"] - Selector hoặc Element chứa alert
 * @param {boolean} [dismissible=true] - Có nút đóng hay không
 * @param {number} [autoDismiss=0] - Tự đóng sau (ms), 0 = không tự đóng
 *
 * @example
 * // Thêm div#alert-container vào HTML trước
 * showAlert("Lỗi kết nối API!", "error", "#alert-container");
 * showAlert("Lưu thành công!", "success", "#form-alert", true, 3000);
 */
function showAlert(
  message,
  type = "info",
  container = "#alert-container",
  dismissible = true,
  autoDismiss = 0
) {
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
  const alertId = `alert-${Date.now()}`;

  const dismissButton = dismissible
    ? `<button type="button"
               class="btn-close"
               data-bs-dismiss="alert"
               aria-label="Đóng">
       </button>`
    : "";

  const alertHTML = `
    <div id="${alertId}"
         class="alert ${config.alertClass} d-flex align-items-start gap-2
                ${dismissible ? "alert-dismissible" : ""} fade show shadow-sm"
         role="alert">
      <i class="${config.icon} flex-shrink-0 mt-1 fs-5" aria-hidden="true"></i>
      <div class="flex-grow-1">
        <strong>${config.label}:</strong> ${message}
      </div>
      ${dismissButton}
    </div>
  `;

  // Resolve container (hỗ trợ cả selector string và DOM element)
  let containerEl;
  if (typeof container === "string") {
    containerEl = document.querySelector(container);
  } else {
    containerEl = container;
  }

  if (!containerEl) {
    console.warn(`[showAlert] Không tìm thấy container: "${container}"`);
    // Fallback: dùng toast thay thế
    showToast(message, type);
    return;
  }

  // Xóa alert cũ cùng loại trước khi thêm mới (tránh stack nhiều alert)
  const oldAlerts = containerEl.querySelectorAll(`.alert.${config.alertClass}`);
  oldAlerts.forEach((el) => el.remove());

  containerEl.insertAdjacentHTML("beforeend", alertHTML);

  // Xử lý tự động đóng alert
  if (autoDismiss > 0) {
    const alertEl = document.getElementById(alertId);
    setTimeout(() => {
      if (alertEl && alertEl.isConnected) {
        // Dùng Bootstrap Alert API để dismiss với animation
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
        bsAlert.close();
      }
    }, autoDismiss);
  }
}

/**
 * Xóa tất cả alert trong một container
 *
 * @param {string|HTMLElement} container - Selector hoặc Element chứa alert
 *
 * @example
 * clearAlerts("#form-alert-container");
 */
function clearAlerts(container = "#alert-container") {
  const containerEl =
    typeof container === "string"
      ? document.querySelector(container)
      : container;

  if (containerEl) {
    containerEl.querySelectorAll(".alert").forEach((el) => el.remove());
  }
}


// ================================================================
// PHẦN 6: HÀM TIỆN ÍCH BỔ SUNG
// ================================================================

/**
 * Validate dữ liệu form món ăn trước khi gửi lên API
 *
 * @param {object} dishData - Dữ liệu món ăn cần validate
 * @param {string} dishData.name - Tên món ăn
 * @param {number|string} dishData.price - Giá món ăn
 * @param {string} dishData.categoryId - ID danh mục
 * @returns {{ isValid: boolean, errors: string[] }} Kết quả validate
 *
 * @example
 * const result = validateDishForm({ name: "", price: -1, categoryId: "" });
 * if (!result.isValid) {
 *   result.errors.forEach(err => showToast(err, "warning"));
 * }
 */
function validateDishForm(dishData) {
  const errors = [];

  if (!dishData.name || dishData.name.trim().length < 2) {
    errors.push("Tên món ăn phải có ít nhất 2 ký tự.");
  }

  if (dishData.name && dishData.name.trim().length > 100) {
    errors.push("Tên món ăn không được vượt quá 100 ký tự.");
  }

  const price = parseFloat(dishData.price);
  if (isNaN(price) || price < 0) {
    errors.push("Giá món ăn phải là số dương hợp lệ.");
  }

  if (price > 100_000_000) {
    errors.push("Giá món ăn không được vượt quá 100 triệu VNĐ.");
  }

  if (!dishData.categoryId) {
    errors.push("Vui lòng chọn danh mục cho món ăn.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Debounce function - Trì hoãn thực thi hàm sau một khoảng thời gian
 * Dùng cho search input, resize window, etc.
 *
 * @param {Function} fn - Hàm cần debounce
 * @param {number} [delay=400] - Thời gian trì hoãn (ms)
 * @returns {Function} Hàm đã được debounce
 *
 * @example
 * const debouncedSearch = debounce(searchDishes, 500);
 * searchInput.addEventListener("input", debouncedSearch);
 */
function debounce(fn, delay = 400) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Cuộn trang lên đầu một cách mượt mà
 * @param {number} [top=0] - Vị trí cuộn đến (pixel từ trên)
 */
function scrollToTop(top = 0) {
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Tạo placeholder ảnh khi không có ảnh (dùng placehold.co)
 *
 * @param {string} src - URL ảnh gốc
 * @param {string} [altText="Hình ảnh món ăn"] - Alt text
 * @param {string} [size="400x300"] - Kích thước placeholder
 * @returns {string} URL ảnh hoặc URL placeholder
 */
function getImageOrPlaceholder(src, altText = "Hình ảnh món ăn", size = "400x300") {
  if (src && src.trim() !== "") return src;
  // Sử dụng dịch vụ placeholder miễn phí
  return `https://placehold.co/${size}/ff6b35/ffffff?text=${encodeURIComponent(altText)}`;
}


// ================================================================
// EXPORT (sử dụng nếu dự án có module system như ES Modules)
// Nếu dùng script tag thông thường, bỏ phần export này đi
// ================================================================

// Nếu môi trường hỗ trợ ES Modules:
// export {
//   formatCurrency, formatDate, truncateText, slugify,
//   showLoading, hideLoading, setButtonLoading,
//   showToast, showAlert, clearAlerts,
//   validateDishForm, debounce, scrollToTop, getImageOrPlaceholder,
// };

// Nếu dùng script tag bình thường, đính kèm vào window object:
if (typeof window !== "undefined") {
  window.FoodieUtils = {
    formatCurrency,
    formatDate,
    truncateText,
    slugify,
    showLoading,
    hideLoading,
    setButtonLoading,
    showToast,
    showAlert,
    clearAlerts,
    validateDishForm,
    debounce,
    scrollToTop,
    getImageOrPlaceholder,
  };
}