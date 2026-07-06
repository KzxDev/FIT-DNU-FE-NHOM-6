/**
 * ============================================================
 * FILE: js/main.js
 * MÔ TẢ: Logic chính của trang khách hàng FoodieMenu
 *        (ĐÃ ĐỒNG BỘ 100% VỚI GIAO DIỆN HTML MỚI)
 * ============================================================
 */

"use strict";

const AppState = {
  allDishes: [],
  allCategories: [],
  filteredDishes: [],
  currentCategoryId: "all",
  currentSearchQuery: "",
  currentSort: "default",
};

const $el = {};

$(document).ready(function () {
  _initSelectors();
  _bindEvents();
  _loadInitialData();
});

function _initSelectors() {
  // KHỚP VỚI HTML MỚI
  $el.dishesContainer   = $("#dishesContainer");
  $el.categoryList      = $("#categoryList");
  $el.searchInput       = $("#searchMenu");
  $el.totalDishes       = $("#totalDishes");
  $el.sortPrice         = $("#sortPrice");
  
  // Stats ở Hero
  $el.heroTotalDishes   = $("#totalDishes"); // Hero dùng chung id này trong HTML mới

  // Modal selectors (Khớp HTML mới)
  $el.dishDetailModal   = $("#dishDetailModal");
  $el.modalDishImage    = $("#modalDishImg");
  $el.modalDishCategory = $("#modalDishCategory");
  $el.modalDishName     = $("#modalDishName");
  $el.modalDishPrice    = $("#modalDishPrice");
  $el.modalDishDesc     = $("#modalDishDesc");
  $el.modalDishStatus   = $("#modalDishStatus");
}

function _bindEvents() {
  // Tìm kiếm
  $el.searchInput.on(
    "input",
    FoodieUtils.debounce(function () {
      const query = $(this).val().trim();
      _handleSearch(query);
    }, 400)
  );

  // Sắp xếp giá
  $el.sortPrice.on("change", function () {
    const sortValue = $(this).val();
    _handleSort(sortValue);
  });

  // Event Delegation: Mở modal khi bấm vào card hoặc nút Xem chi tiết
  $(document).on("click", ".dish-card-wrapper, .btn-dish-detail", function (e) {
    e.preventDefault();
    const dishId = $(this).closest("[data-dish-id]").data("dish-id");
    if (dishId) {
      _openDishDetailModal(dishId);
    }
  });
}

async function _loadInitialData() {
  // Hiển thị vòng xoay loading tĩnh của HTML
  $el.dishesContainer.html(`
    <div class="fm-loading-state" role="status" aria-label="Đang tải...">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p style="font-size:0.95rem; font-weight:500; color:#94a3b8;">
        Đang tải thực đơn...
      </p>
    </div>
  `);

  try {
    const [dishes, categories] = await Promise.all([
      FoodieAPI.getDishes(),
      FoodieAPI.getCategories(),
    ]);

    AppState.allDishes = dishes;
    AppState.allCategories = categories;
    AppState.filteredDishes = [...dishes];

    _renderCategories(categories, dishes);
    _applyFiltersAndRender(); // Gọi hàm render thay vì render trực tiếp

  } catch (error) {
    $el.dishesContainer.html(`
      <div class="fm-empty-state">
        <div class="empty-icon">⚠️</div>
        <h4 style="color:#1a1a2e;">Lỗi tải dữ liệu</h4>
        <p style="color:#718096;">Không thể kết nối đến máy chủ. Vui lòng thử lại sau.</p>
      </div>
    `);
  }
}

function _renderCategories(categories, dishes) {
  // Đếm món
  const dishCountByCategory = {};
  dishes.forEach((dish) => {
    const catId = dish.categoryId !== undefined && dish.categoryId !== null ? String(dish.categoryId) : "";
    if (catId) {
      dishCountByCategory[catId] = (dishCountByCategory[catId] || 0) + 1;
    }
  });

  $el.categoryList.empty();

  // Nút "Tất cả"
  $el.categoryList.append(`
    <button class="btn-category active" data-category-id="all">
      <i class="bi bi-grid-fill"></i>
      <span>Tất Cả Món Ăn</span>
      <span class="badge bg-secondary rounded-pill ms-1">${dishes.length}</span>
    </button>
  `);

  // Render các danh mục
  const categoryButtonsHtml = categories
    .map((cat) => {
      const catIdStr = String(cat.id);
      const count = dishCountByCategory[catIdStr] || 0;
      const icon  = cat.icon || "bi bi-tag";
      return `
        <button class="btn-category" data-category-id="${_escapeHtml(catIdStr)}">
          <i class="${_escapeHtml(icon)}"></i>
          <span>${_escapeHtml(cat.name)}</span>
          <span class="badge bg-secondary rounded-pill ms-1">${count}</span>
        </button>
      `;
    })
    .join("");

  $el.categoryList.append(categoryButtonsHtml);

  // Gắn sự kiện click
  $el.categoryList.on("click", ".btn-category", function () {
    const categoryId = String($(this).data("category-id"));
    
    // Đổi màu nút active
    $el.categoryList.find(".btn-category").removeClass("active");
    $(this).addClass("active");

    AppState.currentCategoryId = categoryId;
    _applyFiltersAndRender();
  });
}

function _handleSearch(query) {
  AppState.currentSearchQuery = query.toLowerCase();
  _applyFiltersAndRender();
}

function _handleSort(sortValue) {
  AppState.currentSort = sortValue;
  _applyFiltersAndRender();
}

function _applyFiltersAndRender() {
  let result = [...AppState.allDishes];

  // 1. Lọc danh mục
  if (AppState.currentCategoryId !== "all") {
    result = result.filter(
      (dish) => String(dish.categoryId) === AppState.currentCategoryId
    );
  }

  // 2. Lọc tìm kiếm
  if (AppState.currentSearchQuery) {
    const q = AppState.currentSearchQuery;
    result = result.filter((dish) => {
      const name = (dish.name || "").toLowerCase();
      return name.includes(q);
    });
  }

  // 3. Sắp xếp (Dựa trên value thẻ option của HTML mới: asc, desc)
  if (AppState.currentSort === "asc") {
    result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (AppState.currentSort === "desc") {
    result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }

  AppState.filteredDishes = result;
  
  // Cập nhật số đếm
  $el.totalDishes.text(result.length);
  
  _renderDishes(result);
}

function _renderDishes(dishes) {
  $el.dishesContainer.empty();

  if (dishes.length === 0) {
    $el.dishesContainer.html(`
      <div class="fm-empty-state">
        <div class="empty-icon">🍽️</div>
        <h4 style="color:#1a1a2e;">Chưa có món ăn</h4>
        <p style="color:#718096;">Không tìm thấy món ăn nào phù hợp với tìm kiếm của bạn.</p>
      </div>
    `);
    // Chỉnh lại layout để hiển thị thông báo đẹp hơn
    $el.dishesContainer.css("display", "block");
    return;
  }
  
  // Reset grid
  $el.dishesContainer.css("display", "grid");

  const cardsHtml = dishes.map((dish) => {
    const isAvailable = _checkDishAvailability(dish);
    const dishId       = String(dish.id || "");
    const dishName     = _escapeHtml(dish.name || "Chưa có tên");
    const dishDesc     = _escapeHtml(dish.description || "Chưa có mô tả.");
    const dishPrice    = FoodieUtils.formatCurrency(dish.price || 0);
    const dishImage    = FoodieUtils.getImageOrPlaceholder(
      dish.image || dish.imageUrl, dish.name, "400x300"
    );
    const dishCategory = _escapeHtml(_getCategoryName(dish.categoryId) || "Chưa phân loại");

    // UI elements cho trạng thái
    const statusBadge = isAvailable 
      ? `<div class="dish-status-badge available">Đang bán</div>` 
      : `<div class="dish-status-badge unavailable">Hết món</div>`;
      
    const soldoutOverlay = isAvailable ? "" : `
      <div class="dish-soldout-overlay">
        <span>Hết Món</span>
      </div>
    `;

    return `
      <div class="dish-card-wrapper" data-dish-id="${dishId}">
        <div class="dish-img-wrap">
          <div class="dish-cat-label">${dishCategory}</div>
          ${statusBadge}
          <img src="${dishImage}" alt="${dishName}" loading="lazy" />
          ${soldoutOverlay}
        </div>
        <div class="dish-body">
          <h3 class="dish-name">${dishName}</h3>
          <p class="dish-desc">${dishDesc}</p>
          <div class="dish-footer">
            <div class="dish-price">${dishPrice}</div>
            <button class="btn-dish-detail" ${!isAvailable ? "disabled" : ""}>
              <i class="bi bi-eye"></i> Chi tiết
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  $el.dishesContainer.html(cardsHtml);
}

// Xử lý Modal (Khớp HTML mới)
async function _openDishDetailModal(dishId) {
  const bsModal = new bootstrap.Modal($el.dishDetailModal[0]);
  bsModal.show();

  try {
    const dish = await FoodieAPI.getDishById(dishId);
    if (!dish) throw new Error("Không tìm thấy thông tin món ăn.");

    const isAvailable  = _checkDishAvailability(dish);
    const categoryName = _getCategoryName(dish.categoryId) || "Chưa phân loại";

    $el.modalDishImage.attr("src", FoodieUtils.getImageOrPlaceholder(dish.image || dish.imageUrl, dish.name, "600x600"));
    $el.modalDishName.text(dish.name || "Chưa có tên");
    
    // HTML Mới: id="modalDishCategory" chứa icon và text
    $el.modalDishCategory.html(`<i class="bi bi-tag"></i> <span>${categoryName}</span>`);
    
    $el.modalDishPrice.text(FoodieUtils.formatCurrency(dish.price || 0));
    $el.modalDishDesc.text(dish.description || "Chưa có mô tả.");

    if (isAvailable) {
      $el.modalDishStatus.html(`<i class="bi bi-check-circle-fill text-success me-1"></i> <span class="text-success">Đang phục vụ</span>`);
    } else {
      $el.modalDishStatus.html(`<i class="bi bi-x-circle-fill text-danger me-1"></i> <span class="text-danger">Tạm hết món</span>`);
    }

  } catch (error) {
    console.error(error);
  }
}

// Helper functions (Giữ nguyên)
function _checkDishAvailability(dish) {
  if (dish.isAvailable !== undefined) return Boolean(dish.isAvailable);
  if (dish.status !== undefined) {
    return ["available", "active", "true"].includes(String(dish.status).toLowerCase());
  }
  return true;
}

function _getCategoryName(categoryId) {
  if (!categoryId) return "";
  const cat = AppState.allCategories.find((c) => String(c.id) === String(categoryId));
  return cat ? cat.name : "";
}

function _escapeHtml(str) {
  if (!str) return "";
  const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char]);
}