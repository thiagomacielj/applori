from flask import Flask, render_template, request, jsonify
from models import db, Expense, Vaccine
from datetime import datetime
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

# Rotas para despesas
@app.route('/api/expenses', methods=['GET', 'POST'])
def expenses():
    if request.method == 'GET':
        expenses = Expense.query.order_by(Expense.date.desc()).all()
        return jsonify([expense.to_dict() for expense in expenses])
    
    elif request.method == 'POST':
        data = request.get_json()
        new_expense = Expense(
            description=data['description'],
            amount=float(data['amount']),
            category=data['category'],
            location=data['location'],
            date=datetime.strptime(data['date'], '%Y-%m-%d').date()
        )
        db.session.add(new_expense)
        db.session.commit()
        return jsonify(new_expense.to_dict()), 201

@app.route('/api/expenses/<int:id>', methods=['DELETE'])
def delete_expense(id):
    expense = Expense.query.get_or_404(id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({'message': 'Despesa excluída com sucesso'})

# Rotas para vacinas
@app.route('/api/vaccines', methods=['GET', 'POST'])
def vaccines():
    if request.method == 'GET':
        vaccines = Vaccine.query.order_by(Vaccine.date.desc()).all()
        return jsonify([vaccine.to_dict() for vaccine in vaccines])
    
    elif request.method == 'POST':
        data = request.get_json()
        
        next_date = None
        if data.get('next_date'):
            next_date = datetime.strptime(data['next_date'], '%Y-%m-%d').date()
            
        new_vaccine = Vaccine(
            name=data['name'],
            date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
            next_date=next_date,
            vet=data['vet'],
            amount=float(data.get('amount', 0))
        )
        db.session.add(new_vaccine)
        db.session.commit()
        
        # Se a vacina tem custo, criar uma despesa associada
        if new_vaccine.amount > 0:
            vaccine_expense = Expense(
                description=f"Vacina: {new_vaccine.name}",
                amount=new_vaccine.amount,
                category='veterinario',
                location=new_vaccine.vet,
                date=new_vaccine.date
            )
            db.session.add(vaccine_expense)
            db.session.commit()
        
        return jsonify(new_vaccine.to_dict()), 201

@app.route('/api/vaccines/<int:id>', methods=['DELETE'])
def delete_vaccine(id):
    vaccine = Vaccine.query.get_or_404(id)
    db.session.delete(vaccine)
    db.session.commit()
    return jsonify({'message': 'Vacina excluída com sucesso'})

# Rota para relatórios
@app.route('/api/reports')
def reports():
    expenses = Expense.query.all()
    vaccines = Vaccine.query.all()
    
    # Cálculo do total gasto
    total = sum(expense.amount for expense in expenses)
    
    # Cálculo da média mensal
    if expenses:
        dates = [expense.date for expense in expenses]
        min_date = min(dates)
        max_date = max(dates)
        
        months = (max_date.year - min_date.year) * 12 + (max_date.month - min_date.month) + 1
        monthly_average = total / max(1, months)
    else:
        monthly_average = 0
    
    # Vacinas em dia
    today = datetime.now().date()
    vaccines_up_to_date = sum(1 for vaccine in vaccines 
                            if not vaccine.next_date or vaccine.next_date >= today)
    
    # Gastos por categoria
    category_totals = {}
    for expense in expenses:
        category_totals[expense.category] = category_totals.get(expense.category, 0) + expense.amount
    
    # Próximas vacinas
    upcoming_vaccines = []
    for vaccine in vaccines:
        if vaccine.next_date and vaccine.next_date > today:
            days_until = (vaccine.next_date - today).days
            upcoming_vaccines.append({
                'id': vaccine.id,
                'name': vaccine.name,
                'next_date': vaccine.next_date.isoformat(),
                'days_until': days_until
            })
    
    # Ordenar por data mais próxima
    upcoming_vaccines.sort(key=lambda x: x['days_until'])
    
    return jsonify({
        'total': total,
        'monthly_average': monthly_average,
        'vaccines_up_to_date': vaccines_up_to_date,
        'category_totals': category_totals,
        'upcoming_vaccines': upcoming_vaccines[:5]  # Apenas as 5 próximas
    })

if __name__ == '__main__':
    app.run(debug=True)