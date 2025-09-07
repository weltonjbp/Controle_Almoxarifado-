# Em app/routes/categorias.py

from flask import Blueprint, jsonify, request
# Corrigindo o import para ser relativo à estrutura do pacote
from ..models import db, Categoria
from flask_login import login_required
from ..decorators import gerente_required # Importar nosso novo decorator
categorias_bp = Blueprint('categorias', __name__)

@categorias_bp.route('/categorias', methods=['GET'])
def get_categorias():
    # --- LÓGICA DE BUSCA E PAGINAÇÃO ADICIONADA ---
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Categoria.query
    if search:
        query = query.filter(Categoria.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Categoria.nome).paginate(page=page, per_page=per_page, error_out=False)
    categorias = pagination.items

    categorias_data = [{'id': c.id, 'nome': c.nome, 'descricao': c.descricao} for c in categorias]
    
    return jsonify({
        'data': categorias_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@categorias_bp.route('/categorias/<int:id>', methods=['GET'])
def get_categoria(id):
    categoria = Categoria.query.get_or_404(id)
    return jsonify({'id': categoria.id, 'nome': categoria.nome, 'descricao': categoria.descricao})

@categorias_bp.route('/categorias', methods=['POST'])
@login_required
@gerente_required
def create_categoria():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome da categoria é obrigatório.'}), 400
    if Categoria.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Esta categoria já existe.'}), 409

    nova_categoria = Categoria(nome=data['nome'], descricao=data.get('descricao'))
    db.session.add(nova_categoria)
    db.session.commit()
    return jsonify({'message': 'Categoria criada com sucesso!', 'id': nova_categoria.id}), 201

@categorias_bp.route('/categorias/<int:id>', methods=['PUT'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def update_categoria(id):
    categoria = Categoria.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome != categoria.nome and Categoria.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de categoria já está em uso.'}), 409
        
    categoria.nome = novo_nome or categoria.nome
    categoria.descricao = data.get('descricao', categoria.descricao)
    db.session.commit()
    return jsonify({'message': 'Categoria atualizada com sucesso!'})

@categorias_bp.route('/categorias/<int:id>', methods=['DELETE'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def delete_categoria(id):
    categoria = Categoria.query.get_or_404(id)
    db.session.delete(categoria)
    db.session.commit()
    return jsonify({'message': 'Categoria apagada com sucesso!'})