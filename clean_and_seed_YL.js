// =====================================================
// LIMPIAR Y CARGAR DATOS INICIALES - YL APP
// =====================================================
// Este script:
// 1. Conecta a MongoDB
// 2. Borra todas las colecciones (LIMPIA TODO)
// 3. Carga Yayo + Laura como coaches
// 4. Listo para producción

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔄 Conectando a MongoDB...');
console.log('URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));

// Conectar
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB conectado');
    cleanAndSeed();
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

// =====================================================
// ESQUEMAS
// =====================================================

const coachSchema = new mongoose.Schema({
  nombre: String,
  username: String,
  password: String,
  telefono: String,
  especialidad: String,
  createdAt: { type: Date, default: Date.now }
});

const clienteSchema = new mongoose.Schema({
  nombre: String,
  username: String,
  password: String,
  edad: Number,
  coach_id: mongoose.Schema.Types.ObjectId,
  objetivo: String,
  status: { type: String, default: 'activo' },
  createdAt: { type: Date, default: Date.now }
});

const dietaSchema = new mongoose.Schema({
  coach_id: mongoose.Schema.Types.ObjectId,
  cliente_id: mongoose.Schema.Types.ObjectId,
  nombre: String,
  kcal_objetivo: Number,
  macros: {
    proteina: Number,
    carbohidratos: Number,
    grasas: Number
  },
  comidas: Array,
  createdAt: { type: Date, default: Date.now }
});

const Coach = mongoose.model('Coach', coachSchema);
const Cliente = mongoose.model('Cliente', clienteSchema);
const Dieta = mongoose.model('Dieta', dietaSchema);

// =====================================================
// LIMPIAR Y CARGAR
// =====================================================

async function cleanAndSeed() {
  try {
    console.log('\n🧹 LIMPIANDO TODAS LAS COLECCIONES...\n');

    // Borrar colecciones
    await Coach.deleteMany({});
    console.log('✅ Coaches borrados');

    await Cliente.deleteMany({});
    console.log('✅ Clientes borrados');

    await Dieta.deleteMany({});
    console.log('✅ Dietas borradas');

    // =====================================================
    // CARGAR COACHES LIMPIOS
    // =====================================================

    console.log('\n📝 CARGANDO COACHES NUEVOS...\n');

    const yayo = new Coach({
      nombre: 'Yayo Daza',
      username: 'yayo',
      password: '1234', // En producción usar hash
      telefono: '+57 300 123 4567',
      especialidad: 'Entrenamiento personalizado y nutrición'
    });

    const laura = new Coach({
      nombre: 'Laura Henao',
      username: 'laura',
      password: '1234', // En producción usar hash
      telefono: '+57 300 987 6543',
      especialidad: 'Nutrición y wellness'
    });

    await yayo.save();
    console.log('✅ Yayo cargado correctamente');
    console.log(`   ID: ${yayo._id}`);
    console.log(`   Username: yayo | Password: 1234`);

    await laura.save();
    console.log('✅ Laura cargada correctamente');
    console.log(`   ID: ${laura._id}`);
    console.log(`   Username: laura | Password: 1234`);

    // =====================================================
    // RESUMEN FINAL
    // =====================================================

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ LIMPIEZA Y CARGA COMPLETADA       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 ESTADO ACTUAL:');
    console.log('   • Coaches: 2 (Yayo + Laura)');
    console.log('   • Clientes: 0 (Limpio)');
    console.log('   • Dietas: 0 (Limpio)');

    console.log('\n🔐 CREDENCIALES PARA LOGIN:');
    console.log('   Coach 1: yayo / 1234');
    console.log('   Coach 2: laura / 1234');

    console.log('\n🌐 URL APP:');
    console.log('   https://yl-app.detroyuniverse.lat');

    console.log('\n✨ La app está lista para producción!\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante limpieza:', error.message);
    process.exit(1);
  }
}
