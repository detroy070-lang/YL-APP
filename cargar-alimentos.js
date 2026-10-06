const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://detroy070_db_user:Yayo1234@cluster0.8jv7uej.mongodb.net/yayo_v65?appName=Cluster0';

const alimentosSchema = new mongoose.Schema({
  nombre: String,
  estado: String,
  kcal: Number,
  proteina: Number,
  carbohidratos: Number,
  grasas: Number,
  grupo: String,
});

const Alimento = mongoose.model('Alimento', alimentosSchema);

const alimentos = [
  { nombre: 'Arroz blanco', estado: 'cocido', kcal: 130, proteina: 2.4, carbohidratos: 28.2, grasas: 0.3, grupo: 'Cereales' },
  { nombre: 'Arroz blanco', estado: 'crudo', kcal: 365, proteina: 6.7, carbohidratos: 79, grasas: 0.9, grupo: 'Cereales' },
  { nombre: 'Arroz integral', estado: 'cocido', kcal: 123, proteina: 2.7, carbohidratos: 25.8, grasas: 0.9, grupo: 'Cereales' },
  { nombre: 'Arroz integral', estado: 'crudo', kcal: 345, proteina: 7.5, carbohidratos: 72, grasas: 2.5, grupo: 'Cereales' },
  { nombre: 'Avena', estado: 'cruda', kcal: 379, proteina: 13.5, carbohidratos: 67.7, grasas: 6.5, grupo: 'Cereales' },
  { nombre: 'Avena', estado: 'cocida en agua', kcal: 71, proteina: 2.5, carbohidratos: 12.0, grasas: 1.4, grupo: 'Cereales' },
  { nombre: 'Pan integral', estado: 'tal cual se come', kcal: 247, proteina: 9.0, carbohidratos: 45.0, grasas: 3.5, grupo: 'Cereales' },
  { nombre: 'Pan blanco', estado: 'tal cual se come', kcal: 265, proteina: 8.5, carbohidratos: 50.0, grasas: 3.2, grupo: 'Cereales' },
  { nombre: 'Pasta', estado: 'cocida', kcal: 138, proteina: 4.5, carbohidratos: 27.5, grasas: 0.9, grupo: 'Cereales' },
  { nombre: 'Pasta', estado: 'cruda', kcal: 365, proteina: 12, carbohidratos: 73, grasas: 2.4, grupo: 'Cereales' },
  { nombre: 'Arepa', estado: 'lista', kcal: 220, proteina: 6, carbohidratos: 37, grasas: 4, grupo: 'Cereales' },
  { nombre: 'Plátano', estado: 'pesado cocido', kcal: 110, proteina: 1.2, carbohidratos: 28, grasas: 0.3, grupo: 'Tubérculos' },
  { nombre: 'Papa', estado: 'cocida', kcal: 87, proteina: 1.9, carbohidratos: 20.1, grasas: 0.1, grupo: 'Tubérculos' },
  { nombre: 'Papa', estado: 'cruda', kcal: 77, proteina: 2.1, carbohidratos: 17, grasas: 0.1, grupo: 'Tubérculos' },
  { nombre: 'Papa criolla', estado: 'cocida', kcal: 87, proteina: 1.9, carbohidratos: 20.1, grasas: 0.1, grupo: 'Tubérculos' },
  { nombre: 'Yuca', estado: 'cocida', kcal: 112, proteina: 1.4, carbohidratos: 27.2, grasas: 0.3, grupo: 'Tubérculos' },
  { nombre: 'Camote', estado: 'cocido', kcal: 86, proteina: 1.6, carbohidratos: 20.1, grasas: 0.1, grupo: 'Tubérculos' },
  { nombre: 'Pechuga de pollo', estado: 'pesado cocido', kcal: 165, proteina: 31.0, carbohidratos: 0.0, grasas: 3.6, grupo: 'Proteínas' },
  { nombre: 'Pechuga de pollo', estado: 'pesado en crudo', kcal: 165, proteina: 31.0, carbohidratos: 0.0, grasas: 3.6, grupo: 'Proteínas' },
  { nombre: 'Pechuga de pavo', estado: 'pesado cocido', kcal: 157, proteina: 30.0, carbohidratos: 0.0, grasas: 3.2, grupo: 'Proteínas' },
  { nombre: 'Pechuga de pavo', estado: 'pesado en crudo', kcal: 157, proteina: 30.0, carbohidratos: 0.0, grasas: 3.2, grupo: 'Proteínas' },
  { nombre: 'Carne de res magra', estado: 'pesado cocido', kcal: 217, proteina: 26.5, carbohidratos: 0.0, grasas: 11.5, grupo: 'Proteínas' },
  { nombre: 'Carne de res magra', estado: 'pesado en crudo', kcal: 217, proteina: 26.5, carbohidratos: 0.0, grasas: 11.5, grupo: 'Proteínas' },
  { nombre: 'Carne de cerdo', estado: 'pesado cocido', kcal: 235, proteina: 25.5, carbohidratos: 0.0, grasas: 14.0, grupo: 'Proteínas' },
  { nombre: 'Carne de cerdo', estado: 'pesado en crudo', kcal: 235, proteina: 25.5, carbohidratos: 0.0, grasas: 14.0, grupo: 'Proteínas' },
  { nombre: 'Atún en agua', estado: 'escurrido', kcal: 116, proteina: 26.0, carbohidratos: 0.0, grasas: 0.8, grupo: 'Proteínas' },
  { nombre: 'Salmón', estado: 'pesado cocido', kcal: 206, proteina: 22.1, carbohidratos: 0.0, grasas: 12.3, grupo: 'Proteínas' },
  { nombre: 'Salmón', estado: 'pesado en crudo', kcal: 206, proteina: 22.1, carbohidratos: 0.0, grasas: 12.3, grupo: 'Proteínas' },
  { nombre: 'Tilapia', estado: 'pesado cocido', kcal: 128, proteina: 26.2, carbohidratos: 0.0, grasas: 2.7, grupo: 'Proteínas' },
  { nombre: 'Tilapia', estado: 'pesado en crudo', kcal: 128, proteina: 26.2, carbohidratos: 0.0, grasas: 2.7, grupo: 'Proteínas' },
  { nombre: 'Huevo', estado: 'pesado cocido', kcal: 155, proteina: 12.6, carbohidratos: 1.1, grasas: 10.6, grupo: 'Proteínas' },
  { nombre: 'Huevo', estado: 'pesado en crudo', kcal: 155, proteina: 12.6, carbohidratos: 1.1, grasas: 10.6, grupo: 'Proteínas' },
  { nombre: 'Claras', estado: 'pesado cocido', kcal: 52, proteina: 10.9, carbohidratos: 0.7, grasas: 0.2, grupo: 'Proteínas' },
  { nombre: 'Claras', estado: 'pesado en crudo', kcal: 52, proteina: 10.9, carbohidratos: 0.7, grasas: 0.2, grupo: 'Proteínas' },
  { nombre: 'Leche', estado: 'lista', kcal: 61, proteina: 3.2, carbohidratos: 4.8, grasas: 3.3, grupo: 'Lácteos' },
  { nombre: 'Yogur griego', estado: 'tal cual se come', kcal: 61, proteina: 3.5, carbohidratos: 4.7, grasas: 3.3, grupo: 'Lácteos' },
  { nombre: 'Queso campesino', estado: 'tal cual se come', kcal: 264, proteina: 18.0, carbohidratos: 1.5, grasas: 20.0, grupo: 'Lácteos' },
  { nombre: 'Queso cheddar', estado: 'tal cual se come', kcal: 403, proteina: 24.9, carbohidratos: 1.3, grasas: 33.1, grupo: 'Lácteos' },
  { nombre: 'Banano', estado: 'tal cual se come', kcal: 89, proteina: 1.1, carbohidratos: 22.8, grasas: 0.3, grupo: 'Frutas' },
  { nombre: 'Mango', estado: 'tal cual se come', kcal: 60, proteina: 0.8, carbohidratos: 14.7, grasas: 0.4, grupo: 'Frutas' },
  { nombre: 'Aguacate', estado: 'tal cual se come', kcal: 160, proteina: 2.0, carbohidratos: 8.5, grasas: 14.7, grupo: 'Grasas' },
  { nombre: 'Maní', estado: 'tal cual se come', kcal: 585, proteina: 24.0, carbohidratos: 21.3, grasas: 49.7, grupo: 'Grasas' },
  { nombre: 'Almendras', estado: 'listas', kcal: 579, proteina: 21.2, carbohidratos: 21.55, grasas: 49.9, grupo: 'Grasas' },
  { nombre: 'Nueces', estado: 'listas', kcal: 654, proteina: 9.3, carbohidratos: 13.7, grasas: 65.2, grupo: 'Grasas' },
  { nombre: 'Crema de maní', estado: 'lista', kcal: 588, proteina: 25, carbohidratos: 20, grasas: 50, grupo: 'Grasas' },
  { nombre: 'Aceite de oliva', estado: 'tal cual se come', kcal: 884, proteina: 0.0, carbohidratos: 0.0, grasas: 100.0, grupo: 'Grasas' },
  { nombre: 'Semillas de chía', estado: 'listas', kcal: 486, proteina: 16.5, carbohidratos: 42.1, grasas: 30.7, grupo: 'Grasas' },
  { nombre: 'Frijoles', estado: 'cocidos', kcal: 132, proteina: 8.9, carbohidratos: 23.7, grasas: 0.5, grupo: 'Leguminosas' },
  { nombre: 'Lentejas', estado: 'cocidas', kcal: 116, proteina: 9.0, carbohidratos: 20.1, grasas: 0.4, grupo: 'Leguminosas' },
  { nombre: 'Garbanzos', estado: 'cocidos', kcal: 164, proteina: 8.9, carbohidratos: 27.4, grasas: 2.6, grupo: 'Leguminosas' },
];

async function cargarAlimentos() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🗑️  Limpiando colección anterior...');
    await Alimento.deleteMany({});

    console.log('📥 Insertando 50 alimentos...');
    const resultado = await Alimento.insertMany(alimentos);
    
    console.log(`✅ ÉXITO: ${resultado.length} alimentos cargados en MongoDB`);
    console.log('\nEjemplos insertados:');
    console.log('  - Pechuga de pollo pesado cocido: 165 kcal');
    console.log('  - Tilapia pesado cocido: 128 kcal');
    console.log('  - Leche lista: 61 kcal');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cargarAlimentos();
