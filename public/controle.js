// controle.js
// Lógica específica da tela de Controle de Caixa

// Garante que o código só rode na página de controle
if (document.body.id === 'page-controle' || location.pathname.includes('controle.html')) {
    // --- ELEMENTOS DO DOM ---
    const saldoAtualDisplay = document.getElementById('saldo-atual');
    const listaTransacoes = document.getElementById('lista-transacoes');
    const filterButtons = document.querySelectorAll('.transaction-type-filter button');
    const outraTransacaoForm = document.getElementById('outra-transacao-form');
    const tipoTransacaoSelect = document.getElementById('tipo-transacao');
    const descricaoTransacaoInput = document.getElementById('descricao-transacao');
    const valorTransacaoInput = document.getElementById('valor-transacao');
    const dataTransacaoInput = document.getElementById('data-transacao');

    // --- ESTADO DA APLICAÇÃO ---
    let historicoTransacoes = [];
    let saldoAtual = 0;
    let filtroAtual = 'all'; // 'all', 'entrada', 'saida'

    // --- FUNÇÕES ---

    function carregarDados() {
        historicoTransacoes = JSON.parse(localStorage.getItem('historicoTransacoes')) || [];
        calcularESetarSaldo();
        renderizarHistorico();
        atualizarNotificacoesComuns(); // Atualiza as notificações comuns
    }

    function salvarDados() {
        localStorage.setItem('historicoTransacoes', JSON.stringify(historicoTransacoes));
    }

    function calcularESetarSaldo() {
        saldoAtual = historicoTransacoes.reduce((acc, transacao) => {
            if (transacao.tipo === 'entrada') {
                return acc + transacao.valor;
            } else if (transacao.tipo === 'saida') {
                return acc - transacao.valor;
            }
            return acc;
        }, 0);
        saldoAtualDisplay.textContent = `R$ ${saldoAtual.toFixed(2)}`;
    }

    function renderizarHistorico() {
        listaTransacoes.innerHTML = '';
        const transacoesFiltradas = historicoTransacoes.filter(transacao => {
            if (filtroAtual === 'all') return true;
            return transacao.tipo === filtroAtual;
        }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()); // Ordena por data mais recente

        if (transacoesFiltradas.length === 0) {
            listaTransacoes.innerHTML = `<li style="justify-content: center; color: var(--text-light-color);">Nenhuma transação encontrada.</li>`;
            return;
        }

        transacoesFiltradas.forEach(transacao => {
            const li = document.createElement('li');
            const valorFormatado = `R$ ${transacao.valor.toFixed(2)}`;
            const valorClasse = transacao.tipo === 'entrada' ? 'positive' : 'negative';
            const sinal = transacao.tipo === 'entrada' ? '+' : '-';

            li.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-description">${transacao.descricao}</span>
                </div>
                <div class="transaction-details">
                    <span class="transaction-value ${valorClasse}">${sinal} ${valorFormatado}</span>
                    <span class="transaction-date">${new Date(transacao.data).toLocaleDateString('pt-BR')}</span>
                </div>
            `;
            listaTransacoes.appendChild(li);
        });
    }

    function registrarOutraTransacao(e) {
        e.preventDefault();

        const tipo = tipoTransacaoSelect.value;
        const descricao = descricaoTransacaoInput.value.trim();
        const valor = parseFloat(valorTransacaoInput.value);
        const data = dataTransacaoInput.value; // Já está no formato YYYY-MM-DD

        if (!descricao || isNaN(valor) || valor <= 0 || !data) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const novaTransacao = {
            id: Date.now(),
            tipo: tipo,
            descricao: descricao,
            valor: valor,
            data: data
        };

        historicoTransacoes.push(novaTransacao);
        salvarDados();
        calcularESetarSaldo();
        renderizarHistorico();
        outraTransacaoForm.reset();
        alert('Transação registrada com sucesso!');
    }

    // --- EVENT LISTENERS ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filtroAtual = button.dataset.filter;
            renderizarHistorico();
        });
    });

    outraTransacaoForm.addEventListener('submit', registrarOutraTransacao);

    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', carregarDados);
}