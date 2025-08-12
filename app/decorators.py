# Em app/decorators.py

from functools import wraps
from flask_login import current_user
from flask import jsonify

def gerente_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Se o usuário não estiver logado ou não for 'gerente', retorna erro
        if not current_user.is_authenticated or current_user.role != 'gerente':
            return jsonify({'error': 'Acesso negado. Permissão de gerente necessária.'}), 403
        return f(*args, **kwargs)
    return decorated_function