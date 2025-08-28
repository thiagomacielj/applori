// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('[id$="Tab"]').forEach(btn => {
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('text-gray-600', 'hover:bg-gray-100');
    });

    // Show selected tab
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    document.getElementById(tabName + 'Tab').classList.add('bg-purple-600', 'text-white');
    document.getElementById(tabName + 'Tab').classList.remove('text-gray-600', 'hover:bg-gray-100');

    if (tabName === 'reports') {
        updateReports();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('vaccineDate').value = new Date().toISOString().split('T')[0];

    loadExpenses();
    loadVaccines();
    updateTotal();

    // Handle custom vaccine name
    document.getElementById('vaccineName').addEventListener('change', function () {
        const customDiv = document.getElementById('customVaccineDiv');
        if (this.value === 'outras') {
            customDiv.classList.remove('hidden');
            document.getElementById('customVaccineName').required = true;
        } else {
            customDiv.classList.add('hidden');
            document.getElementById('customVaccineName').required = false;
        }
    });
});

// Expense form handling
document.getElementById('expenseForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const expense = {
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        location: document.getElementById('expenseLocation').value,
        date: document.getElementById('expenseDate').value
    };

    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expense)
        });

        if (response.ok) {
            loadExpenses();
            updateTotal();
            this.reset();
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        } else {
            alert('Erro ao adicionar despesa');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erro ao adicionar despesa');
    }
});

// Vaccine form handling
document.getElementById('vaccineForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    let vaccineName = document.getElementById('vaccineName').value;
    if (vaccineName === 'outras') {
        vaccineName = document.getElementById('customVaccineName').value;
    }

    const vaccine = {
        name: vaccineName,
        date: document.getElementById('vaccineDate').value,
        next_date: document.getElementById('nextVaccineDate').value || null,
        vet: document.getElementById('vaccineVet').value,
        amount: parseFloat(document.getElementById('vaccineAmount').value) || 0
    };

    try {
        const response = await fetch('/api/vaccines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vaccine)
        });

        if (response.ok) {
            loadVaccines();
            loadExpenses(); // Reload expenses in case a vaccine expense was added
            updateTotal();
            this.reset();
            document.getElementById('vaccineDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('customVaccineDiv').classList.add('hidden');
        } else {
            alert('Erro ao registrar vacina');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erro ao registrar vacina');
    }
});

// Load expenses from API
async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const expenses = await response.json();
        renderExpenses(expenses);
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

// Load vaccines from API
async function loadVaccines() {
    try {
        const response = await fetch('/api/vaccines');
        const vaccines = await response.json();
        renderVaccines(vaccines);
    } catch (error) {
        console.error('Error loading vaccines:', error);
    }
}

// Render functions
function renderExpenses(expenses) {
    const container = document.getElementById('expensesList');

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-4">🐕</div>
                <p class="text-lg">Nenhuma despesa cadastrada ainda</p>
                <p class="text-sm">Adicione a primeira despesa do seu pet!</p>
            </div>
        `;
        return;
    }

    const categoryIcons = {
        'alimentacao': '🍖',
        'veterinario': '🏥',
        'medicamentos': '💊',
        'brinquedos': '🎾',
        'higiene': '🛁',
        'acessorios': '👔',
        'outros': '📦'
    };

    container.innerHTML = expenses.map(expense => {
        return `
            <div class="expense-item bg-white p-4 rounded-xl border border-gray-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <span class="text-2xl">${categoryIcons[expense.category] || '📦'}</span>
                            <div>
                                <h4 class="font-semibold text-gray-800">${expense.description}</h4>
                                <p class="text-sm text-gray-600">${expense.location}</p>
                            </div>
                        </div>
                        <p class="text-xs text-gray-500">${new Date(expense.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-purple-600">R$ ${expense.amount.toFixed(2).replace('.', ',')}</p>
                        <button onclick="deleteExpense(${expense.id})" class="text-red-500 hover:text-red-700 text-sm mt-1">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderVaccines(vaccines) {
    const container = document.getElementById('vaccinesList');

    if (vaccines.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-4">💉</div>
                <p class="text-lg">Nenhuma vacina registrada</p>
                <p class="text-sm">Mantenha o cartão de vacinas sempre atualizado!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = vaccines.map(vaccine => {
        const today = new Date();
        const nextDate = vaccine.next_date ? new Date(vaccine.next_date) : null;
        const isOverdue = nextDate && nextDate < today;
        const isUpcoming = nextDate && nextDate > today && (nextDate - today) / (1000 * 60 * 60 * 24) <= 30;

        let statusBadge = '';
        if (isOverdue) {
            statusBadge = '<span class="overdue-badge text-white px-3 py-1 rounded-full text-xs font-semibold">Atrasada</span>';
        } else if (isUpcoming) {
            statusBadge = '<span class="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Próxima</span>';
        } else if (nextDate) {
            statusBadge = '<span class="vaccine-badge text-white px-3 py-1 rounded-full text-xs font-semibold">Em dia</span>';
        }

        return `
            <div class="expense-item bg-white p-4 rounded-xl border border-gray-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <span class="text-2xl">💉</span>
                            <div>
                                <h4 class="font-semibold text-gray-800">${vaccine.name}</h4>
                                <p class="text-sm text-gray-600">${vaccine.vet}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Aplicada: ${new Date(vaccine.date).toLocaleDateString('pt-BR')}</span>
                            ${vaccine.next_date ? `<span>Próxima: ${new Date(vaccine.next_date).toLocaleDateString('pt-BR')}</span>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        ${statusBadge}
                        ${vaccine.amount > 0 ? `<p class="text-sm font-semibold text-green-600 mt-1">R$ ${vaccine.amount.toFixed(2).replace('.', ',')}</p>` : ''}
                        <button onclick="deleteVaccine(${vaccine.id})" class="text-red-500 hover:text-red-700 text-sm mt-1 block">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function updateTotal() {
    try {
        const response = await fetch('/api/expenses');
        const expenses = await response.json();
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        document.getElementById('totalAmount').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    } catch (error) {
        console.error('Error updating total:', error);
    }
}

async function updateReports() {
    try {
        const response = await fetch('/api/reports');
        const report = await response.json();

        document.getElementById('reportTotal').textContent = `R$ ${report.total.toFixed(2).replace('.', ',')}`;
        document.getElementById('reportAverage').textContent = `R$ ${report.monthly_average.toFixed(2).replace('.', ',')}`;
        document.getElementById('reportVaccines').textContent = report.vaccines_up_to_date;

        // Category breakdown
        const categoryContainer = document.getElementById('categoryReport');
        if (Object.keys(report.category_totals).length === 0) {
            categoryContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Adicione despesas para ver o relatório</p>';
        } else {
            const categoryNames = {
                'alimentacao': '🍖 Alimentação',
                'veterinario': '🏥 Veterinário',
                'medicamentos': '💊 Medicamentos',
                'brinquedos': '🎾 Brinquedos',
                'higiene': '🛁 Higiene',
                'acessorios': '👔 Acessórios',
                'outros': '📦 Outros'
            };

            categoryContainer.innerHTML = Object.entries(report.category_totals)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                    const percentage = report.total > 0 ? (amount / report.total * 100) : 0;
                    return `
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span class="font-medium">${categoryNames[category] || category}</span>
                            <div class="text-right">
                                <span class="font-bold">R$ ${amount.toFixed(2).replace('.', ',')}</span>
                                <span class="text-sm text-gray-500 ml-2">(${percentage.toFixed(1)}%)</span>
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // Upcoming vaccines
        const upcomingContainer = document.getElementById('upcomingVaccines');
        if (report.upcoming_vaccines.length === 0) {
            upcomingContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Nenhuma vacina agendada</p>';
        } else {
            upcomingContainer.innerHTML = report.upcoming_vaccines.map(vaccine => {
                const isUrgent = vaccine.days_until <= 7;

                return `
                    <div class="p-3 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'} rounded-lg">
                        <div class="flex justify-between items-center">
                            <span class="font-medium">${vaccine.name}</span>
                            <span class="text-sm ${isUrgent ? 'text-red-600' : 'text-yellow-600'} font-semibold">
                                ${vaccine.days_until} ${vaccine.days_until === 1 ? 'dia' : 'dias'}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Próxima dose: ${new Date(vaccine.next_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error updating reports:', error);
    }
}

// Delete functions
async function deleteExpense(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadExpenses();
            updateTotal();
        } else {
            alert('Erro ao excluir despesa');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erro ao excluir despesa');
    }
}

async function deleteVaccine(id) {
    if (!confirm('Tem certeza que deseja excluir este registro de vacina?')) return;

    try {
        const response = await fetch(`/api/vaccines/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadVaccines();
        } else {
            alert('Erro ao excluir vacina');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erro ao excluir vacina');
    }
}