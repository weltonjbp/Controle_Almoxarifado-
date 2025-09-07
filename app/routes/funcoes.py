# Em app/routes/funcoes.py

from flask import Blueprint, jsonify, request
from ..models import db, Funcao
from flask_login import login_required
from ..decorators import gerente_required

funcoes_bp = Blueprint('funcoes', __name__)

@funcoes_bp.route('/funcoes', methods=['GET'])
@login_required
def get_funcoes():
    # --- LÓGICA DE BUSCA E PAGINAÇÃO ADICIONADA ---
    page = request.args.get('page', 1, type=int)
    per_page = 1000 # Um número grande para garantir que todos os itens venham para os dropdowns
    search = request.args.get('search', '')

    query = Funcao.query
    if search:
        query = query.filter(Funcao.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Funcao.nome).paginate(page=page, per_page=per_page, error_out=False)
    items = pagination.items

    data = [{'id': f.id, 'nome': f.nome, 'descricao': f.descricao} for f in items]
    
    return jsonify({
        'data': data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

# ... (o resto do ficheiro 'funcoes.py' continua igual) ...
@funcoes_bp.route('/funcoes/<int:id>', methods=['GET'])
@login_required
def get_funcao(id):
    funcao = Funcao.query.get_or_404(id)
    return jsonify({'id': funcao.id, 'nome': funcao.nome, 'descricao': funcao.descricao})

@funcoes_bp.route('/funcoes', methods=['POST'])
@login_required
@gerente_required
def create_funcao():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome da função é obrigatório.'}), 400
    if Funcao.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Esta função já existe.'}), 409

    nova_funcao = Funcao(nome=data['nome'], descricao=data.get('descricao'))
    db.session.add(nova_funcao)
    db.session.commit()
    return jsonify({'message': 'Função criada com sucesso!'}), 201

@funcoes_bp.route('/funcoes/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_funcao(id):
    funcao = Funcao.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome != funcao.nome and Funcao.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de função já está em uso.'}), 409
        
    funcao.nome = novo_nome or funcao.nome
    funcao.descricao = data.get('descricao', funcao.descricao)
    db.session.commit()
    return jsonify({'message': 'Função atualizada com sucesso!'})

@funcoes_bp.route('/funcoes/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_funcao(id):
    funcao = Funcao.query.get_or_404(id)
    db.session.delete(funcao)
    db.session.commit()
    return jsonify({'message': 'Função apagada com sucesso!'})