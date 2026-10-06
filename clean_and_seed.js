// ===============================================
// LIMPIAR MONGODB + CARGAR COACHES
// ===============================================

require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║  LIMPIANDO Y CARGANDO COACHES...     ║');
console.log('╚══════════════════════════════════════╝');
console.log('');

// Conectar MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schema Coach
const coachSchema = new mongoose.Schema({
  nombre: String,
  usuario: String,
  password: String,
  telefono: String,
  especialidad: String,
  clientes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' }],
  createdAt: { type: Date, default: Date.now }
});

const Coach = mongoose.model('Coach', coachSchema);

async function cleanAndSeed() {
  try {
    // Paso 1: Eliminar colección completa
    console.log('🗑️  Eliminando colección coaches completa...');
    await mongoose.connection.dropCollection('coaches').catch(() => {
      console.log('   (No había datos previos)');
    });
    console.log('   ✅ Colección eliminada');
    console.log('');

    // Paso 2: Crear Yayo
    console.log('👤 Creando Coach 1: Yayo Daza');
    const yayoPassword = await bcryptjs.hash('1234', 10);
    const yayo = await Coach.create({
      nombre: 'Yayo Daza',
      usuario: 'yayo',
      password: yayoPassword,
      telefono: '+57 3012855333',
      especialidad: 'Coach Fitness'
    });
    console.log(`   ✅ Usuario: yayo`);
    console.log(`   ✅ Contraseña: 1234`);
    console.log(`   ✅ ID: ${yayo._id}`);
    console.log('');

    // Paso 3: Crear Laura
    console.log('👤 Creando Coach 2: Laura Henao');
    const lauraPassword = await bcryptjs.hash('1234', 10);
    const laura = await Coach.create({
      nombre: 'Laura Henao',
      usuario: 'laura',
      password: lauraPassword,
      telefono: '+57 3236622674',
      especialidad: 'Coach Fitness y Mentalidad'
    });
    console.log(`   ✅ Usuario: laura`);
    console.log(`   ✅ Contraseña: 1234`);
    console.log(`   ✅ ID: ${laura._id}`);
    console.log('');

    console.log('╔══════════════════════════════════════╗');
    console.log('║  ✅ COACHES CARGADOS EXITOSAMENTE   ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log('📊 Total coaches: 2');
    console.log('✅ MongoDB limpió y listo');
    console.log('');

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

// Ejecutar
mongoose.connection.once('open', cleanAndSeed);
