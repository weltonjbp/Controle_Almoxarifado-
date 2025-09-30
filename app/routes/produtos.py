# Em app/routes/produtos.py

from flask import Blueprint, jsonify, request
from ..models import db, Produto, Categoria, Almoxarifado, Fornecedor, Movimentacao
from flask_login import login_required, current_user
from ..decorators import gerente_required
import xml.etree.ElementTree as ET

produtos_bp = Blueprint('produtos', __name__)

@produtos_bp.route('/produtos/ler-xml-nfe', methods=['POST'])
@login_required
def ler_xml_nfe():
    if 'nfe_xml' not in request.files: return jsonify({'error': 'Nenhum ficheiro XML enviado.'}), 400
    file = request.files['nfe_xml']
    try:
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        root = ET.parse(file).getroot()
        cnpj_emitente = root.find('.//nfe:emit/nfe:CNPJ', ns).text
        fornecedor = Fornecedor.query.filter_by(cnpj=cnpj_emitente).first()
        fornecedor_id = fornecedor.id if fornecedor else None
        produtos_xml = []
        for det in root.findall('.//nfe:det', ns):
            prod_node = det.find('nfe:prod', ns)
            def get_value(tag, type_converter=str, default=None):
                node = prod_node.find(f'nfe:{tag}', ns)
                return type_converter(node.text) if node is not None and node.text is not None else default
            produto_data = {
                'nome': get_value('xProd'), 'unidade': get_value('uCom'),
                'quantidade': get_value('qCom', float, 0.0), 'preco_unitario': get_value('vUnCom', float, 0.0),
                'lote': get_value('nLote', str, ''), 'data_validade': get_value('dVal', str, '')
            }
            produtos_xml.append(produto_data)
        return jsonify({'produtos': produtos_xml, 'fornecedor_id': fornecedor_id})
    except Exception as e:
        return jsonify({'error': f'Erro ao processar o XML: {e}'}), 500

@produtos_bp.route('/produtos/importar-nfe', methods=['POST'])
@login_required
def importar_produtos_nfe():
    """Recebe uma lista de produtos do XML, cadastra-os ou atualiza, definindo o estoque inicial."""
    data = request.get_json()
    produtos_para_importar = data.get('produtos')

    if not produtos_para_importar:
        return jsonify({'error': 'Nenhum produto para importar.'}), 400

    try:
        count_novos = 0
        count_atualizados = 0
        for item in produtos_para_importar:
            # Procura o produto pelo nome
            produto_existente = Produto.query.filter_by(nome=item['nome']).first()

            if produto_existente:
                # Se o produto já existe, ATUALIZA os dados e SOMA o estoque
                produto_existente.preco_unitario = item['preco_unitario']
                produto_existente.fornecedor_id = item.get('fornecedor_id')
                produto_existente.estoque += float(item['quantidade']) # Soma ao estoque existente
                db.session.add(produto_existente)
                count_atualizados += 1
            else:
                # Se não existe, CRIA um novo produto com o estoque da nota
                novo_produto = Produto(
                    nome=item['nome'],
                    unidade=item['unidade'],
                    preco_unitario=item['preco_unitario'],
                    estoque=item['quantidade'], # Define o estoque inicial
                    categoria_id=item['categoria_id'],
                    almoxarifado_id=item['almoxarifado_id'],
                    fornecedor_id=item.get('fornecedor_id')
                )
                db.session.add(novo_produto)
                count_novos += 1

        db.session.commit()
        return jsonify({
            'message': f'Importação concluída! {count_novos} produtos novos cadastrados e {count_atualizados} produtos atualizados.'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Ocorreu um erro durante a importação: {e}'}), 500


# --- Rotas existentes (sem alterações) ---
@produtos_bp.route('/produtos', methods=['GET'])
def get_produtos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int) # Permite que a URL defina a quantidade
    search = request.args.get('search', '')
    query = Produto.query
    if search:
        query = query.filter(Produto.nome.ilike(f'%{search}%'))
    pagination = query.order_by(Produto.nome).paginate(page=page, per_page=per_page, error_out=False)
    produtos = pagination.items
    produtos_data = [{'id': p.id, 'nome': p.nome, 'unidade': p.unidade, 'preco_unitario': p.preco_unitario, 'estoque': p.estoque, 'categoria_nome': p.categoria.nome if p.categoria else 'Categoria Removida', 'almoxarifado_nome': p.almoxarifado.nome if p.almoxarifado else 'Almoxarifado Removido', 'fornecedor_nome': p.fornecedor.nome if p.fornecedor else 'N/A', 'is_epi': p.is_epi, 'is_peca_veicular': p.is_peca_veicular} for p in produtos]
    return jsonify({'data': produtos_data, 'total_pages': pagination.pages, 'current_page': pagination.page, 'has_next': pagination.has_next, 'has_prev': pagination.has_prev})

# ... (o resto das suas rotas GET, POST, PUT, DELETE continuam aqui sem alterações) ...
@produtos_bp.route('/produtos/<int:id>', methods=['GET'])
def get_produto(id):
    produto = Produto.query.get_or_404(id)
    return jsonify({'id': produto.id, 'nome': produto.nome, 'unidade': produto.unidade, 'preco_unitario': produto.preco_unitario, 'estoque': produto.estoque, 'categoria_id': produto.categoria_id, 'almoxarifado_id': produto.almoxarifado_id, 'fornecedor_id': produto.fornecedor_id, 'is_epi': produto.is_epi, 'is_peca_veicular': produto.is_peca_veicular})

@produtos_bp.route('/produtos', methods=['POST'])
def create_produto():
    data = request.get_json()
    required_fields = ['nome', 'categoria_id', 'almoxarifado_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Campos obrigatórios ausentes.'}), 400
    novo_produto = Produto(nome=data['nome'], unidade=data.get('unidade'), preco_unitario=data.get('preco_unitario'), estoque=data.get('estoque', 0), categoria_id=data['categoria_id'], almoxarifado_id=data['almoxarifado_id'], fornecedor_id=data.get('fornecedor_id') if data.get('fornecedor_id') else None, is_epi=data.get('is_epi', False), is_peca_veicular=data.get('is_peca_veicular', False))
    db.session.add(novo_produto)
    db.session.commit()
    return jsonify({'message': 'Produto criado com sucesso!', 'id': novo_produto.id}), 201

@produtos_bp.route('/produtos/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_produto(id):
    produto = Produto.query.get_or_404(id)
    data = request.get_json()
    produto.nome = data.get('nome', produto.nome)
    produto.unidade = data.get('unidade', produto.unidade)
    produto.preco_unitario = data.get('preco_unitario', produto.preco_unitario)
    produto.estoque = data.get('estoque', produto.estoque)
    produto.categoria_id = data.get('categoria_id', produto.categoria_id)
    produto.almoxarifado_id = data.get('almoxarifado_id', produto.almoxarifado_id)
    produto.fornecedor_id = data.get('fornecedor_id') if data.get('fornecedor_id') else None
    produto.is_epi = data.get('is_epi', produto.is_epi)
    produto.is_peca_veicular = data.get('is_peca_veicular', produto.is_peca_veicular)
    db.session.commit()
    return jsonify({'message': 'Produto atualizado com sucesso!'})

@produtos_bp.route('/produtos/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_produto(id):
    produto = Produto.query.get_or_404(id)

    # --- VERIFICAÇÃO ADICIONADA AQUI ---
    # Verifica se existe alguma movimentação associada a este produto.
    if Movimentacao.query.filter_by(produto_id=id).first():
        return jsonify({
            'error': 'Não é possível apagar este produto pois ele já possui um histórico de movimentações.'
        }), 409 # 409 Conflict é um bom código de status para esta situação

    db.session.delete(produto)
    db.session.commit()
    return jsonify({'message': 'Produto apagado com sucesso!'})