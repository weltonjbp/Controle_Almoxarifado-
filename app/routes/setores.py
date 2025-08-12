# Em app/routes/setores.py

from flask import Blueprint, jsonify, request
from ..models import db, Setor
from flask_login import login_required
from ..decorators import gerente_required # Importar nosso novo decorator

setores_bp = Blueprint('setores', __name__)

# --- Rota GET (Ler) e POST (Criar) - sem alterações ---
@setores_bp.route('/setores', methods=['GET'])
def get_setores():
    # ... código existente ...
    setores = Setor.query.order_by(Setor.nome).all()
    setores_data = [{'id': s.id, 'nome': s.nome, 'descricao': s.descricao} for s in setores]
    return jsonify(setores_data)

@setores_bp.route('/setores', methods=['POST'])
# @login_required
def create_setor():
    # ... código existente ...
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do setor é obrigatório.'}), 400
    if Setor.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Este setor já existe.'}), 409
    novo_setor = Setor(nome=data['nome'], descricao=data.get('descricao'))
    db.session.add(novo_setor)
    db.session.commit()
    return jsonify({'message': 'Setor criado com sucesso!', 'id': novo_setor.id}), 201

# --- NOVAS ROTAS ABAIXO ---

# Rota para LER (GET) um único setor por ID
@setores_bp.route('/setores/<int:id>', methods=['GET'])
# @login_required
def get_setor(id):
    """Retorna os dados de um setor específico para edição."""
    setor = Setor.query.get_or_404(id)
    return jsonify({'id': setor.id, 'nome': setor.nome, 'descricao': setor.descricao})

# Rota para ATUALIZAR (PUT) um setor existente
@setores_bp.route('/setores/<int:id>', methods=['PUT'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE ATUALIZAR
def update_setor(id):
    """Atualiza um setor existente."""
    setor = Setor.query.get_or_404(id)
    data = request.get_json()
    
    novo_nome = data.get('nome')
    # Verifica se o novo nome já existe em outro registo
    if novo_nome and novo_nome != setor.nome and Setor.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de setor já está em uso.'}), 409

    setor.nome = novo_nome or setor.nome
    setor.descricao = data.get('descricao', setor.descricao)
    db.session.commit()
    return jsonify({'message': 'Setor atualizado com sucesso!'})

# Rota para APAGAR (DELETE) um setor
@setores_bp.route('/setores/<int:id>', methods=['DELETE'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def delete_setor(id):
    """Apaga um setor pelo seu ID."""
    setor = Setor.query.get_or_404(id)
    db.session.delete(setor)
    db.session.commit()
    return jsonify({'message': 'Setor apagado com sucesso!'})