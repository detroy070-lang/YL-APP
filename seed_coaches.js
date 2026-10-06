// ===============================================
// YAYO APP v65 - SEED COACHES (CORREGIDO)
// ===============================================

require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║  CARGANDO COACHES EN MONGODB...      ║');
console.log('╚══════════════════════════════════════╝');
console.log('');

// Conectar MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schema Coach
const coachSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  telefono: String,
  especialidad: String,
  clientes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' }],
  createdAt: { type: Date, default: Date.now }
});

const Coach = mongoose.model('Coach', coachSchema);

async function seedCoaches() {
  try {
    // Limpiar coaches anteriores
    console.log('🗑️  Limpiando coaches anteriores...');
    await Coach.deleteMany({});
    console.log('   ✅ Limpieza completada');
    console.log('');

    // Crear Yayo
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

    // Crear Laura
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
    console.log('🔐 Contraseña por defecto: 1234');
    console.log('');

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

// Ejecutar
mongoose.connection.once('open', seedCoaches);
