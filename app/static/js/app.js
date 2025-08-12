// Em app/static/js/app.js

// --- VARIÁVEL GLOBAL DE PERMISSÃO ---
// Pega o perfil do utilizador que foi passado pelo Flask no template HTML.
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

    // --- FUNÇÃO GENÉRICA PARA CADASTROS (CRUD) ---
    const renderGenericCrud = async (config) => {
        const section = document.getElementById(config.sectionId);
        if (!section) return;

        const addButton = (USER_ROLE === 'gerente' || USER_ROLE === 'supervisor')
            ? `<button id="add-${config.entityName}-btn" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"><i class="fas fa-plus mr-2"></i>${config.addBtnText}</button>`
            : '';

        section.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-gray-800">${config.title}</h2>
                ${addButton}
            </div>
            <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-100 text-gray-600 uppercase"><tr>${config.tableHeaders.map(h => `<th class="p-3">${h}</th>`).join('')}</tr></thead>
                    <tbody id="${config.entityName}-table-body"></tbody>
                </table>
            </div>`;

        if (USER_ROLE === 'gerente' || USER_ROLE === 'supervisor') {
            document.getElementById(`add-${config.entityName}-btn`).addEventListener('click', () => config.openModalFn());
        }

        const tableBody = section.querySelector(`#${config.entityName}-table-body`);
        tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;

        try {
            const items = await api.get(config.endpoint);
            if (items.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8 text-gray-500">Nenhum item cadastrado.</td></tr>`;
            } else {
                tableBody.innerHTML = items.map(item => {
                    const actionButtons = (USER_ROLE === 'gerente')
                        ? `<button class="text-blue-600 hover:text-blue-800 mr-3 edit-btn" data-id="${item.id}" data-entity="${config.entityName}" title="Editar"><i class="fas fa-edit"></i></button>
                           <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${item.id}" data-entity="${config.entityName}" title="Excluir"><i class="fas fa-trash"></i></button>`
                        : '';
                    return `<tr class="border-b hover:bg-gray-50">${config.renderRow(item)}<td class="p-3 text-center">${actionButtons}</td></tr>`;
                }).join('');
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="${config.tableHeaders.length}" class="text-center p-8 text-red-500">Falha ao carregar dados.</td></tr>`;
        }
    };

    // --- Funções de Renderização Específicas ---
    const renderDashboard = async () => {
        const section = document.getElementById('dashboard');
        section.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Total de Produtos</h3><p id="total-produtos" class="text-3xl font-bold text-blue-600 mt-2"></p></div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Valor Total em Estoque</h3><p id="valor-estoque" class="text-3xl font-bold text-green-600 mt-2"></p></div>
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"><h3 class="text-lg font-semibold text-gray-600">Alertas de Estoque Baixo</h3><p id="alertas-estoque" class="text-3xl font-bold text-red-500 mt-2"></p></div>
            </div>
            <div class="mt-8 bg-white p-6 rounded-lg shadow-md"><h3 class="text-xl font-semibold mb-4">Últimas Movimentações</h3><table class="w-full text-left"><thead><tr class="bg-gray-100"><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Quantidade</th><th class="p-3">Data</th><th class="p-3">Utilizador</th></tr></thead><tbody id="movimentacoes-recentes-table"></tbody></table></div>`;
        
        try {
            const stats = await api.get('dashboard-stats');
            document.getElementById('total-produtos').textContent = stats.total_produtos;
            const valor = Number(stats.valor_total_estoque) || 0;
            document.getElementById('valor-estoque').textContent = `R$ ${valor.toFixed(2)}`;
            document.getElementById('alertas-estoque').textContent = stats.alertas_estoque;
            const tableBody = document.getElementById('movimentacoes-recentes-table');
            if (stats.movimentacoes_recentes && stats.movimentacoes_recentes.length > 0) {
                tableBody.innerHTML = stats.movimentacoes_recentes.map(mov => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3 font-medium">${mov.produto_nome}</td>
                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${mov.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${mov.tipo}</span></td>
                        <td class="p-3">${mov.quantidade}</td>
                        <td class="p-3 text-gray-500">${mov.data}</td>
                        <td class="p-3 text-gray-500">${mov.usuario_nome}</td>
                    </tr>`).join('');
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">Nenhuma movimentação recente.</td></tr>`;
            }
        } catch (error) {
            section.innerHTML = `<p class="text-center p-8 text-red-500">Não foi possível carregar os dados do dashboard.</p>`;
        }
    };
    const renderMovimentacoes = async () => {
        const section = document.getElementById('movimentacoes');
        const [produtos, setores] = await Promise.all([api.get('produtos'), api.get('setores')]);
        const produtosOptions = produtos.map(p => `<option value="${p.id}">${p.nome} (Est: ${p.estoque})</option>`).join('');
        const setoresOptions = setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
        
        section.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Registar Movimentação</h2>
            <div class="bg-white p-8 rounded-lg shadow-md mb-8">
                <form id="movimentacao-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div><label class="block font-medium">Produto</label><select name="produto_id" class="w-full p-2 border rounded-md" required>${produtosOptions}</select></div>
                        <div><label class="block font-medium">Tipo</label><select name="tipo" class="w-full p-2 border rounded-md" required><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
                        <div><label class="block font-medium">Quantidade</label><input type="number" name="quantidade" class="w-full p-2 border rounded-md" required min="1"></div>
                        <div><label class="block font-medium">Setor</label><select name="setor_id" class="w-full p-2 border rounded-md" required>${setoresOptions}</select></div>
                    </div>
                    <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Registar</button></div>
                </form>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-4">Histórico de Movimentações</h3>
            <div class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <table class="w-full text-left text-sm"><thead class="bg-gray-100 text-gray-600 uppercase">
                    <tr><th class="p-3">Data</th><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Qtd.</th><th class="p-3">Setor</th><th class="p-3">Utilizador</th></tr>
                </thead><tbody id="movimentacoes-table-body"></tbody></table>
            </div>`;

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
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;
        try {
            const movimentacoes = await api.get('movimentacoes');
            if (movimentacoes.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-500">Nenhuma movimentação registada.</td></tr>`;
            } else {
                tableBody.innerHTML = movimentacoes.map(m => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${m.data}</td>
                        <td class="p-3 font-medium">${m.produto_nome}</td>
                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${m.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${m.tipo}</span></td>
                        <td class="p-3">${m.quantidade}</td>
                        <td class="p-3">${m.setor_nome}</td>
                        <td class="p-3 text-gray-500">${m.usuario_nome}</td>
                    </tr>`).join('');
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Falha ao carregar dados.</td></tr>`;
        }
    };
    const renderRelatorios = () => {
        const section = document.getElementById('relatorios');
        // CORREÇÃO: O HTML foi limpo e organizado corretamente.
        section.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-800 mb-6">Relatório de Movimentações</h2>
            <div class="bg-white p-6 rounded-lg shadow-md mb-8">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label for="rel-data-inicio" class="block font-medium">Data de Início</label><input type="date" id="rel-data-inicio" class="w-full p-2 border rounded-md"></div>
                    <div><label for="rel-data-fim" class="block font-medium">Data de Fim</label><input type="date" id="rel-data-fim" class="w-full p-2 border rounded-md"></div>
                    
                    <button id="gerar-relatorio-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full">Ver Relatório</button>
                    <button id="gerar-pdf-btn" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 w-full flex items-center justify-center">
                        <i class="fas fa-file-pdf mr-2"></i>Gerar PDF
                    </button>
                </div>
            </div>
            <div id="relatorio-container" class="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <p class="text-center p-8 text-gray-500">Selecione um período e clique em "Ver Relatório" ou "Gerar PDF".</p>
            </div>`;

        // Event listener para o botão de ver o relatório na tela
        document.getElementById('gerar-relatorio-btn').addEventListener('click', async () => {
            const dataInicio = document.getElementById('rel-data-inicio').value;
            const dataFim = document.getElementById('rel-data-fim').value;
            const container = document.getElementById('relatorio-container');
            
            container.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;
            
            try {
                const url = `relatorios/movimentacoes?data_inicio=${dataInicio}&data_fim=${dataFim}`;
                const relatorio = await api.get(url);

                if (relatorio.length === 0) {
                    container.innerHTML = `<p class="text-center p-8 text-gray-500">Nenhum resultado encontrado para o período selecionado.</p>`;
                    return;
                }
                
                const tableHeaders = `<tr><th class="p-3">Data</th><th class="p-3">Produto</th><th class="p-3">Tipo</th><th class="p-3">Qtd.</th><th class="p-3">Setor</th><th class="p-3">Utilizador</th><th class="p-3">Valor Total (R$)</th></tr>`;
                const tableRows = relatorio.map(r => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-3">${r.data}</td>
                        <td class="p-3 font-medium">${r.produto_nome}</td>
                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${r.tipo === 'entrada' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${r.tipo}</span></td>
                        <td class="p-3">${r.quantidade}</td>
                        <td class="p-3">${r.setor_nome}</td>
                        <td class="p-3 text-gray-500">${r.usuario_nome}</td>
                        <td class="p-3">R$ ${r.valor_total.toFixed(2)}</td>
                    </tr>`).join('');

                container.innerHTML = `<table class="w-full text-left text-sm"><thead class="bg-gray-100 text-gray-600 uppercase">${tableHeaders}</thead><tbody>${tableRows}</tbody></table>`;
            } catch (error) {
                container.innerHTML = `<p class="text-center p-8 text-red-500">Falha ao gerar o relatório.</p>`;
            }
        });

        // Event listener para o botão de gerar PDF
        document.getElementById('gerar-pdf-btn').addEventListener('click', () => {
            const dataInicio = document.getElementById('rel-data-inicio').value;
            const dataFim = document.getElementById('rel-data-fim').value;

            if (!dataInicio || !dataFim) {
                alert("Por favor, selecione a data de início e a data de fim para gerar o PDF.");
                return;
            }

            const url = `/api/relatorios/movimentacoes/pdf?data_inicio=${dataInicio}&data_fim=${dataFim}`;
            window.open(url, '_blank');
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
        const [categorias, almoxarifados] = await Promise.all([api.get('categorias'), api.get('almoxarifados')]);
        const categoriasOptions = categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        const almoxarifadosOptions = almoxarifados.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
        let produto = { nome: '', unidade: '', preco_unitario: '', estoque: 0, categoria_id: '', almoxarifado_id: '' };
        let title = 'Adicionar Novo Produto';
        if (id) {
            try {
                produto = await api.get('produtos', id);
                title = 'Editar Produto';
            } catch (error) { alert('Não foi possível carregar os dados do produto.'); return; }
        }
        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2"><label class="block font-medium">Nome do Produto</label><input type="text" name="nome" class="w-full p-2 border rounded-md" value="${produto.nome}" required></div>
                <div><label class="block font-medium">Categoria</label><select name="categoria_id" class="w-full p-2 border rounded-md" required>${categoriasOptions}</select></div>
                <div><label class="block font-medium">Almoxarifado</label><select name="almoxarifado_id" class="w-full p-2 border rounded-md" required>${almoxarifadosOptions}</select></div>
                <div><label class="block font-medium">Unidade (ex: kg, un, L)</label><input type="text" name="unidade" class="w-full p-2 border rounded-md" value="${produto.unidade || ''}"></div>
                <div><label class="block font-medium">Preço Unitário (R$)</label><input type="number" step="0.01" name="preco_unitario" class="w-full p-2 border rounded-md" value="${produto.preco_unitario || ''}"></div>
                <div><label class="block font-medium">Estoque</label><input type="number" name="estoque" class="w-full p-2 border rounded-md" value="${produto.estoque}"></div>
            </div>
            <div class="text-right mt-6 border-t pt-4"><button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Salvar</button></div>`;
        openModal(title, formHtml, 'produtos');
        if (id) {
            modalForm.dataset.editId = id;
            modalForm.querySelector('select[name="categoria_id"]').value = produto.categoria_id;
            modalForm.querySelector('select[name="almoxarifado_id"]').value = produto.almoxarifado_id;
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
                        <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="gerente" ${user.role === 'gerente' ? 'selected' : ''}>Gerente</option>
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

    const openVeiculoModal = async (id = null) => {
        // Busca os tipos de veículo para preencher o dropdown
        const tiposVeiculo = await api.get('tipos_veiculo');
        const tiposOptions = tiposVeiculo.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

        let veiculo = { nome: '', placa: '', tipo_veiculo_id: '' };
        let title = 'Adicionar Novo Veículo';
        if (id) {
            try {
                veiculo = await api.get('veiculos', id);
                title = 'Editar Veículo';
            } catch (error) { alert('Não foi possível carregar os dados do veículo.'); return; }
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

    const renderControleCombustivel = async () => {
        const section = document.getElementById('controle_combustivel');
        section.innerHTML = `<div class="text-center p-8"><div class="loader mx-auto"></div></div>`;

        // Busca todos os dados necessários em paralelo
        const [dados, tiposCombustivel, veiculos, funcoes] = await Promise.all([
            api.get('combustivel/dados'),
            api.get('tipos_combustivel'),
            api.get('veiculos'),
            api.get('funcoes')
        ]);

        const tiposCombustivelOptions = tiposCombustivel.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        const veiculosOptions = veiculos.map(v => `<option value="${v.id}">${v.nome}</option>`).join('');
        const funcoesOptions = funcoes.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

        // Monta os cards de stock
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
                                <div><label class="block text-sm font-medium">Veículo</label><select name="veiculo_id" class="w-full p-2 border rounded-md" required>${veiculosOptions}</select></div>
                                <div><label class="block text-sm font-medium">Tipo de Combustível</label><select name="tipo_combustivel_id" class="w-full p-2 border rounded-md" required>${tiposCombustivelOptions}</select></div>
                                <div><label class="block text-sm font-medium">Função / Tarefa Realizada</label><select name="funcao_id" class="w-full p-2 border rounded-md" required>${funcoesOptions}</select></div>
                                <div><label class="block text-sm font-medium">Horas Trabalhadas</label><input type="number" name="horas_trabalhadas" step="0.1" class="w-full p-2 border rounded-md" required></div>
                            </div>
                            <div><label class="block text-sm font-medium">Quantidade Abastecida (Litros)</label><input type="number" name="quantidade_abastecida" step="0.01" class="w-full p-2 border rounded-md" required></div>
                            <div class="text-right"><button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg">Registar Saída</button></div>
                        </form>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md">
                        <h3 class="text-lg font-bold mb-4">Histórico Recente de Saídas</h3>
                        <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-gray-50"><tr><th class="p-2">Data</th><th class="p-2">Veículo</th><th class="p-2">Função</th><th class="p-2">Qtd (L)</th><th class="p-2">Horas</th><th class="p-2">Utilizador</th></tr></thead><tbody id="historico-saidas-combustivel"></tbody></table></div>
                    </div>
                </div>
            </div>
        `;

        // Lógica para os formulários
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
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-500">Nenhuma saída registada.</td></tr>`;
        } else {
            tableBody.innerHTML = dados.historico.map(s => `
                <tr class="border-b"><td class="p-2">${s.data}</td><td class="p-2">${s.veiculo_nome}</td><td class="p-2">${s.funcao_nome}</td><td class="p-2">${s.quantidade}</td><td class="p-2">${s.horas}</td><td class="p-2">${s.usuario_nome}</td></tr>
            `).join('');
        }
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
        'relatorios': renderRelatorios
    };
    
    // --- Event Listeners Globais ---
    document.body.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.entity) return;
        const { id, entity } = button.dataset;

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
            else if (entity === 'funcoes') openFuncaoModal(id); // ADICIONADO
            else if (entity === 'tipos_combustivel') openTipoCombustivelModal(id);
            else if (entity === 'tipos_veiculo') openTipoVeiculoModal(id);
            else if (entity === 'veiculos') openVeiculoModal(id);
        }
    });

    if(modalForm) {
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const entity = e.target.dataset.entity;
            const editId = e.target.dataset.editId;
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            // Não envia a senha se o campo estiver vazio durante a edição
            if (editId && !data.password) {
                delete data.password;
            }
            try {
                let result;
                if (editId) {
                    result = await api.put(entity, editId, data);
                } else {
                    result = await api.post(entity, data);
                }
                alert(result.message);
                closeModal();
                showSection(entity);
            } catch (error) {
                alert(error.message);
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
                // VERIFICAÇÃO: Apenas executa o código se o link tiver o atributo 'data-section'
                if (link.hasAttribute('data-section')) {
                    e.preventDefault(); // Previne o comportamento padrão apenas para links internos
                    showSection(link.dataset.section);
                }
                // Se o link não tiver 'data-section' (como o nosso link do tutorial),
                // este código é ignorado, e o link funciona como um hyperlink normal.
            });
        });

    // Inicialização
    showSection('dashboard');
});

