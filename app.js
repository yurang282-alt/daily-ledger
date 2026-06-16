const STORAGE_KEY = "daily-ledger-records-v1";
const CATEGORY_KEY = "daily-ledger-categories-v1";
const BUDGET_KEY = "daily-ledger-budget-v1";
const AUTH_STORAGE_KEY = "daily-ledger-supabase-auth";
const AUTH_INTERNAL_DOMAIN = "daily-ledger.local";
const LEDGER_EXPORT_SCHEMA_VERSION = 1;
const SUPABASE_SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

const DEFAULT_CATEGORIES = {
  expense: ["餐饮", "交通", "购物", "住房", "娱乐", "医疗", "学习", "其他"],
  income: ["工资", "副业", "投资", "红包", "其他"],
};

const CHART_COLORS = ["#315f9b", "#20785a", "#c17a19", "#7b5bb7", "#c7483c", "#4f7c86", "#9a6232", "#5d6d42"];

const localStore = createLocalStore();
let cloudStore = null;
let supabaseClient = null;
let noticeTimer = null;
let speechRecognition = null;

const state = {
  records: [],
  categories: structuredClone(DEFAULT_CATEGORIES),
  budget: 0,
  currentType: "expense",
  selectedMonth: toMonthValue(new Date()),
  editingId: null,
  mode: "local",
  user: null,
  pendingMigration: false,
  syncMessage: "",
  syncKind: "info",
  syncStatus: "local",
  mobileView: "home",
  chartView: "category",
};

const els = {
  modeLabel: document.querySelector("#modeLabel"),
  pageTitle: document.querySelector("#pageTitle"),
  cloudStatus: document.querySelector("#cloudStatus"),
  authPanel: document.querySelector("#authPanel"),
  authAccount: document.querySelector("#authAccount"),
  authPassword: document.querySelector("#authPassword"),
  passwordLogin: document.querySelector("#passwordLogin"),
  registerAccount: document.querySelector("#registerAccount"),
  savePassword: document.querySelector("#savePassword"),
  signOut: document.querySelector("#signOut"),
  syncNotice: document.querySelector("#syncNotice"),
  syncMessage: document.querySelector("#syncMessage"),
  migrateData: document.querySelector("#migrateData"),
  dismissMigration: document.querySelector("#dismissMigration"),
  monthPicker: document.querySelector("#monthPicker"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  budgetNotice: document.querySelector("#budgetNotice"),
  expenseTotal: document.querySelector("#expenseTotal"),
  budgetValue: document.querySelector("#budgetValue"),
  budgetProgress: document.querySelector("#budgetProgress"),
  budgetMeta: document.querySelector("#budgetMeta"),
  budgetRate: document.querySelector("#budgetRate"),
  spendingBudgetLabel: document.querySelector("#spendingBudgetLabel"),
  spendingBudgetProgress: document.querySelector("#spendingBudgetProgress"),
  spendingBudgetHint: document.querySelector("#spendingBudgetHint"),
  editBudget: document.querySelector("#editBudget"),
  editBudgetQuick: document.querySelector("#editBudgetQuick"),
  budgetDialog: document.querySelector("#budgetDialog"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetInput: document.querySelector("#budgetInput"),
  closeBudget: document.querySelector("#closeBudget"),
  entryForm: document.querySelector("#entryForm"),
  amountInput: document.querySelector("#amountInput"),
  categorySelect: document.querySelector("#categorySelect"),
  quickCategoryList: document.querySelector("#quickCategoryList"),
  showCategoryForm: document.querySelector("#showCategoryForm"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryNameInput: document.querySelector("#categoryNameInput"),
  addCategory: document.querySelector("#addCategory"),
  dateInput: document.querySelector("#dateInput"),
  noteInput: document.querySelector("#noteInput"),
  voiceInput: document.querySelector("#voiceInput"),
  voiceInputRow: document.querySelector("#voiceInputRow"),
  voiceLabel: document.querySelector("#voiceLabel"),
  saveButton: document.querySelector("#entryForm .primary-button"),
  recordCount: document.querySelector("#recordCount"),
  categoryHint: document.querySelector("#categoryHint"),
  categoryDonut: document.querySelector("#categoryDonut"),
  categoryLegend: document.querySelector("#categoryLegend"),
  dailyTrend: document.querySelector("#dailyTrend"),
  topCategoryInsight: document.querySelector("#topCategoryInsight"),
  avgDailyInsight: document.querySelector("#avgDailyInsight"),
  recordsList: document.querySelector("#recordsList"),
  homeRecordCount: document.querySelector("#homeRecordCount"),
  homeRecentList: document.querySelector("#homeRecentList"),
  mobileAddRecord: document.querySelector("#mobileAddRecord"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  importFile: document.querySelector("#importFile"),
  clearMonth: document.querySelector("#clearMonth"),
};

init();

async function init() {
  els.monthPicker.value = state.selectedMonth;
  els.dateInput.value = toDateValue(new Date());
  bindEvents();
  await loadInitialData();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-entry-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentType = button.dataset.entryType;
      state.editingId = null;
      els.saveButton.textContent = "保存";
      document.querySelectorAll("[data-entry-type]").forEach((item) => item.classList.toggle("is-active", item === button));
      populateCategories();
    });
  });

  document.querySelectorAll("[data-mobile-view], [data-mobile-view-target]").forEach((button) => {
    button.addEventListener("click", () => {
      switchMobileView(button.dataset.mobileView || button.dataset.mobileViewTarget);
    });
  });

  document.querySelectorAll("[data-chart-tab]").forEach((button) => {
    button.addEventListener("click", () => setChartView(button.dataset.chartTab));
  });

  els.cloudStatus.addEventListener("click", () => {
    document.body.classList.toggle("auth-open");
  });
  els.authPanel.addEventListener("submit", (event) => event.preventDefault());

  els.monthPicker.addEventListener("change", () => {
    state.selectedMonth = els.monthPicker.value || toMonthValue(new Date());
    render();
  });

  els.prevMonth.addEventListener("click", () => shiftMonth(-1));
  els.nextMonth.addEventListener("click", () => shiftMonth(1));

  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRecord();
  });

  els.showCategoryForm.addEventListener("click", () => {
    els.categoryForm.classList.toggle("is-hidden");
    if (!els.categoryForm.classList.contains("is-hidden")) {
      els.categoryNameInput.focus();
    }
  });

  els.addCategory.addEventListener("click", addCategory);
  els.categorySelect.addEventListener("change", () => renderQuickCategories(state.categories[state.currentType] || []));
  els.categoryNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCategory();
    }
  });

  const openBudgetDialog = () => {
    els.budgetInput.value = state.budget ? state.budget : "";
    if (typeof els.budgetDialog.showModal === "function") {
      els.budgetDialog.showModal();
    }
  };
  els.editBudget.addEventListener("click", openBudgetDialog);
  els.editBudgetQuick?.addEventListener("click", openBudgetDialog);

  els.closeBudget.addEventListener("click", () => els.budgetDialog.close());

  els.budgetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const snapshot = captureAppSnapshot();
    state.budget = Math.max(0, Number(els.budgetInput.value || 0));
    els.budgetDialog.close();
    render();
    const saved = await commitStoreChange(() => activeStore().saveBudget(state.budget), "预算已保存");
    if (!saved) restoreAppSnapshot(snapshot);
  });

  els.clearMonth.addEventListener("click", async () => {
    const monthRecords = getMonthRecords();
    if (!monthRecords.length) return;
    if (!confirm(`确定清空 ${state.selectedMonth} 的 ${monthRecords.length} 笔记录吗？`)) return;
    const snapshot = captureAppSnapshot();
    const month = state.selectedMonth;
    state.records = state.records.filter((record) => !record.date.startsWith(month));
    render();
    const saved = await commitStoreChange(() => activeStore().clearMonth(month), "本月记录已清空");
    if (!saved) restoreAppSnapshot(snapshot);
  });

  els.passwordLogin?.addEventListener("click", signInWithPassword);
  els.registerAccount?.addEventListener("click", registerWithPassword);
  els.savePassword?.addEventListener("click", updatePassword);
  els.authAccount?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    els.authPassword?.focus();
  });
  els.authPassword?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    state.user ? updatePassword() : signInWithPassword();
  });
  els.signOut.addEventListener("click", signOut);
  els.migrateData.addEventListener("click", migrateLocalData);
  els.dismissMigration.addEventListener("click", () => {
    state.pendingMigration = false;
    state.syncMessage = "";
    renderSyncNotice();
  });
  els.exportData.addEventListener("click", exportLedgerData);
  els.importData.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importLedgerData);
  els.voiceInput?.addEventListener("click", handleVoiceInput);
  els.voiceInputRow?.addEventListener("click", handleVoiceInput);
  els.mobileAddRecord?.addEventListener("click", () => {
    switchMobileView("record");
    window.setTimeout(() => els.amountInput.focus(), 80);
  });
}

async function loadInitialData() {
  applyLedgerData(localStore.readAll());
  await setupCloudStore();
  if (state.mode === "cloud") {
    setSyncStatus("saving", "正在读取云端");
    await safeReloadCloudData();
  }
  updateAuthUI();
}

async function setupCloudStore() {
  const config = getSupabaseConfig();
  if (!config) {
    return;
  }

  try {
    await loadSupabaseSdk();
    supabaseClient = createSupabaseClient(config);
    await exchangeRedirectCode(supabaseClient);
    const { data } = await supabaseClient.auth.getSession();
    state.user = data.session?.user || null;
    cloudStore = createCloudStore(supabaseClient);

    if (state.user) {
      state.mode = "cloud";
      state.syncStatus = "cloud";
      state.pendingMigration = hasLocalData();
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      state.user = session?.user || null;
      state.mode = state.user ? "cloud" : "local";
      state.syncMessage = "";
      if (state.user) {
        setSyncStatus("saving", "正在读取云端");
        state.pendingMigration = hasLocalData();
        await safeReloadCloudData();
        if (event === "SIGNED_IN") {
          showNotice("登录成功，云端数据已同步。", "success", 3000);
        }
      } else {
        state.syncStatus = "local";
        applyLedgerData(localStore.readAll());
        if (event === "SIGNED_OUT") {
          showNotice("已退出云端账号，当前使用本地账本。", "info", 3000);
        }
      }
      updateAuthUI();
      render();
    });
  } catch (error) {
    console.warn("Cloud setup failed:", error);
    state.mode = "local";
    state.user = null;
    state.syncStatus = "error";
    showNotice("云端连接失败，已暂时使用本地模式。", "error");
  }
}

async function reloadCloudData() {
  if (!cloudStore || !state.user) return;
  const data = await cloudStore.readAll();
  applyLedgerData(data);
  ensureCategoryShape();
  setSyncStatus("cloud", "云端已同步");
}

async function safeReloadCloudData() {
  try {
    await reloadCloudData();
  } catch (error) {
    console.error("Cloud load failed:", error);
    state.mode = "local";
    state.user = null;
    state.pendingMigration = false;
    setSyncStatus("error", "云端读取失败");
    applyLedgerData(localStore.readAll());
    showNotice("云端数据加载失败，已暂时切回本地模式。", "error");
  }
}

async function readAuthCredentials() {
  const rawAccount = els.authAccount?.value.trim() || "";
  const password = els.authPassword?.value || "";
  const account = normalizeAuthAccount(rawAccount);

  if (!account) {
    els.authAccount?.focus();
    showNotice("账号名 2-32 位，可用中文、字母、数字、下划线或短横线。", "error");
    return null;
  }

  if (!password || password.length < 6) {
    els.authPassword?.focus();
    showNotice("密码至少 6 位。", "error");
    return null;
  }

  return {
    account,
    password,
    email: await accountToAuthEmail(account),
    usesEmail: account.includes("@"),
  };
}

function normalizeAuthAccount(value) {
  const account = value.trim().toLowerCase();
  if (isValidEmail(account)) return account;
  if (!/^[\p{L}\p{N}_-]{2,32}$/u.test(account)) return "";
  return account;
}

async function accountToAuthEmail(account) {
  if (account.includes("@")) return account;
  return `u-${await hashAuthAccount(account)}@${AUTH_INTERNAL_DOMAIN}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hashAuthAccount(account) {
  const input = `daily-ledger:${account}`;
  if (window.crypto?.subtle && window.TextEncoder) {
    const bytes = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .slice(0, 16)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

async function signInWithPassword() {
  if (!supabaseClient) {
    alert("请先在 config.js 填入 Supabase 项目配置。");
    return;
  }

  const credentials = await readAuthCredentials();
  if (!credentials) return;

  els.passwordLogin.disabled = true;
  els.passwordLogin.textContent = "登录中";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  els.passwordLogin.disabled = false;
  els.passwordLogin.textContent = "登录";

  if (error) {
    const message = error.message === "Invalid login credentials" ? "登录失败：账号名或密码不对。" : `登录失败：${error.message}`;
    showNotice(message, "error");
    return;
  }

  showNotice("登录成功，正在同步云端数据。", "success", 3000);
}

async function registerWithPassword() {
  if (!supabaseClient) {
    alert("请先在 config.js 填入 Supabase 项目配置。");
    return;
  }

  const credentials = await readAuthCredentials();
  if (!credentials) return;

  els.registerAccount.disabled = true;
  els.registerAccount.textContent = "注册中";

  const { data, error } = await supabaseClient.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        ledger_account: credentials.account,
        auth_method: credentials.usesEmail ? "email" : "username",
      },
    },
  });

  els.registerAccount.disabled = false;
  els.registerAccount.textContent = "注册";

  if (error) {
    const message = error.message.toLowerCase().includes("already") ? "这个账号已经注册过，请直接登录。" : `注册失败：${error.message}`;
    showNotice(message, "error");
    return;
  }

  if (!data.session) {
    showNotice("注册已提交，但 Supabase 还在要求邮箱确认。请先在 Supabase 关闭邮箱确认，再重新注册或登录。", "error", 7000);
    return;
  }

  showNotice("注册成功，正在同步云端数据。", "success", 3000);
}

async function updatePassword() {
  if (!supabaseClient) {
    alert("请先在 config.js 填入 Supabase 项目配置。");
    return;
  }

  const password = els.authPassword?.value || "";
  if (!password || password.length < 6) {
    els.authPassword?.focus();
    return;
  }

  els.savePassword.disabled = true;
  els.savePassword.textContent = "保存中";

  const { error } = await supabaseClient.auth.updateUser({ password });

  els.savePassword.disabled = false;
  els.savePassword.textContent = "设置/更改密码";

  if (error) {
    showNotice(`密码设置失败：${error.message}`, "error");
    return;
  }

  els.authPassword.value = "";
  showNotice("密码已更新。以后直接用账号名和密码登录。", "success");
}

async function signOut() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  state.mode = "local";
  state.user = null;
  state.pendingMigration = false;
  state.syncMessage = "";
  state.syncStatus = "local";
  applyLedgerData(localStore.readAll());
  updateAuthUI();
  showNotice("已退出云端账号，当前使用本地账本。", "info");
  render();
}

async function migrateLocalData() {
  if (!cloudStore || !state.user) return;
  const localData = localStore.readAll();
  const saved = await commitStoreChange(() => cloudStore.saveAll(localData));
  if (!saved) return;
  state.pendingMigration = false;
  await reloadCloudData();
  showNotice("本地账本已同步到云端。", "success");
  render();
}

async function saveRecord() {
  const amount = Number(els.amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const wasEditing = Boolean(state.editingId);
  const snapshot = captureAppSnapshot();

  const payload = {
    id: state.editingId || makeId(),
    type: state.currentType,
    amount: roundMoney(amount),
    category: els.categorySelect.value,
    date: els.dateInput.value,
    note: els.noteInput.value.trim(),
  };

  if (state.editingId) {
    state.records = state.records.map((record) => (record.id === state.editingId ? payload : record));
    state.editingId = null;
    els.saveButton.textContent = "保存";
  } else {
    state.records.unshift(payload);
  }

  resetForm();
  state.selectedMonth = payload.date.slice(0, 7);
  els.monthPicker.value = state.selectedMonth;
  render();
  const saved = await commitStoreChange(() => activeStore().saveRecord(payload), wasEditing ? "记录已更新" : "记录已保存");
  if (!saved) restoreAppSnapshot(snapshot);
}

async function addCategory() {
  const name = els.categoryNameInput.value.trim();
  if (!name) return;

  const list = state.categories[state.currentType];
  const exists = list.some((item) => item.toLowerCase() === name.toLowerCase());
  if (!exists) {
    const snapshot = captureAppSnapshot();
    list.push(name);
    const saved = await commitStoreChange(() => activeStore().saveCategory(state.currentType, name), "分类已保存");
    if (!saved) {
      restoreAppSnapshot(snapshot);
      return;
    }
  }

  els.categoryNameInput.value = "";
  els.categoryForm.classList.add("is-hidden");
  populateCategories(name);
}

function render() {
  populateCategories();
  renderSummary();
  renderCategoryChart();
  renderTrend();
  renderInsights();
  renderRecords();
  renderHomeRecent();
  renderStatusPill();
  renderSyncNotice();
  renderMobileView();
  renderChartView();
}

function renderSyncNotice() {
  if (state.pendingMigration && state.mode === "cloud") {
    els.syncMessage.textContent = "检测到这个浏览器里还有本地账本，可以同步到云端。";
    els.syncNotice.classList.remove("is-success", "is-error");
    els.migrateData.classList.remove("is-hidden");
    els.dismissMigration.classList.remove("is-hidden");
    els.syncNotice.classList.remove("is-hidden");
    return;
  }

  if (state.syncMessage) {
    els.syncMessage.textContent = state.syncMessage;
    els.syncNotice.classList.toggle("is-success", state.syncKind === "success");
    els.syncNotice.classList.toggle("is-error", state.syncKind === "error");
    els.migrateData.classList.add("is-hidden");
    els.dismissMigration.classList.add("is-hidden");
    els.syncNotice.classList.remove("is-hidden");
    return;
  }

  els.syncNotice.classList.add("is-hidden");
  els.syncNotice.classList.remove("is-success", "is-error");
}

function updateAuthUI() {
  const configured = Boolean(getSupabaseConfig());
  els.modeLabel.textContent = state.mode === "cloud" ? "云端同步" : "本地记账";
  els.authPanel.classList.toggle("is-hidden", !configured);
  els.authAccount?.classList.toggle("is-hidden", !configured || state.user);
  els.authPassword?.classList.toggle("is-hidden", !configured);
  els.passwordLogin?.classList.toggle("is-hidden", !configured || state.user);
  els.registerAccount?.classList.toggle("is-hidden", !configured || state.user);
  els.savePassword?.classList.toggle("is-hidden", !configured || !state.user);
  els.signOut.classList.toggle("is-hidden", !configured || !state.user);
  els.signOut.textContent = "退出登录";
  if (els.authPassword) {
    els.authPassword.placeholder = state.user ? "新密码（至少 6 位）" : "密码";
    els.authPassword.autocomplete = state.user ? "new-password" : "current-password";
  }
  renderStatusPill();
}

function renderStatusPill() {
  const configured = Boolean(getSupabaseConfig());
  let label = "本地模式";
  let kind = "local";

  if (!configured) {
    label = "本地模式";
  } else if (state.syncStatus === "saving") {
    label = state.mode === "cloud" ? "同步中" : "保存中";
    kind = "saving";
  } else if (state.syncStatus === "error") {
    label = "同步异常";
    kind = "error";
  } else if (state.mode === "cloud" && state.user) {
    label = "云端已连接";
    kind = "cloud";
  } else {
    label = "本地模式 · 未登录";
  }

  els.cloudStatus.textContent = label;
  els.cloudStatus.classList.toggle("is-cloud", kind === "cloud");
  els.cloudStatus.classList.toggle("is-saving", kind === "saving");
  els.cloudStatus.classList.toggle("is-error", kind === "error");
}

function setSyncStatus(status, message) {
  state.syncStatus = status;
  if (message) {
    els.cloudStatus.textContent = message;
  }
  renderStatusPill();
}

function showNotice(message, kind = "info", autoHideMs = 0) {
  state.syncMessage = message;
  state.syncKind = kind;
  renderSyncNotice();

  if (noticeTimer) {
    clearTimeout(noticeTimer);
  }

  if (autoHideMs > 0) {
    noticeTimer = setTimeout(() => {
      state.syncMessage = "";
      renderSyncNotice();
    }, autoHideMs);
  }
}

function populateCategories(selected = els.categorySelect.value) {
  const list = state.categories[state.currentType] || [];
  els.categorySelect.replaceChildren(...list.map((category) => new Option(category, category)));
  if (list.includes(selected)) {
    els.categorySelect.value = selected;
  }
  renderQuickCategories(list);
}

function renderQuickCategories(list) {
  if (!els.quickCategoryList) return;

  const quickCategories = list.slice(0, 8);
  els.quickCategoryList.replaceChildren(
    ...quickCategories.map((category) => {
      const button = document.createElement("button");
      button.className = "quick-category";
      button.type = "button";
      button.textContent = category;
      button.classList.toggle("is-active", els.categorySelect.value === category);
      button.addEventListener("click", () => {
        els.categorySelect.value = category;
        renderQuickCategories(list);
      });
      return button;
    }),
  );
}

function renderSummary() {
  const records = getMonthRecords();
  const expense = sumByType(records, "expense");
  const budget = state.budget;
  const usedRate = budget > 0 ? Math.min((expense / budget) * 100, 120) : 0;

  els.expenseTotal.textContent = formatMoney(expense);
  els.budgetValue.textContent = budget > 0 ? formatMoney(budget) : "未设置";
  els.budgetProgress.style.width = `${Math.min(usedRate, 100)}%`;
  els.budgetProgress.classList.toggle("is-warning", budget > 0 && expense >= budget * 0.8 && expense < budget);
  els.budgetProgress.classList.toggle("is-over", budget > 0 && expense >= budget);
  els.spendingBudgetProgress.style.width = `${Math.min(usedRate, 100)}%`;
  els.spendingBudgetProgress.classList.toggle("is-warning", budget > 0 && expense >= budget * 0.8 && expense < budget);
  els.spendingBudgetProgress.classList.toggle("is-over", budget > 0 && expense >= budget);

  if (!budget) {
    els.budgetMeta.textContent = "设置后将在 80% 时提醒";
    els.budgetRate.textContent = "0%";
    els.spendingBudgetLabel.textContent = "预算未设置";
    els.spendingBudgetHint.textContent = "设置预算后会在 80% 时提醒";
    els.budgetNotice.classList.add("is-hidden");
    els.budgetNotice.classList.remove("is-over");
    return;
  }

  const remaining = Math.max(budget - expense, 0);
  const rate = Math.round((expense / budget) * 100);
  els.budgetMeta.textContent = `已使用 ${rate}%，剩余 ${formatMoney(remaining)}`;
  els.budgetRate.textContent = `${rate}%`;
  els.spendingBudgetLabel.textContent = `预算 ${formatMoney(budget)}`;
  els.spendingBudgetHint.textContent = `剩余 ${formatMoney(remaining)}`;

  if (expense >= budget) {
    els.budgetNotice.textContent = `本月支出已超过上限：已用 ${formatMoney(expense)}，上限 ${formatMoney(budget)}。`;
    els.budgetNotice.classList.remove("is-hidden");
    els.budgetNotice.classList.add("is-over");
  } else if (expense >= budget * 0.8) {
    els.budgetNotice.textContent = `本月支出已达到预算的 80%：已用 ${formatMoney(expense)}，还剩 ${formatMoney(remaining)}。`;
    els.budgetNotice.classList.remove("is-hidden");
    els.budgetNotice.classList.remove("is-over");
  } else {
    els.budgetNotice.classList.add("is-hidden");
    els.budgetNotice.classList.remove("is-over");
  }
}

function renderCategoryChart() {
  const expenseRecords = getMonthRecords().filter((record) => record.type === "expense");
  const totals = new Map();
  expenseRecords.forEach((record) => {
    totals.set(record.category, (totals.get(record.category) || 0) + record.amount);
  });

  const items = [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  els.categoryHint.textContent = total ? formatMoney(total) : "暂无支出";

  if (!items.length) {
    els.categoryDonut.style.background = "conic-gradient(var(--line) 0 100%)";
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "这个月还没有支出记录";
    els.categoryLegend.replaceChildren(empty);
    return;
  }

  let cursor = 0;
  const gradientParts = items.map((item, index) => {
    const start = cursor;
    const percent = (item.amount / total) * 100;
    cursor += percent;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    return `${color} ${start}% ${cursor}%`;
  });
  els.categoryDonut.style.background = `conic-gradient(${gradientParts.join(", ")})`;

  els.categoryLegend.replaceChildren(
    ...items.map((item, index) => {
      const li = document.createElement("li");
      const dot = document.createElement("i");
      const name = document.createElement("b");
      const amount = document.createElement("span");
      dot.style.background = CHART_COLORS[index % CHART_COLORS.length];
      name.textContent = item.category;
      amount.textContent = `${Math.round((item.amount / total) * 100)}% · ${formatMoney(item.amount)}`;
      li.append(dot, name, amount);
      return li;
    }),
  );
}

function renderTrend() {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const daily = Array.from({ length: days }, () => 0);

  getMonthRecords()
    .filter((record) => record.type === "expense")
    .forEach((record) => {
      const day = Number(record.date.slice(8, 10));
      daily[day - 1] += record.amount;
    });

  const max = Math.max(...daily, 0);
  els.dailyTrend.style.gridTemplateColumns = `repeat(${days}, minmax(4px, 1fr))`;
  els.dailyTrend.replaceChildren(
    ...daily.map((amount, index) => {
      const bar = document.createElement("div");
      const height = max ? Math.max(4, (amount / max) * 100) : 2;
      bar.className = `bar${amount ? "" : " is-empty"}`;
      bar.style.height = `${height}%`;
      bar.dataset.label = `${index + 1} 日：${formatMoney(amount)}`;
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", bar.dataset.label);
      return bar;
    }),
  );
}

function renderInsights() {
  if (!els.topCategoryInsight || !els.avgDailyInsight) return;

  const expenseRecords = getMonthRecords().filter((record) => record.type === "expense");
  const total = sumByType(expenseRecords, "expense");
  const totals = new Map();

  expenseRecords.forEach((record) => {
    totals.set(record.category, (totals.get(record.category) || 0) + record.amount);
  });

  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  els.topCategoryInsight.textContent = top ? `${top[0]} · ${formatMoney(top[1])}` : "暂无";

  const [year, month] = state.selectedMonth.split("-").map(Number);
  const now = new Date();
  const isCurrentMonth = state.selectedMonth === toMonthValue(now);
  const daysInMonth = new Date(year, month, 0).getDate();
  const divisor = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  els.avgDailyInsight.textContent = formatMoney(total / divisor);
}

function handleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showNotice("当前浏览器不支持语音录入，可以先手动记一笔。", "error", 3500);
    return;
  }

  if (speechRecognition) {
    speechRecognition.stop();
    return;
  }

  const recognition = new SpeechRecognition();
  speechRecognition = recognition;
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    els.voiceInput?.classList.add("is-listening");
    if (els.voiceLabel) els.voiceLabel.textContent = "听取中";
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (transcript) applyVoiceText(transcript);
  };

  recognition.onerror = () => {
    showNotice("语音录入失败，可以再试一次或手动输入。", "error", 3500);
  };

  recognition.onend = () => {
    speechRecognition = null;
    els.voiceInput?.classList.remove("is-listening");
    if (els.voiceLabel) els.voiceLabel.textContent = "语音";
  };

  recognition.start();
}

function applyVoiceText(text) {
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
  const categories = state.categories[state.currentType] || [];
  const matchedCategory = categories.find((category) => text.includes(category));

  if (amountMatch) {
    els.amountInput.value = amountMatch[1];
  }
  if (matchedCategory) {
    els.categorySelect.value = matchedCategory;
    renderQuickCategories(categories);
  }
  if (!els.noteInput.value.trim()) {
    els.noteInput.value = text;
  }

  const filled = [amountMatch ? "金额" : "", matchedCategory ? "分类" : ""].filter(Boolean).join("、");
  showNotice(filled ? `已从语音识别出${filled}。` : "已把语音内容放入备注。", "success", 3000);
}

function renderRecords() {
  const records = getMonthRecords().sort((a, b) => b.date.localeCompare(a.date));
  els.recordCount.textContent = `${records.length} 笔记录`;

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这个月还没有记录。";
    els.recordsList.replaceChildren(empty);
    return;
  }

  els.recordsList.replaceChildren(...records.map((record) => createRecordRow(record)));
}

function renderHomeRecent() {
  if (!els.homeRecentList || !els.homeRecordCount) return;

  const records = getMonthRecords().sort((a, b) => b.date.localeCompare(a.date));
  els.homeRecordCount.textContent = `${records.length} 笔`;

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这个月还没有记录。";
    els.homeRecentList.replaceChildren(empty);
    return;
  }

  els.homeRecentList.replaceChildren(...records.slice(0, 3).map((record) => createRecordRow(record, true)));
}

function createRecordRow(record, compact = false) {
  const row = document.createElement("article");
  row.className = `record-row${compact ? " is-compact" : ""}`;

  const main = document.createElement("div");
  main.className = "record-main";

  const title = document.createElement("div");
  title.className = "record-title";
  const category = document.createElement("span");
  category.textContent = record.category;
  const tag = document.createElement("span");
  tag.className = `tag ${record.type}`;
  tag.textContent = record.type === "expense" ? "支出" : "收入";
  title.append(category, tag);

  const note = document.createElement("div");
  note.className = "record-note";
  note.textContent = `${record.date}${record.note ? ` · ${record.note}` : ""}`;
  main.append(title, note);

  const side = document.createElement("div");
  side.className = `record-amount ${record.type}`;
  const amount = document.createElement("span");
  amount.textContent = `${record.type === "expense" ? "-" : "+"}${formatMoney(record.amount)}`;
  const actions = document.createElement("div");
  const editButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  editButton.className = "delete-button";
  editButton.type = "button";
  editButton.textContent = "✎";
  editButton.setAttribute("aria-label", "编辑记录");
  editButton.addEventListener("click", () => editRecord(record.id));
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", "删除记录");
  deleteButton.addEventListener("click", () => deleteRecord(record.id));
  actions.append(editButton, deleteButton);
  side.append(amount, actions);

  row.append(main, side);
  return row;
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  state.editingId = id;
  state.currentType = record.type;
  document.querySelectorAll("[data-entry-type]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.entryType === record.type);
  });
  populateCategories(record.category);
  els.amountInput.value = record.amount;
  els.dateInput.value = record.date;
  els.noteInput.value = record.note || "";
  els.saveButton.textContent = "更新";
  switchMobileView("record");
  els.amountInput.focus();
}

function switchMobileView(view) {
  if (!["home", "record", "stats"].includes(view)) return;
  state.mobileView = view;
  renderMobileView();
  if (window.matchMedia("(max-width: 680px)").matches) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function renderMobileView() {
  document.body.classList.toggle("mobile-view-home", state.mobileView === "home");
  document.body.classList.toggle("mobile-view-record", state.mobileView === "record");
  document.body.classList.toggle("mobile-view-stats", state.mobileView === "stats");
  const titles = {
    home: "每日收支",
    record: "记一笔",
    stats: "统计",
  };
  if (els.pageTitle) {
    els.pageTitle.textContent = titles[state.mobileView] || "每日收支";
  }
  document.querySelectorAll("[data-mobile-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mobileView === state.mobileView);
  });
}

function setChartView(view) {
  if (!["category", "trend"].includes(view)) return;
  state.chartView = view;
  renderChartView();
}

function renderChartView() {
  document.body.classList.toggle("mobile-chart-category", state.chartView === "category");
  document.body.classList.toggle("mobile-chart-trend", state.chartView === "trend");
  document.querySelectorAll("[data-chart-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.chartTab === state.chartView);
  });
}

async function deleteRecord(id) {
  const snapshot = captureAppSnapshot();
  state.records = state.records.filter((record) => record.id !== id);
  if (state.editingId === id) {
    state.editingId = null;
    resetForm();
    els.saveButton.textContent = "保存";
  }
  render();
  const saved = await commitStoreChange(() => activeStore().deleteRecord(id), "记录已删除");
  if (!saved) restoreAppSnapshot(snapshot);
}

function resetForm() {
  els.entryForm.reset();
  els.dateInput.value = toDateValue(new Date());
  populateCategories();
}

function shiftMonth(offset) {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  state.selectedMonth = toMonthValue(next);
  els.monthPicker.value = state.selectedMonth;
  render();
}

function exportLedgerData() {
  const data = createLedgerExport({
    records: state.records,
    categories: state.categories,
    budget: state.budget,
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daily-ledger-${toDateValue(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importLedgerData() {
  const file = els.importFile.files?.[0];
  if (!file) return;

  try {
    const snapshot = captureAppSnapshot();
    const imported = parseLedgerImport(JSON.parse(await file.text()));
    const merged = mergeLedgerData({ records: state.records, categories: state.categories, budget: state.budget }, imported);
    applyLedgerData(merged);
    render();
    const saved = await commitStoreChange(() => activeStore().saveAll(merged), "账本已导入");
    if (!saved) restoreAppSnapshot(snapshot);
  } catch {
    showNotice("导入失败，请选择有效的账本 JSON 文件。", "error");
  } finally {
    els.importFile.value = "";
  }
}

function activeStore() {
  return state.mode === "cloud" && cloudStore ? cloudStore : localStore;
}

async function commitStoreChange(action, successMessage = "已保存") {
  setSyncStatus("saving", state.mode === "cloud" ? "正在同步" : "正在保存");
  try {
    await action();
    setSyncStatus(state.mode === "cloud" ? "cloud" : "local", state.mode === "cloud" ? "云端已同步" : "本地已保存");
    showNotice(state.mode === "cloud" ? `${successMessage}，已同步到云端。` : `${successMessage}，已保存到本地。`, "success", 5000);
    return true;
  } catch (error) {
    console.error("Save failed:", error);
    setSyncStatus("error", "保存失败");
    showNotice("保存失败，请稍后再试。", "error");
    return false;
  }
}

function captureAppSnapshot() {
  return {
    ledger: normalizeLedgerData({
      records: state.records,
      categories: state.categories,
      budget: state.budget,
    }),
    selectedMonth: state.selectedMonth,
    currentType: state.currentType,
    editingId: state.editingId,
    form: {
      amount: els.amountInput.value,
      category: els.categorySelect.value,
      date: els.dateInput.value,
      note: els.noteInput.value,
      saveButtonText: els.saveButton.textContent,
      categoryFormHidden: els.categoryForm.classList.contains("is-hidden"),
    },
  };
}

function restoreAppSnapshot(snapshot) {
  applyLedgerData(snapshot.ledger);
  state.selectedMonth = snapshot.selectedMonth;
  state.currentType = snapshot.currentType;
  state.editingId = snapshot.editingId;
  els.monthPicker.value = state.selectedMonth;
  render();
  restoreFormSnapshot(snapshot.form);
}

function restoreFormSnapshot(form) {
  populateCategories(form.category);
  els.amountInput.value = form.amount;
  els.dateInput.value = form.date;
  els.noteInput.value = form.note;
  els.saveButton.textContent = form.saveButtonText;
  els.categoryForm.classList.toggle("is-hidden", form.categoryFormHidden);
}

function applyLedgerData(data) {
  const normalized = normalizeLedgerData(data);
  state.records = normalized.records;
  state.categories = normalized.categories;
  state.budget = normalized.budget;
  ensureCategoryShape();
}

function normalizeLedgerData(data) {
  const categories = {
    expense: mergeLists(DEFAULT_CATEGORIES.expense, data?.categories?.expense || []),
    income: mergeLists(DEFAULT_CATEGORIES.income, data?.categories?.income || []),
  };

  return {
    records: Array.isArray(data?.records) ? data.records.map(normalizeRecord).filter(Boolean) : [],
    categories,
    budget: Math.max(0, Number(data?.budget || 0)),
  };
}

function normalizeRecord(record) {
  if (!record || !["income", "expense"].includes(record.type) || !record.date || !record.category) return null;
  const amount = Number(record.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: record.id || makeId(),
    type: record.type,
    amount: roundMoney(amount),
    category: String(record.category),
    date: String(record.date),
    note: String(record.note || ""),
  };
}

function mergeLedgerData(base, incoming) {
  const records = new Map();
  [...base.records, ...incoming.records].forEach((record) => records.set(record.id, record));

  return normalizeLedgerData({
    records: [...records.values()].sort((a, b) => b.date.localeCompare(a.date)),
    categories: {
      expense: mergeLists(base.categories.expense, incoming.categories.expense),
      income: mergeLists(base.categories.income, incoming.categories.income),
    },
    budget: incoming.budget || base.budget,
  });
}

function createLedgerExport(data) {
  return {
    schemaVersion: LEDGER_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    ...normalizeLedgerData(data),
  };
}

function parseLedgerImport(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid ledger import");
  }
  if (data.schemaVersion && data.schemaVersion !== LEDGER_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported ledger schema version: ${data.schemaVersion}`);
  }
  return normalizeLedgerData(data);
}

function createLocalStore() {
  return {
    readAll() {
      return normalizeLedgerData({
        records: loadJSON(STORAGE_KEY, []),
        categories: loadJSON(CATEGORY_KEY, DEFAULT_CATEGORIES),
        budget: Number(localStorage.getItem(BUDGET_KEY) || 0),
      });
    },
    async saveAll(data) {
      const normalized = normalizeLedgerData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized.records));
      localStorage.setItem(CATEGORY_KEY, JSON.stringify(normalized.categories));
      localStorage.setItem(BUDGET_KEY, String(normalized.budget));
    },
    async saveRecord(record) {
      const data = this.readAll();
      const nextRecords = data.records.filter((item) => item.id !== record.id);
      nextRecords.unshift(record);
      await this.saveAll({ ...data, records: nextRecords });
    },
    async deleteRecord(id) {
      const data = this.readAll();
      await this.saveAll({ ...data, records: data.records.filter((record) => record.id !== id) });
    },
    async clearMonth(month) {
      const data = this.readAll();
      await this.saveAll({ ...data, records: data.records.filter((record) => !record.date.startsWith(month)) });
    },
    async saveCategory(type, name) {
      const data = this.readAll();
      data.categories[type] = mergeLists(data.categories[type], [name]);
      await this.saveAll(data);
    },
    async saveBudget(budget) {
      const data = this.readAll();
      await this.saveAll({ ...data, budget });
    },
  };
}

function createCloudStore(client) {
  return {
    async readAll() {
      const userId = state.user.id;
      const [{ data: records, error: recordsError }, { data: categories, error: categoriesError }, { data: settings, error: settingsError }] =
        await Promise.all([
          client.from("ledger_records").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
          client.from("ledger_categories").select("*").eq("user_id", userId),
          client.from("ledger_settings").select("*").eq("user_id", userId).maybeSingle(),
        ]);

      throwIfError(recordsError || categoriesError || settingsError);

      return normalizeLedgerData({
        records: (records || []).map(recordFromRow),
        categories: categoriesFromRows(categories || []),
        budget: Number(settings?.monthly_budget || 0),
      });
    },
    async saveAll(data) {
      const normalized = normalizeLedgerData(data);
      const userId = state.user.id;
      const recordRows = normalized.records.map((record) => recordToRow(record, userId));
      const categoryRows = categoriesToRows(normalized.categories, userId);

      if (recordRows.length) {
        throwIfError((await client.from("ledger_records").upsert(recordRows)).error);
      }
      if (categoryRows.length) {
        throwIfError((await client.from("ledger_categories").upsert(categoryRows, { onConflict: "user_id,kind,name" })).error);
      }
      await this.saveBudget(normalized.budget);
    },
    async saveRecord(record) {
      throwIfError((await client.from("ledger_records").upsert(recordToRow(record, state.user.id))).error);
    },
    async deleteRecord(id) {
      throwIfError((await client.from("ledger_records").delete().eq("id", id).eq("user_id", state.user.id)).error);
    },
    async clearMonth(month) {
      const start = `${month}-01`;
      const [year, monthNumber] = month.split("-").map(Number);
      const end = toDateValue(new Date(year, monthNumber, 1));
      throwIfError((await client.from("ledger_records").delete().eq("user_id", state.user.id).gte("entry_date", start).lt("entry_date", end)).error);
    },
    async saveCategory(type, name) {
      throwIfError((await client.from("ledger_categories").upsert({ user_id: state.user.id, kind: type, name }, { onConflict: "user_id,kind,name" })).error);
    },
    async saveBudget(budget) {
      throwIfError((await client.from("ledger_settings").upsert({ user_id: state.user.id, monthly_budget: budget, updated_at: new Date().toISOString() })).error);
    },
  };
}

function recordToRow(record, userId) {
  return {
    id: record.id,
    user_id: userId,
    type: record.type,
    amount: record.amount,
    category: record.category,
    entry_date: record.date,
    note: record.note || "",
  };
}

function recordFromRow(row) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    date: row.entry_date,
    note: row.note || "",
  };
}

function categoriesFromRows(rows) {
  return rows.reduce(
    (result, row) => {
      result[row.kind] = mergeLists(result[row.kind], [row.name]);
      return result;
    },
    structuredClone(DEFAULT_CATEGORIES),
  );
}

function categoriesToRows(categories, userId) {
  return ["expense", "income"].flatMap((kind) => categories[kind].map((name) => ({ user_id: userId, kind, name })));
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

function ensureCategoryShape() {
  state.categories = {
    expense: mergeLists(DEFAULT_CATEGORIES.expense, state.categories.expense || []),
    income: mergeLists(DEFAULT_CATEGORIES.income, state.categories.income || []),
  };
}

function hasLocalData() {
  const data = localStore.readAll();
  const customExpenseCount = data.categories.expense.filter((item) => !DEFAULT_CATEGORIES.expense.includes(item)).length;
  const customIncomeCount = data.categories.income.filter((item) => !DEFAULT_CATEGORIES.income.includes(item)).length;
  return data.records.length > 0 || data.budget > 0 || customExpenseCount > 0 || customIncomeCount > 0;
}

function getMonthRecords() {
  return state.records.filter((record) => record.date.startsWith(state.selectedMonth));
}

function sumByType(records, type) {
  return roundMoney(records.filter((record) => record.type === type).reduce((sum, record) => sum + record.amount, 0));
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function getSupabaseConfig() {
  const config = window.APP_CONFIG || {};
  const supabaseUrl = String(config.supabaseUrl || "").trim();
  const supabaseAnonKey = String(config.supabaseAnonKey || "").trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

function createSupabaseClient(config) {
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_STORAGE_KEY,
    },
  });
  window.__dailyLedgerSupabaseClient = client;
  return client;
}

async function exchangeRedirectCode(client) {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code || !client?.auth?.exchangeCodeForSession) return;

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw error;

  url.searchParams.delete("code");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function loadSupabaseSdk() {
  if (window.supabase?.createClient) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SUPABASE_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SUPABASE_SDK_URL;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

function mergeLists(first = [], second = []) {
  return [...new Set([...first, ...second].map((item) => String(item).trim()).filter(Boolean))];
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(value);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function toMonthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ ((Math.random() * 16) >> (Number(char) / 4))).toString(16),
  );
}
