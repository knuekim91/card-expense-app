const STORAGE_KEY = 'cardExpenses';

const CARDS = {
  card1: { name: 'NH농협카드(재홍)', color: '#6366f1' },
  card2: { name: '롯데카드(재홍)', color: '#8b5cf6' },
  card3: { name: '우리카드(재홍)', color: '#06b6d4' },
  card4: { name: '삼성카드(정이)', color: '#10b981' },
};

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

let viewYear;
let viewMonth;

function init() {
  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  dateInput.value = formatDateInput(today);
  render();
}

function loadExpenses() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
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

function addExpense(cardId, amount, date, description) {
  const expenses = loadExpenses();
  expenses.unshift({
    id: crypto.randomUUID(),
    cardId,
    amount: Number(amount),
    date,
    description: description.trim(),
    createdAt: Date.now(),
  });
  saveExpenses(expenses);
  render();
}

function deleteExpense(id) {
  const expenses = loadExpenses().filter((e) => e.id !== id);
  saveExpenses(expenses);
  render();
}

function calcTotalsByCard(expenses) {
  const totals = {};
  Object.keys(CARDS).forEach((id) => {
    totals[id] = { amount: 0, count: 0 };
  });
  expenses.forEach((e) => {
    if (totals[e.cardId]) {
      totals[e.cardId].amount += e.amount;
      totals[e.cardId].count += 1;
    }
  });
  return totals;
}

function calcMonthlyByCard(expenses, year, month) {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const totals = {};
  Object.keys(CARDS).forEach((id) => {
    totals[id] = 0;
  });
  expenses
    .filter((e) => getMonthKey(e.date) === monthStr)
    .forEach((e) => {
      if (totals[e.cardId] !== undefined) {
        totals[e.cardId] += e.amount;
      }
    });
  return totals;
}

function renderCardSummary(expenses) {
  const totals = calcTotalsByCard(expenses);
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

function renderMonthlySummary(expenses) {
  currentMonthLabel.textContent = formatMonthLabel(viewYear, viewMonth);
  const totals = calcMonthlyByCard(expenses, viewYear, viewMonth);
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

function renderExpenseList(expenses) {
  const filter = filterCard.value;
  const filtered =
    filter === 'all' ? expenses : expenses.filter((e) => e.cardId === filter);

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function render() {
  const expenses = loadExpenses();
  renderCardSummary(expenses);
  renderMonthlySummary(expenses);
  renderExpenseList(expenses);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addExpense(
    cardSelect.value,
    amountInput.value,
    dateInput.value,
    descInput.value
  );
  amountInput.value = '';
  descInput.value = '';
  amountInput.focus();
});

expenseList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  if (confirm('이 내역을 삭제하시겠습니까?')) {
    deleteExpense(btn.dataset.id);
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

init();
