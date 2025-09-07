// Em app/static/js/app.js

// --- VARIÁVEL GLOBAL DE PERMISSÃO ---
const USER_ROLE = window.APP_CONFIG ? window.APP_CONFIG.USER_ROLE : 'supervisor';

// Função global para fechar o modal.
window.closeModal = () => {
    const modal = document.getElementById('form-modal');
    if (modal) {
        modal.classList.add('hidden');
        const modalForm = document.getElementById('modal-form');
        if (modalForm) {
            modalForm.innerHTML = '';
            modalForm.removeAttribute('data-edit-id');
        }
        if (!modal.classList.contains('hidden')) {
            history.back();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos Globais ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const modal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    const mobileHeaderTitle = document.getElementById('mobile-header-title');


    // --- Cliente de API ---
    const api = {
        get: async (endpoint, id = null) => {
            const url = id ? `/api/${endpoint}/${id}` : `/api/${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert('Sessão expirada ou sem permissão. Será redirecionado para o login.');
                    window.location.href = '/auth/login';
                }
                throw new Error('Erro ao buscar dados.');
            }
            return response.json();
        },
        post: async (endpoint, data) => {
            const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao salvar os dados.');
            return result;
        },
        put: async (endpoint, id, data) => {
            const response = await fetch(`/api/${endpoint}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao atualizar os dados.');
            return result;
        },
        delete: async (endpoint, id) => {
            const response = await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocorreu um erro ao apagar os dados.');
            return result;
        }
    };
    const relatorioMovTrigger = document.getElementById('relatorio-mov-trigger');
        if (relatorioMovTrigger) {
            relatorioMovTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                openRelatorioMovimentacoesModal();
            });
        }

    const relatorioManTrigger = document.getElementById('relatorio-man-trigger');
    if (relatorioManTrigger) {
        relatorioManTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openRelatorioManutencaoModal();
        });
    }

    // --- Event Listener para abrir o Modal de Relatório de Estoque ---
    const relatorioEstTrigger = document.getElementById('relatorio-est-trigger');
    if (relatorioEstTrigger) {
        relatorioEstTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openRelatorioEstoqueModal();
        });
    }

// --- Event Listener para abrir o Modal de Saída de Combustível ---
    const relatorioSaidaCombustivelTrigger = document.getElementById('relatorio-saida-combustivel-trigger');
    if (relatorioSaidaCombustivelTrigger) {
        relatorioSaidaCombustivelTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openRelatorioSaidaCombustivelModal();
        });
    }



    // --- FUNÇÃO GENÉRICA PARA CADASTROS (CRUD) ---
     const renderGenericCrud = async (config) => {
        const section = document.getElementById(config.sectionId);
        if (!section) return;

        const addButton = (USER_ROLE === 'gerente' || USER_ROLE === 'supervisor')
            ? `<button id="add-${config.entityName}-btn" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"><i class="fas fa-plus mr-2"></i>${config.addBtnText}</button>`
            : '';

        // --- NOVO HTML com campo de busca ---
        section.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 class="text-3xl font-bold text-gray-800">${config.title}</h2>
                <div class="w-full md:w-auto flex items-center gap-2">
                    <input type="search" id="search-${config.entityName}" class="w-full md:w-64 p-2 border rounded-md" placeholder="Buscar por nome...">
                    ${addButton}
                </div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100 text-gray-600 uppercase"><tr>${config.tableHeaders.map(h => `<th class="p-3">${h}</th>`).join('')}</tr></thead>
                    <tbody id="${config.entityName}-table-body"></tbody>
                </table>
            </div>
            <div id="pagination-${config.entityName}" class="flex justify-center items-center mt-4 space-x-2"></div>`;

        if (USER_ROLE === 'gerente' || USER_ROLE === 'supervisor') {
            document.getElementById(`add-${config.entityName}-btn`).addEventListener('click', () => config.openModalFn());
        }

        const tableBody = section.querySelector(`#${config.entityName}-table-body`);
        const paginationContainer = section.querySelector(`#pagination-${config.entityName}`);
        const searchInput = section.querySelector(`#search-${config.entityName}`);

        // --- NOVA FUNÇÃO para buscar e renderizar os dados ---
        const fetchData = async (page = 1, search = '') => {
            // 1. MOSTRAR O "LOADING"
            tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;
            paginationContainer.innerHTML = '';

            try {
                const url = `${config.endpoint}?page=${page}&search=${search}`;
                const response = await api.get(url);
                const items = response.data;

                if (items.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8 text-gray-500">Nenhum item encontrado.</td></tr>`;
                } else {
                    tableBody.innerHTML = items.map(item => {
                        const actionButtons = (USER_ROLE === 'gerente')
                            ? `<button class="text-blue-600 hover:text-blue-800 mr-3 edit-btn" data-id="${item.id}" data-entity="${config.entityName}" title="Editar"><i class="fas fa-edit"></i></button>
                               <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${item.id}" data-entity="${config.entityName}" title="Excluir"><i class="fas fa-trash"></i></button>`
                            : '';

                         // Adiciona o botão de detalhes específico para fornecedores
                        const detailsButton = (config.entityName === 'fornecedores')
                            ? `<button class="text-green-600 hover:text-green-800 mr-3 details-btn" data-id="${item.id}" data-name="${item.nome}" data-entity="notas-fiscais" title="Ver Notas Fiscais"><i class="fas fa-file-invoice"></i></button>`
                            : '';

                        return `<tr class="border-b hover:bg-gray-50">${config.renderRow(item)}<td class="p-3 text-center">${detailsButton}${actionButtons}</td></tr>`;
                    }).join('');
                }
                

                // 2. RENDERIZAR A PAGINAÇÃO
                renderPagination(response);

            } catch (error) {
                tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8 text-red-500">Falha ao carregar dados.</td></tr>`;
            }
            
        };

        const renderPagination = (paginationData) => {
            let paginationHtml = '';
            if (paginationData.has_prev) {
                paginationHtml += `<button data-page="${paginationData.current_page - 1}" class="pagination-btn px-3 py-1 border rounded-md hover:bg-gray-100">Anterior</button>`;
            }

            for (let i = 1; i <= paginationData.total_pages; i++) {
                const activeClass = i === paginationData.current_page ? 'bg-green-600 text-white' : '';
                paginationHtml += `<button data-page="${i}" class="pagination-btn px-3 py-1 border rounded-md hover:bg-gray-100 ${activeClass}">${i}</button>`;
            }

            if (paginationData.has_next) {
                paginationHtml += `<button data-page="${paginationData.current_page + 1}" class="pagination-btn px-3 py-1 border rounded-md hover:bg-gray-100">Próximo</button>`;
            }
            paginationContainer.innerHTML = paginationHtml;
        };

        // 3. EVENT LISTENERS PARA BUSCA E PAGINAÇÃO
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchData(1, e.target.value);
            }, 500); // Espera 500ms após o utilizador parar de digitar
        });
        
        paginationContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-btn')) {
                const page = e.target.dataset.page;
                fetchData(page, searchInput.value);
            }
        });

        // Carga inicial dos dados
        fetchData();
    };

    // --- Funções de Renderização Específicas ---
   const renderDashboard = async () => {
        const section = document.getElementById('dashboard');
        const logoUrl = '/static/icons/FazendaLogo.jpg'; // URL do logo da empresa
        // Adicionamos um novo card com um elemento <canvas> para o gráfico
        section.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Total de Produtos</h3><p id="total-produtos" class="text-3xl font-bold text-blue-600 mt-2"></p></div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Valor Total em Estoque</h3><p id="valor-estoque" class="text-3xl font-bold text-green-600 mt-2"></p></div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Total de Combustível</h3><p id="total-combustivel" class="text-3xl font-bold text-orange-500 mt-2"></p></div>
            </div>
            
            <div class="mt-8 space-y-6">
                <!-- Seção do Logo Centralizado e Responsivo -->
                <div class="bg-white p-6 rounded-lg shadow-md flex justify-center items-center">
                    <img src="${logoUrl}" alt="Logo da Empresa" class="w-2/3 sm:w-1/2 md:w-1/3 max-w-sm object-contain">
                </div>

            </div>`;
        
        try {
            // Fazemos as chamadas à API em paralelo
            const [stats, gastosSetor] = await Promise.all([
                api.get('dashboard-stats'),
                api.get('relatorios/gastos-por-setor')
            ]);

            // Preenche os cards de estatísticas
            document.getElementById('total-produtos').textContent = stats.total_produtos;
            const valor = Number(stats.valor_total_estoque) || 0;
            document.getElementById('valor-estoque').textContent = `R$ ${valor.toFixed(2)}`;
            const combustivel = Number(stats.total_combustivel) || 0;
            document.getElementById('total-combustivel').textContent = `${combustivel.toFixed(2)} L`; // Exibe com "L" de litros
            
            // Preenche a tabela de movimentações recentes
          /*  const tableBody = document.getElementById('movimentacoes-recentes-table');
            if (stats.movimentacoes_recentes && stats.movimentacoes_recentes.length > 0) {
                tableBody.innerHTML = stats.movimentacoes_recentes.map(mov => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-2 font-medium">${mov.produto_nome}</td>
                        <td class="p-2"><span class="px-2 py-1 text-xs rounded-full ${mov.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${mov.tipo}</span></td>
                        <td class="p-2">${mov.quantidade}</td>
                    </tr>`).join('');
            } else {
                tableBody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-gray-500">Nenhuma movimentação recente.</td></tr>`;
            }

            // --- LÓGICA PARA RENDERIZAR O GRÁFICO ---
            const ctx = document.getElementById('gastosSetorChart').getContext('2d');
            if (window.myChart instanceof Chart) {
                window.myChart.destroy(); // Destrói gráfico anterior para evitar sobreposição
            }

            window.myChart = new Chart(ctx, {
                type: 'bar', // Tipo de gráfico: barras
                data: {
                    labels: gastosSetor.map(d => d.setor), // Nomes dos setores no eixo X
                    datasets: [{
                        label: 'Valor Total Gasto (R$)',
                        data: gastosSetor.map(d => d.total), // Valores no eixo Y
                        backgroundColor: 'rgba(5, 150, 105, 0.6)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) { return 'R$ ' + value; }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Esconde a legenda para um visual mais limpo
                        }
                    }
                }
            });*/

        } catch (error) {
            section.innerHTML = `<p class="text-center p-8 text-red-500">Não foi possível carregar os dados do dashboard.</p>`;
            console.error("Erro ao renderizar dashboard:", error);
        } 
    };


    
    const renderMovimentacoes = async () => {
        const section = document.getElementById('movimentacoes');
       const [produtosResponse, setoresResponse, funcionariosResponse, veiculosResponse] = await Promise.all([
            api.get('produtos'), 
            api.get('setores'),
            api.get('funcionarios'),
            api.get('veiculos')
        ]);
        
        // E extraímos a lista de dados da propriedade 'data'
        const produtos = produtosResponse.data;
        const setores = setoresResponse.data;
        const funcionarios = funcionariosResponse.data;
        const veiculos = veiculosResponse.data;
        // --- FIM DA MODIFICAÇÃO ---
        
        const produtosData = {};
        produtos.forEach(p => { produtosData[p.id] = p; });

        const produtosOptions = produtos.map(p => `<option value="${p.id}">${p.nome} (Est: ${p.estoque})</option>`).join('');
        const setoresOptions = setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
        const funcionariosOptions = funcionarios.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        const veiculosOptions = veiculos.map(v => `<option value="${v.id}">${v.nome}</option>`).join(''); // <-- Criar options para veículos

        section.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Registar Movimentação</h2>
            <div class="bg-white p-8 rounded-lg shadow-md mb-8">
                <form id="movimentacao-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div><label class="block font-medium">Produto</label><select name="produto_id" id="mov-produto-select" class="w-full p-2 border rounded-md" required>${produtosOptions}</select></div>
                        <div><label class="block font-medium">Tipo</label><select name="tipo" id="mov-tipo-select" class="w-full p-2 border rounded-md" required><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
                        <div><label class="block font-medium">Quantidade</label><input type="number" name="quantidade" class="w-full p-2 border rounded-md" required min="1"></div>
                        <div class="lg:col-span-3"><label class="block font-medium">Setor</label><select name="setor_id" class="w-full p-2 border rounded-md" required>${setoresOptions}</select></div>
                    </div>
                    
                    <div id="lote-validade-fields" class="hidden mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label class="block font-medium text-green-600">Número do Lote</label><input type="text" name="lote" class="w-full p-2 border rounded-md" placeholder="Ex: LOTE-A4521"></div>
                        <div><label class="block font-medium text-green-600">Data de Validade (Opcional)</label><input type="date" name="data_validade" class="w-full p-2 border rounded-md"></div>
                    </div>

                    <div id="funcionario-field" class="hidden mt-6">
                        <label class="block font-medium text-blue-600">Funcionário que Recebe o EPI</label>
                        <select name="funcionario_id" class="w-full p-2 border rounded-md">${funcionariosOptions}</select>
                    </div>
                    
                    <div id="veiculo-field" class="hidden mt-6">
                        <label class="block font-medium text-purple-600">Veículo para Aplicação da Peça</label>
                        <select name="veiculo_id" class="w-full p-2 border rounded-md">${veiculosOptions}</select>
                    </div>

                    <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Registar</button></div>
                </form>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-4">Histórico de Movimentações</h3>
            <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <table class="w-full text-left text-sm"><thead class="bg-gray-100 text-gray-600 uppercase">
                     <tr><th class="p-3">Data</th><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Qtd.</th><th class="p-3">Lote</th><th class="p-3">Setor</th><th class="p-3">Destino</th><th class="p-3">Utilizador</th><th class="p-3">Ações</th></tr>
                </thead><tbody id="movimentacoes-table-body"></tbody></table>
            </div>`;

        const produtoSelect = section.querySelector('#mov-produto-select');
        const tipoSelect = section.querySelector('#mov-tipo-select');
        const funcionarioField = section.querySelector('#funcionario-field');
        const loteValidadeFields = section.querySelector('#lote-validade-fields');
        const veiculoField = section.querySelector('#veiculo-field');

       // --- FUNÇÃO CORRIGIDA AQUI ---
        const toggleMovimentacaoFields = () => {
            const produtoId = produtoSelect.value;
            const tipo = tipoSelect.value;
            const produto = produtosData[produtoId];

            // Reseta todos os campos opcionais para o estado inicial (escondido e desativado)
            funcionarioField.classList.add('hidden');
            funcionarioField.querySelector('select').removeAttribute('required');
            funcionarioField.querySelector('select').disabled = true;

            loteValidadeFields.classList.add('hidden');
            loteValidadeFields.querySelector('input[name="lote"]').removeAttribute('required');

            veiculoField.classList.add('hidden');
            veiculoField.querySelector('select').removeAttribute('required');
            veiculoField.querySelector('select').disabled = true;

            // Mostra e ativa os campos conforme a lógica
            if (tipo === 'entrada') {
                loteValidadeFields.classList.remove('hidden');
                loteValidadeFields.querySelector('input[name="lote"]').setAttribute('required', 'required');
            } else if (tipo === 'saida' && produto) {
                if (produto.is_epi) {
                    funcionarioField.classList.remove('hidden');
                    funcionarioField.querySelector('select').setAttribute('required', 'required');
                    funcionarioField.querySelector('select').disabled = false;
                }
                if (produto.is_peca_veicular) {
                    veiculoField.classList.remove('hidden');
                    veiculoField.querySelector('select').setAttribute('required', 'required');
                    veiculoField.querySelector('select').disabled = false;
                }
            }
        };

        produtoSelect.addEventListener('change', toggleMovimentacaoFields);
        tipoSelect.addEventListener('change', toggleMovimentacaoFields);
        toggleMovimentacaoFields();
        
        section.querySelector('#movimentacao-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            try {
                const result = await api.post('movimentacoes', data);
                alert(result.message);
                showSection('movimentacoes');
            } catch (error) {
                alert(error.message);
            }
        });

        const tableBody = section.querySelector('#movimentacoes-table-body');
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;
        try {
            const movimentacoes = await api.get('movimentacoes');
            if (movimentacoes.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-gray-500">Nenhuma movimentação registada.</td></tr>`;
            } else {
                tableBody.innerHTML = movimentacoes.map(m => {
                    const destino = m.funcionario_nome 
                        ? `<span class="text-blue-600">${m.funcionario_nome}</span>` 
                        : (m.veiculo_nome ? `<span class="text-purple-600">${m.veiculo_nome}</span>` : '');

                    // Só mostra o botão de correção para o gerente
                    const corrigirButton = (USER_ROLE === 'gerente')
                        ? `<button class="text-blue-600 hover:text-blue-800 edit-mov-btn" data-id="${m.id}" title="Corrigir Lançamento"><i class="fas fa-edit"></i></button>`
                        : '';

                    return `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-3">${m.data}</td>
                            <td class="p-3 font-medium">${m.produto_nome}</td>
                            <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${m.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${m.tipo}</span></td>
                            <td class="p-3">${m.quantidade}</td>
                            <td class="p-3">${m.lote || ''}</td>
                            <td class="p-3">${m.setor_nome}</td>
                            <td class="p-3">${destino}</td>
                            <td class="p-3 text-gray-500">${m.usuario_nome}</td>
                            <td class="p-3 text-center">${corrigirButton}</td>
                        </tr>`
                }).join('');
            }
            
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-red-500">Falha ao carregar dados.</td></tr>`;
        }
    };
    const openMovimentacaoModal = async (id) => {
        let movimentacao;
        try {
            // Primeiro, buscamos os dados atuais da movimentação que será corrigida
            movimentacao = await api.get('movimentacoes', id);
        } catch (error) {
            alert('Não foi possível carregar os dados da movimentação.');
            return;
        }

        const title = 'Corrigir Lançamento de Movimentação';
        const formHtml = `
            <div class="space-y-4">
                <div class="bg-gray-100 p-4 rounded-md text-sm">
                    <p><strong>Produto:</strong> ${movimentacao.produto_nome}</p>
                    <p><strong>Data Original:</strong> ${movimentacao.data}</p>
                    <p><strong>Quantidade Original:</strong> ${movimentacao.quantidade}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                     <div>
                        <label for="quantidade_corrigida" class="block font-medium">Nova Quantidade</label>
                        <input type="number" name="quantidade" class="w-full p-2 border rounded-md" value="${movimentacao.quantidade}" required>
                    </div>
                    <div>
                        <label for="motivo_correcao" class="block font-medium">Motivo da Correção</label>
                        <input type="text" name="motivo" class="w-full p-2 border rounded-md" placeholder="Ex: Erro de digitação" required>
                    </div>
                </div>

                <div class="pt-4 border-t">
                    <p class="font-bold text-red-600">Autorização do Gerente</p>
                    <p class="text-sm text-gray-600 mb-2">Para aplicar esta correção, um gerente deve autorizar com a sua senha.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="gerente_username" class="block font-medium">Utilizador do Gerente</label>
                            <input type="text" name="gerente_username" class="w-full p-2 border rounded-md" required>
                        </div>
                        <div>
                            <label for="gerente_password" class="block font-medium">Senha do Gerente</label>
                            <input type="password" name="gerente_password" class="w-full p-2 border rounded-md" required>
                        </div>
                    </div>
                </div>
            </div>
            <div class="text-right mt-6 border-t pt-4">
                <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar Correção</button>
            </div>`;

        openModal(title, formHtml, 'movimentacoes'); // Corrigido para 'movimentacoes'
        if (id) modalForm.dataset.editId = id;
    };   
    // Em app.js, substitua a sua função renderRelatorios por esta:

// Em app.js, substitua a sua função renderRelatorios por esta:


 // --- FUNÇÃO GENÉRICA PARA PÁGINA DE RELATÓRIO ---
    const renderRelatorioGenerico = (config) => {
        const section = document.getElementById(config.sectionId);
        if (!section) return;

        section.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-3xl font-bold text-gray-800 mb-2 flex items-center"><i class="${config.icon} fa-fw mr-4 text-gray-500"></i>${config.title}</h2>
                <p class="text-gray-600 mb-6">${config.description}</p>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t pt-6">
                    <div><label for="${config.entityName}-data-inicio" class="block font-medium text-sm">Data de Início</label><input type="date" id="${config.entityName}-data-inicio" class="w-full p-2 border rounded-md mt-1"></div>
                    <div><label for="${config.entityName}-data-fim" class="block font-medium text-sm">Data de Fim</label><input type="date" id="${config.entityName}-data-fim" class="w-full p-2 border rounded-md mt-1"></div>
                    <button id="consultar-${config.entityName}-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-${config.entityName}-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 w-full flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-${config.entityName}" class="mt-6 hidden border-t pt-6"></div>
            </div>`;

        document.getElementById(`consultar-${config.entityName}-btn`).addEventListener('click', async () => {
            const dataInicio = document.getElementById(`${config.entityName}-data-inicio`).value;
            const dataFim = document.getElementById(`${config.entityName}-data-fim`).value;
            const container = document.getElementById(`container-${config.entityName}`);
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;
            try {
                const data = await api.get(`${config.endpoint}?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (data.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum resultado encontrado para o período selecionado.</p>`;
                    return;
                }
                const tableHeaders = `<tr>${config.tableHeaders.map(h => `<th class="p-3">${h}</th>`).join('')}</tr>`;
                const tableRows = data.map(item => `<tr class="border-b hover:bg-gray-50">${config.renderRow(item)}</tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100 text-gray-600 uppercase">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById(`pdf-${config.entityName}-btn`).addEventListener('click', () => {
            const dataInicio = document.getElementById(`${config.entityName}-data-inicio`).value;
            const dataFim = document.getElementById(`${config.entityName}-data-fim`).value;
            if (!dataInicio || !dataFim) {
                alert("Por favor, selecione a data de início e a data de fim para gerar o PDF.");
                return;
            }
            window.open(`/api/${config.endpoint}/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    };



    // --- Funções que abrem os Modais ---
    const openModal = (title, formHtml, entity) => {
        if(modal && modalTitle && modalForm) {
            modalForm.removeAttribute('data-edit-id');
            modalTitle.textContent = title;
            modalForm.innerHTML = formHtml;
            modalForm.dataset.entity = entity;
            modal.classList.remove('hidden');
            // Adiciona um novo estado ao histórico do navegador quando o modal é aberto
            history.pushState({ modal: true }, null);
        }
    };
    const openSetorModal = async (id = null) => {
        let setor = { nome: '', descricao: '' };
        let title = 'Adicionar Novo Setor';
        if (id) {
            try {
                setor = await api.get('setores', id);
                title = 'Editar Setor';
            } catch (error) { alert('Não foi possível carregar os dados do setor.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome do Setor</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${setor.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${setor.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'setores');
        if (id) modalForm.dataset.editId = id;
    };
    const openCategoriaModal = async (id = null) => {
        let categoria = { nome: '', descricao: '' };
        let title = 'Adicionar Nova Categoria';
        if (id) {
            try {
                categoria = await api.get('categorias', id);
                title = 'Editar Categoria';
            } catch (error) { alert('Não foi possível carregar os dados da categoria.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome da Categoria</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${categoria.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${categoria.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'categorias');
        if (id) modalForm.dataset.editId = id;
    };
    const openAlmoxarifadoModal = async (id = null) => {
        let almoxarifado = { nome: '', localizacao: '' };
        let title = 'Adicionar Novo Almoxarifado';
        if (id) {
            try {
                almoxarifado = await api.get('almoxarifados', id);
                title = 'Editar Almoxarifado';
            } catch (error) { alert('Não foi possível carregar os dados do almoxarifado.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome do Almoxarifado</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${almoxarifado.nome}" required></div>
                <div><label class="block font-medium">Localização</label><input type="text" name="localizacao" class="w-full p-2 border rounded-md" value="${almoxarifado.localizacao || ''}"></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'almoxarifados');
        if (id) modalForm.dataset.editId = id;
    };
    const openProdutoModal = async (id = null) => {
        try {
            // Buscamos a resposta completa (objeto de paginação)
            const [categoriasResponse, almoxarifadosResponse, fornecedoresResponse] = await Promise.all([
                api.get('categorias?page=1&search='), 
                api.get('almoxarifados?page=1&search='),
                api.get('fornecedores') // Busca a lista de fornecedores
            ]);
    
            // Extraímos a lista de dados da propriedade 'data'
            const categorias = categoriasResponse.data;
            const almoxarifados = almoxarifadosResponse.data;
            const fornecedores = fornecedoresResponse.data;
            const categoriasOptions = categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            const almoxarifadosOptions = almoxarifados.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
            const fornecedoresOptions = `<option value="">Nenhum</option>` + fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
            let produto = { 
                nome: '', unidade: '', preco_unitario: '', estoque: 0, 
                categoria_id: '', almoxarifado_id: '', fornecedor_id: '', is_epi: false, is_peca_veicular: false 
            };
            let title = 'Adicionar Novo Produto';
    
            if (id) {
                produto = await api.get('produtos', id);
                title = 'Editar Produto';
            }
    
            const formHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2"><label class="block font-medium">Nome do Produto</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${produto.nome}" required></div>
                    <div><label class="block font-medium">Categoria</label><select name="categoria_id" class="w-full p-2 border rounded-md" required>${categoriasOptions}</select></div>
                    <div><label class="block font-medium">Almoxarifado</label><select name="almoxarifado_id" class="w-full p-2 border rounded-md" required>${almoxarifadosOptions}</select></div>
                    <div class="md:col-span-2"><label class="block font-medium">Fornecedor (Opcional)</label><select name="fornecedor_id" class="w-full p-2 border rounded-md">${fornecedoresOptions}</select></div>
                    <div id="add-nota-produto-container" class="md:col-span-2 hidden">
                        <button type="button" id="add-nota-produto-btn" class="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Adicionar Nota Fiscal para este Fornecedor</button>
                    </div>
                    <div><label class="block font-medium">Unidade (ex: kg, un, L)</label><input type="text" name="unidade" class="w-full p-2 border rounded-md" value="${produto.unidade || ''}"></div>
                    <div><label class="block font-medium">Preço Unitário (R$)</label><input type="number" step="0.01" name="preco_unitario" class="w-full p-2 border rounded-md" value="${produto.preco_unitario || ''}"></div>
                    <div><label class="block font-medium">Estoque Atual</label><input type="number" name="estoque" class="w-full p-2 border rounded-md" value="${produto.estoque}"></div>
                </div>
                <div class="mt-4 pt-4 border-t space-y-3">
                     <label class="flex items-center space-x-3">
                        <input type="checkbox" name="is_epi" class="h-5 w-5" ${produto.is_epi ? 'checked' : ''}>
                        <span class="text-gray-700 font-medium">Este produto é um EPI (Equipamento de Proteção Individual)</span>
                    </label>
                    <label class="flex items-center space-x-3">
                        <input type="checkbox" name="is_peca_veicular" class="h-5 w-5" ${produto.is_peca_veicular ? 'checked' : ''}>
                        <span class="text-gray-700 font-medium">Este produto é uma Peça Veicular</span>
                    </label>
                </div>
                <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
            
            openModal(title, formHtml, 'produtos');
            // --- ADICIONE ESTE BLOCO DE CÓDIGO NO FINAL DA FUNÇÃO ---
            const fornecedorSelect = modalForm.querySelector('select[name="fornecedor_id"]');
            const addNotaContainer = modalForm.querySelector('#add-nota-produto-container');
            const addNotaBtn = modalForm.querySelector('#add-nota-produto-btn');

            const toggleNotaButton = () => {
                const fornecedorId = fornecedorSelect.value;
                addNotaContainer.classList.toggle('hidden', !fornecedorId);
            };
            fornecedorSelect.addEventListener('change', toggleNotaButton);
            addNotaBtn.addEventListener('click', () => {
                const fornecedorId = fornecedorSelect.value;
                if (fornecedorId) {
                    openNotaFiscalFormModal(fornecedorId);
                }
            });
            if (id) {
                modalForm.dataset.editId = id;
                modalForm.querySelector('select[name="categoria_id"]').value = produto.categoria_id;
                modalForm.querySelector('select[name="almoxarifado_id"]').value = produto.almoxarifado_id;
                if (produto.fornecedor_id) {
                    modalForm.querySelector('select[name="fornecedor_id"]').value = produto.fornecedor_id;
                }
            }
        } catch (error) {
            alert('Não foi possível carregar os dados para o modal de produtos.');
            console.error(error);
        }
    };   

        const openFuncionarioModal = async (id = null) => {
        // --- CORREÇÃO APLICADA AQUI ---
        // Busca a resposta completa do servidor (o objeto de paginação)
        const setoresResponse = await api.get('setores');
        // E extrai a lista de dados de dentro da propriedade 'data'
        const setores = setoresResponse.data;
        // --- FIM DA MODIFICAÇÃO ---
    
        const setoresOptions = setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
        
        let funcionario = { nome: '', cargo: '', setor_id: '' };
        let title = 'Adicionar Novo Funcionário';
        
        if (id) {
            try {
                funcionario = await api.get('funcionarios', id);
                title = 'Editar Funcionário';
            } catch (error) { 
                alert('Não foi possível carregar os dados do funcionário.'); 
                return; 
            }
        }
    
        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block font-medium">Nome Completo</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${funcionario.nome}" required></div>
                <div><label class="block font-medium">Cargo</label><input type="text" name="cargo" class="w-full p-2 border rounded-md" value="${funcionario.cargo || ''}"></div>
                <div class="md:col-span-2"><label class="block font-medium">Setor</label><select name="setor_id" class="w-full p-2 border rounded-md" required>${setoresOptions}</select></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        
        openModal(title, formHtml, 'funcionarios');
        
        if (id) {
            modalForm.dataset.editId = id;
            modalForm.querySelector('select[name="setor_id"]').value = funcionario.setor_id;
        }
    };
    const openFuncaoModal = async (id = null) => {
        let funcao = { nome: '', descricao: '' };
        let title = 'Adicionar Nova Função';
        if (id) {
            try {
                funcao = await api.get('funcoes', id);
                title = 'Editar Função';
            } catch (error) { alert('Não foi possível carregar os dados da função.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome da Função</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${funcao.nome}" required></div>
                <div><label class="block font-medium">Descrição</label><textarea name="descricao" class="w-full p-2 border rounded-md" rows="3">${funcao.descricao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'funcoes');
        if (id) modalForm.dataset.editId = id;
    };
    const openUsuarioModal = async (id = null) => {
        let user = { username: '', role: 'supervisor' };
        let title = 'Adicionar Novo Utilizador';
        if (id) {
            try {
                user = await api.get('usuarios', id);
                title = 'Editar Utilizador';
            } catch (error) { alert('Não foi possível carregar os dados do utilizador.'); return; }
        }
        
        const passwordField = id 
            ? `<div><label class="block font-medium">Nova Senha</label><input type="password" name="password" class="w-full p-2 border rounded-md" placeholder="Deixe em branco para não alterar"></div>`
            : `<div><label class="block font-medium">Senha</label><input type="password" name="password" class="w-full p-2 border rounded-md" required></div>`;

        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome de Utilizador</label><input type="text" name="username" class="w-full p-2 border rounded-md" value="${user.username}" required></div>
                ${passwordField}
                <div>
                    <label class="block font-medium">Perfil</label>
                    <select name="role" class="w-full p-2 border rounded-md">
                        <option value="gerente" ${user.role === 'gerente' ? 'selected' : ''}>Gerente</option>
                        <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="operador" ${user.role === 'operador' ? 'selected' : ''}>Operador</option>
                    </select>
                </div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'usuarios');
        if (id) modalForm.dataset.editId = id;
    };
    const openTipoCombustivelModal = async (id = null) => {
        let tipo = { nome: '' };
        let title = 'Adicionar Novo Tipo de Combustível';
        if (id) {
            try {
                tipo = await api.get('tipos_combustivel', id);
                title = 'Editar Tipo de Combustível';
            } catch (error) { alert('Não foi possível carregar os dados.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome (ex: Diesel S10, Gasolina)</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${tipo.nome}" required></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'tipos_combustivel');
        if (id) modalForm.dataset.editId = id;
    };
    const openTipoVeiculoModal = async (id = null) => {
        let tipo = { nome: '' };
        let title = 'Adicionar Novo Tipo de Veículo';
        if (id) {
            try {
                tipo = await api.get('tipos_veiculo', id);
                title = 'Editar Tipo de Veículo';
            } catch (error) { alert('Não foi possível carregar os dados.'); return; }
        }
        const formHtml = `
            <div class="space-y-4">
                <div><label class="block font-medium">Nome (ex: Trator, Camião)</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${tipo.nome}" required></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'tipos_veiculo');
        if (id) modalForm.dataset.editId = id;
    };
    // Em app/static/js/app.js

    const openVeiculoModal = async (id = null) => {
        // --- CORREÇÃO APLICADA AQUI ---
        // Busca a resposta completa do servidor (o objeto de paginação)
        const tiposVeiculoResponse = await api.get('tipos_veiculo');
        // E extrai a lista de dados de dentro da propriedade 'data'
        const tiposVeiculo = tiposVeiculoResponse.data;
        // --- FIM DA MODIFICAÇÃO ---
    
        const tiposOptions = tiposVeiculo.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    
        let veiculo = { nome: '', placa: '', tipo_veiculo_id: '' };
        let title = 'Adicionar Novo Veículo';
        if (id) {
            try {
                veiculo = await api.get('veiculos', id);
                title = 'Editar Veículo';
            } catch (error) { 
                alert('Não foi possível carregar os dados do veículo.'); 
                return; 
            }
        }
    
        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block font-medium">Nome do Veículo</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${veiculo.nome}" required></div>
                <div><label class="block font-medium">Placa</label><input type="text" name="placa" class="w-full p-2 border rounded-md" value="${veiculo.placa || ''}"></div>
                <div class="md:col-span-2"><label class="block font-medium">Tipo de Veículo</label><select name="tipo_veiculo_id" class="w-full p-2 border rounded-md" required>${tiposOptions}</select></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        
        openModal(title, formHtml, 'veiculos');
        
        if (id) {
            modalForm.dataset.editId = id;
            modalForm.querySelector('select[name="tipo_veiculo_id"]').value = veiculo.tipo_veiculo_id;
        }
    };
   // Em app/static/js/app.js

    const renderControleCombustivel = async () => {
        const section = document.getElementById('controle_combustivel');
        section.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

        try {
            const [dados, tiposCombustivelResponse, veiculosResponse, funcoesResponse, fornecedoresResponse] = await Promise.all([
                api.get('combustivel/dados'),
                api.get('tipos_combustivel'),
                api.get('veiculos'),
                api.get('funcoes'),
                api.get('fornecedores') // Busca a lista de fornecedores
            ]);

            const tiposCombustivel = tiposCombustivelResponse.data;
            const veiculos = veiculosResponse.data;
            const funcoes = funcoesResponse.data;
            const fornecedores = fornecedoresResponse.data;

            const tiposCombustivelOptions = tiposCombustivel.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
            const veiculosOptions = veiculos.map(v => `<option value="${v.id}" data-hodometro="${v.hodometro_horimetro || 0}">${v.nome}</option>`).join('');
            const funcoesOptions = funcoes.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
            // --- Adiciona a opção "Nenhum" para o fornecedor ser opcional ---
            const fornecedoresOptions = `<option value="">Nenhum</option>` + fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
            
            const stockCards = dados.estoque.map(e => `
                <div class="bg-white p-4 rounded-lg shadow-sm border">
                    <h4 class="font-semibold text-gray-700">${e.tipo_combustivel_nome}</h4>
                    <p class="text-2xl font-bold text-gray-900">${e.quantidade.toFixed(2)} L</p>
                </div>
            `).join('');

            section.innerHTML = `
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Controlo de Combustível</h2>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-white p-6 rounded-xl shadow-md">
                            <h3 class="text-lg font-bold mb-4">Stock Atual</h3>
                            <div class="grid grid-cols-2 gap-4">${stockCards || '<p class="col-span-2 text-sm text-gray-500">Nenhum stock registado.</p>'}</div>
                        </div>
                        <div class="bg-white p-6 rounded-xl shadow-md">
                            <h3 class="text-lg font-bold mb-4">Registar Entrada (Compra)</h3>
                            <form id="form-entrada-combustivel" class="space-y-4">
                                <div><label class="block text-sm font-medium">Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposCombustivelOptions}</select></div>
                                
                                <div><label class="block text-sm font-medium">Fornecedor (Opcional)</label><select name="fornecedor_id" class="w-full p-2 border rounded-md">${fornecedoresOptions}</select></div>
                               
                                <div id="add-nota-combustivel-container" class="hidden">
                                    <button type="button" id="add-nota-combustivel-btn" class="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Adicionar Nota Fiscal para este Fornecedor</button>
                                </div>

                                <div><label class="block text-sm font-medium">Quantidade (Litros)</label><input type="number" name="quantidade" step="0.01" class="w-full p-2 border rounded-md" required></div>
                                <div><label class="block text-sm font-medium">Preço por Litro (R$)</label><input type="number" name="preco_litro" step="0.01" class="w-full p-2 border rounded-md" required></div>
                                <div class="text-right"><button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Registar Entrada</button></div>
                            </form>
                        </div>
                    </div>
                    <div class="lg:col-span-2 space-y-6">
                        <div class="bg-white p-6 rounded-xl shadow-md">
                            <h3 class="text-lg font-bold mb-4">Registar Saída (Abastecimento)</h3>
                            <form id="form-saida-combustivel" class="space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label class="block text-sm font-medium">Veículo</label><select name="veiculo_id" id="saida-veiculo-select" class="w-full p-2 border rounded-md" required>${veiculosOptions}</select></div>
                                    <div><label class="block text-sm font-medium">Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposCombustivelOptions}</select></div>
                                    <div><label class="block text-sm font-medium">Função / Tarefa</label><select name="funcao_id" class="w-full p-2 border rounded-md" required>${funcoesOptions}</select></div>
                                    <div><label class="block text-sm font-medium">Horas Trabalhadas</label><input type="number" name="horas_trabalhadas" step="0.1" class="w-full p-2 border rounded-md" required></div>
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium">Hodómetro / Horímetro Atual</label>
                                        <input type="number" name="hodometro_horimetro" id="hodometro-input" step="0.1" class="w-full p-2 border rounded-md" required placeholder="Último registo: 0">
                                    </div>
                                </div>
                                <div><label class="block text-sm font-medium">Quantidade Abastecida (Litros)</label><input type="number" name="quantidade_abastecida" step="0.01" class="w-full p-2 border rounded-md" required></div>
                                <div class="text-right"><button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg">Registar Saída</button></div>
                            </form>
                        </div>
                        <div class="bg-white p-6 rounded-xl shadow-md">
                            <h3 class="text-lg font-bold mb-4">Histórico Recente de Saídas</h3>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-sm">
                                    <thead class="bg-gray-50">
                                        <tr><th class="p-2">Data</th><th class="p-2">Veículo</th><th class="p-2">Função</th><th class="p-2">Qtd (L)</th><th class="p-2">Horas Trab.</th><th class="p-2">Hod./Horím.</th><th class="p-2">Utilizador</th></tr>
                                    </thead>
                                    <tbody id="historico-saidas-combustivel"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

                // --- ADICIONE ESTE BLOCO DE CÓDIGO ANTES DA LÓGICA DO HODÔMETRO ---
            const fornecedorSelectComb = section.querySelector('select[name="fornecedor_id"]');
            const addNotaContainerComb = section.querySelector('#add-nota-combustivel-container');
            const addNotaBtnComb = section.querySelector('#add-nota-combustivel-btn');

            const toggleNotaButtonComb = () => {
                const fornecedorId = fornecedorSelectComb.value;
                addNotaContainerComb.classList.toggle('hidden', !fornecedorId);
            };

            fornecedorSelectComb.addEventListener('change', toggleNotaButtonComb);
            addNotaBtnComb.addEventListener('click', () => {
                const fornecedorId = fornecedorSelectComb.value;
                if (fornecedorId) {
                    openNotaFiscalFormModal(fornecedorId);
                }
            });
            const veiculoSelect = section.querySelector('#saida-veiculo-select');
            const hodometroInput = section.querySelector('#hodometro-input');
            



            
            const updateHodometroPlaceholder = () => {
                if (veiculoSelect.options.length > 0) {
                    const selectedOption = veiculoSelect.options[veiculoSelect.selectedIndex];
                    const ultimoRegisto = selectedOption.dataset.hodometro;
                    hodometroInput.placeholder = "Último registo: " + ultimoRegisto;
                    hodometroInput.min = ultimoRegisto;
                }
            };
            veiculoSelect.addEventListener('change', updateHodometroPlaceholder);
            updateHodometroPlaceholder();

            // Lógica dos formulários
            const formEntrada = section.querySelector('#form-entrada-combustivel');
            formEntrada.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target).entries());
                try {
                    const result = await api.post('combustivel/entradas', data);
                    alert(result.message);
                    showSection('controle_combustivel');
                } catch (error) { alert(error.message); }
            });

            const formSaida = section.querySelector('#form-saida-combustivel');
            formSaida.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target).entries());
                try {
                    const result = await api.post('combustivel/saidas', data);
                    alert(result.message);
                    showSection('controle_combustivel');
                } catch (error) { alert(error.message); }
            });

            // Preenche a tabela de histórico
            const tableBody = section.querySelector('#historico-saidas-combustivel');
            if (dados.historico.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">Nenhuma saída registada.</td></tr>';
            } else {
                tableBody.innerHTML = dados.historico.map(s => `
                    <tr class="border-b">
                        <td class="p-2">${s.data}</td>
                        <td class="p-2">${s.veiculo_nome}</td>
                        <td class="p-2">${s.funcao_nome}</td>
                        <td class="p-2">${s.quantidade}</td>
                        <td class="p-2">${s.horas}</td>
                        <td class="p-2">${s.hodometro_horimetro || ''}</td>
                        <td class="p-2">${s.usuario_nome}</td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            section.innerHTML = '<p class="text-center p-8 text-red-500">Falha ao carregar dados.</p>';
        }
    };
    const openManutencaoModal = async (id = null) => {
        try {
            const [veiculosResponse, pecasResponse] = await Promise.all([
                api.get('veiculos?page=1&search='),
                api.get('produtos?search=&per_page=9999')
            ]);

            const veiculos = veiculosResponse.data;
            const pecas = pecasResponse.data.filter(p => p.is_peca_veicular);

            const veiculosOptions = veiculos.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
            const pecasOptions = pecas.map(p => `<option value="${p.id}">${p.nome} (Est: ${p.estoque})</option>`).join('');

            let title = 'Registar Nova Manutenção';
            const formHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block font-medium">Veículo</label><select name="veiculo_id" class="w-full p-2 border rounded-md" required>${veiculosOptions}</select></div>
                    <div><label class="block font-medium">Tipo</label><select name="tipo" class="w-full p-2 border rounded-md" required><option>Preventiva</option><option>Corretiva</option></select></div>
                    <div><label class="block font-medium">Data</label><input type="date" name="data" class="w-full p-2 border rounded-md" value="${new Date().toISOString().split('T')[0]}" required></div>
                    <div><label class="block font-medium">Custo Mão de Obra (R$)</label><input type="number" name="custo_mo" step="0.01" class="w-full p-2 border rounded-md" value="0"></div>
                    <div class="md:col-span-2"><label class="block font-medium">Descrição do Serviço</label><textarea name="descricao" rows="3" class="w-full p-2 border rounded-md" required></textarea></div>
                </div>
                <div class="mt-6 pt-4 border-t">
                    <h4 class="font-bold mb-2">Peças Utilizadas</h4>
                    <div id="pecas-container" class="space-y-2"></div>
                    <button type="button" id="add-peca-btn" class="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">Adicionar Peça</button>
                </div>
                <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar Manutenção</button></div>
            `;
            
            openModal(title, formHtml, 'manutencoes');
            
            const pecasContainer = document.getElementById('pecas-container');
            document.getElementById('add-peca-btn').addEventListener('click', () => {
                const div = document.createElement('div');
                div.classList.add('flex', 'items-center', 'gap-2', 'peca-row');
                // --- SINTAXE CORRETA AQUI (usando crases ``) ---
                div.innerHTML = `<select class="peca-produto w-2/3 p-2 border rounded-md">${pecasOptions}</select><input type="number" class="peca-quantidade w-1/3 p-2 border rounded-md" placeholder="Qtd." min="1" value="1"><button type="button" class="remove-peca-btn text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>`;
                pecasContainer.appendChild(div);
            });

            pecasContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-peca-btn')) {
                    e.target.parentElement.remove();
                }
            });
        } catch (error) {
            alert("Erro ao abrir o modal de manutenção. Verifique se existem veículos e produtos cadastrados.");
            console.error(error);
        }
    };  

    const openRelatorioManutencaoModal = () => {
        const title = 'Relatório de Custos de Manutenção';
        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Filtre os custos por um período específico para ver os totais com peças e mão de obra para cada veículo.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="modal-man-data-inicio" class="block font-medium text-sm">Data de Início</label>
                        <input type="date" id="modal-man-data-inicio" class="w-full p-2 border rounded-md mt-1">
                    </div>
                    <div>
                        <label for="modal-man-data-fim" class="block font-medium text-sm">Data de Fim</label>
                        <input type="date" id="modal-man-data-fim" class="w-full p-2 border rounded-md mt-1">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button id="consultar-man-modal-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-man-modal-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-man-modal" class="mt-4 border-t pt-4 hidden"></div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-manutencao');

        // Adiciona os eventos aos botões
        document.getElementById('consultar-man-modal-btn').addEventListener('click', async () => {
            const dataInicio = document.getElementById('modal-man-data-inicio').value;
            const dataFim = document.getElementById('modal-man-data-fim').value;
            const container = document.getElementById('container-man-modal');
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

            try {
                const custos = await api.get(`relatorios/custos-manutencao?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (custos.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum custo encontrado.</p>`;
                    return;
                }
                const tableHeaders = `<tr><th class="p-3">Veículo</th><th class="p-3 text-right">Custo Peças (R$)</th><th class="p-3 text-right">Custo M. Obra (R$)</th><th class="p-3 text-right">Custo Total (R$)</th></tr>`;
                const tableRows = custos.map(c => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3 font-medium">${c.veiculo_nome}</td>
                        <td class="p-3 text-right">R$ ${c.custo_pecas.toFixed(2)}</td>
                        <td class="p-3 text-right">R$ ${c.custo_mo.toFixed(2)}</td>
                        <td class="p-3 text-right font-bold">R$ ${c.custo_total.toFixed(2)}</td>
                    </tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById('pdf-man-modal-btn').addEventListener('click', () => {
            const dataInicio = document.getElementById('modal-man-data-inicio').value;
            const dataFim = document.getElementById('modal-man-data-fim').value;
            window.open(`/api/relatorios/custos-manutencao/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    };
   const openRelatorioEstoqueModal = async () => {
        const title = 'Relatório de Posição de Estoque';
        
        // Busca os dados para os filtros antes de abrir o modal
        let almoxarifadosOptions = '<option value="todos">Geral (Todos)</option>';
        let categoriasOptions = '<option value="todos">Geral (Todas)</option>';

        try {
            const [almoxarifadosResponse, categoriasResponse] = await Promise.all([
                api.get('almoxarifados'),
                api.get('categorias')
            ]);
            almoxarifadosResponse.data.forEach(a => {
                almoxarifadosOptions += `<option value="${a.id}">${a.nome}</option>`;
            });
            categoriasResponse.data.forEach(c => {
                categoriasOptions += `<option value="${c.id}">${c.nome}</option>`;
            });
        } catch (error) {
            alert('Erro ao carregar filtros. Tente novamente.');
            return;
        }

        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Gere um PDF com a posição do estoque. Você pode filtrar por um almoxarifado ou categoria específica, ou gerar um relatório geral.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="filtro-almoxarifado" class="block font-medium text-sm">Filtrar por Almoxarifado</label>
                        <select id="filtro-almoxarifado" class="w-full p-2 border rounded-md mt-1">${almoxarifadosOptions}</select>
                    </div>
                    <div>
                        <label for="filtro-categoria" class="block font-medium text-sm">Filtrar por Categoria</label>
                        <select id="filtro-categoria" class="w-full p-2 border rounded-md mt-1">${categoriasOptions}</select>
                    </div>
                </div>

                <div class="flex justify-end pt-4 border-t mt-4">
                    <button id="pdf-est-modal-btn" class="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 w-full md:w-auto flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Gerar PDF</button>
                </div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-estoque');

        // Adiciona evento ao botão
        document.getElementById('pdf-est-modal-btn').addEventListener('click', () => {
            const almoxarifadoId = document.getElementById('filtro-almoxarifado').value;
            const categoriaId = document.getElementById('filtro-categoria').value;
            
            // Constrói a URL com os parâmetros de filtro
            const url = `/api/relatorios/estoque/pdf?almoxarifado_id=${almoxarifadoId}&categoria_id=${categoriaId}`;
            window.open(url, '_blank');
        });
    };

    const openRelatorioMovimentacoesModal = () => {
        const title = 'Relatório de Movimentações';
        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Filtre as movimentações por um período específico.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="modal-mov-data-inicio" class="block font-medium text-sm">Data de Início</label>
                        <input type="date" id="modal-mov-data-inicio" class="w-full p-2 border rounded-md mt-1">
                    </div>
                    <div>
                        <label for="modal-mov-data-fim" class="block font-medium text-sm">Data de Fim</label>
                        <input type="date" id="modal-mov-data-fim" class="w-full p-2 border rounded-md mt-1">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button id="consultar-mov-modal-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-mov-modal-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-mov-modal" class="mt-4 border-t pt-4 hidden"></div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-movimentacoes');

        // Adiciona os eventos aos botões recém-criados dentro do modal
        document.getElementById('consultar-mov-modal-btn').addEventListener('click', async () => {
            const dataInicio = document.getElementById('modal-mov-data-inicio').value;
            const dataFim = document.getElementById('modal-mov-data-fim').value;
            const container = document.getElementById('container-mov-modal');
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

            try {
                const relatorio = await api.get(`relatorios/movimentacoes?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (relatorio.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum resultado encontrado.</p>`;
                    return;
                }
                const tableHeaders = `<tr><th class="p-3">Data</th><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Qtd.</th><th class="p-3">Setor</th><th class="p-3 text-right">Valor (R$)</th></tr>`;
                const tableRows = relatorio.map(r => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${r.data}</td>
                        <td class="p-3 font-medium">${r.produto_nome}</td>
                        <td class="p-3">${r.tipo}</td>
                        <td class="p-3">${r.quantidade}</td>
                        <td class="p-3">${r.setor_nome}</td>
                        <td class="p-3 text-right">R$ ${r.valor_total.toFixed(2)}</td>
                    </tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById('pdf-mov-modal-btn').addEventListener('click', () => {
            const dataInicio = document.getElementById('modal-mov-data-inicio').value;
            const dataFim = document.getElementById('modal-mov-data-fim').value;
            if (!dataInicio || !dataFim) {
                alert("Por favor, selecione as datas para gerar o PDF.");
                return;
            }
            window.open(`/api/relatorios/movimentacoes/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    }; 




    
    const openFornecedorModal = async (id = null) => {
        let fornecedor = {};
        let title = 'Adicionar Novo Fornecedor';
        if (id) {
            try {
                fornecedor = await api.get('fornecedores', id);
                title = 'Editar Fornecedor';
            } catch (error) { alert('Não foi possível carregar os dados do fornecedor.'); return; }
        }

        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div class="lg:col-span-2"><label class="block font-medium">Nome</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${fornecedor.nome || ''}" required></div>
                <div><label class="block font-medium">Contato</label><input type="text" name="contato" class="w-full p-2 border rounded-md" value="${fornecedor.contato || ''}"></div>
                <div class="lg:col-span-3"><label class="block font-medium">Razão Social</label><input type="text" name="razao_social" class="w-full p-2 border rounded-md" value="${fornecedor.razao_social || ''}"></div>
                <div><label class="block font-medium">CNPJ</label><input type="text" name="cnpj" class="w-full p-2 border rounded-md" value="${fornecedor.cnpj || ''}"></div>
                <div><label class="block font-medium">Inscrição Estadual</label><input type="text" name="inscricao_estadual" class="w-full p-2 border rounded-md" value="${fornecedor.inscricao_estadual || ''}"></div>
                <div><label class="block font-medium">Telefone Fixo</label><input type="text" name="fone" class="w-full p-2 border rounded-md" value="${fornecedor.fone || ''}"></div>
                <div><label class="block font-medium">Celular</label><input type="text" name="cel" class="w-full p-2 border rounded-md" value="${fornecedor.cel || ''}"></div>
                <div><label class="block font-medium">WhatsApp</label><input type="text" name="whatsapp" class="w-full p-2 border rounded-md" value="${fornecedor.whatsapp || ''}"></div>
                <div class="lg:col-span-2"><label class="block font-medium">Endereço</label><input type="text" name="endereco" class="w-full p-2 border rounded-md" value="${fornecedor.endereco || ''}"></div>
                <div><label class="block font-medium">Bairro</label><input type="text" name="bairro" class="w-full p-2 border rounded-md" value="${fornecedor.bairro || ''}"></div>
                <div><label class="block font-medium">CEP</label><input type="text" name="cep" class="w-full p-2 border rounded-md" value="${fornecedor.cep || ''}"></div>
                <div><label class="block font-medium">Cidade</label><input type="text" name="cidade" class="w-full p-2 border rounded-md" value="${fornecedor.cidade || ''}"></div>
                 <div>
                    <label class="block font-medium">Estado (UF)</label>
                    <select name="estado" class="w-full p-2 border rounded-md">
                        <option value="">Selecione...</option>
                        <option value="AC" ${fornecedor.estado === 'AC' ? 'selected' : ''}>Acre</option>
                        <option value="AL" ${fornecedor.estado === 'AL' ? 'selected' : ''}>Alagoas</option>
                        <option value="AP" ${fornecedor.estado === 'AP' ? 'selected' : ''}>Amapá</option>
                        <option value="AM" ${fornecedor.estado === 'AM' ? 'selected' : ''}>Amazonas</option>
                        <option value="BA" ${fornecedor.estado === 'BA' ? 'selected' : ''}>Bahia</option>
                        <option value="CE" ${fornecedor.estado === 'CE' ? 'selected' : ''}>Ceará</option>
                        <option value="DF" ${fornecedor.estado === 'DF' ? 'selected' : ''}>Distrito Federal</option>
                        <option value="ES" ${fornecedor.estado === 'ES' ? 'selected' : ''}>Espírito Santo</option>
                        <option value="GO" ${fornecedor.estado === 'GO' ? 'selected' : ''}>Goiás</option>
                        <option value="MA" ${fornecedor.estado === 'MA' ? 'selected' : ''}>Maranhão</option>
                        <option value="MT" ${fornecedor.estado === 'MT' ? 'selected' : ''}>Mato Grosso</option>
                        <option value="MS" ${fornecedor.estado === 'MS' ? 'selected' : ''}>Mato Grosso do Sul</option>
                        <option value="MG" ${fornecedor.estado === 'MG' ? 'selected' : ''}>Minas Gerais</option>
                        <option value="PA" ${fornecedor.estado === 'PA' ? 'selected' : ''}>Pará</option>
                        <option value="PB" ${fornecedor.estado === 'PB' ? 'selected' : ''}>Paraíba</option>
                        <option value="PR" ${fornecedor.estado === 'PR' ? 'selected' : ''}>Paraná</option>
                        <option value="PE" ${fornecedor.estado === 'PE' ? 'selected' : ''}>Pernambuco</option>
                        <option value="PI" ${fornecedor.estado === 'PI' ? 'selected' : ''}>Piauí</option>
                        <option value="RJ" ${fornecedor.estado === 'RJ' ? 'selected' : ''}>Rio de Janeiro</option>
                        <option value="RN" ${fornecedor.estado === 'RN' ? 'selected' : ''}>Rio Grande do Norte</option>
                        <option value="RS" ${fornecedor.estado === 'RS' ? 'selected' : ''}>Rio Grande do Sul</option>
                        <option value="RO" ${fornecedor.estado === 'RO' ? 'selected' : ''}>Rondônia</option>
                        <option value="RR" ${fornecedor.estado === 'RR' ? 'selected' : ''}>Roraima</option>
                        <option value="SC" ${fornecedor.estado === 'SC' ? 'selected' : ''}>Santa Catarina</option>
                        <option value="SP" ${fornecedor.estado === 'SP' ? 'selected' : ''}>São Paulo</option>
                        <option value="SE" ${fornecedor.estado === 'SE' ? 'selected' : ''}>Sergipe</option>
                        <option value="TO" ${fornecedor.estado === 'TO' ? 'selected' : ''}>Tocantins</option>
                    </select>
                </div>
                <div class="lg:col-span-2"><label class="block font-medium">E-mail</label><input type="email" name="email" class="w-full p-2 border rounded-md" value="${fornecedor.email || ''}"></div>
                <div><label class="block font-medium">Site</label><input type="text" name="site" class="w-full p-2 border rounded-md" value="${fornecedor.site || ''}"></div>
                <div class="lg:col-span-3"><label class="block font-medium">Observação</label><textarea name="observacao" class="w-full p-2 border rounded-md" rows="3">${fornecedor.observacao || ''}</textarea></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        
        openModal(title, formHtml, 'fornecedores');
        if (id) modalForm.dataset.editId = id;
    };    

const openRelatorioSaidaCombustivelModal = () => {
        const title = 'Relatório de Saída de Combustível';
        const formHtml = `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Filtre as saídas de combustível por um período para ver todos os abastecimentos registados.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label for="modal-saida-comb-data-inicio" class="block font-medium text-sm">Data de Início</label>
                        <input type="date" id="modal-saida-comb-data-inicio" class="w-full p-2 border rounded-md mt-1">
                    </div>
                    <div>
                        <label for="modal-saida-comb-data-fim" class="block font-medium text-sm">Data de Fim</label>
                        <input type="date" id="modal-saida-comb-data-fim" class="w-full p-2 border rounded-md mt-1">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button id="consultar-saida-comb-modal-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"><i class="fas fa-search mr-2"></i>Consultar</button>
                    <button id="pdf-saida-comb-modal-btn" class="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 flex items-center justify-center"><i class="fas fa-file-pdf mr-2"></i>Imprimir PDF</button>
                </div>
                <div id="container-saida-comb-modal" class="mt-4 border-t pt-4 hidden"></div>
            </div>
        `;

        openModal(title, formHtml, 'relatorio-saida-combustivel');

        // Adiciona os eventos aos botões
        document.getElementById('consultar-saida-comb-modal-btn').addEventListener('click', async () => {
            const dataInicio = document.getElementById('modal-saida-comb-data-inicio').value;
            const dataFim = document.getElementById('modal-saida-comb-data-fim').value;
            const container = document.getElementById('container-saida-comb-modal');
            container.classList.remove('hidden');
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

            try {
                const saidas = await api.get(`relatorios/saidas-combustivel?data_inicio=${dataInicio}&data_fim=${dataFim}`);
                if (saidas.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhuma saída encontrada.</p>`;
                    return;
                }
                const tableHeaders = `<tr><th class="p-3">Data</th><th class="p-3">Veículo</th><th class="p-3">Combustível</th><th class="p-3">Função</th><th class="p-3 text-right">Qtd (L)</th><th class="p-3 text-right">Horímetro</th><th class="p-3">Utilizador</th></tr>`;
                const tableRows = saidas.map(s => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${s.data}</td>
                        <td class="p-3 font-medium">${s.veiculo_nome}</td>
                        <td class="p-3">${s.tipo_combustivel_nome}</td>
                        <td class="p-3">${s.funcao_nome}</td>
                        <td class="p-3 text-right">${s.quantidade.toFixed(2)}</td>
                        <td class="p-3 text-right">${s.hodometro_horimetro || ''}</td>
                        <td class="p-3 text-gray-500">${s.usuario_nome}</td>
                    </tr>`).join('');
                container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-100">${tableHeaders}</thead><tbody>${tableRows}</tbody></table></div>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        document.getElementById('pdf-saida-comb-modal-btn').addEventListener('click', () => {
            const dataInicio = document.getElementById('modal-saida-comb-data-inicio').value;
            const dataFim = document.getElementById('modal-saida-comb-data-fim').value;
            if (!dataInicio || !dataFim) {
                alert("Por favor, selecione as datas para gerar o PDF.");
                return;
            }
            window.open(`/api/relatorios/saidas-combustivel/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`, '_blank');
        });
    };

    const openCodigoAcessoModal = async () => {
        let title = 'Gerar Nova Chave de Acesso';
        const formHtml = `
            <div class="space-y-4">
                <div>
                    <label class="block font-medium">Nível de Permissão para a Nova Chave</label>
                    <select name="role" class="w-full p-2 border rounded-md">
                        <option value="supervisor" selected>Supervisor</option>
                        <option value="gerente">Gerente</option>
                    </select>
                </div>
                <p class="text-sm text-gray-600">Será gerado um código aleatório de 8 dígitos para o nível de permissão selecionado.</p>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Gerar Chave</button></div>`;
        
        openModal(title, formHtml, 'codigos-acesso');
    };   
    
    

    const openNotaFiscalFormModal = async (fornecedorId, notaId = null) => {
        let nota = { numero: '', data_emissao: new Date().toISOString().slice(0, 10), valor_total: '' };
        let title = 'Adicionar Nova Nota Fiscal';

        if (notaId) {
            try {
                nota = await api.get('notas-fiscais', notaId);
                title = 'Editar Nota Fiscal';
            } catch (error) {
                alert('Não foi possível carregar os dados da nota fiscal.');
                return;
            }
        }

        const formHtml = `
            <input type="hidden" name="fornecedor_id" value="${fornecedorId}">
            <div class="space-y-4">
                <div><label class="block font-medium">Número da Nota</label><input type="text" name="numero" class="w-full p-2 border rounded-md" value="${nota.numero}" required></div>
                <div><label class="block font-medium">Data de Emissão</label><input type="date" name="data_emissao" class="w-full p-2 border rounded-md" value="${nota.data_emissao}" required></div>
                <div><label class="block font-medium">Valor Total (R$)</label><input type="number" step="0.01" name="valor_total" class="w-full p-2 border rounded-md" value="${nota.valor_total}" required></div>
            </div>
            <div class="text-right mt-6 border-t pt-4">
                <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button>
            </div>`;

        openModal(title, formHtml, 'notas-fiscais');
        if (notaId) {
            modalForm.dataset.editId = notaId;
        }
    };

    // --- FUNÇÃO PARA O MODAL MESTRE-DETALHE DE FORNECEDORES ---
    const openNotasFiscaisModal = async (fornecedorId, fornecedorNome) => {
        const title = `Notas Fiscais de: ${fornecedorNome}`;
        const formHtml = `
            <div class="flex justify-end mb-4">
                <button id="add-nota-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center">
                    <i class="fas fa-plus mr-2"></i>Adicionar Nota Fiscal
                </button>
            </div>
            <div class="overflow-y-auto max-h-96">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="p-2">Número</th>
                            <th class="p-2">Data Emissão</th>
                            <th class="p-2 text-right">Valor Total</th>
                            <th class="p-2 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="notas-fiscais-table-body">
                        <tr><td colspan="4" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>
                    </tbody>
                </table>
            </div>`;

        openModal(title, formHtml, 'notas-fiscais-list');

        const renderTable = async () => {
            const tableBody = document.getElementById('notas-fiscais-table-body');
            try {
                const notas = await api.get(`fornecedores/${fornecedorId}/notas`);
                if (notas.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Nenhuma nota fiscal registada.</td></tr>`;
                } else {
                    tableBody.innerHTML = notas.map(n => `
                        <tr class="border-b">
                            <td class="p-2">${n.numero}</td>
                            <td class="p-2">${n.data_emissao}</td>
                            <td class="p-2 text-right">R$ ${n.valor_total.toFixed(2)}</td>
                            <td class="p-2 text-center">
                                <button class="text-blue-600 hover:text-blue-800 mr-3 edit-nota-btn" data-id="${n.id}" title="Editar Nota"><i class="fas fa-edit"></i></button>
                                <button class="text-red-600 hover:text-red-800 delete-nota-btn" data-id="${n.id}" title="Excluir Nota"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                 tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-500">Falha ao carregar notas.</td></tr>`;
            }
        };

        document.getElementById('add-nota-btn').addEventListener('click', () => {
            openNotaFiscalFormModal(fornecedorId);
        });

        document.getElementById('notas-fiscais-table-body').addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-nota-btn');
            const deleteBtn = e.target.closest('.delete-nota-btn');

            if (editBtn) {
                openNotaFiscalFormModal(fornecedorId, editBtn.dataset.id);
            }

            if (deleteBtn) {
                if (confirm('Tem a certeza que deseja apagar esta nota fiscal?')) {
                    try {
                        await api.delete('notas-fiscais', deleteBtn.dataset.id);
                        renderTable();
                    } catch (error) {
                        alert(error.message);
                    }
                }
            }
        });

        renderTable();
    };

     const fornecedoresConfig = {
        sectionId: 'fornecedores',
        entityName: 'fornecedores',
        endpoint: 'fornecedores',
        title: 'Cadastro de Fornecedores',
        addBtnText: 'Adicionar Fornecedor',
        tableHeaders: ['Nome', 'Razão Social', 'Contato', 'Telefone', 'Cidade', 'Ações'],
        renderRow: (f) => `
            <td class="p-3 font-medium">${f.nome}</td>
            <td class="p-3">${f.razao_social || ''}</td>
            <td class="p-3">${f.contato || ''}</td>
            <td class="p-3">${f.fone || ''}</td>
            <td class="p-3">${f.cidade || ''}</td>`,
        openModalFn: openFornecedorModal
    };
    const codigosAcessoConfig = {
    sectionId: 'codigos_acesso',
    entityName: 'codigos-acesso',
    endpoint: 'admin/codigos-acesso', // <-- ESTA É A VERSÃO CORRETA
    title: 'Gerir Chaves de Acesso',
    addBtnText: 'Gerar Nova Chave',
        tableHeaders: ['Código', 'Nível Permitido', 'Usado?', 'Ações'],
        renderRow: (c) => `
            <td class="p-3 font-mono">${c.codigo}</td>
            <td class="p-3">${c.role_permitida}</td>
            <td class="p-3">${c.usado ? '<span class="text-red-500 font-semibold">Sim</span>' : '<span class="text-green-500 font-semibold">Não</span>'}</td>
        `,
        openModalFn: openCodigoAcessoModal
    };

    // --- Configurações para cada Módulo de Cadastro ---
    const setoresConfig = {
        sectionId: 'setores', entityName: 'setores', endpoint: 'setores', title: 'Cadastro de Setores', addBtnText: 'Adicionar Setor',
        tableHeaders: ['ID', 'Nome', 'Descrição', 'Ações'],
        renderRow: (s) => `<td class="p-3">${s.id}</td><td class="p-3 font-medium">${s.nome}</td><td class="p-3">${s.descricao || ''}</td>`,
        openModalFn: openSetorModal
    };


    const categoriasConfig = {
        sectionId: 'categorias', entityName: 'categorias', endpoint: 'categorias', title: 'Cadastro de Categorias', addBtnText: 'Adicionar Categoria',
        tableHeaders: ['ID', 'Nome', 'Descrição', 'Ações'],
        renderRow: (c) => `<td class="p-3">${c.id}</td><td class="p-3 font-medium">${c.nome}</td><td class="p-3">${c.descricao || ''}</td>`,
        openModalFn: openCategoriaModal
    };
    const almoxarifadosConfig = {
        sectionId: 'almoxarifados', entityName: 'almoxarifados', endpoint: 'almoxarifados', title: 'Cadastro de Almoxarifados', addBtnText: 'Adicionar Almoxarifado',
        tableHeaders: ['ID', 'Nome', 'Localização', 'Ações'],
        renderRow: (a) => `<td class="p-3">${a.id}</td><td class="p-3 font-medium">${a.nome}</td><td class="p-3">${a.localizacao || ''}</td>`,
        openModalFn: openAlmoxarifadoModal
    };
    const produtosConfig = {
        sectionId: 'produtos', entityName: 'produtos', endpoint: 'produtos', title: 'Cadastro de Produtos', addBtnText: 'Adicionar Produto',
        tableHeaders: ['Nome', 'Categoria', 'Almoxarifado', 'Estoque', 'Preço', 'Ações'],
        renderRow: (p) => `<td class="p-3 font-medium">${p.nome}</td><td>${p.categoria_nome}</td><td>${p.almoxarifado_nome}</td><td>${p.estoque} ${p.unidade || ''}</td><td>${p.preco_unitario ? `R$ ${p.preco_unitario.toFixed(2)}` : ''}</td>`,
        openModalFn: openProdutoModal
    };
    const usuariosConfig = {
        sectionId: 'usuarios', entityName: 'usuarios', endpoint: 'usuarios', title: 'Gestão de Utilizadores', addBtnText: 'Adicionar Utilizador',
        tableHeaders: ['ID', 'Nome de Utilizador', 'Perfil', 'Ações'],
        renderRow: (u) => `<td class="p-3">${u.id}</td><td class="p-3 font-medium">${u.username}</td><td class="p-3">${u.role}</td>`,
        openModalFn: openUsuarioModal
    };
    const funcoesConfig = {
        sectionId: 'funcoes', entityName: 'funcoes', endpoint: 'funcoes', title: 'Cadastro de Funções', addBtnText: 'Adicionar Função',
        tableHeaders: ['ID', 'Nome', 'Descrição', 'Ações'],
        renderRow: (f) => `<td class="px-4 py-3">${f.id}</td><td class="px-4 py-3 font-medium text-gray-900">${f.nome}</td><td class="px-4 py-3 text-gray-500">${f.descricao || ''}</td>`,
        openModalFn: openFuncaoModal
    };
    const tiposCombustivelConfig = {
        sectionId: 'tipos_combustivel', entityName: 'tipos_combustivel', endpoint: 'tipos_combustivel', title: 'Cadastro de Tipos de Combustível', addBtnText: 'Adicionar Tipo',
        tableHeaders: ['ID', 'Nome', 'Ações'],
        renderRow: (t) => `<td class="px-4 py-3">${t.id}</td><td class="px-4 py-3 font-medium text-gray-900">${t.nome}</td>`,
        openModalFn: openTipoCombustivelModal
    };
    const tiposVeiculoConfig = {
        sectionId: 'tipos_veiculo', entityName: 'tipos_veiculo', endpoint: 'tipos_veiculo', title: 'Cadastro de Tipos de Veículo', addBtnText: 'Adicionar Tipo',
        tableHeaders: ['ID', 'Nome', 'Ações'],
        renderRow: (t) => `<td class="px-4 py-3">${t.id}</td><td class="px-4 py-3 font-medium text-gray-900">${t.nome}</td>`,
        openModalFn: openTipoVeiculoModal
    };
    const veiculosConfig = {
        sectionId: 'veiculos', entityName: 'veiculos', endpoint: 'veiculos', title: 'Cadastro de Veículos', addBtnText: 'Adicionar Veículo',
        tableHeaders: ['Nome', 'Placa', 'Tipo de Veículo', 'Ações'],
        renderRow: (v) => `<td class="px-4 py-3 font-medium text-gray-900">${v.nome}</td><td class="px-4 py-3">${v.placa || ''}</td><td class="px-4 py-3">${v.tipo_veiculo_nome}</td>`,
        openModalFn: openVeiculoModal
    };
    const funcionariosConfig = {
        sectionId: 'funcionarios', entityName: 'funcionarios', endpoint: 'funcionarios', title: 'Cadastro de Funcionários', addBtnText: 'Adicionar Funcionário',
        tableHeaders: ['Nome', 'Cargo', 'Setor', 'Ações'],
        renderRow: (f) => `<td class="p-3 font-medium">${f.nome}</td><td class="p-3">${f.cargo || ''}</td><td class="p-3">${f.setor_nome}</td>`,
        openModalFn: openFuncionarioModal
    };

    const manutencoesConfig = {
        sectionId: 'manutencoes',
        entityName: 'manutencoes',
        endpoint: 'manutencoes',
        title: 'Controlo de Manutenção de Frota',
        addBtnText: 'Registar Manutenção',
        tableHeaders: ['Data', 'Veículo', 'Tipo', 'Descrição', 'Custo Total', 'Ações'],
        renderRow: (m) => `
            <td class="p-3">${m.data}</td>
            <td class="p-3 font-medium">${m.veiculo_nome}</td>
            <td class="p-3">${m.tipo}</td>
            <td class="p-3 text-sm text-gray-600">${m.descricao.substring(0, 50)}...</td>
            <td class="p-3">R$ ${m.custo_total.toFixed(2)}</td>
        `,
        openModalFn: openManutencaoModal
    };
        const relatorioMovimentacoesConfig = {
        sectionId: 'relatorio-movimentacoes',
        entityName: 'movimentacoes',
        endpoint: 'relatorios/movimentacoes',
        icon: 'fas fa-exchange-alt',
        title: 'Relatório de Movimentações',
        description: 'Gera um histórico de todas as entradas e saídas de produtos num período específico.',
        tableHeaders: ['Data', 'Produto', 'Tipo', 'Qtd.', 'Setor', 'Utilizador', 'Valor Total (R$)'],
        renderRow: (r) => `
            <td class="p-3">${r.data}</td>
            <td class="p-3 font-medium">${r.produto_nome}</td>
            <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${r.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${r.tipo}</span></td>
            <td class="p-3">${r.quantidade}</td>
            <td class="p-3">${r.setor_nome}</td>
            <td class="p-3 text-gray-500">${r.usuario_nome}</td>
            <td class="p-3 text-right">R$ ${r.valor_total.toFixed(2)}</td>`
    };

    // --- Mapeamento e Navegação ---
    const renderers = {
        'dashboard': renderDashboard,
        'setores': () => renderGenericCrud(setoresConfig),
        'categorias': () => renderGenericCrud(categoriasConfig),
        'almoxarifados': () => renderGenericCrud(almoxarifadosConfig),
        'produtos': () => renderGenericCrud(produtosConfig),
        'usuarios': () => renderGenericCrud(usuariosConfig),
        'movimentacoes': renderMovimentacoes,
        'funcoes': () => renderGenericCrud(funcoesConfig),
        'tipos_veiculo': () => renderGenericCrud(tiposVeiculoConfig),
        'veiculos': () => renderGenericCrud(veiculosConfig),
        'controle_combustivel': renderControleCombustivel,
        'tipos_combustivel': () => renderGenericCrud(tiposCombustivelConfig),
        'fornecedores': () => renderGenericCrud(fornecedoresConfig),
        'manutencoes': () => renderGenericCrud(manutencoesConfig),
        'codigos_acesso': () => renderGenericCrud(codigosAcessoConfig),
        'relatorio-movimentacoes': () => renderRelatorioGenerico(relatorioMovimentacoesConfig),
        'funcionarios': () => renderGenericCrud(funcionariosConfig)
    };
    
    // --- Event Listeners Globais ---
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (button && button.classList.contains('edit-mov-btn')) {
            const movimentacaoId = button.dataset.id;
            openMovimentacaoModal(movimentacaoId);
            return; // Interrompe a execução para não confundir com o outro listener
        }
        if (!button || !button.dataset.entity) return;
        const { id, entity } = button.dataset;
// --- NOVA LÓGICA PARA BOTÃO DE DETALHES ---
       if (button && button.classList.contains('details-btn')) {
            const fornecedorId = button.dataset.id;
            const fornecedorNome = button.dataset.name;
            openNotasFiscaisModal(fornecedorId, fornecedorNome);
            return;
        }
        if (button.classList.contains('delete-btn')) {
            if (confirm(`Tem a certeza que deseja excluir este item?`)) {
                try {
                    const result = await api.delete(entity, id);
                    alert(result.message);
                    showSection(entity);
                } catch (error) { alert(error.message); }
            }
        } else if (button.classList.contains('edit-btn')) {
            if (entity === 'setores') openSetorModal(id);
            else if (entity === 'categorias') openCategoriaModal(id);
            else if (entity === 'almoxarifados') openAlmoxarifadoModal(id);
            else if (entity === 'produtos') openProdutoModal(id);
            else if (entity === 'usuarios') openUsuarioModal(id);
            else if (entity === 'funcoes') openFuncaoModal(id);
            else if (entity === 'tipos_combustivel') openTipoCombustivelModal(id);
            else if (entity === 'tipos_veiculo') openTipoVeiculoModal(id);
            else if (entity === 'veiculos') openVeiculoModal(id);
            else if (entity === 'fornecedores') openFornecedorModal(id);
            else if (entity === 'codigos_acesso') openCodigoAcessoModal();
            else if (button.classList.contains('edit-btn')) 
            if (entity === 'manutencoes') openManutencaoModal(id);
            else if (entity === 'funcionarios') openFuncionarioModal(id);
        }
    });
    window.addEventListener('popstate', (event) => {
        // Se o utilizador clicar em "Voltar", escondemos o modal visualmente
        // sem adicionar um novo estado ao histórico.
        const modalElement = document.getElementById('form-modal');
        if (modalElement && !modalElement.classList.contains('hidden')) {
            modalElement.classList.add('hidden');
        }
    });
    
     window.addEventListener('beforeunload', (event) => {
        // Exibe uma mensagem de confirmação padrão do navegador
        // para impedir que o utilizador feche a página acidentalmente.
        event.preventDefault();
        event.returnValue = '';
    });
    // Substitua o bloco acima por este
if(modalForm) {
    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- CORREÇÃO APLICADA AQUI ---
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent; // Guarda o texto original do botão
        submitButton.disabled = true;
        submitButton.textContent = 'Aguarde...';

        const entity = e.target.dataset.entity;
        const editId = e.target.dataset.editId;
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (entity === 'produtos') {
            data.is_epi = e.target.querySelector('input[name="is_epi"]').checked;
            data.is_peca_veicular = e.target.querySelector('input[name="is_peca_veicular"]').checked;
        }
        // --- LÓGICA ADICIONADA PARA RECOLHER PEÇAS DA MANUTENÇÃO ---
        if (entity === 'notas-fiscais') {
                if (editId) {
                    result = await api.put('notas-fiscais', editId, data);
                } else {
                    result = await api.post('notas-fiscais', data);
                }
                closeModal();
                const fornecedorNome = document.querySelector('#modal-title').textContent.replace('Notas Fiscais de: ', '');
                openNotasFiscaisModal(data.fornecedor_id, fornecedorNome);
                return; 
            }

        if (entity === 'manutencoes') {
            data.pecas = [];
            document.querySelectorAll('.peca-row').forEach(row => {
                const produtoId = row.querySelector('.peca-produto').value;
                const quantidade = row.querySelector('.peca-quantidade').value;
                if (produtoId && quantidade) {
                    data.pecas.push({
                        produto_id: produtoId,
                        quantidade: quantidade
                    });
                }
            });
        }
        if (editId && !data.password) {
            delete data.password;
        }

        try {
            let result;
            // --- NOVA CONDIÇÃO ADICIONADA AQUI ---
            if (entity === 'movimentacoes' && editId) {
                // Rota específica para a correção de movimentação
                result = await api.put('movimentacoes', editId, data);
            } else if (editId) {
                result = await api.put(entity, editId, data);
            } else {
                result = await api.post(entity, data);
            }
            alert(result.message);
            closeModal();
            // Recarrega a seção correta
            showSection(entity === 'movimentacoes' ? 'movimentacoes' : entity);
        } catch (error) {
            alert(error.message);
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}
    
    const showSection = (sectionId) => {
        contentSections.forEach(sec => sec.style.display = 'none');
        navLinks.forEach(link => link.classList.remove('active'));
        const sectionElement = document.getElementById(sectionId);
        const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (sectionElement) sectionElement.style.display = 'block';
        if (navLink) navLink.classList.add('active');
        if (mobileHeaderTitle && navLink) {
            mobileHeaderTitle.textContent = navLink.querySelector('span').textContent;
        }
        if (renderers[sectionId]) {
            renderers[sectionId]();
        }
    };
    
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Se o link tiver target="_blank", não fazemos nada e deixamos o navegador abri-lo.
        if (link.getAttribute('target') === '_blank') {
            return;
        }

        // Caso contrário, impedimos a ação padrão e carregamos a secção na página.
        e.preventDefault();
        showSection(link.dataset.section);
    });
});

    // Inicialização
    showSection('dashboard');
});