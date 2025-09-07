# Em app/routes/admin.py

from flask import Blueprint, jsonify, request
from app.models import db, Usuario, CodigoAcesso
from flask_login import login_required
from ..decorators import gerente_required
import secrets
import string

admin_bp = Blueprint('admin', __name__)

# --- API para Gerir Chaves de Acesso ---
@admin_bp.route('/codigos-acesso', methods=['GET'])
@login_required
@gerente_required
def get_codigos():
    # --- LÓGICA DE PAGINAÇÃO ADICIONADA ---
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    # A busca não se aplica bem aqui, mas mantemos a estrutura
    pagination = CodigoAcesso.query.order_by(CodigoAcesso.data_criacao.desc()).paginate(page=page, per_page=per_page, error_out=False)
    codigos = pagination.items
    
    codigos_data = [{'id': c.id, 'codigo': c.codigo, 'role_permitida': c.role_permitida, 'usado': c.usado} for c in codigos]

    return jsonify({
        'data': codigos_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })

@admin_bp.route('/codigos-acesso', methods=['POST'])
@login_required
@gerente_required
def create_codigo():
    data = request.get_json()
    role = data.get('role', 'supervisor')

    if role not in ['gerente', 'supervisor', 'operador']:
        return jsonify({'error': 'Perfil inválido.'}), 400

    alphabet = string.ascii_uppercase + string.digits
    codigo_str = ''.join(secrets.choice(alphabet) for i in range(8))

    novo_codigo = CodigoAcesso(codigo=codigo_str, role_permitida=role)
    db.session.add(novo_codigo)
    db.session.commit()
    return jsonify({'message': f'Código {codigo_str} criado com sucesso!'}), 201