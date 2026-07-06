/**
 * ============================================================
 * FILE: js/api.js
 * MÔ TẢ: Module xử lý toàn bộ giao tiếp với MockAPI.io
 *        Sử dụng Fetch API (async/await) + jQuery AJAX fallback
 *        cho dự án FoodieMenu
 * TÁC GIẢ: [Tên của bạn]
 * NGÀY TẠO: 2025
 *
 * CẤU TRÚC ENDPOINT:
 *   BASE_URL/dishes      - Quản lý món ăn
 *   BASE_URL/categories  - Quản lý danh mục
 * ============================================================
 */

"use strict";

// ================================================================
// PHẦN 1: CẤU HÌNH API
// ================================================================

/**
 * URL gốc của MockAPI project
 * ⚠️ QUAN TRỌNG: Thay "MOCKAPI_URL_CUA_BAN" bằng URL thực tế
 * từ dashboard tại https://mockapi.io/projects
 *
 * Ví dụ thực tế:
 * const BASE_URL = "https://64abc123def456.mockapi.io/api/v1";
 */
const BASE_URL = "https://6a4b6995f5eab0bb6b62b910.mockapi.io";

/**
 * Định nghĩa các endpoint resources
 * Tách riêng để dễ maintenance và thay đổi sau này
 */
const ENDPOINTS = {
  DISHES: `${BASE_URL}/dishes`,
  CATEGORIES: `${BASE_URL}/categories`,
};

/**
 * Cấu hình mặc định cho mọi request HTTP
 * Áp dụng cho cả Fetch API và jQuery AJAX
 */
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * Thời gian timeout tối đa cho mỗi request (ms)
 * Sau thời gian này sẽ tự động throw error
 */
const REQUEST_TIMEOUT = 10000; // 10 giây


// ================================================================
// PHẦN 2: HÀM TIỆN ÍCH NỘI BỘ (PRIVATE HELPERS)
// ================================================================

/**
 * Wrapper cho Fetch API với timeout và xử lý lỗi chuẩn hóa
 * Đây là hàm core được dùng bởi tất cả các API functions
 *
 * @param {string} url - URL endpoint đầy đủ
 * @param {object} [options={}] - Fetch options (method, body, headers...)
 * @returns {Promise<any>} Promise resolve với data JSON
 * @throws {Error} Khi request thất bại hoặc timeout
 * @private
 */
async function _fetchWithTimeout(url, options = {}) {
  // Tạo AbortController để xử lý timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers, // Cho phép override headers
      },
      signal: controller.signal, // Gắn signal để có thể abort
    });

    // Xóa timeout timer vì request đã hoàn thành
    clearTimeout(timeoutId);

    // Kiểm tra HTTP status code
    if (!response.ok) {
      // Tạo error message chi tiết dựa trên status code
      const errorMessage = _getHttpErrorMessage(response.status, url);
      throw new Error(errorMessage);
    }

    // Xử lý response rỗng (VD: DELETE trả về 204 No Content)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType?.includes("application/json")) {
      return null; // Response rỗng - thường là DELETE thành công
    }

    return await response.json();

  } catch (error) {
    clearTimeout(timeoutId); // Đảm bảo cleanup timeout

    // Phân loại và chuẩn hóa lỗi
    if (error.name === "AbortError") {
      throw new Error(
        `Request timeout sau ${REQUEST_TIMEOUT / 1000}s. Vui lòng kiểm tra kết nối mạng.`
      );
    }

    if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet."
      );
    }

    // Re-throw lỗi đã được xử lý ở trên (HTTP errors)
    throw error;
  }
}

/**
 * Tạo thông báo lỗi thân thiện dựa trên HTTP Status Code
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} url - URL gây ra lỗi (để debug)
 * @returns {string} Thông báo lỗi tiếng Việt
 * @private
 */
function _getHttpErrorMessage(statusCode, url) {
  const messages = {
    400: "Dữ liệu gửi lên không hợp lệ (Bad Request 400).",
    401: "Bạn không có quyền truy cập (Unauthorized 401).",
    403: "Truy cập bị từ chối (Forbidden 403).",
    404: "Không tìm thấy dữ liệu yêu cầu (Not Found 404).",
    405: "Phương thức HTTP không được hỗ trợ (405).",
    409: "Xung đột dữ liệu, vui lòng thử lại (Conflict 409).",
    422: "Dữ liệu không thể xử lý được (Unprocessable Entity 422).",
    429: "Quá nhiều request, vui lòng chờ một chút (Too Many Requests 429).",
    500: "Lỗi máy chủ nội bộ, vui lòng thử lại sau (Internal Server Error 500).",
    502: "Lỗi gateway, máy chủ tạm thời không phản hồi (Bad Gateway 502).",
    503: "Dịch vụ tạm thời không khả dụng (Service Unavailable 503).",
  };

  const message = messages[statusCode] || `Lỗi HTTP không xác định (Status ${statusCode}).`;

  // Log để debug trong quá trình phát triển
  console.error(`[API Error] ${message}\nURL: ${url}`);

  return message;
}

/**
 * Log thông tin request/response để debug (chỉ chạy ở development)
 * Tắt log này ở production bằng cách đặt IS_DEV = false
 *
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url - URL endpoint
 * @param {any} [data] - Dữ liệu request body (nếu có)
 * @private
 */
const IS_DEV = true; // ← Đặt false khi deploy production

function _logRequest(method, url, data = null) {
  if (!IS_DEV) return;

  const timestamp = new Date().toLocaleTimeString("vi-VN");
  const style = "color: #ff6b35; font-weight: bold;";

  console.group(`%c[FoodieAPI] ${method} ${url}`, style);
  console.log(`⏰ Time: ${timestamp}`);
  if (data) console.log("📤 Payload:", data);
  console.groupEnd();
}

function _logResponse(method, url, data) {
  if (!IS_DEV) return;

  const style = "color: #28a745; font-weight: bold;";
  console.group(`%c[FoodieAPI] ✅ ${method} Response`, style);
  console.log("📥 Data:", data);
  console.groupEnd();
}


// ================================================================
// PHẦN 3: API DISHES - QUẢN LÝ MÓN ĂN
// ================================================================

/**
 * Lấy danh sách tất cả món ăn từ API
 * Hỗ trợ filter, sort và pagination qua query params
 *
 * @param {object} [params={}] - Query parameters tùy chọn
 * @param {number} [params.page] - Số trang (MockAPI hỗ trợ pagination)
 * @param {number} [params.limit] - Số item mỗi trang
 * @param {string} [params.sortBy] - Field để sort (VD: "name", "price")
 * @param {string} [params.order] - Thứ tự: "asc" | "desc"
 * @param {string} [params.search] - Từ khóa tìm kiếm tên món
 * @param {string} [params.categoryId] - Lọc theo danh mục
 * @returns {Promise<Array>} Promise resolve với mảng các món ăn
 *
 * @example
 * // Lấy tất cả món ăn
 * const dishes = await getDishes();
 *
 * // Lấy trang 1, mỗi trang 10 món, sort theo giá tăng dần
 * const dishes = await getDishes({ page: 1, limit: 10, sortBy: "price", order: "asc" });
 *
 * // Tìm kiếm món có từ "phở"
 * const dishes = await getDishes({ search: "phở" });
 */
async function getDishes(params = {}) {
  try {
    // Xây dựng URL với query parameters
    const url = new URL(ENDPOINTS.DISHES);

    // MockAPI.io hỗ trợ các params: page, limit, sortBy, order, search
    if (params.page) url.searchParams.set("page", params.page);
    if (params.limit) url.searchParams.set("limit", params.limit);
    if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
    if (params.order) url.searchParams.set("order", params.order);
    if (params.search) url.searchParams.set("search", params.search);
    if (params.categoryId) url.searchParams.set("categoryId", params.categoryId);

    const finalUrl = url.toString();
    _logRequest("GET", finalUrl);

    const data = await _fetchWithTimeout(finalUrl);
    _logResponse("GET", finalUrl, data);

    // Đảm bảo luôn trả về array, tránh lỗi khi component iterate
    return Array.isArray(data) ? data : [];

  } catch (error) {
    console.error("[getDishes] Lỗi khi lấy danh sách món ăn:", error.message);
    // Re-throw để component xử lý và hiển thị thông báo phù hợp
    throw error;
  }
}

/**
 * Lấy thông tin chi tiết của một món ăn theo ID
 *
 * @param {string|number} id - ID của món ăn cần lấy
 * @returns {Promise<object>} Promise resolve với object chứa thông tin món ăn
 * @throws {Error} Khi không tìm thấy món ăn (404) hoặc lỗi mạng
 *
 * @example
 * const dish = await getDishById("abc123");
 * console.log(dish.name, dish.price);
 */
async function getDishById(id) {
  // Validate ID trước khi gửi request
  if (!id && id !== 0) {
    throw new Error("[getDishById] ID món ăn không được để trống.");
  }

  const url = `${ENDPOINTS.DISHES}/${id}`;

  try {
    _logRequest("GET", url);

    const data = await _fetchWithTimeout(url);
    _logResponse("GET", url, data);

    return data;

  } catch (error) {
    console.error(`[getDishById] Lỗi khi lấy món ăn ID="${id}":`, error.message);
    throw error;
  }
}

/**
 * Tạo món ăn mới và lưu vào MockAPI
 *
 * @param {object} dishData - Dữ liệu món ăn mới
 * @param {string} dishData.name - Tên món ăn (bắt buộc)
 * @param {number} dishData.price - Giá món ăn (bắt buộc)
 * @param {string} dishData.categoryId - ID danh mục (bắt buộc)
 * @param {string} [dishData.description] - Mô tả món ăn
 * @param {string} [dishData.image] - URL hình ảnh
 * @param {boolean} [dishData.isAvailable=true] - Còn phục vụ không
 * @returns {Promise<object>} Promise resolve với object món ăn vừa tạo (có ID từ server)
 * @throws {Error} Khi dữ liệu không hợp lệ hoặc lỗi server
 *
 * @example
 * const newDish = await createDish({
 *   name: "Phở Bò Tái",
 *   price: 75000,
 *   categoryId: "cat_001",
 *   description: "Phở bò truyền thống Hà Nội",
 *   isAvailable: true
 * });
 * console.log("Đã tạo món:", newDish.id);
 */
async function createDish(dishData) {
  // Validate dữ liệu đầu vào
  if (!dishData || typeof dishData !== "object") {
    throw new Error("[createDish] Dữ liệu món ăn không hợp lệ.");
  }

  // Chuẩn hóa và làm sạch dữ liệu trước khi gửi
  const sanitizedData = {
    name: dishData.name?.trim() || "",
    price: Number(dishData.price) || 0,
    categoryId: dishData.categoryId || "",
    description: dishData.description?.trim() || "",
    image: dishData.image?.trim() || "",
    isAvailable: dishData.isAvailable !== undefined ? Boolean(dishData.isAvailable) : true,
    // Tự động thêm timestamp
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    _logRequest("POST", ENDPOINTS.DISHES, sanitizedData);

    const data = await _fetchWithTimeout(ENDPOINTS.DISHES, {
      method: "POST",
      body: JSON.stringify(sanitizedData),
    });

    _logResponse("POST", ENDPOINTS.DISHES, data);
    return data;

  } catch (error) {
    console.error("[createDish] Lỗi khi tạo món ăn mới:", error.message);
    throw error;
  }
}

/**
 * Cập nhật thông tin món ăn đã tồn tại
 * Sử dụng PUT (thay thế toàn bộ) hoặc PATCH (cập nhật một phần)
 *
 * @param {string|number} id - ID của món ăn cần cập nhật
 * @param {object} dishData - Dữ liệu cần cập nhật (có thể là một phần hoặc toàn bộ)
 * @param {boolean} [partial=true] - true = PATCH (update một phần), false = PUT (thay toàn bộ)
 * @returns {Promise<object>} Promise resolve với object món ăn đã được cập nhật
 * @throws {Error} Khi không tìm thấy món ăn hoặc dữ liệu không hợp lệ
 *
 * @example
 * // Cập nhật một phần (PATCH - khuyến nghị)
 * const updated = await updateDish("abc123", { price: 85000 });
 *
 * // Cập nhật toàn bộ (PUT)
 * const updated = await updateDish("abc123", { ...fullData }, false);
 */
async function updateDish(id, dishData, partial = true) {
  // Validate inputs
  if (!id && id !== 0) {
    throw new Error("[updateDish] ID món ăn không được để trống.");
  }

  if (!dishData || typeof dishData !== "object" || Object.keys(dishData).length === 0) {
    throw new Error("[updateDish] Dữ liệu cập nhật không được để trống.");
  }

  const url = `${ENDPOINTS.DISHES}/${id}`;
  const method = partial ? "PUT" : "PUT";
  // Lưu ý: MockAPI.io chỉ hỗ trợ PUT, không hỗ trợ PATCH
  // Nếu dùng server khác hỗ trợ PATCH: const method = partial ? "PATCH" : "PUT";

  // Tự động cập nhật timestamp
  const updatedData = {
    ...dishData,
    updatedAt: new Date().toISOString(),
  };

  try {
    _logRequest(method, url, updatedData);

    const data = await _fetchWithTimeout(url, {
      method: method,
      body: JSON.stringify(updatedData),
    });

    _logResponse(method, url, data);
    return data;

  } catch (error) {
    console.error(`[updateDish] Lỗi khi cập nhật món ăn ID="${id}":`, error.message);
    throw error;
  }
}

/**
 * Xóa một món ăn khỏi hệ thống theo ID
 *
 * @param {string|number} id - ID của món ăn cần xóa
 * @returns {Promise<boolean>} Promise resolve với true nếu xóa thành công
 * @throws {Error} Khi không tìm thấy món ăn hoặc không có quyền xóa
 *
 * @example
 * try {
 *   await deleteDish("abc123");
 *   showToast("Đã xóa món ăn thành công!", "success");
 * } catch (err) {
 *   showToast(err.message, "error");
 * }
 */
async function deleteDish(id) {
  if (!id && id !== 0) {
    throw new Error("[deleteDish] ID món ăn không được để trống.");
  }

  const url = `${ENDPOINTS.DISHES}/${id}`;

  try {
    _logRequest("DELETE", url);

    await _fetchWithTimeout(url, { method: "DELETE" });

    _logResponse("DELETE", url, { message: `Món ăn ID=${id} đã được xóa.` });

    return true; // Xóa thành công

  } catch (error) {
    console.error(`[deleteDish] Lỗi khi xóa món ăn ID="${id}":`, error.message);
    throw error;
  }
}


// ================================================================
// PHẦN 4: API CATEGORIES - QUẢN LÝ DANH MỤC
// ================================================================

/**
 * Lấy danh sách tất cả danh mục món ăn
 *
 * @param {object} [params={}] - Query parameters tùy chọn
 * @param {string} [params.sortBy] - Field để sort
 * @param {string} [params.order] - Thứ tự: "asc" | "desc"
 * @returns {Promise<Array>} Promise resolve với mảng danh mục
 *
 * @example
 * const categories = await getCategories();
 * categories.forEach(cat => console.log(cat.name));
 *
 * // Sort theo tên A-Z
 * const sorted = await getCategories({ sortBy: "name", order: "asc" });
 */
async function getCategories(params = {}) {
  try {
    const url = new URL(ENDPOINTS.CATEGORIES);

    if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
    if (params.order) url.searchParams.set("order", params.order);

    const finalUrl = url.toString();
    _logRequest("GET", finalUrl);

    const data = await _fetchWithTimeout(finalUrl);
    _logResponse("GET", finalUrl, data);

    return Array.isArray(data) ? data : [];

  } catch (error) {
    console.error("[getCategories] Lỗi khi lấy danh sách danh mục:", error.message);
    throw error;
  }
}

/**
 * Lấy thông tin chi tiết một danh mục theo ID
 *
 * @param {string|number} id - ID danh mục
 * @returns {Promise<object>} Thông tin danh mục
 *
 * @example
 * const category = await getCategoryById("cat_001");
 */
async function getCategoryById(id) {
  if (!id && id !== 0) {
    throw new Error("[getCategoryById] ID danh mục không được để trống.");
  }

  const url = `${ENDPOINTS.CATEGORIES}/${id}`;

  try {
    _logRequest("GET", url);
    const data = await _fetchWithTimeout(url);
    _logResponse("GET", url, data);
    return data;

  } catch (error) {
    console.error(`[getCategoryById] Lỗi khi lấy danh mục ID="${id}":`, error.message);
    throw error;
  }
}

/**
 * Tạo danh mục mới
 *
 * @param {object} categoryData - Dữ liệu danh mục
 * @param {string} categoryData.name - Tên danh mục (bắt buộc)
 * @param {string} [categoryData.description] - Mô tả danh mục
 * @param {string} [categoryData.icon] - Icon class (VD: "bi bi-cup-hot")
 * @returns {Promise<object>} Danh mục vừa được tạo
 *
 * @example
 * const newCat = await createCategory({
 *   name: "Món Khai Vị",
 *   icon: "bi bi-egg-fried",
 *   description: "Các món ăn khai vị trước bữa chính"
 * });
 */
async function createCategory(categoryData) {
  if (!categoryData?.name?.trim()) {
    throw new Error("[createCategory] Tên danh mục không được để trống.");
  }

  const sanitizedData = {
    name: categoryData.name.trim(),
    description: categoryData.description?.trim() || "",
    icon: categoryData.icon?.trim() || "bi bi-grid",
    createdAt: new Date().toISOString(),
  };

  try {
    _logRequest("POST", ENDPOINTS.CATEGORIES, sanitizedData);

    const data = await _fetchWithTimeout(ENDPOINTS.CATEGORIES, {
      method: "POST",
      body: JSON.stringify(sanitizedData),
    });

    _logResponse("POST", ENDPOINTS.CATEGORIES, data);
    return data;

  } catch (error) {
    console.error("[createCategory] Lỗi khi tạo danh mục:", error.message);
    throw error;
  }
}


// ================================================================
// PHẦN 5: HÀM JQUERY AJAX ALTERNATIVE
// Sử dụng khi cần tích hợp jQuery vào project
// ================================================================

/**
 * Alternative: Lấy danh sách món ăn sử dụng jQuery AJAX
 * Tương đương getDishes() nhưng dùng jQuery $.ajax thay vì Fetch API
 *
 * ⚡ LƯU Ý: Cần load jQuery trước file này:
 * <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
 *
 * @param {object} [params={}] - Query parameters
 * @returns {Promise<Array>} Promise resolve với mảng món ăn
 *
 * @example
 * // Sử dụng với async/await
 * const dishes = await getDishesJQuery();
 *
 * // Sử dụng với .then()
 * getDishesJQuery().then(dishes => console.log(dishes));
 */
function getDishesJQuery(params = {}) {
  // Bọc $.ajax trong Promise để hỗ trợ async/await
  return new Promise((resolve, reject) => {
    // Kiểm tra jQuery đã được load chưa
    if (typeof $ === "undefined" || typeof $.ajax === "undefined") {
      reject(new Error("jQuery chưa được load. Vui lòng thêm thẻ script jQuery."));
      return;
    }

    _logRequest("GET [jQuery]", ENDPOINTS.DISHES, params);

    $.ajax({
      url: ENDPOINTS.DISHES,
      method: "GET",
      data: params, // jQuery tự động chuyển object thành query string
      dataType: "json",
      timeout: REQUEST_TIMEOUT,
      headers: DEFAULT_HEADERS,

      // ✅ Callback khi request thành công
      success: function (data) {
        _logResponse("GET [jQuery]", ENDPOINTS.DISHES, data);
        resolve(Array.isArray(data) ? data : []);
      },

      // ❌ Callback khi request thất bại
      error: function (jqXHR, textStatus, errorThrown) {
        let errorMessage;

        if (textStatus === "timeout") {
          errorMessage = `Request timeout sau ${REQUEST_TIMEOUT / 1000}s.`;
        } else if (textStatus === "error" && jqXHR.status === 0) {
          errorMessage = "Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng.";
        } else {
          errorMessage = _getHttpErrorMessage(jqXHR.status, ENDPOINTS.DISHES);
        }

        console.error("[getDishesJQuery] Error:", { textStatus, errorThrown, jqXHR });
        reject(new Error(errorMessage));
      },
    });
  });
}

/**
 * Alternative: Tạo món ăn mới sử dụng jQuery AJAX
 * Tương đương createDish() nhưng dùng jQuery
 *
 * @param {object} dishData - Dữ liệu món ăn mới
 * @returns {Promise<object>} Promise resolve với món ăn đã tạo
 *
 * @example
 * const newDish = await createDishJQuery({
 *   name: "Bún Bò Huế",
 *   price: 65000,
 *   categoryId: "cat_002"
 * });
 */
function createDishJQuery(dishData) {
  return new Promise((resolve, reject) => {
    if (typeof $ === "undefined") {
      reject(new Error("jQuery chưa được load."));
      return;
    }

    const sanitizedData = {
      ...dishData,
      name: dishData.name?.trim(),
      price: Number(dishData.price) || 0,
      createdAt: new Date().toISOString(),
    };

    _logRequest("POST [jQuery]", ENDPOINTS.DISHES, sanitizedData);

    $.ajax({
      url: ENDPOINTS.DISHES,
      method: "POST",
      data: JSON.stringify(sanitizedData),
      contentType: "application/json",
      dataType: "json",
      timeout: REQUEST_TIMEOUT,

      success: function (data) {
        _logResponse("POST [jQuery]", ENDPOINTS.DISHES, data);
        resolve(data);
      },

      error: function (jqXHR, textStatus, errorThrown) {
        const errorMessage = textStatus === "timeout"
          ? `Request timeout sau ${REQUEST_TIMEOUT / 1000}s.`
          : _getHttpErrorMessage(jqXHR.status, ENDPOINTS.DISHES);

        console.error("[createDishJQuery] Error:", { textStatus, errorThrown });
        reject(new Error(errorMessage));
      },
    });
  });
}


// ================================================================
// PHẦN 6: HÀM TIỆN ÍCH API CẤP CAO (HIGH-LEVEL HELPERS)
// ================================================================

/**
 * Lấy món ăn và tự động join với thông tin danh mục
 * Thực hiện 2 request song song để tối ưu performance
 *
 * @param {object} [params={}] - Query params cho dishes
 * @returns {Promise<Array>} Mảng món ăn đã được enrich với tên danh mục
 *
 * @example
 * const dishesWithCategory = await getDishesWithCategory();
 * // Mỗi item có thêm field: categoryName
 */
async function getDishesWithCategory(params = {}) {
  try {
    // Gọi 2 API song song để tiết kiệm thời gian (thay vì tuần tự)
    const [dishes, categories] = await Promise.all([
      getDishes(params),
      getCategories(),
    ]);

    // Tạo Map từ categories để lookup O(1) thay vì O(n)
    const categoryMap = new Map(
      categories.map((cat) => [String(cat.id), cat])
    );

    // Join dishes với category data
    return dishes.map((dish) => ({
      ...dish,
      category: categoryMap.get(String(dish.categoryId)) || null,
      categoryName: categoryMap.get(String(dish.categoryId))?.name || "Chưa phân loại",
    }));

  } catch (error) {
    console.error("[getDishesWithCategory] Lỗi:", error.message);
    throw error;
  }
}

/**
 * Kiểm tra kết nối đến API có hoạt động không
 * Dùng để hiển thị trạng thái kết nối hoặc fallback
 *
 * @returns {Promise<boolean>} true nếu API đang hoạt động
 *
 * @example
 * const isOnline = await checkApiConnection();
 * if (!isOnline) {
 *   showAlert("Không thể kết nối máy chủ!", "error");
 * }
 */
async function checkApiConnection() {
  try {
    await _fetchWithTimeout(ENDPOINTS.CATEGORIES);
    console.log("[API] ✅ Kết nối MockAPI thành công!");
    return true;
  } catch {
    console.warn("[API] ❌ Không thể kết nối MockAPI.");
    return false;
  }
}


// ================================================================
// EXPORT - Tương tự utils.js
// ================================================================

if (typeof window !== "undefined") {
  window.FoodieAPI = {
    // Core dish functions
    getDishes,
    getDishById,
    createDish,
    updateDish,
    deleteDish,

    // Category functions
    getCategories,
    getCategoryById,
    createCategory,

    // jQuery alternatives
    getDishesJQuery,
    createDishJQuery,

    // High-level helpers
    getDishesWithCategory,
    checkApiConnection,

    // Export constants để components khác có thể sử dụng
    ENDPOINTS,
    BASE_URL,
  };
}