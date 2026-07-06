/**
 * ============================================================
 * FILE: js/admin.js
 * MÔ TẢ: Logic trang Admin FoodieMenu - Quản lý CRUD món ăn
 *        Phụ thuộc: jQuery 3.7+, Bootstrap 5, utils.js, api.js
 * TÁC GIẢ: [Tên của bạn]
 * NGÀY TẠO: 2025
 *
 * LUỒNG CHÍNH:
 *   Load → renderTable → [Add/Edit/Delete] → API → reload
 * ============================================================
 */

"use strict";

// ================================================================
// PHẦN 1: STATE VÀ CẤU HÌNH
// ================================================================

/**
 * Trạng thái tập trung của trang Admin
 */
const AdminState = {
  allDishes: [],          // Toàn bộ món ăn từ API
  allCategories: [],      // Toàn bộ danh mục từ API
  filteredDishes: [],     // Món ăn sau khi filter/search
  currentMode: "add",     // "add" hoặc "edit"
  editingDishId: null,    // ID món đang edit
  currentPage: 1,
  rowsPerPage: 10,
  sortField: null,
  sortDir: "asc",
  tableSearchQuery: "",
  tableStatusFilter: "all",
  tableCategoryFilter: "all",
};

/**
 * Cache jQuery selectors
 */
const $A = {}; // Prefix $A để phân biệt với $el của main.js

// ================================================================
// PHẦN 2: KHỞI TẠO
// ================================================================

$(document).ready(function () {
  console.log(
    "%c🛡️ FoodieMenu Admin Panel Starting...",
    "color: #3182ce; font-size: 14px; font-weight: bold;"
  );

  _initAdminSelectors();
  _bindAdminEvents();
  _loadAdminData();
  _initSidebarToggle();
});

/**
 * Cache tất cả selectors
 * @private
 */
function _initAdminSelectors() {
  // Stats
  $A.statTotalDishes   = $("#statTotalDishes");
  $A.statAvailable     = $("#statAvailable");
  $A.statSoldout       = $("#statSoldout");
  $A.statCategories    = $("#statCategories");
  $A.sidebarDishCount  = $("#sidebarDishCount");

  // Table
  $A.dishTableBody        = $("#dishTableBody");
  $A.tableSearch          = $("#tableSearch");
  $A.tableStatusFilter    = $("#tableStatusFilter");
  $A.tableCategoryFilter  = $("#tableCategoryFilter");
  $A.tableInfo            = $("#tableInfo");
  $A.rowsPerPage          = $("#rowsPerPage");

  // Form Modal
  $A.dishFormModal      = $("#dishFormModal");
  $A.dishForm           = $("#dishForm");
  $A.modalFormTitle     = $("#modalFormTitle");
  $A.modalFormIcon      = $("#modalFormIcon");
  $A.submitFormBtn      = $("#submitFormBtn");
  $A.submitBtnIcon      = $("#submitBtnIcon");
  $A.submitBtnText      = $("#submitBtnText");
  $A.btnAddDish         = $("#btnAddDish");
  $A.formAlertContainer = $("#formAlertContainer");

  // Form Fields
  $A.fieldDishId        = $("#fieldDishId");
  $A.fieldName          = $("#fieldName");
  $A.fieldPrice         = $("#fieldPrice");
  $A.fieldCategory      = $("#fieldCategory");
  $A.fieldImage         = $("#fieldImage");
  $A.fieldDescription   = $("#fieldDescription");
  $A.fieldIsAvailable   = $("#fieldIsAvailable");

  // Form UI helpers
  $A.nameCharCount      = $("#nameCharCount");
  $A.descCharCount      = $("#descCharCount");
  $A.pricePreview       = $("#pricePreview");
  $A.imagePreviewWrap   = $("#imagePreviewWrap");
  $A.imagePreviewImg    = $("#imagePreviewImg");
  $A.previewImageBtn    = $("#previewImageBtn");
  $A.statusToggleLabel  = $("#statusToggleLabel");
  $A.statusDescription  = $("#statusDescription");

  // Delete Modal
  $A.deleteConfirmModal = $("#deleteConfirmModal");
  $A.deleteDishId       = $("#deleteDishId");
  $A.deleteDishName     = $("#deleteDishName");
  $A.confirmDeleteBtn   = $("#confirmDeleteBtn");
  $A.confirmDeleteText  = $("#confirmDeleteText");

  // System
  $A.adminAlertContainer = $("#adminAlertContainer");
  $A.apiStatusDot        = $("#apiStatusDot");
  $A.apiStatusText       = $("#apiStatusText");
}

// ================================================================
// PHẦN 3: GẮNG SỰ KIỆN (EVENT BINDING)
// ================================================================

/**
 * Gắn toàn bộ event listeners
 * @private
 */
function _bindAdminEvents() {

  // --- Nút "Thêm Món Mới" → Reset form về chế độ ADD ---
  $A.btnAddDish.on("click", function () {
    _setFormMode("add");
  });

  // --- Submit Form (Thêm / Sửa) ---
  $A.submitFormBtn.on("click", function () {
    _handleFormSubmit();
  });

  // Submit bằng phím Enter trong form (ngoại trừ textarea)
  $A.dishForm.on("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      _handleFormSubmit();
    }
  });

  // --- Xác nhận xóa ---
  $A.confirmDeleteBtn.on("click", function () {
    _handleConfirmDelete();
  });

  // --- Tìm kiếm trong bảng (debounce) ---
  $A.tableSearch.on(
    "input",
    FoodieUtils.debounce(function () {
      AdminState.tableSearchQuery = $(this).val().toLowerCase().trim();
      AdminState.currentPage = 1; // Reset về trang 1
      _applyTableFilters();
    }, 300)
  );

  // --- Filter trạng thái ---
  $A.tableStatusFilter.on("change", function () {
    AdminState.tableStatusFilter = $(this).val();
    AdminState.currentPage = 1;
    _applyTableFilters();
  });

  // --- Filter danh mục ---
  $A.tableCategoryFilter.on("change", function () {
    AdminState.tableCategoryFilter = $(this).val();
    AdminState.currentPage = 1;
    _applyTableFilters();
  });

  // --- Số hàng mỗi trang ---
  $A.rowsPerPage.on("change", function () {
    AdminState.rowsPerPage = parseInt($(this).val());
    AdminState.currentPage = 1;
    _renderTable(AdminState.filteredDishes);
  });

  // --- Sortable columns (event delegation) ---
  $(document).on("click", "[data-sort]", function () {
    const field = $(this).data("sort");
    if (AdminState.sortField === field) {
      AdminState.sortDir = AdminState.sortDir === "asc" ? "desc" : "asc";
    } else {
      AdminState.sortField = field;
      AdminState.sortDir = "asc";
    }
    _applyTableFilters();
    _updateSortIcons(field, AdminState.sortDir);
  });

  // --- Form field: Live validation (real-time feedback) ---
  $A.fieldName.on("input", function () {
    const val = $(this).val();
    $A.nameCharCount.text(`${val.length}/100`);
    if (val.trim().length >= 2) {
      _clearFieldError("fieldName");
      _setFieldValid("fieldName");
    }
  });

  $A.fieldPrice.on("input", function () {
    const val = parseFloat($(this).val());
    if (!isNaN(val) && val > 0) {
      _clearFieldError("fieldPrice");
      _setFieldValid("fieldPrice");
      $A.pricePreview.text(`= ${FoodieUtils.formatCurrency(val)}`);
    } else {
      $A.pricePreview.text("");
    }
  });

  $A.fieldCategory.on("change", function () {
    if ($(this).val()) {
      _clearFieldError("fieldCategory");
      _setFieldValid("fieldCategory");
    }
  });

  $A.fieldImage.on("input", function () {
    const val = $(this).val().trim();
    if (!val || _isValidImageUrl(val)) {
      _clearFieldError("fieldImage");
      if (val) _setFieldValid("fieldImage");
      // Ẩn preview cũ khi URL thay đổi
      $A.imagePreviewWrap.hide();
    }
  });

  $A.fieldDescription.on("input", function () {
    $A.descCharCount.text(`${$(this).val().length}/500`);
  });

  // --- Toggle switch: Cập nhật label trạng thái ---
  $A.fieldIsAvailable.on("change", function () {
    _updateStatusToggleUI($(this).is(":checked"));
  });

  // --- Preview ảnh khi click nút xem trước ---
  $A.previewImageBtn.on("click", function () {
    const url = $A.fieldImage.val().trim();
    if (!url) {
      FoodieUtils.showToast("Vui lòng nhập URL ảnh trước.", "warning");
      return;
    }
    if (!_isValidImageUrl(url)) {
      FoodieUtils.showToast("URL ảnh không hợp lệ.", "error");
      return;
    }
    $A.imagePreviewImg.attr("src", url);
    $A.imagePreviewWrap.show();
  });

  // --- Reset form khi đóng modal ---
  $A.dishFormModal.on("hidden.bs.modal", function () {
    _resetForm();
    FoodieUtils.clearAlerts("#formAlertContainer");
  });

  // --- Sidebar toggle responsive ---
  // (Được xử lý trong _initSidebarToggle)
}

// ================================================================
// PHẦN 4: TẢI DỮ LIỆU
// ================================================================

/**
 * Tải đồng thời danh mục và món ăn khi trang admin khởi động
 * @private
 */
async function _loadAdminData() {
  _setApiStatus("loading");

  try {
    const [dishes, categories] = await Promise.all([
      FoodieAPI.getDishes(),
      FoodieAPI.getCategories(),
    ]);

    AdminState.allDishes      = dishes;
    AdminState.allCategories  = categories;
    AdminState.filteredDishes = [...dishes];

    // Cập nhật UI
    _renderCategoryOptions(categories);
    _updateStats(dishes, categories);
    _applyTableFilters(); // Render bảng qua pipeline filter

    _setApiStatus("online");
    console.log(
      `%c✅ Admin: Đã tải ${dishes.length} món, ${categories.length} danh mục`,
      "color: #38a169; font-weight: bold;"
    );

  } catch (error) {
    console.error("[Admin] Lỗi tải dữ liệu:", error);
    _setApiStatus("offline");

    FoodieUtils.showAlert(
      `<strong>Lỗi kết nối API:</strong> ${error.message}
       <br><button class="btn btn-sm btn-danger mt-2" onclick="_loadAdminData()">
         <i class="bi bi-arrow-clockwise me-1"></i>Thử lại
       </button>`,
      "error",
      "#adminAlertContainer",
      false,
      0
    );

    // Ẩn skeleton, hiện bảng rỗng
    $A.dishTableBody.html(`
      <tr>
        <td colspan="7">
          <div class="table-empty">
            <i class="bi bi-wifi-off table-empty-icon" aria-hidden="true"></i>
            <div class="fw-semibold">Không thể tải dữ liệu</div>
            <small>${error.message}</small>
          </div>
        </td>
      </tr>
    `);
    $A.tableInfo.text("Lỗi tải dữ liệu");
  }
}

// ================================================================
// PHẦN 5: RENDER BẢNG (TABLE)
// ================================================================

/**
 * Pipeline: Filter → Sort → Render bảng
 * Gọi khi bất kỳ filter/sort/search nào thay đổi
 * @private
 */
function _applyTableFilters() {
  let result = [...AdminState.allDishes];

  // --- Bước 1: Filter theo từ khóa ---
  if (AdminState.tableSearchQuery) {
    const q = AdminState.tableSearchQuery;
    result = result.filter((dish) => {
      const name = (dish.name || "").toLowerCase();
      const desc = (dish.description || "").toLowerCase();
      const id   = String(dish.id || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || id.includes(q);
    });
  }

  // --- Bước 2: Filter theo trạng thái ---
  if (AdminState.tableStatusFilter !== "all") {
    result = result.filter((dish) => {
      const avail = _getAvailability(dish);
      return AdminState.tableStatusFilter === "available" ? avail : !avail;
    });
  }

  // --- Bước 3: Filter theo danh mục ---
  if (AdminState.tableCategoryFilter !== "all") {
    result = result.filter(
      (dish) => String(dish.categoryId) === AdminState.tableCategoryFilter
    );
  }

  // --- Bước 4: Sort ---
  if (AdminState.sortField) {
    result = _sortTableData(result, AdminState.sortField, AdminState.sortDir);
  }

  AdminState.filteredDishes = result;

  // --- Bước 5: Render ---
  _renderTable(result);
}

/**
 * Render dữ liệu vào bảng HTML có hỗ trợ phân trang
 * @param {Array} dishes - Mảng món ăn cần render
 * @private
 */
function _renderTable(dishes) {
  const total       = dishes.length;
  const rowsPerPage = AdminState.rowsPerPage;
  const totalPages  = Math.max(1, Math.ceil(total / rowsPerPage));

  // Clamp trang hiện tại
  AdminState.currentPage = Math.min(AdminState.currentPage, totalPages);
  const page = AdminState.currentPage;

  // Slice data cho trang hiện tại
  const startIdx  = (page - 1) * rowsPerPage;
  const endIdx    = Math.min(startIdx + rowsPerPage, total);
  const pageData  = dishes.slice(startIdx, endIdx);

  // Cập nhật thông tin bảng
  $A.tableInfo.text(
    total === 0
      ? "Không có kết quả nào"
      : `Hiển thị ${startIdx + 1}–${endIdx} / ${total} món ăn`
  );

  // Trường hợp không có dữ liệu
  if (pageData.length === 0) {
    $A.dishTableBody.html(`
      <tr>
        <td colspan="7">
          <div class="table-empty">
            <i class="bi bi-search table-empty-icon" aria-hidden="true"></i>
            <div class="fw-semibold">Không tìm thấy món ăn nào</div>
            <small class="text-muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</small>
          </div>
        </td>
      </tr>
    `);
    return;
  }

  // Build tất cả rows HTML
  const rowsHtml = pageData.map((dish) => _buildTableRow(dish)).join("");
  $A.dishTableBody.html(rowsHtml);

  // Fade in animation
  $A.dishTableBody.find("tr").each(function (i) {
    const $tr = $(this);
    $tr.css({ opacity: 0 });
    setTimeout(() => {
      $tr.css({ transition: "opacity 0.2s ease", opacity: 1 });
    }, i * 30);
  });
}

/**
 * Tạo HTML cho một hàng (row) trong bảng Admin
 * @param {object} dish - Object món ăn
 * @returns {string} HTML string của <tr>
 * @private
 */
function _buildTableRow(dish) {
  const isAvailable = _getAvailability(dish);
  const categoryName = _getAdminCategoryName(dish.categoryId);
  const price        = FoodieUtils.formatCurrency(dish.price || 0);
  const imageUrl     = FoodieUtils.getImageOrPlaceholder(
    dish.image || dish.imageUrl || "",
    dish.name,
    "52x52"
  );

  // Escape dữ liệu để tránh XSS
  const safeName = _escapeHtml(dish.name || "Chưa đặt tên");
  const safeId   = _escapeHtml(String(dish.id || ""));
  const safeCat  = _escapeHtml(categoryName);

  // Encode data cho data attribute (tránh lỗi ký tự đặc biệt)
  const encodedName = encodeURIComponent(dish.name || "");

  const statusBadge = isAvailable
    ? `<span class="status-badge available" aria-label="Còn phục vụ">Còn món</span>`
    : `<span class="status-badge soldout" aria-label="Hết món">Hết món</span>`;

  return `
    <tr data-dish-id="${safeId}">
      <!-- ID -->
      <td>
        <span class="id-cell" title="${safeId}">#${safeId}</span>
      </td>

      <!-- Ảnh thumbnail -->
      <td>
        <img
          class="dish-thumb"
          src="${_escapeHtml(imageUrl)}"
          alt="Ảnh ${safeName}"
          loading="lazy"
          onerror="this.src='https://placehold.co/52x52/e2e8f0/718096?text=?'"
        />
      </td>

      <!-- Tên -->
      <td>
        <div class="dish-name-cell" title="${safeName}">${safeName}</div>
        ${dish.description
          ? `<div class="text-muted mt-1" style="font-size:0.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">
               ${_escapeHtml(FoodieUtils.truncateText(dish.description, 50))}
             </div>`
          : ''}
      </td>

      <!-- Danh mục -->
      <td>
        <span
          class="badge rounded-pill px-2 py-1"
          style="background:rgba(255,107,53,0.1);color:var(--foodie-primary);
                 font-size:0.72rem;font-weight:600;"
        >${safeCat}</span>
      </td>

      <!-- Giá -->
      <td>
        <span class="fw-semibold" style="color:var(--foodie-primary);">${price}</span>
      </td>

      <!-- Trạng thái -->
      <td>${statusBadge}</td>

      <!-- Hành động -->
      <td>
        <div class="d-flex align-items-center justify-content-center gap-1">
          <!-- Nút Sửa -->
          <button
            type="button"
            class="action-btn action-btn-edit btn-edit-dish"
            data-dish-id="${safeId}"
            title="Sửa món ăn"
            aria-label="Sửa món ${safeName}"
          >
            <i class="bi bi-pencil-fill" aria-hidden="true"></i>
          </button>

          <!-- Nút Xóa -->
          <button
            type="button"
            class="action-btn action-btn-delete btn-delete-dish"
            data-dish-id="${safeId}"
            data-dish-name="${encodedName}"
            title="Xóa món ăn"
            aria-label="Xóa món ${safeName}"
          >
            <i class="bi bi-trash3-fill" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ================================================================
// PHẦN 6: CHỨC NĂNG THÊM / SỬA MÓN ĂN (CREATE & UPDATE)
// ================================================================

/**
 * Xử lý submit form (dùng chung cho Add và Edit)
 * Validate trước → Gọi API → Cập nhật UI
 * @private
 */
async function _handleFormSubmit() {
  // 1. Thu thập dữ liệu từ form
  const formData = _collectFormData();

  // 2. Validate phía client trước khi gửi API
  const validation = _validateForm(formData);
  if (!validation.isValid) {
    // Hiển thị lỗi inline dưới các field
    _showFormErrors(validation.errors);
    // Cuộn lên field lỗi đầu tiên
    const firstErrorField = Object.keys(validation.errors)[0];
    if (firstErrorField) {
      document.getElementById(firstErrorField)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      $(`#${firstErrorField}`).trigger("focus");
    }
    FoodieUtils.showAlert(
      `Vui lòng kiểm tra lại <strong>${Object.keys(validation.errors).length} trường</strong> không hợp lệ.`,
      "warning",
      "#formAlertContainer",
      true,
      4000
    );
    return;
  }

  // 3. Chuẩn bị payload gửi lên API
  const payload = _buildApiPayload(formData);

  // 4. Disable nút + hiện loading
  FoodieUtils.setButtonLoading($A.submitFormBtn[0], true, "Đang lưu...");
  FoodieUtils.clearAlerts("#formAlertContainer");

  try {
    let savedDish;
    const isEditing = AdminState.currentMode === "edit";

    if (isEditing) {
      // === CẬP NHẬT (PUT) ===
      savedDish = await FoodieAPI.updateDish(AdminState.editingDishId, payload);
      FoodieUtils.showToast(
        `✅ Đã cập nhật món "<strong>${savedDish.name}</strong>" thành công!`,
        "success",
        3500
      );
      console.log(`[Admin] Đã sửa món ID=${AdminState.editingDishId}`, savedDish);
    } else {
      // === THÊM MỚI (POST) ===
      savedDish = await FoodieAPI.createDish(payload);
      FoodieUtils.showToast(
        `🎉 Đã thêm món "<strong>${savedDish.name}</strong>" thành công!`,
        "success",
        3500
      );
      console.log(`[Admin] Đã tạo món mới ID=${savedDish.id}`, savedDish);
    }

    // 5. Đóng modal
    bootstrap.Modal.getInstance($A.dishFormModal[0])?.hide();

    // 6. Tải lại toàn bộ dữ liệu để đảm bảo đồng bộ với API
    await _reloadDishesOnly();

  } catch (error) {
    console.error("[Admin] Lỗi lưu món ăn:", error);
    FoodieUtils.showAlert(
      `<strong>Lưu thất bại:</strong> ${error.message}`,
      "error",
      "#formAlertContainer",
      true,
      0
    );
  } finally {
    // Luôn restore nút dù thành công hay lỗi
    FoodieUtils.setButtonLoading($A.submitFormBtn[0], false);
    _restoreSubmitBtn();
  }
}

/**
 * Thu thập giá trị từ tất cả các field trong form
 * @returns {object} Object chứa dữ liệu form raw
 * @private
 */
function _collectFormData() {
  return {
    id:           $A.fieldDishId.val().trim(),
    name:         $A.fieldName.val().trim(),
    price:        $A.fieldPrice.val().trim(),
    categoryId:   $A.fieldCategory.val(),
    image:        $A.fieldImage.val().trim(),
    description:  $A.fieldDescription.val().trim(),
    isAvailable:  $A.fieldIsAvailable.is(":checked"),
  };
}

/**
 * Chuẩn hóa dữ liệu thành payload để gửi lên API
 * @param {object} formData - Dữ liệu raw từ form
 * @returns {object} Payload sạch và đúng kiểu dữ liệu
 * @private
 */
function _buildApiPayload(formData) {
  return {
    name:         formData.name,
    price:        parseFloat(formData.price),
    categoryId:   formData.categoryId,
    image:        formData.image || "",
    description:  formData.description || "",
    isAvailable:  Boolean(formData.isAvailable),
    updatedAt:    new Date().toISOString(),
  };
}

// ================================================================
// PHẦN 7: CHỨC NĂNG XÓA MÓN ĂN (DELETE)
// ================================================================

/**
 * Mở modal xác nhận xóa
 * Được gọi thông qua event delegation khi click nút Xóa trên bảng
 *
 * @param {string} dishId - ID món cần xóa
 * @param {string} dishName - Tên món (để hiển thị xác nhận)
 * @private
 */
function _openDeleteConfirm(dishId, dishName) {
  // Điền thông tin vào modal xác nhận
  $A.deleteDishId.val(dishId);
  $A.deleteDishName.text(`"${dishName}"`);

  // Mở modal
  const modal = new bootstrap.Modal($A.deleteConfirmModal[0]);
  modal.show();
}

/**
 * Xử lý xác nhận xóa: Gọi API DELETE và cập nhật bảng
 * @private
 */
async function _handleConfirmDelete() {
  const dishId   = $A.deleteDishId.val();
  const dishName = $A.deleteDishName.text().replace(/"/g, "");

  if (!dishId) {
    FoodieUtils.showToast("Không xác định được món cần xóa.", "error");
    return;
  }

  // Loading state trên nút xóa
  $A.confirmDeleteBtn.prop("disabled", true);
  $A.confirmDeleteText.text("Đang xóa...");
  $A.confirmDeleteBtn.prepend('<span class="spinner-border spinner-border-sm me-2"></span>');

  try {
    await FoodieAPI.deleteDish(dishId);

    // Đóng modal
    bootstrap.Modal.getInstance($A.deleteConfirmModal[0])?.hide();

    // Thông báo thành công
    FoodieUtils.showToast(
      `🗑️ Đã xóa món <strong>${_escapeHtml(dishName)}</strong> thành công!`,
      "success",
      3500
    );

    console.log(`[Admin] Đã xóa món ID=${dishId}`);

    // Tải lại bảng
    await _reloadDishesOnly();

  } catch (error) {
    console.error("[Admin] Lỗi xóa món:", error);
    FoodieUtils.showToast(`Xóa thất bại: ${error.message}`, "error", 5000);
  } finally {
    // Restore nút xóa
    $A.confirmDeleteBtn.prop("disabled", false);
    $A.confirmDeleteText.text("Xóa Ngay");
    $A.confirmDeleteBtn.find(".spinner-border").remove();
  }
}

// ================================================================
// PHẦN 8: EVENT DELEGATION CHO BẢNG (ĐỘNG)
// ================================================================

/**
 * Dùng event delegation để xử lý click trên các nút
 * trong table body (vì rows được render động)
 */
$(document).on("click", ".btn-edit-dish", function () {
  const dishId = $(this).data("dish-id");
  _openEditForm(dishId);
});

$(document).on("click", ".btn-delete-dish", function () {
  const dishId   = $(this).data("dish-id");
  const dishName = decodeURIComponent($(this).data("dish-name") || "");
  _openDeleteConfirm(dishId, dishName);
});

// ================================================================
// PHẦN 9: QUẢN LÝ FORM (MODE ADD / EDIT)
// ================================================================

/**
 * Đặt form về chế độ ADD (thêm mới)
 * @private
 */
function _setFormMode(mode) {
  AdminState.currentMode = mode;

  if (mode === "add") {
    AdminState.editingDishId = null;
    $A.modalFormTitle.text("Thêm Món Ăn Mới");
    $A.modalFormIcon.attr("class", "bi bi-plus-circle me-2");
    $A.submitBtnIcon.attr("class", "bi bi-check-lg me-1");
    $A.submitBtnText.text("Lưu Món Ăn");
    _resetForm();
  }
}

/**
 * Mở form ở chế độ EDIT với dữ liệu món ăn hiện có
 * @param {string} dishId - ID món ăn cần sửa
 * @private
 */
async function _openEditForm(dishId) {
  AdminState.currentMode = "edit";
  AdminState.editingDishId = dishId;

  // Cập nhật tiêu đề modal
  $A.modalFormTitle.text("Sửa Thông Tin Món Ăn");
  $A.modalFormIcon.attr("class", "bi bi-pencil-square me-2");
  $A.submitBtnIcon.attr("class", "bi bi-save me-1");
  $A.submitBtnText.text("Cập Nhật");

  // Mở modal (hiện spinner)
  const bsModal = new bootstrap.Modal($A.dishFormModal[0]);
  bsModal.show();

  // Disable form trong khi đang tải
  $A.dishForm.find("input, select, textarea").prop("disabled", true);
  $A.submitFormBtn.prop("disabled", true);

  try {
    // Ưu tiên lấy từ state (cache) trước, nếu không thì gọi API
    let dish = AdminState.allDishes.find((d) => String(d.id) === String(dishId));
    if (!dish) {
      dish = await FoodieAPI.getDishById(dishId);
    }

    // Điền dữ liệu vào form
    _populateForm(dish);

  } catch (error) {
    console.error("[Admin] Lỗi tải chi tiết món:", error);
    FoodieUtils.showAlert(
      `Không thể tải thông tin món ăn: ${error.message}`,
      "error",
      "#formAlertContainer",
      true,
      0
    );
  } finally {
    // Luôn enable lại form
    $A.dishForm.find("input, select, textarea").prop("disabled", false);
    $A.submitFormBtn.prop("disabled", false);
  }
}

/**
 * Điền dữ liệu món ăn vào tất cả các field của form
 * @param {object} dish - Object món ăn từ API
 * @private
 */
function _populateForm(dish) {
  $A.fieldDishId.val(dish.id || "");
  $A.fieldName.val(dish.name || "");
  $A.fieldPrice.val(dish.price || "");
  $A.fieldCategory.val(dish.categoryId || "");
  $A.fieldImage.val(dish.image || dish.imageUrl || "");
  $A.fieldDescription.val(dish.description || "");

  const isAvail = _getAvailability(dish);
  $A.fieldIsAvailable.prop("checked", isAvail);

  // Cập nhật các UI helpers
  $A.nameCharCount.text(`${(dish.name || "").length}/100`);
  $A.descCharCount.text(`${(dish.description || "").length}/500`);

  if (dish.price) {
    $A.pricePreview.text(`= ${FoodieUtils.formatCurrency(dish.price)}`);
  }

  _updateStatusToggleUI(isAvail);

  // Hiện preview ảnh nếu có URL
  const imgUrl = dish.image || dish.imageUrl || "";
  if (imgUrl && _isValidImageUrl(imgUrl)) {
    $A.imagePreviewImg.attr("src", imgUrl);
    $A.imagePreviewWrap.show();
  }
}

/**
 * Reset form về trạng thái ban đầu
 * @private
 */
function _resetForm() {
  $A.dishForm[0].reset();
  $A.fieldDishId.val("");

  // Reset UI helpers
  $A.nameCharCount.text("0/100");
  $A.descCharCount.text("0/500");
  $A.pricePreview.text("");
  $A.imagePreviewWrap.hide();
  $A.imagePreviewImg.attr("src", "");
  $A.fieldIsAvailable.prop("checked", true);
  _updateStatusToggleUI(true);

  // Xóa toàn bộ lỗi validation
  _clearAllErrors();

  // Reset state
  AdminState.currentMode = "add";
  AdminState.editingDishId = null;
}

/**
 * Restore nút submit về trạng thái gốc sau khi loading
 * @private
 */
function _restoreSubmitBtn() {
  const isEdit = AdminState.currentMode === "edit";
  $A.submitBtnIcon.attr("class", isEdit ? "bi bi-save me-1" : "bi bi-check-lg me-1");
  $A.submitBtnText.text(isEdit ? "Cập Nhật" : "Lưu Món Ăn");
  $A.submitFormBtn.prop("disabled", false);
}

// ================================================================
// PHẦN 10: FORM VALIDATION (VANILLA JS)
// ================================================================

/**
 * Validate toàn bộ dữ liệu form trước khi submit
 * Sử dụng Vanilla JS thuần (không dùng jQuery validate plugin)
 *
 * @param {object} data - Dữ liệu từ _collectFormData()
 * @returns {{ isValid: boolean, errors: object }} Kết quả validate
 */
function _validateForm(data) {
  const errors = {};

  // --- Validate Tên món ---
  if (!data.name) {
    errors["fieldName"] = "Tên món ăn không được để trống.";
  } else if (data.name.length < 2) {
    errors["fieldName"] = "Tên món ăn phải có ít nhất 2 ký tự.";
  } else if (data.name.length > 100) {
    errors["fieldName"] = "Tên món ăn không được vượt quá 100 ký tự.";
  }

  // --- Validate Giá tiền ---
  if (!data.price && data.price !== "0") {
    errors["fieldPrice"] = "Vui lòng nhập giá tiền.";
  } else {
    const priceNum = parseFloat(data.price);
    if (isNaN(priceNum)) {
      errors["fieldPrice"] = "Giá tiền phải là một số hợp lệ.";
    } else if (priceNum <= 0) {
      errors["fieldPrice"] = "Giá tiền phải lớn hơn 0 VNĐ.";
    } else if (priceNum > 100_000_000) {
      errors["fieldPrice"] = "Giá tiền không được vượt quá 100.000.000 VNĐ.";
    }
  }

  // --- Validate Danh mục ---
  if (!data.categoryId) {
    errors["fieldCategory"] = "Vui lòng chọn danh mục cho món ăn.";
  }

  // --- Validate URL Ảnh (chỉ khi có nhập) ---
  if (data.image && !_isValidImageUrl(data.image)) {
    errors["fieldImage"] =
      "URL ảnh không hợp lệ. Phải là URL đầy đủ (https://...) và kết thúc bằng .jpg, .jpeg, .png, .gif, .webp hoặc từ các domain ảnh phổ biến.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Hiển thị lỗi inline dưới từng field
 * @param {object} errors - Object { fieldId: "error message" }
 * @private
 */
function _showFormErrors(errors) {
  // Xóa lỗi cũ trước
  _clearAllErrors();

  Object.entries(errors).forEach(([fieldId, message]) => {
    // Thêm class invalid vào input
    const $field = $(`#${fieldId}`);
    $field.addClass("field-invalid").removeClass("field-valid");

    // Tìm error div tương ứng (convention: #error + FieldId bỏ "field")
    const errorId = "error" + fieldId.charAt(5).toUpperCase() + fieldId.slice(6);
    const $errorEl = $(`#${errorId}`);

    if ($errorEl.length) {
      $errorEl.find(".error-msg").text(message);
      $errorEl.addClass("visible");
    }
  });
}

/**
 * Xóa lỗi của một field cụ thể
 * @param {string} fieldId - ID của field cần xóa lỗi
 * @private
 */
function _clearFieldError(fieldId) {
  $(`#${fieldId}`).removeClass("field-invalid");
  const errorId = "error" + fieldId.charAt(5).toUpperCase() + fieldId.slice(6);
  $(`#${errorId}`).removeClass("visible").find(".error-msg").text("");
}

/**
 * Đánh dấu field là hợp lệ
 * @param {string} fieldId
 * @private
 */
function _setFieldValid(fieldId) {
  $(`#${fieldId}`).addClass("field-valid").removeClass("field-invalid");
}

/**
 * Xóa toàn bộ lỗi validation trong form
 * @private
 */
function _clearAllErrors() {
  $A.dishForm.find(".field-invalid, .field-valid")
    .removeClass("field-invalid field-valid");

  $A.dishForm.find(".field-error")
    .removeClass("visible")
    .find(".error-msg")
    .text("");
}

/**
 * Kiểm tra URL ảnh có hợp lệ không
 * Hỗ trợ: URL đầy đủ với các đuôi ảnh phổ biến,
 *          hoặc URL từ các domain ảnh/placeholder nổi tiếng
 *
 * @param {string} url - URL cần kiểm tra
 * @returns {boolean} true nếu hợp lệ
 */
function _isValidImageUrl(url) {
  if (!url) return true; // URL rỗng = hợp lệ (tùy chọn)
  if (typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol;

    // Phải là HTTP hoặc HTTPS
    if (protocol !== "http:" && protocol !== "https:") return false;

    // Kiểm tra đuôi file ảnh phổ biến
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|tiff)(\?.*)?$/i;
    if (imageExtensions.test(parsed.pathname)) return true;

    // Cho phép URL từ các domain ảnh/CDN phổ biến (không cần đuôi file)
    const trustedDomains = [
      "placehold.co", "placeholder.com", "picsum.photos",
      "unsplash.com", "images.unsplash.com",
      "cloudinary.com", "res.cloudinary.com",
      "imgur.com", "i.imgur.com",
      "googleusercontent.com", "lh3.googleusercontent.com",
      "cdn.jsdelivr.net", "raw.githubusercontent.com",
      "mockapi.io",
    ];

    const hostname = parsed.hostname.toLowerCase();
    if (trustedDomains.some((domain) => hostname.includes(domain))) return true;

    // Các URL có path chứa /image/ hoặc /img/ hoặc /photo/
    if (/\/(image|img|photo|picture|thumbnail)\//i.test(parsed.pathname)) return true;

    // Nếu không match gì nhưng là URL hợp lệ → cảnh báo nhưng vẫn cho phép
    // (Một số API trả về URL không có đuôi file)
    return true;

  } catch {
    // URL không parse được
    return false;
  }
}

// ================================================================
// PHẦN 11: CÁC HÀM HỖ TRỢ UI
// ================================================================

/**
 * Render options danh mục vào tất cả các <select> trong trang
 * @param {Array} categories - Mảng danh mục
 * @private
 */
function _renderCategoryOptions(categories) {
  const optionsHtml = categories
    .map((cat) => `<option value="${_escapeHtml(String(cat.id))}">${_escapeHtml(cat.name)}</option>`)
    .join("");

  // Select trong form modal
  $A.fieldCategory.find("option:not(:first-child)").remove();
  $A.fieldCategory.append(optionsHtml);

  // Select filter trong toolbar bảng
  $A.tableCategoryFilter.find("option:not(:first-child)").remove();
  $A.tableCategoryFilter.append(optionsHtml);
}

/**
 * Cập nhật thống kê các stat cards
 * @param {Array} dishes
 * @param {Array} categories
 * @private
 */
function _updateStats(dishes, categories) {
  const total     = dishes.length;
  const available = dishes.filter(_getAvailability).length;
  const soldout   = total - available;

  $A.statTotalDishes.text(total);
  $A.statAvailable.text(available);
  $A.statSoldout.text(soldout);
  $A.statCategories.text(categories.length);
  $A.sidebarDishCount.text(total);
}

/**
 * Cập nhật UI toggle trạng thái
 * @param {boolean} isAvailable
 * @private
 */
function _updateStatusToggleUI(isAvailable) {
  if (isAvailable) {
    $A.statusToggleLabel.html('<span class="text-success fw-semibold">Còn món</span>');
    $A.statusDescription.text("Món ăn hiện đang được phục vụ cho khách");
  } else {
    $A.statusToggleLabel.html('<span class="text-danger fw-semibold">Hết món</span>');
    $A.statusDescription.text("Món ăn tạm thời không được phục vụ");
  }
}

/**
 * Cập nhật icon sort trên header bảng
 * @param {string} field - Field đang sort
 * @param {string} dir - "asc" | "desc"
 * @private
 */
function _updateSortIcons(field, dir) {
  // Reset tất cả icon
  $("[data-sort] i").attr("class", "bi bi-chevron-expand").css("font-size", "0.6rem");
  // Cập nhật icon của field đang sort
  $(`[data-sort="${field}"] i`).attr("class", dir === "asc"
    ? "bi bi-chevron-up"
    : "bi bi-chevron-down"
  ).css("font-size", "0.75rem");
}

/**
 * Sắp xếp dữ liệu bảng
 * @param {Array} data
 * @param {string} field
 * @param {string} dir
 * @returns {Array}
 * @private
 */
function _sortTableData(data, field, dir) {
  return [...data].sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    if (field === "price") {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return dir === "asc" ? valA - valB : valB - valA;
    }

    // String sort
    valA = String(valA || "").toLowerCase();
    valB = String(valB || "").toLowerCase();
    const cmp = valA.localeCompare(valB, "vi", { sensitivity: "base" });
    return dir === "asc" ? cmp : -cmp;
  });
}

/**
 * Tải lại chỉ dữ liệu dishes (không reload toàn bộ)
 * Dùng sau khi Add/Edit/Delete để cập nhật bảng
 * @private
 */
async function _reloadDishesOnly() {
  try {
    const dishes = await FoodieAPI.getDishes();
    AdminState.allDishes = dishes;
    _updateStats(dishes, AdminState.allCategories);
    _applyTableFilters(); // Re-apply toàn bộ filter
  } catch (error) {
    console.error("[Admin] Lỗi tải lại danh sách:", error);
    FoodieUtils.showToast("Không thể tải lại dữ liệu. Vui lòng F5.", "warning", 5000);
  }
}

/**
 * Lấy tên danh mục theo ID (dùng trong Admin)
 * @param {string|number} categoryId
 * @returns {string}
 * @private
 */
function _getAdminCategoryName(categoryId) {
  if (!categoryId) return "Chưa phân loại";
  const cat = AdminState.allCategories.find(
    (c) => String(c.id) === String(categoryId)
  );
  return cat ? cat.name : "Chưa phân loại";
}

/**
 * Kiểm tra trạng thái phục vụ của món ăn
 * (Hỗ trợ nhiều field name từ MockAPI)
 * @param {object} dish
 * @returns {boolean}
 */
function _getAvailability(dish) {
  if (dish.isAvailable !== undefined) return Boolean(dish.isAvailable);
  if (dish.available   !== undefined) return Boolean(dish.available);
  if (dish.status      !== undefined) {
    if (typeof dish.status === "string") {
      return ["available", "active", "true"].includes(dish.status.toLowerCase());
    }
    return Boolean(dish.status);
  }
  if (dish.inStock !== undefined) return Boolean(dish.inStock);
  if (dish.stock   !== undefined) return Number(dish.stock) > 0;
  return true; // Mặc định: còn phục vụ
}

/**
 * Cập nhật indicator trạng thái API (góc trên phải)
 * @param {"loading"|"online"|"offline"} status
 * @private
 */
function _setApiStatus(status) {
  const configs = {
    loading: { color: "#d69e2e", text: "Đang kết nối..." },
    online:  { color: "#38a169", text: "API Online"       },
    offline: { color: "#e53e3e", text: "Mất kết nối"      },
  };
  const cfg = configs[status] || configs.offline;
  $A.apiStatusDot.css("background", cfg.color);
  $A.apiStatusText.text(cfg.text);
}

/**
 * Khởi tạo chức năng toggle sidebar
 * @private
 */
function _initSidebarToggle() {
  const $sidebar = $("#adminSidebar");
  const $toggle  = $("#sidebarToggle");
  let isMobile   = window.innerWidth < 768;

  $toggle.on("click", function () {
    if (isMobile) {
      $sidebar.toggleClass("mobile-open");
    } else {
      $sidebar.toggleClass("collapsed");
    }
  });

  // Đóng sidebar khi click ngoài (mobile)
  $(document).on("click", function (e) {
    if (isMobile
      && $sidebar.hasClass("mobile-open")
      && !$sidebar.is(e.target)
      && $sidebar.has(e.target).length === 0
      && !$toggle.is(e.target)
      && $toggle.has(e.target).length === 0
    ) {
      $sidebar.removeClass("mobile-open");
    }
  });

  // Cập nhật khi resize
  $(window).on("resize", FoodieUtils.debounce(function () {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 768;
    if (wasMobile !== isMobile) {
      $sidebar.removeClass("collapsed mobile-open");
    }
  }, 200));
}

/**
 * Escape HTML để tránh XSS
 * @param {string} str
 * @returns {string}
 * @private
 */
function _escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}