from app import create_app, db
from app.models import Usuario

app = create_app()

with app.app_context():
    db.create_all()
    if not Usuario.query.filter_by(username='admin').first():
        print("Criando usuário 'admin' inicial...")
        admin_user = Usuario(username='admin', role='gerente')
        admin_user.set_password('admin')
        db.session.add(admin_user)
        db.session.commit()
        print("Usuário 'admin' criado.")

if __name__ == '__main__':
    # Inicia o servidor de desenvolvimento
    app.run(debug=True, host='0.0.0.0', port=5000)