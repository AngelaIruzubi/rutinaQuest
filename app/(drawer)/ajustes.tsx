// app/(drawer)/ajustes.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useGamificacion } from '../../hooks/useGamificacion';

// ─── Colores ──────────────────────────────────────────────────────────────────
const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const RED       = '#FF4444';
const ORANGE    = '#FF6B35';
const GOLD      = '#FFD700';

// ─── Sección con título ───────────────────────────────────────────────────────
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.seccion}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      <View style={s.seccionCard}>{children}</View>
    </View>
  );
}

// ─── Fila con switch ──────────────────────────────────────────────────────────
function FilaSwitch({
  icono, label, sub, valor, onChange, color = PURPLE,
}: {
  icono: string; label: string; sub?: string;
  valor: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <View style={s.fila}>
      <View style={[s.filaIcono, { backgroundColor: color + '22' }]}>
        <Ionicons name={icono as any} size={18} color={color} />
      </View>
      <View style={s.filaTexto}>
        <Text style={s.filaLabel}>{label}</Text>
        {sub && <Text style={s.filaSub}>{sub}</Text>}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: '#DDD', true: PURPLE_LT }}
        thumbColor={valor ? PURPLE : '#fff'}
      />
    </View>
  );
}

// ─── Fila de opciones (radio) ─────────────────────────────────────────────────
function FilaOpciones<T extends string>({
  icono, label, opciones, valor, onChange, color = PURPLE,
}: {
  icono: string; label: string;
  opciones: { valor: T; etiqueta: string }[];
  valor: T; onChange: (v: T) => void; color?: string;
}) {
  return (
    <View style={s.filaOpciones}>
      <View style={s.fila}>
        <View style={[s.filaIcono, { backgroundColor: color + '22' }]}>
          <Ionicons name={icono as any} size={18} color={color} />
        </View>
        <Text style={s.filaLabel}>{label}</Text>
      </View>
      <View style={s.opcionesRow}>
        {opciones.map(op => (
          <Pressable
            key={op.valor}
            onPress={() => onChange(op.valor)}
            style={[
              s.opcionBtn,
              valor === op.valor && { backgroundColor: color, borderColor: color },
            ]}
          >
            <Text style={[
              s.opcionTxt,
              valor === op.valor && { color: '#fff', fontWeight: '700' },
            ]}>
              {op.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Fila de acción ───────────────────────────────────────────────────────────
function FilaAccion({
  icono, label, sub, onPress, color = PURPLE, destructivo = false,
}: {
  icono: string; label: string; sub?: string;
  onPress: () => void; color?: string; destructivo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.fila, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.filaIcono, { backgroundColor: (destructivo ? RED : color) + '22' }]}>
        <Ionicons name={icono as any} size={18} color={destructivo ? RED : color} />
      </View>
      <View style={s.filaTexto}>
        <Text style={[s.filaLabel, destructivo && { color: RED }]}>{label}</Text>
        {sub && <Text style={s.filaSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CCC" />
    </Pressable>
  );
}

// ─── Separador ────────────────────────────────────────────────────────────────
function Sep() {
  return <View style={s.sep} />;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Ajustes() {
  const { ajustes, colores, escala, actualizar, reset } = useAjustesCtx();
  const gami   = useGamificacion();
  const router = useRouter();

  // ── Reset ajustes ─────────────────────────────────────────────────────────
  const confirmarReset = () => {
    Alert.alert(
      'Restablecer ajustes',
      '¿Volver a los ajustes por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', style: 'destructive', onPress: reset },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[s.root, { backgroundColor: colores.fondo }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.titulo, { fontSize: 30 * escala, color: colores.purple }]}>Ajustes</Text>
       <Pressable
                    onPress={() => router.replace('/')}
                    style={s.btnInicio}
                  >
                    <Ionicons name="home-outline" size={16} color={PURPLE} />
                    <Text style={s.btnInicioTxt}>Inicio</Text>
                  </Pressable>
            

      {/* ── APARIENCIA ── */}
      <Seccion titulo="🎨  Apariencia">
        <FilaOpciones
          icono="sunny-outline"
          label="Tema"
          opciones={[
            { valor: 'claro',  etiqueta: '☀️ Claro'  },
            { valor: 'oscuro', etiqueta: '🌙 Oscuro' },
            { valor: 'auto',   etiqueta: '⚙️ Auto'   },
          ]}
          valor={ajustes.tema}
          onChange={v => actualizar({ tema: v })}
        />
        <Sep />
        <FilaOpciones
          icono="text-outline"
          label="Tamaño de texto"
          opciones={[
            { valor: 'pequeño',    etiqueta: 'Pequeño'  },
            { valor: 'normal',     etiqueta: 'Normal'   },
            { valor: 'grande',     etiqueta: 'Grande'   },
            { valor: 'muy_grande', etiqueta: 'Muy gde.' },
          ]}
          valor={ajustes.tamanoTexto}
          onChange={v => actualizar({ tamanoTexto: v })}
        />
        <Sep />
        <FilaSwitch
          icono="contrast-outline"
          label="Alto contraste"
          sub="Mejora la legibilidad"
          valor={ajustes.altoContraste}
          onChange={v => actualizar({ altoContraste: v })}
          color="#333"
        />
      </Seccion>

      {/* ── INTERACCIÓN ── */}
      <Seccion titulo="⚡  Interacción">
        <FilaSwitch
          icono="phone-portrait-outline"
          label="Vibración"
          sub="Al completar tareas"
          valor={ajustes.vibracion}
          onChange={v => actualizar({ vibracion: v })}
          color={ORANGE}
        />
        <Sep />
        <FilaSwitch
          icono="notifications-outline"
          label="Notificaciones"
          sub="Alertas de la app"
          valor={ajustes.notificaciones}
          onChange={v => actualizar({ notificaciones: v })}
          color={PURPLE}
        />
        {ajustes.notificaciones && (
          <>
            <Sep />
            <FilaSwitch
              icono="timer-outline"
              label="Aviso 5 minutos"
              sub="Antes de que venza una tarea"
              valor={ajustes.notifCincoMin}
              onChange={v => actualizar({ notifCincoMin: v })}
              color={PURPLE}
            />
            <Sep />
            <FilaSwitch
              icono="partly-sunny-outline"
              label="Aviso mediodía"
              sub="Si no has empezado"
              valor={ajustes.notifMitadDia}
              onChange={v => actualizar({ notifMitadDia: v })}
              color={ORANGE}
            />
            <Sep />
            <FilaSwitch
              icono="moon-outline"
              label="Aviso fin de día"
              sub="A las 21h si quedan tareas"
              valor={ajustes.notifFinDia}
              onChange={v => actualizar({ notifFinDia: v })}
              color="#555"
            />
          </>
        )}
      </Seccion>

      {/* ── RESTABLECER ── */}
      <Seccion titulo="⚙️  Avanzado">
        <FilaAccion
          icono="refresh-outline"
          label="Restablecer ajustes"
          sub="Volver a los valores por defecto"
          onPress={confirmarReset}
          destructivo
        />
      </Seccion>

      {/* Versión */}
      <Text style={s.version}>RutinaQuest · v1.0</Text>

    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  titulo: {
    fontWeight: '700', color: PURPLE,
    textAlign: 'center', marginBottom: 24,
  },
  btnInicio: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: PURPLE + '18', borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: 13 },


  seccion:       { marginBottom: 20 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', color: '#BBB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  seccionCard:   { backgroundColor: PURPLE_BG, borderRadius: 18, paddingVertical: 4, paddingHorizontal: 14, borderWidth: 1, borderColor: PURPLE_LT },

  fila:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  filaIcono: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { flex: 1 },
  filaLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  filaSub:   { fontSize: 11, color: '#AAA', marginTop: 1 },

  filaOpciones: { paddingVertical: 10, gap: 8 },
  opcionesRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 46 },
  opcionBtn:    { borderRadius: 20, borderWidth: 1.5, borderColor: PURPLE_LT, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  opcionTxt:    { fontSize: 12, color: '#666' },

  sep: { height: 1, backgroundColor: PURPLE_LT, marginHorizontal: -14 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  statItem:  { alignItems: 'center', gap: 4 },
  statNum:   { fontSize: 28, fontWeight: '800', color: PURPLE },
  statLbl:   { fontSize: 11, color: '#AAA' },

  version: { textAlign: 'center', color: '#CCC', fontSize: 11, marginTop: 8, marginBottom: 20 },
});
