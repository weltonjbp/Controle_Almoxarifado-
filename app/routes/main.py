# Em app/routes/main.py

import os
from flask import Blueprint, render_template, redirect, url_for, jsonify, send_from_directory
from flask_login import login_required, current_user
from flask import send_from_directory
from app.models import db, Produto, Movimentacao, CombustivelEstoque 
from sqlalchemy import func

main_bp = Blueprint('main', __name__)

# --- ROTAS DE PÁGINAS ---

@main_bp.route('/')
@login_required 
def entry_point():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard_page'))
    else:
        return redirect(url_for('auth.login_page'))

@main_bp.route('/tutorial')
@login_required
def tutorial_page():
    """ Renderiza a página do tutorial. """
    return render_template('tutorial.html')

@main_bp.route('/dashboard')
@login_required 
def dashboard_page():
    return render_template('index.html', user_role=current_user.role)

# --- API PARA O DASHBOARD (COM A CORREÇÃO FINAL) ---
@main_bp.route('/api/dashboard-stats')
@login_required
def dashboard_stats():
    try:
        # Estas consultas continuam as mesmas
        total_value = db.session.query(func.sum(Produto.preco_unitario * Produto.estoque)).filter(Produto.preco_unitario.isnot(None)).scalar() or 0.0
        total_products = Produto.query.count()
        total_combustivel = db.session.query(func.sum(CombustivelEstoque.quantidade)).scalar() or 0.0

        low_stock_alerts = Produto.query.filter(Produto.estoque <= 0).count()
        recent_movements = Movimentacao.query.order_by(Movimentacao.data.desc()).limit(5).all()
        
        movements_data = []
        for mov in recent_movements:
            # --- LÓGICA MAIS DEFENSIVA ADICIONADA AQUI ---
            # Verifica se a movimentação e os seus relacionamentos existem antes de os usar
            if mov and mov.produto and mov.usuario:
                movements_data.append({
                    'produto_nome': mov.produto.nome,
                    'tipo': mov.tipo,
                    'quantidade': mov.quantidade,
                    'data': mov.data.strftime('%d/%m/%Y %H:%M') if mov.data else 'Data Inválida',
                    'usuario_nome': mov.usuario.username
                })
        
        stats = {
            'total_produtos': total_products, 
            'valor_total_estoque': float(total_value), 
            'total_combustivel': float(total_combustivel), 
            'alertas_estoque_baixo': low_stock_alerts,
            'movimentacoes_recentes': movements_data
        }
        return jsonify(stats)
    except Exception as e:
        # Esta parte é ótima para depuração, ela imprime o erro real no seu terminal
        print(f"ERRO NA API DO DASHBOARD: {e}")
        return jsonify({"error": "Ocorreu um erro interno no servidor ao carregar as estatísticas."}), 500

    

@main_bp.route('/favicon.ico')
def favicon():
    # Encontra o caminho para a pasta 'static' e envia o ficheiro 'favicon.ico'
    return send_from_directory(os.path.join(main_bp.root_path, '..', 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


@main_bp.route('/service-worker.js')
def service_worker():
    return send_from_directory(os.path.join(main_bp.root_path, '..', 'static'),
                               'service-worker.js', mimetype='application/javascript')


                               
                               