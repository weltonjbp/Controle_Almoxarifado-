# Em app/routes/produtos.py

from flask import Blueprint, jsonify, request
from ..models import db, Produto, Categoria, Almoxarifado
from flask_login import login_required
from ..decorators import gerente_required

produtos_bp = Blueprint('produtos', __name__)

@produtos_bp.route('/produtos', methods=['GET'])
def get_produtos():
    # --- LÓGICA DE BUSCA E PAGINAÇÃO ---
    page = request.args.get('page', 1, type=int)
    per_page = 20  # Define quantos itens por página
    search = request.args.get('search', '')

    query = Produto.query

    # Se houver um termo de busca, filtra os resultados
    if search:
        # O 'ilike' faz uma busca insensível a maiúsculas/minúsculas
        query = query.filter(Produto.nome.ilike(f'%{search}%'))

    # Usa o método 'paginate' do SQLAlchemy
    pagination = query.order_by(Produto.nome).paginate(page=page, per_page=per_page, error_out=False)
    produtos = pagination.items

    produtos_data = []
    for p in produtos:
        produtos_data.append({
            'id': p.id, 
            'nome': p.nome,
            'unidade': p.unidade,
            'preco_unitario': p.preco_unitario,
            'estoque': p.estoque,
            'categoria_nome': p.categoria.nome if p.categoria else 'Categoria Removida',
            'almoxarifado_nome': p.almoxarifado.nome if p.almoxarifado else 'Almoxarifado Removido',
            'fornecedor_nome': p.fornecedor.nome if p.fornecedor else 'N/A',
            'is_epi': p.is_epi,
            'is_peca_veicular': p.is_peca_veicular
        })
        
    return jsonify({
        'data': produtos_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@produtos_bp.route('/produtos/<int:id>', methods=['GET'])
def get_produto(id):
    produto = Produto.query.get_or_404(id)
    return jsonify({
        'id': produto.id, 
        'nome': produto.nome,
        'unidade': produto.unidade,
        'preco_unitario': produto.preco_unitario,
        'estoque': produto.estoque,
        'categoria_id': produto.categoria_id,
        'almoxarifado_id': produto.almoxarifado_id,
        'fornecedor_id': produto.fornecedor_id,
        'is_epi': produto.is_epi,
        'is_peca_veicular': produto.is_peca_veicular # <-- Adicionado
    })

@produtos_bp.route('/produtos', methods=['POST'])
def create_produto():
    data = request.get_json()
    required_fields = ['nome', 'categoria_id', 'almoxarifado_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Campos obrigatórios ausentes.'}), 400

    novo_produto = Produto(
        nome=data['nome'],
        unidade=data.get('unidade'),
        preco_unitario=data.get('preco_unitario'),
        estoque=data.get('estoque', 0),
        categoria_id=data['categoria_id'],
        almoxarifado_id=data['almoxarifado_id'],
        fornecedor_id=data.get('fornecedor_id') if data.get('fornecedor_id') else None,
        is_epi=data.get('is_epi', False),
        is_peca_veicular=data.get('is_peca_veicular', False) # <-- Adicionado
    )
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
    
    # --- CORREÇÃO APLICADA AQUI: Vírgula no final removida ---
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
    db.session.delete(produto)
    db.session.commit()
    return jsonify({'message': 'Produto apagado com sucesso!'})
