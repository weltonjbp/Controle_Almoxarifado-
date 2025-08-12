# Em app/routes/almoxarifados.py

from flask import Blueprint, jsonify, request
from ..models import db, Almoxarifado
from ..decorators import gerente_required # Importar nosso novo decorator
from flask_login import login_required
almoxarifados_bp = Blueprint('almoxarifados', __name__)

@almoxarifados_bp.route('/almoxarifados', methods=['GET'])
def get_almoxarifados():
    almoxarifados = Almoxarifado.query.order_by(Almoxarifado.nome).all()
    return jsonify([{'id': a.id, 'nome': a.nome, 'localizacao': a.localizacao} for a in almoxarifados])

@almoxarifados_bp.route('/almoxarifados/<int:id>', methods=['GET'])
def get_almoxarifado(id):
    almoxarifado = Almoxarifado.query.get_or_404(id)
    return jsonify({'id': almoxarifado.id, 'nome': almoxarifado.nome, 'localizacao': almoxarifado.localizacao})

@almoxarifados_bp.route('/almoxarifados', methods=['POST'])
def create_almoxarifado():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do almoxarifado é obrigatório.'}), 400
    if Almoxarifado.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Este almoxarifado já existe.'}), 409

    novo_almoxarifado = Almoxarifado(nome=data['nome'], localizacao=data.get('localizacao'))
    db.session.add(novo_almoxarifado)
    db.session.commit()
    return jsonify({'message': 'Almoxarifado criado com sucesso!', 'id': novo_almoxarifado.id}), 201

@almoxarifados_bp.route('/almoxarifados/<int:id>', methods=['PUT'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def update_almoxarifado(id):
    almoxarifado = Almoxarifado.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome != almoxarifado.nome and Almoxarifado.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de almoxarifado já está em uso.'}), 409
        
    almoxarifado.nome = novo_nome or almoxarifado.nome
    almoxarifado.localizacao = data.get('localizacao', almoxarifado.localizacao)
    db.session.commit()
    return jsonify({'message': 'Almoxarifado atualizado com sucesso!'})

@almoxarifados_bp.route('/almoxarifados/<int:id>', methods=['DELETE'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def delete_almoxarifado(id):
    almoxarifado = Almoxarifado.query.get_or_404(id)
    db.session.delete(almoxarifado)
    db.session.commit()
    return jsonify({'message': 'Almoxarifado apagado com sucesso!'})