const CARDS = {
  card1: { name: 'NH농협카드(재홍)', color: '#6366f1' },
  card2: { name: '롯데카드(재홍)', color: '#8b5cf6' },
  card3: { name: '우리카드(재홍)', color: '#06b6d4' },
  card4: { name: '삼성카드(정이)', color: '#10b981' },
};

const LEGACY_STORAGE_KEY = 'cardExpenses';

const configError = document.getElementById('configError');
const authScreen = document.getElementById('authScreen');
const householdScreen = document.getElementById('householdScreen');
const appScreen = document.getElementById('appScreen');

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessage = document.getElementById('authMessage');
const authTabs = document.querySelectorAll('.auth-tab');

const createHouseholdForm = document.getElementById('createHouseholdForm');
const joinHouseholdForm = document.getElementById('joinHouseholdForm');
const householdMessage = document.getElementById('householdMessage');
const householdLogoutBtn = document.getElementById('householdLogoutBtn');

const householdLabel = document.getElementById('householdLabel');
const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
const copyInviteBtn = document.getElementById('copyInviteBtn');
const logoutBtn = document.getElementById('logoutBtn');

const form = document.getElementById('expenseForm');
const cardSelect = document.getElementById('cardSelect');
const amountInput = document.getElementById('amountInput');
const dateInput = document.getElementById('dateInput');
const descInput = document.getElementById('descInput');
const cardSummary = document.getElementById('cardSummary');
const monthlySummary = document.getElementById('monthlySummary');
const expenseList = document.getElementById('expenseList');
const emptyMessage = document.getElementById('emptyMessage');
const filterCard = document.getElementById('filterCard');
const currentMonthLabel = document.getElementById('currentMonthLabel');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

let supabase;
let viewYear;
let viewMonth;
let household = null;
let expenses = [];
let realtimeChannel = null;

function isConfigValid() {
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    return false;
  }
  return (
    typeof SUPABASE_URL === 'string' &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY'
  );
}

function showScreen(screen) {
  configError.hidden = true;
  authScreen.hidden = screen !== 'auth';
  householdScreen.hidden = screen !== 'household';
  appScreen.hidden = screen !== 'app';
}

function showMessage(el, text, isError = false) {
  el.textContent = text;
  el.hidden = !text;
  el.classList.toggle('error', isError);
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCurrency(amount) {
  return amount.toLocaleString('ko-KR') + '원';
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function formatMonthLabel(year, month) {
  return `${year}년 ${month + 1}월`;
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function mapExpense(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    amount: row.amount,
    date: row.date,
    description: row.description,
    createdAt: new Date(row.created_at).getTime(),
  };
}

async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

async function loadHousehold() {
  const { data, error } = await supabase.rpc('get_my_household');
  if (error) throw error;
  household = data?.[0] ?? null;
  return household;
}

async function fetchExpenses() {
  if (!household) return;

  const { data, error } = await supabase
    .from('expenses')
    .select('id, card_id, amount, date, description, created_at')
    .eq('household_id', household.household_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  expenses = (data ?? []).map(mapExpense);
  render();
}

function subscribeToExpenses() {
  if (!household || realtimeChannel) return;

  realtimeChannel = supabase
    .channel(`expenses-${household.household_id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `household_id=eq.${household.household_id}`,
      },
      () => {
        fetchExpenses().catch((err) => console.error(err));
      }
    )
    .subscribe();
}

function unsubscribeFromExpenses() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

async function migrateLegacyData() {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw || !household) return;

  let legacyItems;
  try {
    legacyItems = JSON.parse(raw);
  } catch {
    return;
  }

  if (!Array.isArray(legacyItems) || legacyItems.length === 0) return;

  const shouldImport = confirm(
    `브라우저에 저장된 사용 내역 ${legacyItems.length}건을 가계 데이터로 옮길까요?`
  );
  if (!shouldImport) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  const user = await getSessionUser();
  const rows = legacyItems.map((item) => ({
    household_id: household.household_id,
    card_id: item.cardId,
    amount: item.amount,
    date: item.date,
    description: item.description,
    created_by: user?.id ?? null,
  }));

  const { error } = await supabase.from('expenses').insert(rows);
  if (error) throw error;

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  await fetchExpenses();
}

async function addExpense(cardId, amount, date, description) {
  const user = await getSessionUser();
  const { error } = await supabase.from('expenses').insert({
    household_id: household.household_id,
    card_id: cardId,
    amount: Number(amount),
    date,
    description: description.trim(),
    created_by: user?.id ?? null,
  });

  if (error) throw error;
  await fetchExpenses();
}

async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
  await fetchExpenses();
}

function calcTotalsByCard(items) {
  const totals = {};
  Object.keys(CARDS).forEach((id) => {
    totals[id] = { amount: 0, count: 0 };
  });
  items.forEach((e) => {
    if (totals[e.cardId]) {
      totals[e.cardId].amount += e.amount;
      totals[e.cardId].count += 1;
    }
  });
  return totals;
}

function calcMonthlyByCard(items, year, month) {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const totals = {};
  Object.keys(CARDS).forEach((id) => {
    totals[id] = 0;
  });
  items
    .filter((e) => getMonthKey(e.date) === monthStr)
    .forEach((e) => {
      if (totals[e.cardId] !== undefined) {
        totals[e.cardId] += e.amount;
      }
    });
  return totals;
}

function renderCardSummary(items) {
  const totals = calcTotalsByCard(items);
  cardSummary.innerHTML = Object.entries(CARDS)
    .map(([id, card]) => {
      const t = totals[id];
      return `
        <div class="summary-card" style="--accent: ${card.color}">
          <div class="card-name">${card.name}</div>
          <div class="card-total">${formatCurrency(t.amount)}</div>
          <div class="card-count">${t.count}건</div>
        </div>
      `;
    })
    .join('');
}

function renderMonthlySummary(items) {
  currentMonthLabel.textContent = formatMonthLabel(viewYear, viewMonth);
  const totals = calcMonthlyByCard(items, viewYear, viewMonth);
  let monthTotal = 0;

  const rows = Object.entries(CARDS)
    .map(([id, card]) => {
      const amount = totals[id];
      monthTotal += amount;
      return `
        <div class="monthly-row" style="--accent: ${card.color}">
          <span class="row-name">${card.name}</span>
          <span class="row-amount">${formatCurrency(amount)}</span>
        </div>
      `;
    })
    .join('');

  monthlySummary.innerHTML =
    rows +
    `
    <div class="monthly-total">
      <span>이번 달 합계</span>
      <span>${formatCurrency(monthTotal)}</span>
    </div>
  `;
}

function renderExpenseList(items) {
  const filter = filterCard.value;
  const filtered = filter === 'all' ? items : items.filter((e) => e.cardId === filter);

  expenseList.innerHTML = '';
  emptyMessage.hidden = filtered.length > 0;

  filtered.forEach((e) => {
    const card = CARDS[e.cardId];
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.style.setProperty('--accent', card.color);
    li.innerHTML = `
      <span class="expense-badge">${card.name}</span>
      <div class="expense-info">
        <div class="expense-desc">${escapeHtml(e.description)}</div>
        <div class="expense-meta">${formatDisplayDate(e.date)}</div>
      </div>
      <span class="expense-amount">${formatCurrency(e.amount)}</span>
      <div class="expense-actions">
        <button type="button" class="btn btn-delete" data-id="${e.id}">삭제</button>
      </div>
    `;
    expenseList.appendChild(li);
  });
}

function render() {
  renderCardSummary(expenses);
  renderMonthlySummary(expenses);
  renderExpenseList(expenses);
}

function updateHouseholdBanner() {
  if (!household) return;
  householdLabel.textContent = household.household_name;
  inviteCodeDisplay.textContent = household.invite_code;
}

async function enterApp() {
  updateHouseholdBanner();
  showScreen('app');

  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  dateInput.value = formatDateInput(today);

  subscribeToExpenses();
  await migrateLegacyData();
  await fetchExpenses();
}

async function handleAuthState() {
  const user = await getSessionUser();
  if (!user) {
    unsubscribeFromExpenses();
    household = null;
    expenses = [];
    showScreen('auth');
    return;
  }

  await loadHousehold();
  if (!household) {
    showScreen('household');
    return;
  }

  await enterApp();
}

async function initApp() {
  if (!isConfigValid()) {
    configError.hidden = false;
    authScreen.hidden = true;
    householdScreen.hidden = true;
    appScreen.hidden = true;
    return;
  }

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  supabase.auth.onAuthStateChange(() => {
    handleAuthState().catch((err) => console.error(err));
  });

  await handleAuthState();
}

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    authTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
    showMessage(authMessage, '');
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage(authMessage, '');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage(authMessage, error.message, true);
    return;
  }

  loginForm.reset();
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage(authMessage, '');

  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    showMessage(authMessage, error.message, true);
    return;
  }

  showMessage(
    authMessage,
    '회원가입이 완료되었습니다. 이메일 확인이 필요하면 메일함을 확인한 뒤 로그인하세요.'
  );
  signupForm.reset();
});

createHouseholdForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage(householdMessage, '');

  const name = document.getElementById('householdName').value.trim();
  const { data, error } = await supabase.rpc('create_household', { p_name: name });

  if (error) {
    showMessage(householdMessage, error.message, true);
    return;
  }

  household = {
    household_id: data[0].household_id,
    household_name: name || '우리집',
    invite_code: data[0].invite_code,
  };

  await enterApp();
});

joinHouseholdForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage(householdMessage, '');

  const code = document.getElementById('inviteCode').value.trim();
  const { error } = await supabase.rpc('join_household_by_code', {
    p_invite_code: code,
  });

  if (error) {
    showMessage(householdMessage, error.message, true);
    return;
  }

  await loadHousehold();
  await enterApp();
});

async function logout() {
  unsubscribeFromExpenses();
  await supabase.auth.signOut();
}

logoutBtn.addEventListener('click', () => {
  logout().catch((err) => console.error(err));
});

householdLogoutBtn.addEventListener('click', () => {
  logout().catch((err) => console.error(err));
});

copyInviteBtn.addEventListener('click', async () => {
  if (!household?.invite_code) return;
  try {
    await navigator.clipboard.writeText(household.invite_code);
    copyInviteBtn.textContent = '복사됨';
    setTimeout(() => {
      copyInviteBtn.textContent = '복사';
    }, 1500);
  } catch {
    alert(`초대 코드: ${household.invite_code}`);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await addExpense(
      cardSelect.value,
      amountInput.value,
      dateInput.value,
      descInput.value
    );
    amountInput.value = '';
    descInput.value = '';
    amountInput.focus();
  } catch (err) {
    alert(err.message || '내역 추가에 실패했습니다.');
  }
});

expenseList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  if (!confirm('이 내역을 삭제하시겠습니까?')) return;

  try {
    await deleteExpense(btn.dataset.id);
  } catch (err) {
    alert(err.message || '삭제에 실패했습니다.');
  }
});

filterCard.addEventListener('change', render);

prevMonthBtn.addEventListener('click', () => {
  viewMonth -= 1;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  }
  render();
});

nextMonthBtn.addEventListener('click', () => {
  viewMonth += 1;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  }
  render();
});

initApp();
