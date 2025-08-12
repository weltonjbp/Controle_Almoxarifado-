# Em app/routes/main.py

from flask import Blueprint, render_template, redirect, url_for, jsonify
from flask_login import login_required, current_user
from app.models import db, Produto, Movimentacao
from sqlalchemy import func

main_bp = Blueprint('main', __name__)

# --- ROTAS DE PÁGINAS ---

@main_bp.route('/')
@login_required # <-- Descomentado/Adicionado
def entry_point():
    # A verificação de autenticação volta a ser feita
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard_page'))
    else:
        return redirect(url_for('auth.login_page'))

@main_bp.route('/dashboard')
@login_required # <-- Descomentado/Adicionado
def dashboard_page():
    return render_template('index.html', user_role=current_user.role)

@main_bp.route('/tutorial')
def tutorial_page():
    return render_template('tutorial.html')

# --- API PARA O DASHBOARD (já estava correta, mas revisada) ---
@main_bp.route('/api/dashboard-stats')
@login_required # <-- Garantir que está aqui também
def dashboard_stats():
    # ... (código da API do dashboard sem alterações)
    try:
        total_value = db.session.query(func.sum(Produto.preco_unitario * Produto.estoque)).filter(Produto.preco_unitario.isnot(None)).scalar() or 0.0
        total_products = Produto.query.count()
        low_stock_alerts = Produto.query.filter(Produto.estoque <= 0).count()
        recent_movements = Movimentacao.query.order_by(Movimentacao.data.desc()).limit(5).all()
    # CORREÇÃO AQUI: Adicionar 'usuario_nome'
        movements_data = [{
            'produto_nome': mov.produto.nome,
            'tipo': mov.tipo,
            'quantidade': mov.quantidade,
            'data': mov.data.strftime('%d/%m/%Y %H:%M'),
            'usuario_nome': mov.usuario.username # Adicionar esta linha
        } for mov in recent_movements]
        
        stats = {'total_produtos': total_products, 'valor_total_estoque': float(total_value), 'alertas_estoque': low_stock_alerts, 'movimentacoes_recentes': movements_data}
        return jsonify(stats)
    except Exception as e:
        print(f"ERRO NA API DO DASHBOARD: {e}")

        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500
