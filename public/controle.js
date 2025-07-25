// public/controle.js

document.addEventListener('DOMContentLoaded', async () => {
    // ==== Seleção de Elementos do DOM ====
    const saldoCaixaSpan = document.getElementById('saldo-caixa');
    const transactionsTableBody = document.getElementById('transactions-table-body');
    const filterDataInicioInput = document.getElementById('filter-data-inicio');
    const filterDataFimInput = document.getElementById('filter-data-fim');
    const filterTipoSelect = document.getElementById('filter-tipo');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    // ==== Funções de Utilidade ====
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    // ==== Funções de Busca e Renderização ====

    async function fetchTransactions() {
        transactionsTableBody.innerHTML = '<tr><td colspan="7">Carregando transações...</td></tr>'; // Atualizado colspan
        const dataInicio = filterDataInicioInput.value;
        const dataFim = filterDataFimInput.value;
        const tipo = filterTipoSelect.value;

        let queryParams = new URLSearchParams();
        if (dataInicio) queryParams.append('dataInicio', dataInicio);
        if (dataFim) queryParams.append('dataFim', dataFim);
        if (tipo) queryParams.append('tipo', tipo);

        try {
            const response = await fetch(`/api/transacoes?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar transações.');
            }
            const transactions = await response.json();
            renderTransactions(transactions);
            calculateAndDisplayBalance(transactions);
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="7" style="color: var(--color-danger);">Erro ao carregar transações: ${error.message}</td></tr>`; // Atualizado colspan
            saldoCaixaSpan.textContent = 'Erro';
        }
    }

    function renderTransactions(transactions) {
        transactionsTableBody.innerHTML = ''; // Limpa o corpo da tabela
        if (transactions.length === 0) {
            transactionsTableBody.innerHTML = '<tr><td colspan="7">Nenhuma transação encontrada.</td></tr>'; // Atualizado colspan
            return;
        }

        transactions.forEach(transaction => {
            const row = transactionsTableBody.insertRow();
            row.innerHTML = `
                <td>${transaction.id}</td>
                <td>${transaction.tipo === 'entrada' ? 'Entrada <i class="fas fa-arrow-down" style="color: green;"></i>' : transaction.tipo === 'saida' ? 'Saída <i class="fas fa-arrow-up" style="color: red;"></i>' : 'Venda <i class="fas fa-shopping-cart" style="color: blue;"></i>'}</td>
                <td>${transaction.descricao}</td>
                <td style="color: ${transaction.tipo === 'saida' ? 'red' : 'green'};">${formatCurrency(transaction.valor)}</td>
                <td>${new Date(transaction.data).toLocaleDateString('pt-BR')}</td>
                <td>${transaction.client ? transaction.client.name : 'N/A'}</td> <td>
                    ${transaction.tipo === 'venda' ? `<button class="btn-icon btn-view-receipt" data-transaction-id="${transaction.id}" title="Visualizar Nota"><i class="fas fa-file-invoice-dollar"></i></button>` : '—'}
                </td>
            `;
        });
    }

    function calculateAndDisplayBalance(transactions) {
        let total = 0;
        transactions.forEach(t => {
            if (t.tipo === 'entrada' || t.tipo === 'venda') {
                total += t.valor;
            } else if (t.tipo === 'saida') {
                total -= t.valor;
            }
        });
        saldoCaixaSpan.textContent = formatCurrency(total);
        saldoCaixaSpan.style.color = total >= 0 ? 'green' : 'red';
    }

    // ==== Listeners de Eventos ====
    applyFiltersBtn.addEventListener('click', fetchTransactions);
    clearFiltersBtn.addEventListener('click', () => {
        filterDataInicioInput.value = '';
        filterDataFimInput.value = '';
        filterTipoSelect.value = '';
        fetchTransactions(); // Recarrega todas as transações sem filtros
    });

    // Listener para os botões "Visualizar Nota" (delegação de evento)
    transactionsTableBody.addEventListener('click', (event) => {
        const viewReceiptBtn = event.target.closest('.btn-view-receipt');
        if (viewReceiptBtn) {
            const transactionId = viewReceiptBtn.dataset.transactionId;
            if (transactionId) {
                // Abre a nota em uma nova guia
                window.open(`receipt.html?transactionId=${transactionId}`, '_blank');
            }
        }
    });

    // ==== Inicialização ====
    fetchTransactions(); // Carrega as transações ao carregar a página
});