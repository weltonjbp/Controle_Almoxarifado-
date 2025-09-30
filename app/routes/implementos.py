# Em app/routes/implementos.py

from flask import Blueprint, jsonify, request
from ..models import db, Implemento
from flask_login import login_required
from ..decorators import gerente_required

implementos_bp = Blueprint('implementos', __name__)

@implementos_bp.route('/implementos', methods=['GET'])
@login_required
def get_implementos():
    query = Implemento.query.order_by(Implemento.nome)
    implementos = query.all()
    return jsonify({'data': [{'id': i.id, 'nome': i.nome, 'descricao': i.descricao} for i in implementos]})

@implementos_bp.route('/implementos/<int:id>', methods=['GET'])
@login_required
def get_implemento(id):
    implemento = Implemento.query.get_or_404(id)
    return jsonify({'id': implemento.id, 'nome': implemento.nome, 'descricao': implemento.descricao})

@implementos_bp.route('/implementos', methods=['POST'])
@login_required
@gerente_required
def create_implemento():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do implemento é obrigatório.'}), 400
    if Implemento.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Este implemento já existe.'}), 409
    novo = Implemento(nome=data['nome'], descricao=data.get('descricao'))
    db.session.add(novo)
    db.session.commit()
    return jsonify({'message': 'Implemento criado com sucesso!'}), 201

@implementos_bp.route('/implementos/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_implemento(id):
    implemento = Implemento.query.get_or_404(id)
    data = request.get_json()
    implemento.nome = data.get('nome', implemento.nome)
    implemento.descricao = data.get('descricao', implemento.descricao)
    db.session.commit()
    return jsonify({'message': 'Implemento atualizado com sucesso!'})

@implementos_bp.route('/implementos/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_implemento(id):
    implemento = Implemento.query.get_or_404(id)
    db.session.delete(implemento)
    db.session.commit()
    return jsonify({'message': 'Implemento apagado com sucesso!'})