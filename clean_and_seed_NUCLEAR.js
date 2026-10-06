// =====================================================
// SCRIPT NUCLEAR - LIMPIAR TODO Y CARGAR LIMPIO
// =====================================================
// ADVERTENCIA: BORRA TODO sin recuperación posible
// Solo usar si hay corrupción de datos

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('\n🔴 INICIANDO LIMPIEZA NUCLEAR...\n');
console.log('⚠️  ESTO BORRARÁ TODO DE MONGODB\n');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ Conectado a MongoDB\n');
    await cleanNuclear();
  })
  .catch(err => {
    console.error('❌ Error conectando:', err.message);
    process.exit(1);
  });

async function cleanNuclear() {
  try {
    console.log('🔥 PASO 1: Borrando colecciones...\n');

    // Obtener todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (let collection of collections) {
      if (collection.name !== 'system.indexes') {
        await mongoose.connection.db.dropCollection(collection.name);
        console.log(`   ✅ Colección borrada: ${collection.name}`);
      }
    }

    console.log('\n🔥 PASO 2: Recreando esquemas...\n');

    // Recrear esquemas
    const coachSchema = new mongoose.Schema({
      nombre: String,
      username: { type: String, unique: true, sparse: true },
      password: String,
      telefono: String,
      especialidad: String,
      createdAt: { type: Date, default: Date.now }
    });

    const clienteSchema = new mongoose.Schema({
      nombre: String,
      username: { type: String, unique: true, sparse: true },
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

    console.log('   ✅ Esquemas recreados\n');

    console.log('🔥 PASO 3: Cargando coaches LIMPIOS...\n');

    // Crear coaches
    const yayo = new Coach({
      nombre: 'Yayo Daza',
      username: 'yayo',
      password: '1234',
      telefono: '+57 300 123 4567',
      especialidad: 'Entrenamiento personalizado y nutrición'
    });

    const laura = new Coach({
      nombre: 'Laura Henao',
      username: 'laura',
      password: '1234',
      telefono: '+57 300 987 6543',
      especialidad: 'Nutrición y wellness'
    });

    await yayo.save();
    console.log('   ✅ Yayo cargado');
    console.log(`      ID: ${yayo._id}`);
    console.log('      Usuario: yayo | Contraseña: 1234\n');

    await laura.save();
    console.log('   ✅ Laura cargada');
    console.log(`      ID: ${laura._id}`);
    console.log('      Usuario: laura | Contraseña: 1234\n');

    // Resumen
    console.log('╔════════════════════════════════════════╗');
    console.log('║  ✅ LIMPIEZA NUCLEAR COMPLETADA       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 ESTADO ACTUAL:');
    console.log('   • Coaches: 2 (Yayo + Laura)');
    console.log('   • Clientes: 0 (LIMPIO)');
    console.log('   • Dietas: 0 (LIMPIO)');
    console.log('   • Índices: Recreados\n');

    console.log('🔓 CREDENCIALES:');
    console.log('   • yayo / 1234');
    console.log('   • laura / 1234\n');

    console.log('🌐 APP LISTA EN:');
    console.log('   https://yl-app.detroyuniverse.lat\n');

    console.log('✨ Ahora haz: git add . && git commit -m "Clean MongoDB" && git push\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante limpieza nuclear:', error.message);
    process.exit(1);
  }
}
